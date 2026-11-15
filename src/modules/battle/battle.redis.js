import { redis } from "../../config/redis.js";
import { BATTLE_ANSWER_KEYS, BATTLE_BOT_POOL_KEY } from "./battle.constants.js";

const LUA_ANSWER_KEYS = BATTLE_ANSWER_KEYS.map((answer) => `'${answer}'`).join(", ");
const userKey = (kind, userId) => `battle:user:${userId}:${kind}`;

export const BATTLE_KEYS = Object.freeze({
    queue: (subjectCode, chapter) =>
        `battle:queue:${encodeURIComponent(subjectCode)}:${chapter}`,
    waiting: (userId) => userKey("waiting", userId),
    inBattle: (userId) => userKey("room", userId),
    searchRequest: (userId) => userKey("search-request", userId),
    cancelRequest: (userId, requestId) => `${userKey("cancel-request", userId)}:${requestId}`,
    matchRequest: (userId) => userKey("match-request", userId),
    matchOpponent: (userId) => userKey("match-opponent", userId),
    matchIsBot: (userId) => userKey("match-is-bot", userId),
    cancelledBattle: (battleId) => `battle:${battleId}:cancelled`,
    socket: (userId) => userKey("socket", userId),
    socketLock: (userId) => userKey("socket-lock", userId),
    socketGuard: (userId) => userKey("socket-guard", userId),
    profile: (userId) => userKey("profile", userId),
    noOpponentJob: (userId) => userKey("no-opponent-job", userId),
    matchupWithBotJob: (userId) => userKey("bot-match-job", userId),
    forfeitJob: (userId) => userKey("forfeit-job", userId),
    payload: (battleId) => `battle:${battleId}:payload`,
    nextQuestionJob: (battleId) => `battle:${battleId}:next-question-job`,
    roundTimeoutJob: (battleId) => `battle:${battleId}:round-timeout-job`,
    botAnswerJob: (battleId) => `battle:${battleId}:bot-answer-job`,
    botChatState: (battleId) => `battle:${battleId}:bot-chat-state`,
    botChatPending: (battleId) => `battle:${battleId}:bot-chat-pending`,
    botChatTurns: (battleId) => `battle:${battleId}:bot-chat-turns`,
    chat: (battleId) => `battle:${battleId}:chat`,
    chatRate: (battleId, userId) => `battle:${battleId}:chat-rate:${userId}`,
    chatMessage: (battleId, userId, clientMessageId) =>
        `battle:${battleId}:chat-message:${userId}:${clientMessageId}`,
    forfeitCount: (userId) => userKey("forfeit-count", userId),
    forfeitBlocked: (userId) => userKey("forfeit-blocked", userId)
});

