# Proyectos · AntonioooJ

Proyectos de demostración completos y funcionales, cada uno de un tipo distinto. Cada carpeta tiene su propio README con las instrucciones.

| Proyecto | Tipo | Tecnologías | Cómo verlo |
| --- | --- | --- | --- |
| [`restaurante-web`](./restaurante-web) | Web de negocio · hostelería | HTML, CSS, JavaScript, PHP | `php -S localhost:8000 router.php` |
| [`inmobiliaria-web`](./inmobiliaria-web) | Web de negocio · inmobiliaria | HTML, CSS, JavaScript | Abrir `index.html` |
| [`fivem-garaje`](./fivem-garaje) | Script de FiveM (GTA V RP) | Lua, NUI (HTML/CSS/JS), MySQL | Recurso de servidor FiveM |
| [`discord-bot`](./discord-bot) | Bot de Discord automatizado | Node.js, discord.js v14 | `npm install && npm start` |

## Qué demuestra cada uno

- **restaurante-web:** reservas con control de aforo real (concurrencia con `flock`), una API REST en PHP, un panel de administración con login y CSRF, y lógica de horarios.
- **inmobiliaria-web:** un buscador con estado en la URL, favoritos persistentes, cálculo financiero y una interfaz accesible con `<dialog>`, todo sin dependencias.
- **fivem-garaje:** arquitectura cliente/servidor con validación anti-exploit, una capa de compatibilidad ESX/QBCore y una interfaz NUI.
- **discord-bot:** una arquitectura modular, eventos, botones, persistencia y un planificador de tareas que sobrevive a reinicios.
