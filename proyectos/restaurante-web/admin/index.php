<?php
declare(strict_types=1);

// Panel de reservas: login, listado por día y cancelación.

require __DIR__ . '/../api/lib.php';

session_start([
    'cookie_httponly' => true,
    'cookie_samesite' => 'Strict',
    'cookie_secure'   => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
    'use_strict_mode' => true,
]);

// Nadie puede meter el panel en un iframe (clickjacking) ni reinterpretar sus respuestas
header('X-Frame-Options: DENY');
header("Content-Security-Policy: frame-ancestors 'none'; form-action 'self'; base-uri 'self'");
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: same-origin');
header('Cache-Control: no-store');

$e = static fn (string $s): string => htmlspecialchars($s, ENT_QUOTES, 'UTF-8');

if (empty($_SESSION['csrf'])) {
    $_SESSION['csrf'] = bin2hex(random_bytes(16));
}

$panelActivo = $config['admin_password'] !== '';
$error = '';

// ── acciones POST ──────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!hash_equals($_SESSION['csrf'], (string) ($_POST['csrf'] ?? ''))) {
        http_response_code(403);
        exit('Token no válido');
    }

    $accion = $_POST['accion'] ?? '';

    if ($accion === 'login' && $panelActivo) {
        // pequeña pausa + máximo 10 intentos por IP cada 15 minutos (fuerza bruta)
        usleep(400_000);
        if (limiteSuperado($config, 'login', 10, 900)) {
            $error = 'Demasiados intentos. Espera 15 minutos.';
        } elseif (hash_equals($config['admin_password'], (string) ($_POST['password'] ?? ''))) {
            session_regenerate_id(true);
            $_SESSION['admin'] = true;
        } else {
            $error = 'Contraseña incorrecta';
        }
    }

    if ($accion === 'logout') {
        $_SESSION = [];
        session_destroy();
        header('Location: ./');
        exit;
    }

    if ($accion === 'cancelar' && !empty($_SESSION['admin'])) {
        $codigo = (string) ($_POST['codigo'] ?? '');
        modificarReservas($config, function (array &$reservas) use ($codigo) {
            foreach ($reservas as &$r) {
                if ($r['codigo'] === $codigo) {
                    $r['estado'] = 'cancelada';
                }
            }
        });
        header('Location: ./?fecha=' . urlencode((string) ($_POST['fecha'] ?? '')));
        exit;
    }
}

$logueado = !empty($_SESSION['admin']);

// ── datos del día ──────────────────────────────────
$dia = fechaValida((string) ($_GET['fecha'] ?? '')) ?? new DateTimeImmutable('today');
$fecha = $dia->format('Y-m-d');
$reservasDia = [];
$totalPersonas = 0;