export const MATCH_OR_QUEUE_SCRIPT = `
local userId = ARGV[1]
local battleId = ARGV[2]
local marker = ARGV[3]
local queueTtl = tonumber(ARGV[4])
local battleTtl = tonumber(ARGV[5])
local keyPrefix = ARGV[6]
local requestId = ARGV[8]
if redis.call('GET', KEYS[2]) then return {'CANCELLED'} end
local requesterSocket = redis.call('GET', keyPrefix .. userId .. ':socket')
local requesterLock = redis.call('GET', keyPrefix .. userId .. ':socket-lock')
local requesterProfile = redis.call('GET', keyPrefix .. userId .. ':profile')
local requesterProfileOk, requesterProfileData = pcall(cjson.decode, requesterProfile or '')

if not requesterSocket or requesterLock ~= requesterSocket then return {'OFFLINE'} end
if redis.call('GET', keyPrefix .. userId .. ':room') then return {'IN_BATTLE'} end
local existingMarker = redis.call('GET', keyPrefix .. userId .. ':waiting')
if existingMarker then
    if requestId ~= '' then redis.call('SET', KEYS[3], requestId, 'EX', queueTtl) end
    return {'WAITING', existingMarker}
end
if not requesterProfileOk or requesterProfileData._id ~= userId or
    type(requesterProfileData.username) ~= 'string' then
    return {'PROFILE_MISSING'}
end

while true do
    local candidates = redis.call('ZRANGE', KEYS[1], 0, 0)
    if #candidates == 0 then break end
    local candidate = candidates[1]
    if candidate == userId then
        redis.call('ZREM', KEYS[1], candidate)
    else
        local candidateWaiting = redis.call('GET', keyPrefix .. candidate .. ':waiting')
        local candidateSocket = redis.call('GET', keyPrefix .. candidate .. ':socket')
        local candidateLock = redis.call('GET', keyPrefix .. candidate .. ':socket-lock')
        local candidateRoom = redis.call('GET', keyPrefix .. candidate .. ':room')
        local candidateProfile = redis.call('GET', keyPrefix .. candidate .. ':profile')
        local candidateProfileOk, candidateProfileData = pcall(cjson.decode, candidateProfile or '')
        local candidateInThisQueue = candidateWaiting and
            string.sub(candidateWaiting, 1, string.len(KEYS[1]) + 1) == KEYS[1] .. '|'
        if candidateInThisQueue and
            candidateSocket and candidateLock == candidateSocket and not candidateRoom and
            candidateProfileOk and candidateProfileData._id == candidate and
            type(candidateProfileData.username) == 'string' then
            local candidateRequestId = redis.call('GET', keyPrefix .. candidate .. ':search-request') or ''
            redis.call('ZREM', KEYS[1], candidate)
            redis.call('DEL', keyPrefix .. candidate .. ':waiting', keyPrefix .. candidate .. ':search-request')
            redis.call('SET', keyPrefix .. userId .. ':room', battleId, 'EX', battleTtl)
            redis.call('SET', keyPrefix .. candidate .. ':room', battleId, 'EX', battleTtl)
            redis.call('SET', keyPrefix .. userId .. ':match-request', requestId, 'EX', queueTtl)
            redis.call('SET', keyPrefix .. candidate .. ':match-request', candidateRequestId, 'EX', queueTtl)
            redis.call('SET', keyPrefix .. userId .. ':match-opponent', candidate, 'EX', queueTtl)
            redis.call('SET', keyPrefix .. candidate .. ':match-opponent', userId, 'EX', queueTtl)
            redis.call('SET', keyPrefix .. userId .. ':match-is-bot', '0', 'EX', queueTtl)
            redis.call('SET', keyPrefix .. candidate .. ':match-is-bot', '0', 'EX', queueTtl)
            local noOpponentJob = redis.call('GET', keyPrefix .. candidate .. ':no-opponent-job')
            local botJob = redis.call('GET', keyPrefix .. candidate .. ':bot-match-job')
            redis.call('DEL', keyPrefix .. candidate .. ':no-opponent-job')
            redis.call('DEL', keyPrefix .. candidate .. ':bot-match-job')
            return {'MATCH', battleId, candidate, candidateSocket, noOpponentJob or '', botJob or '', requesterProfile, candidateProfile, requestId, candidateRequestId}
        else
            redis.call('ZREM', KEYS[1], candidate)
            if not candidateWaiting or candidateInThisQueue then
                redis.call('DEL', keyPrefix .. candidate .. ':waiting', keyPrefix .. candidate .. ':search-request')
            end
        end
    end
end

redis.call('SET', keyPrefix .. userId .. ':waiting', marker, 'EX', queueTtl)
if requestId ~= '' then redis.call('SET', KEYS[3], requestId, 'EX', queueTtl) end
redis.call('ZADD', KEYS[1], tonumber(ARGV[7]), userId)
redis.call('EXPIRE', KEYS[1], queueTtl)
return {'QUEUED', marker}
`;

export const CLAIM_WAITING_REQUEST_SCRIPT = `
if redis.call('GET', KEYS[2]) then return {'CANCELLED'} end
if redis.call('GET', KEYS[1]) ~= ARGV[1] then return {'STALE'} end
redis.call('SET', KEYS[3], ARGV[2], 'EX', ARGV[3])
return {'CLAIMED'}
`;

export const ACTIVATE_MATCH_SCRIPT = `
if redis.call('GET', KEYS[1]) ~= ARGV[1] or
    redis.call('GET', KEYS[2]) ~= ARGV[1] or
    redis.call('GET', KEYS[3]) then return 0 end
redis.call('EXPIRE', KEYS[1], ARGV[2])
redis.call('EXPIRE', KEYS[2], ARGV[2])
return 1
`;

