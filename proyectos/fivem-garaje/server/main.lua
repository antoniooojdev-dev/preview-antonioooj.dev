-- Lógica del servidor. El cliente nunca decide nada importante:
-- propiedad, distancia, estado y cobros se comprueban aquí.

local L = Config.Locale

local function trim(s)
    return (s:gsub('^%s*(.-)%s*$', '%1'))
end

---@param kind 'garage'|'impound'
---@param id string
local function getLocation(kind, id)
    if kind == 'garage' then return Config.Garages[id] end
    if kind == 'impound' then return Config.Impounds[id] end
end

---¿Está el jugador realmente junto a ese garaje/depósito?
local function isNear(src, location)
    local ped = GetPlayerPed(src)
    if ped == 0 then return false end
    return #(GetEntityCoords(ped) - location.coords) <= Config.MaxDistance
end

---Matrículas de todos los vehículos que existen ahora mismo en el mundo (OneSync).
local function platesInWorld()
    local plates = {}
    for _, vehicle in ipairs(GetAllVehicles()) do
        plates[trim(GetVehicleNumberPlateText(vehicle))] = vehicle
    end
    return plates
end

---Un vehículo puede salir de este sitio?
---@param vehicle OwnedVehicle
local function canTakeOut(vehicle, kind, id, world)
    if kind == 'garage' then
        return vehicle.state == 'garage' and (Config.SharedGarages or vehicle.garage == id or vehicle.garage == nil)
    end
    -- depósito: incautados, o "fuera" pero que ya no existen en el mundo (destruidos, desaparecidos…)
    return vehicle.state == 'impound' or (vehicle.state == 'out' and not world[trim(vehicle.plate)])
end

---Mismo modelo, aunque uno venga con signo (GetEntityModel) y otro sin él (joaat / base de datos).
---Si no hay modelo guardado no se puede comprobar y se acepta.
local function sameModel(stored, current)
    stored, current = math.tointeger(tonumber(stored)), math.tointeger(tonumber(current))
    if not stored then return true end
    return current ~= nil and (stored & 0xFFFFFFFF) == (current & 0xFFFFFFFF)
end

local function findVehicle(identifier, plate)
    for _, v in ipairs(Bridge.fetchVehicles(identifier)) do
        if trim(v.plate) == trim(plate) then return v end
    end
end

-- Rate limit sencillo por jugador para callbacks que tocan la base de datos
local lastAction = {}
local function throttled(src)
    local now = GetGameTimer()
    if lastAction[src] and now - lastAction[src] < 750 then return true end
    lastAction[src] = now
    return false
end
AddEventHandler('playerDropped', function() lastAction[source] = nil end)

---------------------------------------------------------------------------
-- Listado de vehículos para la interfaz
---------------------------------------------------------------------------
lib.callback.register('aj_garage:getVehicles', function(src, kind, id)
    local location = getLocation(kind, id)
    if not location or not isNear(src, location) then return nil end

    local identifier = Bridge.getIdentifier(src)
    if not identifier then return nil end

    local world = platesInWorld()
    local result = {}
    for _, v in ipairs(Bridge.fetchVehicles(identifier)) do
        local available = canTakeOut(v, kind, id, world)
        -- en un garaje mostramos también los de otros garajes/fuera (deshabilitados) como referencia
        if available or kind == 'garage' then
            result[#result + 1] = {
                plate     = trim(v.plate),
                model     = v.props.model,
                fuel      = v.props.fuelLevel or 100,
                engine    = v.props.engineHealth or 1000,
                body      = v.props.bodyHealth or 1000,
                state     = v.state,
                garage    = v.garage and Config.Garages[v.garage] and Config.Garages[v.garage].label or v.garage,
                available = available,
            }
        end
    end

    table.sort(result, function(a, b)
        if a.available ~= b.available then return a.available end
        return a.plate < b.plate
    end)

    return { vehicles = result, fee = kind == 'impound' and Config.ImpoundFee or 0 }
end)

