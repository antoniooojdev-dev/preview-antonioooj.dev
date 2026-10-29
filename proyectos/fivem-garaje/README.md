# aj_garage — garajes y depósito para FiveM

Sistema de garajes con **interfaz NUI propia**, **depósito de pago** y **validación completa en servidor**. Compatible con **ESX** y **QBCore**: el framework se detecta solo.

## Funciones

- Varios garajes y depósitos configurables, cada uno con blip, marcador y varios puntos de salida.
- Interfaz con buscador por modelo o matrícula y barras de combustible, motor y carrocería.
- Al guardar un vehículo se conservan todas sus propiedades (tuning, daños, combustible) con `lib.getVehicleProperties`.
- **Depósito inteligente:** recupera los coches incautados **y también los que están "fuera" pero ya no existen** en el mundo (destruidos o desaparecidos), cobrando una tasa del banco.
- Garajes compartidos o por ubicación (`Config.SharedGarages`).
- Comprueba que haya hueco libre antes de sacar un coche.
- Export `impoundVehicle(plate, impoundId)` para scripts de policía o grúa.
- Llaves: integración con `qb-vehiclekeys` y `wasabi_carlock`, ampliable en `Config.GiveKeys`.

## Seguridad (anti-exploit)

El cliente solo pide. **Todo se decide en el servidor**:

| Comprobación | Dónde |
| --- | --- |
| El jugador está realmente junto al garaje (`Config.MaxDistance`) | `isNear()` |
| El vehículo pertenece al jugador | `findVehicle()` |
| La matrícula y el modelo se leen de la entidad, **no del cliente** | callback `store` |
| Solo guarda quien va al volante | `GetPedInVehicleSeat` |
| Se marca como "fuera" **antes** de cobrar, para evitar duplicados | callback `takeOut` |
| Límite de peticiones por jugador (750 ms) | `throttled()` |

## Estructura

```
fivem-garaje/
├── fxmanifest.lua
├── config.lua          garajes, depósitos, precios, textos, llaves
├── client/main.lua     blips, puntos, NUI, crear y guardar vehículos
├── server/
│   ├── bridge.lua      capa ESX / QBCore (jugador, dinero, SQL)
│   └── main.lua        callbacks validados y export
├── html/               interfaz NUI (HTML, CSS y JS sin dependencias)
└── sql/install.sql
```

## Instalación

1. Dependencias: [ox_lib](https://github.com/overextended/ox_lib), [oxmysql](https://github.com/overextended/oxmysql) y `es_extended` o `qb-core`.
2. Copia la carpeta a `resources/[aj]/aj_garage`.
3. **Solo en ESX:** ejecuta `sql/install.sql`.
4. En `server.cfg`, después del framework:
   ```cfg
   ensure ox_lib
   ensure oxmysql
   ensure aj_garage
   ```

## Uso desde otros recursos

```lua
-- servidor: mandar un coche al depósito (p. ej. desde un script de policía)
exports.aj_garage:impoundVehicle('ABC 123', 'lspd')
```

## Añadir un garaje

```lua
Config.Garages.paleto = {
    label  = 'Garaje Paleto Bay',
    coords = vec3(105.4, 6613.5, 32.4),
    spawns = { vec4(110.8, 6607.4, 31.9, 265.0) },
}
```