export const CLAIM_FRIEND_MATCH_SCRIPT = `
if redis.call('GET', KEYS[1]) or redis.call('GET', KEYS[2]) then return 0 end
redis.call('SET', KEYS[1], ARGV[1], 'EX', ARGV[2])
redis.call('SET', KEYS[2], ARGV[1], 'EX', ARGV[2])
return 1
`;

export const ROLLBACK_MATCH_SCRIPT = `
for i = 2, #KEYS do
    if redis.call('GET', KEYS[i]) == ARGV[1] then redis.call('DEL', KEYS[i]) end
end
redis.call('DEL', KEYS[1])
return 1
`;

export const RELEASE_MATCH_SCRIPT = `
if redis.call('GET', KEYS[1]) ~= ARGV[1] then return 0 end
redis.call('DEL', KEYS[1])
if redis.call('GET', KEYS[2]) == ARGV[1] then redis.call('DEL', KEYS[2]) end
if not redis.call('GET', KEYS[3]) then redis.call('DEL', KEYS[4]) end
return 1
`;

export const CLAIM_SOCKET_SCRIPT = `
local current = redis.call('GET', KEYS[1])
if ARGV[1] == '' then
    if current then return 0 end
elseif current ~= ARGV[1] then
    return 0
end
redis.call('SET', KEYS[1], ARGV[2], 'EX', ARGV[4])
redis.call('SET', KEYS[2], ARGV[2], 'EX', ARGV[5])
redis.call('SET', KEYS[3], ARGV[3], 'EX', ARGV[5])
return 1
`;

export const REFRESH_SOCKET_SCRIPT = `
if redis.call('GET', KEYS[1]) ~= ARGV[1] then return 0 end
redis.call('EXPIRE', KEYS[1], ARGV[2])
if redis.call('GET', KEYS[2]) == ARGV[1] then redis.call('EXPIRE', KEYS[2], ARGV[3]) end
redis.call('EXPIRE', KEYS[3], ARGV[3])
return 1
`;


export const RELEASE_SOCKET_SCRIPT = `
if redis.call('GET', KEYS[1]) ~= ARGV[1] then return 0 end
if redis.call('GET', KEYS[2]) == ARGV[1] then redis.call('DEL', KEYS[2]) end
if not redis.call('GET', KEYS[3]) then
    redis.call('DEL', KEYS[1], KEYS[4])
end
return 1
`;

export const STORE_JOB_ID_SCRIPT = `
if redis.call('GET', KEYS[1]) ~= ARGV[1] then return 0 end
redis.call('SET', KEYS[2], ARGV[2], 'EX', ARGV[3])
return 1
`;

export const FINISH_NO_OPPONENT_SCRIPT = `
if redis.call('GET', KEYS[1]) ~= ARGV[1] then return 0 end
if string.sub(ARGV[1], 1, string.len(KEYS[3]) + 1) ~= KEYS[3] .. '|' then return 0 end
redis.call('DEL', KEYS[1], KEYS[2])
redis.call('ZREM', KEYS[3], ARGV[2])
return 1
`;