---------------------------------------------------------------------------
-- Sacar vehículo → devuelve sus propiedades para que el cliente lo cree
---------------------------------------------------------------------------
lib.callback.register('aj_garage:takeOut', function(src, kind, id, plate)
    if type(plate) ~= 'string' or throttled(src) then return false end

    local location = getLocation(kind, id)
    if not location or not isNear(src, location) then return false end

    local identifier = Bridge.getIdentifier(src)
    local vehicle = identifier and findVehicle(identifier, plate)
    if not vehicle then
        return false, L.not_owner
    end

    if not canTakeOut(vehicle, kind, id, platesInWorld()) then
        return false, L.error
    end

    -- primero se marca como "fuera" (evita duplicar el coche con dos peticiones a la vez)…
    if not Bridge.setState(identifier, vehicle.plate, 'out') then
        return false, L.error
    end

    -- …y después se cobra; si no hay dinero, se deja como estaba
    if kind == 'impound' and Config.ImpoundFee > 0 and not Bridge.removeBankMoney(src, Config.ImpoundFee) then
        Bridge.setState(identifier, vehicle.plate, vehicle.state, vehicle.garage)
        return false, L.no_money
    end

    vehicle.props.plate = trim(vehicle.plate)
    return true, vehicle.props
end)

---------------------------------------------------------------------------
-- Guardar vehículo
---------------------------------------------------------------------------
lib.callback.register('aj_garage:store', function(src, id, netId, props)
    if type(props) ~= 'table' or throttled(src) then return false end

    local location = Config.Garages[id]
    if not location or not isNear(src, location) then return false end

    local entity = NetworkGetEntityFromNetworkId(netId)
    if entity == 0 or not DoesEntityExist(entity) or GetEntityType(entity) ~= 2 then
        return false, L.error
    end

    -- el que guarda tiene que ir al volante
    if GetPedInVehicleSeat(entity, -1) ~= GetPlayerPed(src) then
        return false, L.not_driver
    end

    -- la matrícula se lee del servidor, no de lo que mande el cliente
    local plate = trim(GetVehicleNumberPlateText(entity))
    local identifier = Bridge.getIdentifier(src)
    local vehicle = identifier and findVehicle(identifier, plate)
    if not vehicle then
        return false, L.not_owner
    end

    -- Solo se guarda un coche que esté "fuera": si está en un garaje o en el depósito, el que
    -- llega es una copia con la matrícula clonada (o una forma de saltarse la tasa del depósito)
    if vehicle.state ~= 'out' then
        return false, L.error
    end

    -- Y tiene que ser el mismo modelo: si no, alguien podría crear un deportivo con trampas,
    -- ponerle la matrícula de su utilitario y guardarlo para quedárselo
    if not sameModel(vehicle.props.model, GetEntityModel(entity)) then
        print(('[aj_garage] %s intentó guardar un modelo distinto con la matrícula %s'):format(GetPlayerName(src), plate))
        return false, L.not_owner
    end

    -- el modelo tampoco se acepta del cliente
    props.plate = plate
    props.model = GetEntityModel(entity)

    -- el estado del coche se lee del servidor: así un cliente modificado no puede guardar
    -- un coche destrozado como nuevo (reparación gratis) ni llenarse el depósito
    props.engineHealth = GetVehicleEngineHealth(entity)
    props.bodyHealth = GetVehicleBodyHealth(entity)
    local fuel = tonumber(props.fuelLevel) or 100
    props.fuelLevel = math.max(0.0, math.min(100.0, fuel))
    local stateFuel = Entity(entity).state.fuel          -- la mayoría de scripts de gasolina lo guardan aquí
    if type(stateFuel) == 'number' then props.fuelLevel = math.max(0.0, math.min(100.0, stateFuel)) end

    -- que no se pueda inflar la base de datos con propiedades enormes
    local encoded = json.encode(props)
    if not encoded or #encoded > 16000 then
        return false, L.error
    end

    if not Bridge.setState(identifier, vehicle.plate, 'garage', id, props) then
        return false, L.error
    end

    DeleteEntity(entity)
    return true
end)

---------------------------------------------------------------------------
-- Export para que otros scripts (policía, grúa…) manden un coche al depósito
---------------------------------------------------------------------------
---@param plate string
---@param impoundId string|nil
exports('impoundVehicle', function(plate, impoundId)
    plate = trim(plate)
    impoundId = impoundId or next(Config.Impounds)

    local column = Bridge.framework == 'esx' and 'owner' or 'citizenid'
    local tbl = Bridge.framework == 'esx' and 'owned_vehicles' or 'player_vehicles'
    local owner = MySQL.scalar.await(('SELECT %s FROM %s WHERE plate = ?'):format(column, tbl), { plate })
    if not owner then return false end

    local entity = platesInWorld()[plate]
    if entity then DeleteEntity(entity) end

    return Bridge.setState(owner, plate, 'impound', impoundId)
end)
