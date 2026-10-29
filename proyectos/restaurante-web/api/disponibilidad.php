<?php
declare(strict_types=1);

// GET api/disponibilidad.php?fecha=2026-10-24
// → { "fecha": "2026-10-24", "horas": [ { "hora": "13:00", "plazas": 52 }, … ] }

require __DIR__ . '/lib.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    responder(['error' => 'Método no permitido'], 405);
}

$dia = fechaValida((string) ($_GET['fecha'] ?? ''));
if (!$dia) {
    responder(['error' => 'Fecha no válida'], 422);
}

$hoy = new DateTimeImmutable('today');
if ($dia < $hoy || $dia > $hoy->modify("+{$config['max_dias']} days")) {
    responder(['fecha' => $dia->format('Y-m-d'), 'horas' => []]);
}

responder([
    'fecha' => $dia->format('Y-m-d'),
    'horas' => huecos($config, $dia, leerReservas($config)),
]);