export const SUBMIT_BATTLE_ANSWER_SCRIPT = `
local raw = redis.call('GET', KEYS[1])
if not raw then return {'MISSING'} end
local ok, state = pcall(cjson.decode, raw)
if not ok or type(state) ~= 'table' then return {'CORRUPT'} end
local userId = ARGV[1]
local questionIndex = tonumber(ARGV[2])
local answer = ARGV[3]
local timeout = tonumber(ARGV[4])
local questionTtl = ARGV[5]
local redisTime = redis.call('TIME')
local now = tonumber(redisTime[1]) * 1000 + math.floor(tonumber(redisTime[2]) / 1000)
if state.phase ~= 'active' then return {'NOT_ACTIVE'} end
if tonumber(state.current_index) ~= questionIndex then return {'STALE'} end
local playerFound = false
for _, playerId in ipairs(state.players or {}) do
    if playerId == userId then playerFound = true end
end
if not playerFound then return {'NOT_PLAYER'} end
local question = state.questions[questionIndex + 1]
if not question or type(question.options) ~= 'table' then return {'BAD_QUESTION'} end
local answerKeys = {${LUA_ANSWER_KEYS}}
local validAnswer = false
for optionIndex = 1, math.min(#question.options, #answerKeys) do
    if answer == answerKeys[optionIndex] then validAnswer = true end
end
if not validAnswer then return {'BAD_ANSWER'} end
local indexKey = tostring(questionIndex)
local answers = state.players_answers[userId]
if answers[indexKey] ~= nil then
    local previousAnswer = answers[indexKey]
    local previousCorrect = previousAnswer == question.answer
    return {'DUPLICATE', tostring(state.answered_count or 0), tostring(#state.players), previousCorrect and '1' or '0', question.answer}
end
local elapsed = math.max(0, (now - tonumber(state.round_started_at)) / 1000)
if elapsed > timeout then return {'TIME_EXPIRED'} end
local duration = math.min(timeout, elapsed)
duration = math.floor(duration * 100) / 100
answers[indexKey] = answer
state.players_answered_durations[userId][indexKey] = duration
state.players_last_answered_at[userId] = now
local correct = answer == question.answer
if correct then state.scores[userId] = tonumber(state.scores[userId] or 0) + 1 end
state.answered_count = tonumber(state.answered_count or 0) + 1
redis.call('SET', KEYS[1], cjson.encode(state), 'EX', questionTtl)
return {'OK', tostring(state.answered_count), tostring(#state.players), correct and '1' or '0', question.answer}
`;

export const TIMEOUT_BATTLE_ROUND_SCRIPT = `
local raw = redis.call('GET', KEYS[1])
if not raw then return {'MISSING'} end
local ok, state = pcall(cjson.decode, raw)
if not ok or type(state) ~= 'table' then return {'CORRUPT'} end
local index = tonumber(ARGV[1])
if state.phase ~= 'active' or tonumber(state.current_index) ~= index then return {'STALE'} end
if tonumber(state.answered_count or 0) >= #state.players then return {'RESOLVED'} end
local timeout = tonumber(ARGV[2])
local ttl = ARGV[3]
local redisTime = redis.call('TIME')
local now = tonumber(redisTime[1]) * 1000 + math.floor(tonumber(redisTime[2]) / 1000)
local missing = {}
local indexKey = tostring(index)
for _, userId in ipairs(state.players) do
    if state.players_answers[userId][indexKey] == nil then
        state.players_answers[userId][indexKey] = cjson.null
        state.players_answered_durations[userId][indexKey] = timeout
        state.players_last_answered_at[userId] = now
        state.answered_count = tonumber(state.answered_count or 0) + 1
        table.insert(missing, userId)
    end
end
state.round_timed_out = true
redis.call('SET', KEYS[1], cjson.encode(state), 'EX', ttl)
return {'OK', cjson.encode(missing), tostring(state.answered_count)}
`;

export const ADVANCE_BATTLE_ROUND_SCRIPT = `
local raw = redis.call('GET', KEYS[1])
if not raw then return {'MISSING'} end
local ok, state = pcall(cjson.decode, raw)
if not ok or type(state) ~= 'table' then return {'CORRUPT'} end
local expected = tonumber(ARGV[1])
local ttl = ARGV[2]
local timeout = tonumber(ARGV[3])
local redisTime = redis.call('TIME')
local now = tonumber(redisTime[1]) * 1000 + math.floor(tonumber(redisTime[2]) / 1000)
local current = tonumber(state.current_index)
local target = expected + 1
if current == target and (state.phase == 'active' or state.phase == 'finalizing') then
    local remaining = timeout * 1000
    if type(state.round_started_at) == 'number' then
        remaining = math.max(0, timeout * 1000 - (now - state.round_started_at))
    end
    return {state.phase == 'finalizing' and 'DONE' or 'REPLAY', cjson.encode(state), tostring(remaining)}
end
if current ~= expected then return {'STALE'} end
if state.phase ~= 'starting' and state.phase ~= 'active' then return {'NOT_ACTIVE'} end
if expected >= 0 and
    tonumber(state.answered_count or 0) < #state.players and
    not state.round_timed_out then return {'WAITING'} end
if target >= tonumber(state.total_questions) then
    state.current_index = target
    state.phase = 'finalizing'
    redis.call('SET', KEYS[1], cjson.encode(state), 'EX', ttl)
    return {'DONE', cjson.encode(state)}
end
state.current_index = target
state.phase = 'active'
state.answered_count = 0
state.round_started_at = now
state.round_timed_out = false
for _, userId in ipairs(state.players) do
    state.players_last_answered_at[userId] = now
end
redis.call('SET', KEYS[1], cjson.encode(state), 'EX', ttl)
return {'OK', cjson.encode(state)}
`;

