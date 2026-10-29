# Demos jugables del Pack vehículos

Cada carpeta (`dealer`, `fuel`, `speedo`) es la **NUI real** del recurso de FiveM
(`index.html`, `style.css`, `script.js` copiados tal cual de `my_dealership`, `my_fuel` y
`my_speedo`) con tres añadidos:

- `../bridge.js` — sustituye a Lua: intercepta los `fetch('https://my_xxx/...')` de la NUI y
  responde con lo que diga la escena (`NUI.on('callback', fn)`), y `NUI.send()` hace de `SendNUIMessage`.
- `../scene-common.*` — controles en pantalla, cartera, avisos y la capa «Haz clic para jugar».
- `scene.js` / `scene.css` — el «juego» simulado (fondo, estados y reglas del cliente Lua).

Para volver a copiar la NUI desde el servidor después de cambiarla:

```
node tools/sync-fivem-live.mjs
```
