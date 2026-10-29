local L = Config.Locale
local current = nil   -- { kind = 'garage'|'impound', id = string } del menú abierto
local uiOpen = false

---------------------------------------------------------------------------
-- Utilidades
---------------------------------------------------------------------------
local function notify(msg, kind)
    lib.notify({ title = 'Garaje', description = msg, type = kind or 'inform' })
end

local function vehicleLabel(model)
    local name = GetDisplayNameFromVehicleModel(model)
    local label = GetLabelText(name)
    return label ~= 'NULL' and label or name
end

---Primer hueco libre de la lista de spawns
local function freeSpawn(spawns)
    for _, s in ipairs(spawns) do
        if not IsAnyVehicleNearPoint(s.x, s.y, s.z, 2.5) then return s end
    end
end

---------------------------------------------------------------------------
-- Interfaz NUI
---------------------------------------------------------------------------
local function closeUI()
    if not uiOpen then return end
    uiOpen = false
    current = nil
    SetNuiFocus(false, false)
    SendNUIMessage({ action = 'close' })
end

local function openUI(kind, id)
    local location = kind == 'garage' and Config.Garages[id] or Config.Impounds[id]
    local data = lib.callback.await('aj_garage:getVehicles', false, kind, id)
    if not data then return notify(L.error, 'error') end

    for _, v in ipairs(data.vehicles) do
        v.label = vehicleLabel(v.model)
    end

    current = { kind = kind, id = id }
    uiOpen = true
    SetNuiFocus(true, true)
    SendNUIMessage({
        action   = 'open',
        kind     = kind,
        title    = location.label,
        fee      = data.fee,
        vehicles = data.vehicles,
    })
end

RegisterNUICallback('close', function(_, cb)
    closeUI()
    cb(true)
end)

RegisterNUICallback('takeOut', function(data, cb)
    if not current then return cb(false) end
    local kind, id = current.kind, current.id
    local location = kind == 'garage' and Config.Garages[id] or Config.Impounds[id]

    -- comprobamos el hueco ANTES de pedir el coche al servidor
    local spawn = freeSpawn(location.spawns)
    if not spawn then
        notify(L.no_space, 'error')
        return cb(false)
    end

    local ok, result = lib.callback.await('aj_garage:takeOut', false, kind, id, data.plate)
    if not ok then
        notify(result or L.error, 'error')
        return cb(false)
    end

    closeUI()
    cb(true)

    local props = result
    local model = lib.requestModel(props.model, 10000)
    local vehicle = CreateVehicle(model, spawn.x, spawn.y, spawn.z, spawn.w, true, false)
    SetModelAsNoLongerNeeded(model)

    SetVehicleOnGroundProperly(vehicle)
    lib.setVehicleProperties(vehicle, props)
    SetVehicleNumberPlateText(vehicle, props.plate)
    SetVehicleHasBeenOwnedByPlayer(vehicle, true)
    SetEntityAsMissionEntity(vehicle, true, true)
    TaskWarpPedIntoVehicle(cache.ped, vehicle, -1)
    Config.GiveKeys(props.plate, vehicle)

    if kind == 'impound' and Config.ImpoundFee > 0 then
        notify(L.impound_paid:format(Config.ImpoundFee), 'success')
    else
        notify(L.taken_out, 'success')
    end
end)

---------------------------------------------------------------------------
-- Guardar vehículo
---------------------------------------------------------------------------
local function storeVehicle(id)
    local vehicle = cache.vehicle
    if not vehicle then return end
    if cache.seat ~= -1 then return notify(L.not_driver, 'error') end

    local props = lib.getVehicleProperties(vehicle)
    local ok, err = lib.callback.await('aj_garage:store', false, id, NetworkGetNetworkIdFromEntity(vehicle), props)
    if ok then
        notify(L.stored, 'success')
    else
        notify(err or L.error, 'error')
    end
end

---------------------------------------------------------------------------
-- Blips y puntos de interacción
---------------------------------------------------------------------------
local function createBlip(coords, cfg, label)
    local blip = AddBlipForCoord(coords.x, coords.y, coords.z)
    SetBlipSprite(blip, cfg.sprite)
    SetBlipColour(blip, cfg.color)
    SetBlipScale(blip, cfg.scale)
    SetBlipAsShortRange(blip, true)
    BeginTextCommandSetBlipName('STRING')
    AddTextComponentSubstringPlayerName(label)
    EndTextCommandSetBlipName(blip)
end

local function createPoint(kind, id, location)
    createBlip(location.coords, Config.Blips[kind], location.label)

    lib.points.new({
        coords = location.coords,
        distance = 10.0,
        nearby = function(self)
            DrawMarker(36, self.coords.x, self.coords.y, self.coords.z, 0, 0, 0, 0, 0, 0, 1.0, 1.0, 1.0,
                255, 255, 255, 140, false, true, 2, false, nil, nil, false)

            local inVehicle = cache.vehicle ~= false and cache.vehicle ~= nil
            local reach = inVehicle and 6.0 or 2.0
            local canInteract = self.currentDistance < reach and not uiOpen
                and (not inVehicle or kind == 'garage')

            if canInteract then
                local text = inVehicle and L.store_vehicle or (kind == 'garage' and L.open_garage or L.open_impound)
                if not self.textShown then
                    lib.showTextUI(text)
                    self.textShown = true
                end
                if IsControlJustReleased(0, Config.InteractKey) then
                    lib.hideTextUI()
                    self.textShown = false
                    if inVehicle then storeVehicle(id) else openUI(kind, id) end
                end
            elseif self.textShown then
                lib.hideTextUI()
                self.textShown = false
            end
        end,
        onExit = function(self)
            if self.textShown then
                lib.hideTextUI()
                self.textShown = false
            end
        end,
    })
end

CreateThread(function()
    for id, garage in pairs(Config.Garages) do createPoint('garage', id, garage) end
    for id, impound in pairs(Config.Impounds) do createPoint('impound', id, impound) end
end)

AddEventHandler('onResourceStop', function(resource)
    if resource == GetCurrentResourceName() then closeUI() end
end)