export const FORFEIT_BATTLE_SCRIPT = `
local raw = redis.call('GET', KEYS[1])
if not raw then return {'MISSING'} end
local ok, state = pcall(cjson.decode, raw)
if not ok or type(state) ~= 'table' then return {'CORRUPT'} end
if state.phase == 'finalizing' or state.phase == 'finalized' then return {'DONE'} end
if state.phase ~= 'active' and state.phase ~= 'starting' then return {'NOT_ACTIVE'} end
local forfeitedUserId = ARGV[1]
local isVoluntary = ARGV[3] == '1'
if not isVoluntary then
    local currentSocket = redis.call('GET', KEYS[2])
    local currentLock = redis.call('GET', KEYS[3])
    if currentSocket or currentLock ~= ARGV[2] then return {'RECONNECTED'} end
end
local found = false
for _, userId in ipairs(state.players) do
    if userId == forfeitedUserId then found = true end
end
if not found then return {'NOT_PLAYER'} end
local forfeits = redis.call('INCR', KEYS[4])
if forfeits == 1 then redis.call('EXPIRE', KEYS[4], ARGV[5]) end
if forfeits >= tonumber(ARGV[6]) then
    redis.call('SET', KEYS[5], '1', 'EX', ARGV[7])
end
state.phase = 'finalizing'
state.isForfeit = true
state.forfeitedUserId = forfeitedUserId
redis.call('SET', KEYS[1], cjson.encode(state), 'EX', ARGV[4])
return {'OK', cjson.encode(state)}
`;

export const FINALIZE_BATTLE_CLEANUP_SCRIPT = `
local raw = redis.call('GET', KEYS[1])
if not raw then return {'MISSING'} end
local ok, state = pcall(cjson.decode, raw)
if not ok or type(state) ~= 'table' then return {'CORRUPT'} end
local botId = state.botuserid or ''
for i = 2, 3 do
    if redis.call('GET', KEYS[i]) == ARGV[1] then redis.call('DEL', KEYS[i]) end
end
for i = 4, 5 do
    local reference = redis.call('GET', KEYS[i])
    if reference and string.sub(reference, 1, string.len(ARGV[3])) == ARGV[3] then
        redis.call('DEL', KEYS[i])
    end
end
redis.call('DEL', KEYS[7])
redis.call('DEL', KEYS[8])
redis.call('DEL', KEYS[9])
redis.call('DEL', KEYS[10])
if state.isBot and botId ~= '' then redis.call('SADD', KEYS[6], botId) end
state.phase = 'finalized'
redis.call('SET', KEYS[1], cjson.encode(state), 'EX', ARGV[2])
return {'OK', botId}
`;

export const CLAIM_BOT_CHAT_MILESTONE_SCRIPT = `
if redis.call('SISMEMBER', KEYS[1], ARGV[1]) == 1 then return 0 end
redis.call('SADD', KEYS[1], ARGV[1])
redis.call('EXPIRE', KEYS[1], ARGV[2])
return 1
`;

export const COUNT_BOT_CHAT_TURN_SCRIPT = `
local raw = redis.call('GET', KEYS[1])
if not raw then return {'MISSING'} end
local ok, state = pcall(cjson.decode, raw)
if not ok or type(state) ~= 'table' or type(state.players) ~= 'table' then
    return {'CORRUPT'}
end
if state.phase ~= 'active' or state.isBot ~= true or state.botuserid ~= ARGV[1] then
    return {'NOT_ACTIVE'}
end
local playerFound = false
for _, playerId in ipairs(state.players or {}) do
    if playerId == ARGV[2] then playerFound = true end
end
if not playerFound then return {'NOT_PLAYER'} end
local turns = redis.call('INCR', KEYS[2])
redis.call('EXPIRE', KEYS[2], ARGV[3])
return {'OK', tostring(turns)}
`;

