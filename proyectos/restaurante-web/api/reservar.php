<?php
declare(strict_types=1);

// POST api/reservar.php  (JSON)
// { nombre, telefono, email, fecha, hora, personas, comentarios }
// → { ok: true, codigo: "BS-7K2Q" }

require __DIR__ . '/lib.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    responder(['ok' => false, 'error' => 'Método no permitido'], 405);
}

$input = json_decode(file_get_contents('php://input') ?: '', true);
if (!is_array($input)) {
    responder(['ok' => false, 'error' => 'Petición no válida'], 400);
}

// honeypot: los bots rellenan el campo oculto "web"
if (!empty($input['web'])) {
    responder(['ok' => true, 'codigo' => 'BS-0000']);
}

// Que nadie pueda llenar el aforo con reservas falsas: máximo 5 por IP y hora
if (limiteSuperado($config, 'reserva', 5, 3600)) {
    responder(['ok' => false, 'error' => 'Has hecho demasiadas reservas seguidas. Llámanos si necesitas más.'], 429);
}

// ── validación ─────────────────────────────────────
$nombre      = limpiar((string) ($input['nombre'] ?? ''), 80);
$telefono    = preg_replace('/[^\d+]/', '', (string) ($input['telefono'] ?? ''));
$email       = filter_var(trim((string) ($input['email'] ?? '')), FILTER_VALIDATE_EMAIL);
$hora        = (string) ($input['hora'] ?? '');
$personas    = filter_var($input['personas'] ?? null, FILTER_VALIDATE_INT, [
    'options' => ['min_range' => 1, 'max_range' => $config['max_grupo']],
]);
$comentarios = limpiar((string) ($input['comentarios'] ?? ''), 500);
$dia         = fechaValida((string) ($input['fecha'] ?? ''));

$errores = [];
if (mb_strlen($nombre) < 2)                       $errores[] = 'nombre';
if (!preg_match('/^\+?\d{9,14}$/', $telefono))    $errores[] = 'teléfono';
if (!$email)                                      $errores[] = 'email';
if (!$dia)                                        $errores[] = 'fecha';
if (!preg_match('/^\d{2}:\d{2}$/', $hora))        $errores[] = 'hora';
if ($personas === false)                          $errores[] = 'personas';

if ($errores) {
    responder(['ok' => false, 'error' => 'Revisa: ' . implode(', ', $errores) . '.'], 422);
}

// ── reserva atómica (comprueba hueco y guarda con el fichero bloqueado) ──
$resultado = modificarReservas($config, function (array &$reservas) use (
    $config, $dia, $hora, $personas, $nombre, $telefono, $email, $comentarios
) {
    $hueco = null;
    foreach (huecos($config, $dia, $reservas) as $h) {
        if ($h['hora'] === $hora) {
            $hueco = $h;
            break;
        }
    }
    if (!$hueco) {
        return ['error' => 'Esa hora no está disponible. Elige otra.'];
    }
    if ($hueco['plazas'] < $personas) {
        return ['error' => "Solo quedan {$hueco['plazas']} plazas a las {$hora}."];
    }

    $codigo = 'BS-' . strtoupper(substr(bin2hex(random_bytes(3)), 0, 4));
    $reservas[] = [
        'codigo'      => $codigo,
        'fecha'       => $dia->format('Y-m-d'),
        'hora'        => $hora,
        'personas'    => $personas,
        'nombre'      => $nombre,
        'telefono'    => $telefono,
        'email'       => $email,
        'comentarios' => $comentarios,
        'estado'      => 'confirmada',
        'creada'      => date(DATE_ATOM),
    ];
    return ['codigo' => $codigo];
});

if (isset($resultado['error'])) {
    responder(['ok' => false, 'error' => $resultado['error']], 409);
}

// ── emails (cliente + restaurante). Fallar al enviar no anula la reserva. ──
$fechaTexto = $dia->format('d/m/Y');
$asunto = "Reserva confirmada {$resultado['codigo']} · {$config['nombre']}";
$cuerpo = <<<TXT
Hola {$nombre},

Tu reserva en {$config['nombre']} está confirmada:

  Código:   {$resultado['codigo']}
  Fecha:    {$fechaTexto} a las {$hora}
  Personas: {$personas}

Si necesitas cambiarla o cancelarla, responde a este email o llámanos.

¡Te esperamos!
TXT;

$cabeceras = [
    'From'         => "{$config['nombre']} <{$config['email']}>",
    'Reply-To'     => $config['email'],
    'Content-Type' => 'text/plain; charset=utf-8',
];
@mail($email, $asunto, $cuerpo, $cabeceras);
@mail($config['email'], "Nueva reserva {$resultado['codigo']}", $cuerpo . "\n\nTel: {$telefono}\nNotas: {$comentarios}", $cabeceras);

responder(['ok' => true, 'codigo' => $resultado['codigo']], 201);
