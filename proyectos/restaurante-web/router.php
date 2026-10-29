<?php
// Router para el servidor de desarrollo de PHP:  php -S localhost:8000 router.php
// Bloquea el acceso directo a /data (donde se guardan las reservas).

$ruta = rawurldecode((string) parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));

// Se compara la ruta real del archivo, no el texto de la URL: así no se cuela con
// "/DATA/…" (Windows no distingue mayúsculas), "//data/…" o "/./data/…".
$normal = strtolower(preg_replace('#/+#', '/', str_replace('\\', '/', $ruta)));
$real = realpath(__DIR__ . $ruta);
$dataDir = realpath(__DIR__ . '/data');
$enData = $dataDir && $real && str_starts_with(strtolower($real), strtolower($dataDir));

if ($enData || preg_match('#(^|/)(\.\.?/)*data(/|$)#', $normal) || preg_match('#/\.(env|git|ht)#', $normal)) {
    http_response_code(403);
    exit('Prohibido');
}

return false; // sirve el archivo solicitado tal cual