export const RESERVE_BOT_CHAT_PHRASE_SCRIPT = `
local raw = redis.call('GET', KEYS[1])
if not raw then return {'MISSING'} end
local ok, state = pcall(cjson.decode, raw)
if not ok or type(state) ~= 'table' then return {'CORRUPT'} end
if state.phase ~= 'active' or state.isBot ~= true or state.botuserid ~= ARGV[1] then
    return {'NOT_ACTIVE'}
end
local count = #ARGV - 2
if count < 1 then return {'EXHAUSTED'} end
local time = redis.call('TIME')
local start = (tonumber(time[2]) % count) + 1
for offset = 0, count - 1 do
    local index = ((start + offset - 1) % count) + 1
    local phraseId = ARGV[index + 2]
    if redis.call('SISMEMBER', KEYS[2], 'phrase:' .. phraseId) == 0 then
        redis.call('SADD', KEYS[2], 'phrase:' .. phraseId)
        redis.call('EXPIRE', KEYS[2], ARGV[2])
        return {'OK', phraseId}
    end
end
return {'EXHAUSTED'}
`;

export const APPEND_BOT_CHAT_SCRIPT = `
local raw = redis.call('GET', KEYS[1])
if not raw then return {'MISSING'} end
local ok, state = pcall(cjson.decode, raw)
if not ok or type(state) ~= 'table' then return {'CORRUPT'} end
if state.phase ~= 'active' or state.isBot ~= true or state.botuserid ~= ARGV[1] then
    return {'NOT_ACTIVE'}
end
local player = false
for _, playerId in ipairs(state.players or {}) do
    if playerId == ARGV[1] then player = true end
end
if not player then return {'NOT_PLAYER'} end
local profile = state.player_profiles and state.player_profiles[ARGV[1]] or {}
local time = redis.call('TIME')
local timestamp = tonumber(time[1]) * 1000 + math.floor(tonumber(time[2]) / 1000)
local message = cjson.encode({
    userId = ARGV[1],
    username = profile.username or '',
    avatar_url = profile.avatar_url or '',
    text = ARGV[2],
    createdAt = timestamp
})
redis.call('RPUSH', KEYS[2], message)
redis.call('LTRIM', KEYS[2], -tonumber(ARGV[3]), -1)
redis.call('EXPIRE', KEYS[2], ARGV[4])
return {'OK', message}
`;

export const BATTLE_CHAT_SCRIPT = `
local raw = redis.call('GET', KEYS[1])
if not raw then return {'MISSING'} end
local ok, state = pcall(cjson.decode, raw)
if not ok or type(state) ~= 'table' then return {'CORRUPT'} end
if state.phase ~= 'active' then return {'NOT_ACTIVE'} end
local userId = ARGV[1]
local player = false
for _, playerId in ipairs(state.players or {}) do
    if playerId == userId then player = true end
end
if not player or redis.call('GET', KEYS[4]) ~= ARGV[2] then return {'NOT_PLAYER'} end
local clientMessageId = ARGV[10]
if clientMessageId ~= '' then
    local existing = redis.call('GET', KEYS[5])
    if existing then return {'DUPLICATE', existing} end
end
local count = redis.call('INCR', KEYS[3])
if count == 1 then redis.call('EXPIRE', KEYS[3], ARGV[3]) end
if count > tonumber(ARGV[4]) then return {'RATE_LIMIT', tostring(redis.call('TTL', KEYS[3]))} end
local time = redis.call('TIME')
local timestamp = tonumber(time[1]) * 1000 + math.floor(tonumber(time[2]) / 1000)
local message = cjson.encode({
   _id = clientMessageId,
    userId = userId,
    username = ARGV[5],
    avatar_url = ARGV[6],
    text = ARGV[7],
    createdAt = timestamp
})
redis.call('RPUSH', KEYS[2], message)
redis.call('LTRIM', KEYS[2], -tonumber(ARGV[8]), -1)
redis.call('EXPIRE', KEYS[2], ARGV[9])
if clientMessageId ~= '' then
    redis.call('SET', KEYS[5], message, 'EX', ARGV[9])
end
return {'OK', message}
`;

