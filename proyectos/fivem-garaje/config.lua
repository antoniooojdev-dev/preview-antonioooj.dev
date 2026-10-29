Config = {}

-- 'auto' detecta es_extended o qb-core. También puedes forzar 'esx' o 'qb'.
Config.Framework = 'auto'

-- Si es true, cualquier garaje muestra todos tus vehículos guardados.
-- Si es false, cada vehículo solo sale del garaje donde se guardó.
Config.SharedGarages = false

-- Precio por sacar un vehículo del depósito (se cobra del banco).
Config.ImpoundFee = 500

-- Distancia máxima (servidor) para aceptar acciones. Evita exploits por triggers.
Config.MaxDistance = 15.0

-- Tecla de interacción (38 = E)
Config.InteractKey = 38

Config.Blips = {
    garage  = { sprite = 357, color = 3, scale = 0.7 },
    impound = { sprite = 68,  color = 1, scale = 0.7 },
}

Config.Garages = {
    legion = {
        label  = 'Parking Legion Square',
        coords = vec3(215.8, -810.1, 30.7),
        spawns = {
            vec4(229.7, -800.1, 30.6, 157.8),
            vec4(232.3, -795.0, 30.6, 157.8),
            vec4(234.8, -789.9, 30.6, 157.8),
        },
    },
    pillbox = {
        label  = 'Parking Pillbox Hill',
        coords = vec3(273.9, -344.4, 44.9),
        spawns = {
            vec4(289.4, -340.3, 44.9, 160.0),
            vec4(285.9, -337.7, 44.9, 160.0),
        },
    },
    sandy = {
        label  = 'Garaje Sandy Shores',
        coords = vec3(1737.5, 3710.2, 34.1),
        spawns = {
            vec4(1737.8, 3719.0, 34.0, 21.0),
        },
    },
}

Config.Impounds = {
    lspd = {
        label  = 'Depósito municipal',
        coords = vec3(409.2, -1623.1, 29.3),
        spawns = {
            vec4(401.8, -1647.4, 29.3, 320.0),
            vec4(404.4, -1650.2, 29.3, 320.0),
        },
    },
}

-- Se llama en el cliente al sacar un vehículo. Adáptalo a tu sistema de llaves.
Config.GiveKeys = function(plate, vehicle)
    if GetResourceState('qb-vehiclekeys') == 'started' then
        TriggerEvent('vehiclekeys:client:SetOwner', plate)
    elseif GetResourceState('wasabi_carlock') == 'started' then
        exports.wasabi_carlock:GiveKey(plate)
    end
end

Config.Locale = {
    open_garage    = '[E] Abrir garaje',
    open_impound   = '[E] Abrir depósito',
    store_vehicle  = '[E] Guardar vehículo',
    stored         = 'Vehículo guardado en el garaje',
    not_owner      = 'Este vehículo no es tuyo',
    not_driver     = 'Tienes que ir al volante',
    no_space       = 'No hay sitio libre para sacar el vehículo',
    taken_out      = 'Has sacado tu vehículo',
    no_money       = 'No tienes suficiente dinero en el banco',
    impound_paid   = 'Has pagado $%s en el depósito',
    error          = 'No se pudo completar la acción',
}
