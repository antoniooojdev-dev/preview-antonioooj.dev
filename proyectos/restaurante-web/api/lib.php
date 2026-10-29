<?php
declare(strict_types=1);

$config = require __DIR__ . '/config.php';
date_default_timezone_set($config['zona_horaria']);

/** Responde en JSON y termina. */
function responder(array $data, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

/** "20:30" → 1230. Un cierre a "00:00" se interpreta como medianoche (1440). */
function aMinutos(string $hhmm, bool $esCierre = false): int
{
    [$h, $m] = array_map('intval', explode(':', $hhmm));
    $total = $h * 60 + $m;
    return ($esCierre && $total === 0) ? 1440 : $total;
}

function aHora(int $min): string
{
    return sprintf('%02d:%02d', intdiv($min, 60) % 24, $min % 60);
}

function fechaValida(string $fecha): ?DateTimeImmutable
{
    $d = DateTimeImmutable::createFromFormat('!Y-m-d', $fecha);
    return ($d && $d->format('Y-m-d') === $fecha) ? $d : null;
}

/**
 * Lee las reservas con bloqueo compartido.
 * @return list<array<string, mixed>>
 */
function leerReservas(array $config): array
{
    $file = $config['fichero'];
    if (!is_file($file)) {
        return [];
    }
    $fp = fopen($file, 'rb');
    flock($fp, LOCK_SH);
    $json = stream_get_contents($fp);
    flock($fp, LOCK_UN);
    fclose($fp);
    return json_decode($json ?: '[]', true) ?: [];
}

/**
 * Modifica las reservas de forma atómica: bloquea, lee, aplica $fn y guarda.
 * $fn recibe el array por referencia y puede devolver un valor.
 */
function modificarReservas(array $config, callable $fn): mixed
{
    $file = $config['fichero'];
    if (!is_dir(dirname($file))) {
        mkdir(dirname($file), 0750, true);
    }
    $fp = fopen($file, 'c+b');
    flock($fp, LOCK_EX);
    try {
        $reservas = json_decode(stream_get_contents($fp) ?: '[]', true) ?: [];
        $resultado = $fn($reservas);
        ftruncate($fp, 0);
        rewind($fp);
        fwrite($fp, json_encode($reservas, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        fflush($fp);
        return $resultado;
    } finally {
        flock($fp, LOCK_UN);
        fclose($fp);
    }
}

/** Comensales que ocupan el local a una hora concreta de un día. */
function ocupacion(array $reservas, string $fecha, int $minuto, int $duracion): int
{
    $total = 0;
    foreach ($reservas as $r) {
        if ($r['fecha'] !== $fecha || ($r['estado'] ?? '') === 'cancelada') {
            continue;
        }
        if (abs(aMinutos($r['hora']) - $minuto) < $duracion) {
            $total += (int) $r['personas'];
        }
    }
    return $total;
}

/**
 * Horas reservables de un día con las plazas libres en cada una.
 * @return list<array{hora: string, plazas: int}>
 */
function huecos(array $config, DateTimeImmutable $dia, array $reservas): array
{
    $fecha = $dia->format('Y-m-d');
    $ahora = new DateTimeImmutable();
    $esHoy = $ahora->format('Y-m-d') === $fecha;
    $limite = (int) $ahora->format('G') * 60 + (int) $ahora->format('i') + $config['antelacion'];

    $horas = [];
    foreach ($config['horario'][(int) $dia->format('w')] as [$ini, $fin]) {
        $desde = aMinutos($ini);
        $hasta = aMinutos($fin, true) - $config['margen'];
        for ($m = $desde; $m <= $hasta; $m += $config['intervalo']) {
            if ($esHoy && $m < $limite) {
                continue;
            }
            $libres = $config['aforo'] - ocupacion($reservas, $fecha, $m, $config['duracion']);
            $horas[] = ['hora' => aHora($m), 'plazas' => max(0, $libres)];
        }
    }
    return $horas;
}

function limpiar(string $valor, int $max = 200): string
{
    return mb_substr(trim(strip_tags($valor)), 0, $max);
}

/**
 * Límite de peticiones por IP guardado en data/limites.json.
 * Devuelve true si $clave ya ha hecho $max intentos en los últimos $ventana segundos
 * (y en ese caso no cuenta uno más).
 */
function limiteSuperado(array $config, string $clave, int $max, int $ventana): bool
{
    $file = dirname($config['fichero']) . '/limites.json';
    if (!is_dir(dirname($file))) {
        mkdir(dirname($file), 0750, true);
    }
    $id = hash('sha256', $clave . '|' . ($_SERVER['REMOTE_ADDR'] ?? ''));   // no se guarda la IP en claro
    $ahora = time();
    $fp = fopen($file, 'c+b');
    flock($fp, LOCK_EX);
    try {
        $datos = json_decode(stream_get_contents($fp) ?: '[]', true) ?: [];
        foreach ($datos as $k => $marcas) {
            $datos[$k] = array_values(array_filter((array) $marcas, fn ($t) => $ahora - (int) $t < 86400));
            if (!$datos[$k]) {
                unset($datos[$k]);
            }
        }
        $recientes = array_filter($datos[$id] ?? [], fn ($t) => $ahora - (int) $t < $ventana);
        $superado = count($recientes) >= $max;
        if (!$superado) {
            $datos[$id][] = $ahora;
        }
        ftruncate($fp, 0);
        rewind($fp);
        fwrite($fp, json_encode($datos));
        fflush($fp);
        return $superado;
    } finally {
        flock($fp, LOCK_UN);
        fclose($fp);
    }
}