if ($logueado) {
    $reservasDia = array_values(array_filter(leerReservas($config), fn ($r) => $r['fecha'] === $fecha));
    usort($reservasDia, fn ($a, $b) => strcmp($a['hora'], $b['hora']));
    foreach ($reservasDia as $r) {
        if ($r['estado'] !== 'cancelada') {
            $totalPersonas += (int) $r['personas'];
        }
    }
}
?>
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex">
  <title>Panel de reservas · <?= $e($config['nombre']) ?></title>
  <style>
    :root { --bg:#f6f6f4; --card:#fff; --fg:#1d1d1b; --muted:#6b6b66; --line:#e5e4df; --accent:#c4501f; }
    * { box-sizing: border-box; margin: 0; }
    body { font: 15px/1.5 system-ui, sans-serif; background: var(--bg); color: var(--fg); padding: 2rem 1rem; }
    .wrap { max-width: 60rem; margin: auto; }
    header { display: flex; flex-wrap: wrap; gap: 1rem; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
    h1 { font-size: 1.3rem; }
    .card { background: var(--card); border: 1px solid var(--line); border-radius: 8px; padding: 1.25rem; }
    .login { max-width: 22rem; margin: 10vh auto; display: grid; gap: .75rem; }
    input, button { font: inherit; padding: .55rem .8rem; border-radius: 6px; border: 1px solid var(--line); }
    button { background: var(--fg); color: #fff; border-color: var(--fg); cursor: pointer; }
    button.link { background: none; color: var(--muted); border: 0; padding: 0; text-decoration: underline; }
    .error { color: #b42318; font-size: .9rem; }
    .toolbar { display: flex; flex-wrap: wrap; gap: .75rem; align-items: center; margin-bottom: 1rem; }
    .kpis { display: flex; gap: 2rem; margin-left: auto; color: var(--muted); }
    .kpis strong { color: var(--fg); font-size: 1.2rem; }
    table { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; padding: .7rem .5rem; border-bottom: 1px solid var(--line); vertical-align: top; }
    th { font-size: .75rem; text-transform: uppercase; letter-spacing: .05em; color: var(--muted); }
    tr.cancelada td { color: var(--muted); text-decoration: line-through; }
    .notes { font-size: .85rem; color: var(--muted); }
    .empty { text-align: center; color: var(--muted); padding: 2rem; }
    .scroll { overflow-x: auto; }
  </style>
</head>
<body>
<div class="wrap">

<?php if (!$panelActivo): ?>
  <div class="card login">
    <h1>Panel desactivado</h1>
    <p>Define la variable de entorno <code>ADMIN_PASSWORD</code> para activarlo.</p>
  </div>

<?php elseif (!$logueado): ?>
  <form method="post" class="card login">
    <h1>Panel de reservas</h1>
    <input type="hidden" name="csrf" value="<?= $e($_SESSION['csrf']) ?>">
    <input type="hidden" name="accion" value="login">
    <label for="pw">Contraseña</label>
    <input id="pw" type="password" name="password" autocomplete="current-password" required autofocus>
    <?php if ($error): ?><p class="error"><?= $e($error) ?></p><?php endif; ?>
    <button>Entrar</button>
  </form>

<?php else: ?>
  <header>
    <h1>Reservas · <?= $e($config['nombre']) ?></h1>
    <form method="post">
      <input type="hidden" name="csrf" value="<?= $e($_SESSION['csrf']) ?>">
      <input type="hidden" name="accion" value="logout">
      <button class="link">Cerrar sesión</button>
    </form>
  </header>

  <div class="card">
    <form class="toolbar" method="get">
      <a href="?fecha=<?= $dia->modify('-1 day')->format('Y-m-d') ?>">←</a>
      <input type="date" name="fecha" value="<?= $e($fecha) ?>" onchange="this.form.submit()">
      <a href="?fecha=<?= $dia->modify('+1 day')->format('Y-m-d') ?>">→</a>
      <div class="kpis">
        <span><strong><?= count(array_filter($reservasDia, fn ($r) => $r['estado'] !== 'cancelada')) ?></strong> reservas</span>
        <span><strong><?= $totalPersonas ?></strong> comensales</span>
      </div>
    </form>

    <div class="scroll">
    <table>
      <thead>
        <tr><th>Hora</th><th>Pax</th><th>Cliente</th><th>Contacto</th><th>Código</th><th></th></tr>
      </thead>
      <tbody>
      <?php if (!$reservasDia): ?>
        <tr><td colspan="6" class="empty">No hay reservas este día.</td></tr>
      <?php endif; ?>
      <?php foreach ($reservasDia as $r): ?>
        <tr class="<?= $e($r['estado']) ?>">
          <td><strong><?= $e($r['hora']) ?></strong></td>
          <td><?= (int) $r['personas'] ?></td>
          <td>
            <?= $e($r['nombre']) ?>
            <?php if ($r['comentarios']): ?><div class="notes"><?= $e($r['comentarios']) ?></div><?php endif; ?>
          </td>
          <td><a href="tel:<?= $e($r['telefono']) ?>"><?= $e($r['telefono']) ?></a><br><span class="notes"><?= $e($r['email']) ?></span></td>
          <td><code><?= $e($r['codigo']) ?></code></td>
          <td>
            <?php if ($r['estado'] !== 'cancelada'): ?>
            <form method="post" onsubmit="return confirm('¿Cancelar la reserva <?= $e($r['codigo']) ?>?')">
              <input type="hidden" name="csrf" value="<?= $e($_SESSION['csrf']) ?>">
              <input type="hidden" name="accion" value="cancelar">
              <input type="hidden" name="codigo" value="<?= $e($r['codigo']) ?>">
              <input type="hidden" name="fecha" value="<?= $e($fecha) ?>">
              <button class="link">Cancelar</button>
            </form>
            <?php endif; ?>
          </td>
        </tr>
      <?php endforeach; ?>
      </tbody>
    </table>
    </div>
  </div>
<?php endif; ?>

</div>
</body>
</html>
