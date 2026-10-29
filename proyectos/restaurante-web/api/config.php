<?php
declare(strict_types=1);

// Configuración del restaurante (fuente de verdad para el servidor).

return [
    'nombre'      => 'Brasa & Sal',
    'email'       => 'reservas@brasaysal.test',   // recibe copia de cada reserva
    'aforo'       => 60,                         // comensales simultáneos
    'duracion'    => 120,                        // minutos que dura una mesa
    'intervalo'   => 30,                         // minutos entre horas de reserva
    'antelacion'  => 60,                         // minutos mínimos de antelación
    'margen'      => 90,                         // última reserva X min antes del cierre
    'max_dias'    => 60,                         // días máximos de antelación
    'max_grupo'   => 8,

    // 0 = domingo … 6 = sábado
    'horario' => [
        0 => [['13:00', '16:30']],
        1 => [],
        2 => [['13:00', '16:00'], ['20:00', '23:30']],
        3 => [['13:00', '16:00'], ['20:00', '23:30']],
        4 => [['13:00', '16:00'], ['20:00', '23:30']],
        5 => [['13:00', '16:30'], ['20:00', '00:00']],
        6 => [['13:00', '16:30'], ['20:00', '00:00']],
    ],

    // Contraseña del panel: define la variable de entorno ADMIN_PASSWORD.
    // Si no existe, el panel queda desactivado.
    'admin_password' => getenv('ADMIN_PASSWORD') ?: '',

    'zona_horaria' => 'Europe/Madrid',
    'fichero'      => __DIR__ . '/../data/reservas.json',
];
