-- Capa de compatibilidad: aísla las diferencias entre ESX y QBCore
-- (jugador, dinero y esquema de la tabla de vehículos).

Bridge = {}

local framework = Config.Framework
if framework == 'auto' then
    if GetResourceState('es_extended') == 'started' then
        framework = 'esx'
    elseif GetResourceState('qb-core') == 'started' then
        framework = 'qb'
    end
end

local ESX, QBCore
if framework == 'esx' then
    ESX = exports.es_extended:getSharedObject()
elseif framework == 'qb' then
    QBCore = exports['qb-core']:GetCoreObject()
else
    error('[aj_garage] No se encontró es_extended ni qb-core. Revisa Config.Framework.')
end

Bridge.framework = framework
print(('[aj_garage] Framework detectado: %s'):format(framework))

---@param src number
---@return string|nil
function Bridge.getIdentifier(src)
    if ESX then
        local xPlayer = ESX.GetPlayerFromId(src)
        return xPlayer and xPlayer.identifier
    end
    local player = QBCore.Functions.GetPlayer(src)
    return player and player.PlayerData.citizenid
end

---Cobra del banco. Devuelve true si se pudo cobrar.
---@param src number
---@param amount number
---@return boolean
function Bridge.removeBankMoney(src, amount)
    if ESX then
        local xPlayer = ESX.GetPlayerFromId(src)
        if not xPlayer or xPlayer.getAccount('bank').money < amount then return false end
        xPlayer.removeAccountMoney('bank', amount, 'aj_garage: depósito')
        return true
    end
    local player = QBCore.Functions.GetPlayer(src)
    return player ~= nil and player.Functions.RemoveMoney('bank', amount, 'aj_garage: depósito')
end

---@alias VehicleState 'garage' | 'out' | 'impound'
---@class OwnedVehicle
---@field plate string
---@field props table
---@field state VehicleState
---@field garage string|nil

---Todos los vehículos de un jugador con un formato común.
---@param identifier string
---@return OwnedVehicle[]
function Bridge.fetchVehicles(identifier)
    local list = {}

    if ESX then
        local rows = MySQL.query.await(
            'SELECT plate, vehicle, stored, parking, pound FROM owned_vehicles WHERE owner = ? AND type = ?',
            { identifier, 'car' }
        ) or {}
        for _, row in ipairs(rows) do
            local state = row.pound and 'impound' or (row.stored == 1 or row.stored == true) and 'garage' or 'out'
            list[#list + 1] = {
                plate  = row.plate,
                props  = json.decode(row.vehicle or '{}') or {},
                state  = state,
                garage = state == 'impound' and row.pound or row.parking,
            }
        end
        return list
    end

    local rows = MySQL.query.await(
        'SELECT plate, vehicle, mods, garage, state, fuel, engine, body FROM player_vehicles WHERE citizenid = ?',
        { identifier }
    ) or {}
    local states = { [0] = 'out', [1] = 'garage', [2] = 'impound' }
    for _, row in ipairs(rows) do
        local props = json.decode(row.mods or '{}') or {}
        props.model        = props.model or joaat(row.vehicle)
        props.fuelLevel    = props.fuelLevel or row.fuel
        props.engineHealth = props.engineHealth or row.engine
        props.bodyHealth   = props.bodyHealth or row.body
        list[#list + 1] = {
            plate  = row.plate,
            props  = props,
            state  = states[row.state] or 'out',
            garage = row.garage,
        }
    end
    return list
end

---Cambia el estado de un vehículo. Devuelve true si se actualizó alguna fila.
---@param identifier string
---@param plate string
---@param state VehicleState
---@param location string|nil garaje o depósito
---@param props table|nil propiedades a guardar (solo al guardar en garaje)
---@return boolean
function Bridge.setState(identifier, plate, state, location, props)
    local affected

    if ESX then
        if state == 'garage' then
            affected = MySQL.update.await(
                'UPDATE owned_vehicles SET stored = 1, parking = ?, pound = NULL, vehicle = ? WHERE owner = ? AND plate = ?',
                { location, json.encode(props), identifier, plate }
            )
        elseif state == 'impound' then
            affected = MySQL.update.await(
                'UPDATE owned_vehicles SET stored = 0, pound = ? WHERE owner = ? AND plate = ?',
                { location, identifier, plate }
            )
        else
            affected = MySQL.update.await(
                'UPDATE owned_vehicles SET stored = 0, pound = NULL WHERE owner = ? AND plate = ?',
                { identifier, plate }
            )
        end
        return (affected or 0) > 0
    end

    if state == 'garage' then
        affected = MySQL.update.await(
            'UPDATE player_vehicles SET state = 1, garage = ?, mods = ?, fuel = ?, engine = ?, body = ? WHERE citizenid = ? AND plate = ?',
            {
                location, json.encode(props),
                math.floor(props.fuelLevel or 100), math.floor(props.engineHealth or 1000), math.floor(props.bodyHealth or 1000),
                identifier, plate,
            }
        )
    elseif state == 'impound' then
        affected = MySQL.update.await(
            'UPDATE player_vehicles SET state = 2, garage = ? WHERE citizenid = ? AND plate = ?',
            { location, identifier, plate }
        )
    else
        affected = MySQL.update.await(
            'UPDATE player_vehicles SET state = 0 WHERE citizenid = ? AND plate = ?',
            { identifier, plate }
        )
    end
    return (affected or 0) > 0
end