export const MATCH_WITH_BOT_SCRIPT = `
local marker = redis.call('GET', KEYS[1])
if marker ~= ARGV[1] then return {'STALE'} end
local userId = ARGV[2]
local battleId = ARGV[3]
local keyPrefix = ARGV[4]
local socketId = redis.call('GET', keyPrefix .. userId .. ':socket')
local socketLock = redis.call('GET', keyPrefix .. userId .. ':socket-lock')
local profile = redis.call('GET', keyPrefix .. userId .. ':profile')
if not socketId or socketLock ~= socketId or not profile then
    local delimiter = string.find(marker, '|', 1, true)
    if delimiter then redis.call('ZREM', string.sub(marker, 1, delimiter - 1), userId) end
    redis.call('DEL', KEYS[1], KEYS[2])
    return {'OFFLINE'}
end
local profileOk, profileData = pcall(cjson.decode, profile)
if not profileOk or profileData._id ~= userId then return {'PROFILE_MISSING'} end
if redis.call('GET', keyPrefix .. userId .. ':room') then return {'IN_BATTLE'} end

local botId
local availableBots = redis.call('SCARD', KEYS[3])
for attempt = 1, availableBots do
    botId = redis.call('SPOP', KEYS[3])
    if not botId then break end
    if botId ~= userId and
        not redis.call('GET', keyPrefix .. botId .. ':room') and
        not redis.call('GET', keyPrefix .. botId .. ':socket') then break end
    botId = nil
end
if not botId then
    local delimiter = string.find(marker, '|', 1, true)
    if delimiter then redis.call('ZREM', string.sub(marker, 1, delimiter - 1), userId) end
    redis.call('DEL', KEYS[1], KEYS[2], keyPrefix .. userId .. ':search-request')
    return {'NO_BOT'}
end
local ttl = ARGV[5]
local requestId = redis.call('GET', keyPrefix .. userId .. ':search-request') or ''
redis.call('SET', keyPrefix .. userId .. ':room', battleId, 'EX', ttl)
redis.call('SET', keyPrefix .. botId .. ':room', battleId, 'EX', ttl)
redis.call('SET', keyPrefix .. userId .. ':match-request', requestId, 'EX', ttl)
redis.call('SET', keyPrefix .. botId .. ':match-request', requestId, 'EX', ttl)
redis.call('SET', keyPrefix .. userId .. ':match-opponent', botId, 'EX', ttl)
redis.call('SET', keyPrefix .. botId .. ':match-opponent', userId, 'EX', ttl)
redis.call('SET', keyPrefix .. userId .. ':match-is-bot', '1', 'EX', ttl)
redis.call('SET', keyPrefix .. botId .. ':match-is-bot', '1', 'EX', ttl)
local delimiter = string.find(marker, '|', 1, true)
if delimiter then redis.call('ZREM', string.sub(marker, 1, delimiter - 1), userId) end
redis.call('DEL', KEYS[1], KEYS[2], keyPrefix .. userId .. ':search-request')
return {'MATCH', botId, socketId, profile, requestId}
`;

export const ROLLBACK_BOT_MATCH_SCRIPT = `
for i = 1, 2 do
    if redis.call('GET', KEYS[i]) == ARGV[1] then redis.call('DEL', KEYS[i]) end
end
redis.call('SADD', KEYS[3], ARGV[2])
return 1
`;

export const RESTORE_BOT_MATCH_SCRIPT = `
if redis.call('GET', KEYS[7]) then
    for i = 1, 2 do
        if redis.call('GET', KEYS[i]) == ARGV[1] then redis.call('DEL', KEYS[i]) end
    end
    redis.call('SADD', KEYS[3], ARGV[2])
    return {'CANCELLED'}
end
for i = 1, 2 do
    if redis.call('GET', KEYS[i]) == ARGV[1] then redis.call('DEL', KEYS[i]) end
end
redis.call('SADD', KEYS[3], ARGV[2])
redis.call('SET', KEYS[4], ARGV[3], 'EX', ARGV[4])
redis.call('ZADD', KEYS[5], tonumber(ARGV[5]), ARGV[6])
redis.call('EXPIRE', KEYS[5], ARGV[4])
redis.call('SET', KEYS[6], ARGV[7], 'EX', ARGV[8])
redis.call('SET', KEYS[8], ARGV[9], 'EX', ARGV[4])
return {'RESTORED'}
`;

