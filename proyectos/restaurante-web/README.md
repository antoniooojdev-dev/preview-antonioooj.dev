# Brasa & Sal — web de restaurante

Web para un restaurante con **carta dinámica**, **estado "abierto ahora"** y un **sistema de reservas con control de aforo** en PHP, sin base de datos ni dependencias.

## Funciones

- Carta por categorías con filtro de alérgenos y etiqueta vegetariana.
- Indicador en vivo de abierto/cerrado y próxima apertura.
- Horario con el día actual resaltado.
- Reservas:
  - Las horas disponibles se calculan según el horario, la antelación mínima y el margen de cierre.
  - Muestra las **plazas libres** por hora, teniendo en cuenta la duración de cada mesa.
  - La comprobación y el guardado son **atómicos** (`flock`), así que dos reservas simultáneas no superan el aforo.
  - Validación en cliente y servidor, honeypot anti-spam y email de confirmación.
- **Panel de administración** (`/admin`) con login, CSRF, listado por día, total de comensales y cancelación.
- Responsive y accesible (pestañas ARIA, foco visible, `aria-live`).

## Estructura

```
restaurante-web/
├── index.html
├── css/styles.css
├── js/
│   ├── carta.js            datos: carta, alérgenos y horario
│   └── main.js             interfaz: carta, horario, reservas
├── api/
│   ├── config.php          aforo, horario, duración de mesa…
│   ├── lib.php             utilidades: huecos, ocupación, ficheros con bloqueo
│   ├── disponibilidad.php  GET  → horas y plazas libres de un día
│   └── reservar.php        POST → crea la reserva
├── admin/index.php         panel de reservas
├── data/                   reservas.json (se crea solo, acceso bloqueado)
└── router.php              router para `php -S`
```

## Ejecutar

Necesitas PHP 8.1 o superior.

```bash
# Windows PowerShell
$env:ADMIN_PASSWORD="una-contraseña-segura"; php -S localhost:8000 router.php

# macOS / Linux
ADMIN_PASSWORD="una-contraseña-segura" php -S localhost:8000 router.php
```

- Web: http://localhost:8000
- Panel: http://localhost:8000/admin/

Si abres `index.html` directamente sin PHP, la carta y el horario funcionan, pero las reservas no se pueden enviar.

## API

```http
GET /api/disponibilidad.php?fecha=2026-10-24

200 { "fecha": "2026-10-24", "horas": [{ "hora": "13:00", "plazas": 52 }, …] }
```

```http
POST /api/reservar.php
Content-Type: application/json

{ "nombre": "Ana", "telefono": "600000000", "email": "ana@mail.com",
  "fecha": "2026-10-24", "hora": "21:00", "personas": 4 }

201 { "ok": true, "codigo": "BS-7K2Q" }
409 { "ok": false, "error": "Solo quedan 2 plazas a las 21:00." }
```

## En producción

- El envío de emails usa `mail()`. En un hosting real conviene cambiarlo por SMTP (por ejemplo, PHPMailer).
- Si el volumen de reservas es alto, el JSON se puede sustituir por MySQL o SQLite sin tocar la interfaz.
