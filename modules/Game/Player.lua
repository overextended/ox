--[[
    https://github.com/overextended/ox_lib

    This file is licensed under LGPL-3.0 or higher <https://www.gnu.org/licenses/lgpl-3.0.en.html>

    Copyright © 2025 Linden <https://github.com/thelindat>
]]

---@meta Ox.Game.Player

local Ped = require 'Ox.Game.Ped'
local isServer = lib.context == 'server'
local User = isServer and require 'Ox.User' or nil
local Character = isServer and require 'Ox.Character' or nil

---@class Player : Ped
---@field handle number The player ped's script handle, or 0 while out of scope.
---@field netId number The player's server id.
---@field playerId number The server id on the server or current player index on the client.
---@field new PlayerConstructor
---@field create nil
local Player = Class('Player', Ped)
Player.type = Player.__name
Player.fromHandle = Ped.bindFromHandle(Player)

local players = setmetatable({}, {
    __mode = 'v',
    __index = function(self, key)
        self[key] = Player:new(key)
        return self[key]
    end
})

local stateChangeHandlers = {}

local function triggerStateChangeHandlers(bag, key, value)
    if not bag:find('^player:') then return end

    local playerId = GetPlayerFromStateBagName(bag)

    if (isServer and playerId <= 0) or (not isServer and playerId < 0) then return end

    local serverId = isServer and playerId or GetPlayerServerId(playerId)

    if serverId <= 0 or bag ~= ('player:%s'):format(serverId) then return end

    local handlers = stateChangeHandlers[key]

    if not handlers then return end

    local player = players[serverId]
    local old = GetStateBagValue(bag, key)
    local subscriptions = table.clone(handlers.subscriptions)

    for i = 1, #subscriptions do
        local subscription = subscriptions[i]

        if subscription.active then
            subscription.cb(player, key, value, old)
        end
    end
end

---Returns a cached player instance or creates a new one.
---@param netId number
---@return Player
function Player.fromId(netId)
    if netId == -1 then netId = isServer and tonumber(GetPlayerFromIndex(0)) or cache.serverId end

    return players[netId]
end

---@param key string
---@param handler fun(player: Player, key: string, value?: unknown, old?: unknown)
---@return fun() unsubscribe
---Registers a player state callback and returns a function that unsubscribes it.
function Player.on(key, handler)
    local handlers = stateChangeHandlers[key]

    if not handlers then
        handlers = {
            cookie = AddStateBagChangeHandler(key, '', triggerStateChangeHandlers),
            subscriptions = {},
        }
        stateChangeHandlers[key] = handlers
    end

    local subscription = { cb = handler, active = true }
    local subscriptions = handlers.subscriptions

    subscriptions[#subscriptions + 1] = subscription

    return function()
        if not subscription.active then return end

        subscription.active = false

        for i = 1, #subscriptions do
            if subscriptions[i] == subscription then
                table.remove(subscriptions, i)
                break
            end
        end

        if #subscriptions > 0 then return end

        RemoveStateBagChangeHandler(handlers.cookie)
        stateChangeHandlers[key] = nil
    end
end

---@class PlayerConstructor
---@overload fun(self: Player, netId: number): Player
---@private
---@see Player.fromId
function Player:constructor(netId)
    if netId == -1 then netId = isServer and tonumber(GetPlayerFromIndex(0)) or cache.serverId end

    self:super(0)
    self.netId = netId
    self:setHandle(isServer and GetPlayerPed(netId) or 0)
end

function Player:__index(index)
    if index == 'playerId' then
        return isServer and self.netId or GetPlayerFromServerId(self.netId)
    end

    if index == 'handle' then
        if isServer then return self.private.handle end

        local playerId = self.playerId
        return playerId >= 0 and GetPlayerPed(playerId) or 0
    end

    return Player[index]
end

---Returns a remote class proxy for the player's user.
function Player:getUser()
    return User?.fromId(self:get('userId'))
end

---Returns a remote class proxy for the player's current character.
function Player:getCharacter()
    return Character?.fromId(self:get('charId'))
end

---Streams and applies a model to the local player. Server calls return immediately.
---@async
---@param model string | number
function Player:setModel(model)
    if isServer or self.playerId ~= Player.Local.playerId then return end

    local hash = lib.requestModel(model)

    SetPlayerModel(self.playerId, hash)
    SetModelAsNoLongerNeeded(hash)
end

function Player:getRoutingBucket()
    ---@diagnostic disable-next-line: param-type-mismatch
    return isServer and GetPlayerRoutingBucket(self.playerId) or self:get('bucket') or 0
end

---@param bucket number
function Player:setRoutingBucket(bucket)
    if not isServer then return end

    ---@diagnostic disable-next-line: param-type-mismatch
    SetPlayerRoutingBucket(self.playerId, bucket)
    self:set('bucket', bucket, 1)
end

if not isServer then
    Player.Local = Player.fromId(-1)
end

return Player