export const CLEAN_WAITING_SCRIPT = `
local marker = redis.call('GET', KEYS[1])
local expectedMarker = ARGV[2]
local expectedJobId = ARGV[3]
if marker and expectedMarker ~= '' and marker ~= expectedMarker then return 0 end
if not marker then
    if expectedJobId ~= '' and redis.call('GET', KEYS[2]) == expectedJobId then
        redis.call('DEL', KEYS[2])
    end
    return 0
end
local delimiter = string.find(marker, '|', 1, true)
if not delimiter then
    redis.call('DEL', KEYS[1])
    if expectedJobId == '' or redis.call('GET', KEYS[2]) == expectedJobId then
        redis.call('DEL', KEYS[2])
    end
    return 1
end
local queue = string.sub(marker, 1, delimiter - 1)
redis.call('DEL', KEYS[1])
if expectedJobId == '' or redis.call('GET', KEYS[2]) == expectedJobId then
    redis.call('DEL', KEYS[2])
end
redis.call('ZREM', queue, ARGV[1])
return 1
`;

export const CANCEL_MATCHMAKING_SCRIPT = `
local battleId = redis.call('GET', KEYS[2])
local requestId = ARGV[2]
local currentRequestId = redis.call('GET', KEYS[6])
redis.call('SET', KEYS[5], '1', 'EX', ARGV[3])
if battleId then
    local matchedRequestId = redis.call('GET', KEYS[7])
    if matchedRequestId ~= requestId then return {'MATCHED', battleId} end

    local payloadKey = 'battle:' .. battleId .. ':payload'
    local raw = redis.call('GET', payloadKey)
    if raw then
        local ok, state = pcall(cjson.decode, raw)
        if ok and type(state) == 'table' and
            (state.phase == 'finalizing' or state.phase == 'finalized') then
            return {'MATCHED', battleId}
        end
    end

    local opponentId = redis.call('GET', KEYS[8])
    if not opponentId then return {'MATCHED', battleId} end
    local opponentRequestId = redis.call('GET', 'battle:user:' .. opponentId .. ':match-request') or ''
    local isBot = redis.call('GET', KEYS[9]) == '1'
    local botId = isBot and opponentId or ''
    redis.call('SET', 'battle:' .. battleId .. ':cancelled', requestId, 'EX', ARGV[3])
    if redis.call('GET', KEYS[2]) == battleId then redis.call('DEL', KEYS[2]) end
    if redis.call('GET', 'battle:user:' .. opponentId .. ':room') == battleId then
        redis.call('DEL', 'battle:user:' .. opponentId .. ':room')
    end
    redis.call('DEL',
        KEYS[7], KEYS[8], KEYS[9], KEYS[6],
        'battle:user:' .. opponentId .. ':match-request',
        'battle:user:' .. opponentId .. ':match-opponent',
        'battle:user:' .. opponentId .. ':match-is-bot',
        'battle:user:' .. opponentId .. ':search-request'
    )
    redis.call('DEL', payloadKey)
    if isBot then redis.call('SADD', KEYS[10], botId) end
    return {'MATCH_CANCELLED', battleId, opponentId, opponentRequestId, isBot and '1' or '0'}
end
if currentRequestId and currentRequestId ~= requestId then
    return {'STALE', currentRequestId}
end

local marker = redis.call('GET', KEYS[1])
local botJobId = redis.call('GET', KEYS[4]) or ''
local noOpponentJobId = redis.call('GET', KEYS[3]) or ''
if not marker then
    redis.call('DEL', KEYS[3], KEYS[4], KEYS[6])
    return {'IDLE', botJobId, noOpponentJobId}
end

local delimiter = string.find(marker, '|', 1, true)
if not delimiter then return {'INVALID_MARKER'} end
local queue = string.sub(marker, 1, delimiter - 1)
redis.call('ZREM', queue, ARGV[1])
redis.call('DEL', KEYS[1], KEYS[3], KEYS[4], KEYS[6])
return {'CANCELLED', botJobId, noOpponentJobId}
`;

export const redisCall = async (script, keys, args) =>
    redis.eval(script, keys.length, ...keys, ...args);
