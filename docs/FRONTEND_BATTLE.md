# Battle and Socket.IO Frontend Contract

Battle is the most stateful feature. HTTP starts matchmaking; the authenticated
`/battle` namespace carries all live state. The worker and Redis continue the
battle after the HTTP request has ended.

## Connection

```js
const battleSocket = io(`${backendOrigin}/battle`, {
  auth: {
    accessToken,
    reconnect: false
  }
});
```

The server verifies the access token, joins the user room, and claims one
battle socket per account. A second active battle socket is rejected with a
handshake error. For an intentional reconnect, set `auth.reconnect: true`;
the old socket is accepted only when it no longer exists. The server uses
socket ID ownership checks so a stale old disconnect cannot release a newer
socket.

Socket handshake errors:

- `Authentication failed: Missing token.`
- `Authentication failed.` for invalid/expired/revoked access token.
- `Authentication is temporarily unavailable.` for auth dependency failure.
- `A battle socket is already connected for this account.`
- `Server is shutting down.`

On handshake auth failure, refresh the access token once through REST. On
socket-in-use, close the duplicate client rather than creating another battle
connection.

## Battle constants the UI must understand

| Rule | Value |
|---|---:|
| Questions per battle | 10 |
| Round timeout | 45 seconds |
| Start delay | 2 seconds |
| Between-round turn delay | 2 seconds |
| Human battle-chat limit | 40 messages/60 seconds |
| Battle-chat max message | 500 characters |
| Retained battle-chat history | 100 messages |
| Disconnect grace before forfeit | 15 seconds |
| Bot answer delay | 4–20 seconds |

Academic practice has no timer; battle timing is separate and applies only to
the battle game.

## HTTP matchmaking

### `POST /battle/start`

```json
{
  "subject_code": "BIO",
  "chapter": 1
}
```

The battle socket must already be connected and owned by the same user. The
server verifies that the user is not already in a battle and not already
searching another incompatible queue.

Possible responses:

```json
{
  "statusCode": 202,
  "data": {
    "status": "waiting",
    "searchId": "search-uuid"
  },
  "message": "Searching for an opponent.",
  "success": true
}
```

or, when a match is already activated:

```json
{
  "statusCode": 200,
  "data": {
    "status": "matched",
    "battleId": "battle-uuid"
  },
  "message": "Opponent found. Battle is starting.",
  "success": true
}
```

Errors:

- `400`: invalid subject/chapter.
- `401`: missing authentication.
- `409`: battle socket missing, socket disconnected, already in battle,
  incompatible queue, or match expired during activation.
- `429`: temporary matchmaking restriction after repeated forfeits.
- `503/500`: Redis/queue dependency or rollback failure.

After a `202`, do not poll an HTTP endpoint. Keep the socket connected and wait
for `NO_OPPONENT_FOUND`, `STARTING_BATTLE`, or `BATTLE_ERROR`.

## Server event catalogue

### `CHAT_CONFIG`

Emitted after socket connection:

```json
{
  "maxMessageLength": 500,
  "messagesPerMinute": 40,
  "historyLimit": 100
}
```

### `STARTING_BATTLE`

Emitted to each player when Redis state and both socket ownership records are
activated:

```json
{
  "battleId": "battle-uuid",
  "yourUserId": "userId",
  "players": [
    {
      "userId": "userId",
      "username": "student",
      "tier": "FREE",
      "avatar_url": null,
      "isBot": false
    }
  ],
  "total_questions": 10
}
```

The client should transition from `searching` to `starting`, clear stale
search UI, and wait for `NEXT_QUESTION`.

### `NO_OPPONENT_FOUND`

```json
{ "searchId": "search-uuid" }
```

The waiting search was cleaned. The UI may show retry/start-again. This is not
a failure requiring logout.

### `NEXT_QUESTION`

The worker emits the next sanitized question:

```json
{
  "battleId": "battle-uuid",
  "index": 0,
  "question": {
    "_id": "ObjectId",
    "question": "Question text",
    "options": ["...", "...", "...", "..."],
    "...": "sanitized question fields"
  },
  "scores": {
    "playerA": 0,
    "playerB": 0
  },
  "answered_count": 0,
  "timeout_seconds": 45
}
```

The exact question fields are the sanitized battle question; the correct
answer is never sent before submission. `index` starts at 0. Start a 45-second
visual countdown using the server event's timing; do not make a local timeout
the authority.

Present the Bangladesh HSC MCQ flow in reading order: stimulus/context first,
then the question stem, any sub-statements, and the sub-question before the
answer options. Keep the server timer visually centered between the two player
cards. After an answer result is known, use a green player-card treatment for a
correct answer and red for an incorrect one; do not show generic "Answer
submitted" profile metadata.

### `PLAYER_ANSWERED`

```json
{
  "userId": "answering-user-id",
  "question_index": 0,
  "correct": true
}
```

Depending on implementation state, the event can omit sensitive detail or
contain the server's correctness result. Never infer the opponent's selected
answer from it. Set that player's answered indicator and wait for the next
round/result event.

### `ROUND_TIMEOUT`

```json
{
  "battleId": "battle-uuid",
  "question_index": 0
}
```

The unanswered player is recorded as timed out/wrong. Stop the local countdown
and wait for `NEXT_QUESTION` or finalization.

### `BATTLE_STATE_SNAPSHOT`

Emitted after reconnect:

```json
{
  "battleId": "battle-uuid",
  "yourUserId": "userId",
  "players": [
    { "userId": "userId", "username": "student", "tier": "FREE" }
  ],
  "scores": { "playerA": 10, "playerB": 8 },
  "total_questions": 10,
  "current_index": 3,
  "phase": "active",
  "timeout_seconds": 31.4,
  "answered_count": 1,
  "chat": [],
  "hasAnswered": false,
  "question": {}
}
```

Replace local battle state with this object. If `question` is null and phase is
finalizing/finished, wait for finalization or reload the result screen.

Snapshot failures:

- `Battle state is no longer available.`
- `Battle state could not be restored.`
- `This account is not part of the battle.`

### `USER_DISCONNECTED` / `USER_RECONNECTED`

```json
{ "userId": "opponentId" }
```

Disconnect starts the server's grace period. Show reconnecting/disconnected,
but do not declare a winner locally. If the opponent reconnects, remove the
warning. If the grace expires, the worker emits finalization/forfeit events.

### `FORFEITING_BATTLE`

```json
{
  "battleId": "battle-uuid",
  "forfeitedUserId": "userId"
}
```

Show a forfeit transition. The durable result follows.

### `FINALIZE_BATTLE`

```json
{
  "battleId": "battle-uuid",
  "winner": "userId-or-DRAW",
  "scores": { "playerA": 12, "playerB": 8 },
  "playerResults": {
    "playerA": {
      "correctAnswers": 7,
      "wrongAnswers": 2,
      "timedOutAnswers": 1,
      "answeredQuestions": 9,
      "totalQuestions": 10,
      "accuracy": 77.78,
      "completionRate": 100,
      "averageAnswerTime": 7.2,
      "fastestAnswerTime": 3.1,
      "timeLeft": 378,
      "timeUsed": 72,
      "answerTimeUsed": 72,
      "matchPoints": 12,
      "outcome": "win"
    }
  },
  "finalizedAt": "ISO date"
}
```

`winner` is `DRAW` for a draw. The client should render this event as the
authoritative match result. The worker persists history/report idempotently
before or as part of this finalization flow; refresh leaderboard afterward.

### `BATTLE_ERROR`

Examples:

```json
{ "message": "You are not currently in a battle." }
```

```json
{ "success": false, "message": "Answer submission failed. Please retry." }
```

This event is used when an operation has no acknowledgement callback or when
the server must notify a connected player about rollback/initialization
failure. Show an actionable message and reload state when appropriate.

## Client events

### `SUBMIT_ANSWER`

```json
{
  "question_index": 0,
  "answer": "ক"
}
```

The server ignores any extra `userId`; sender identity comes from the
authenticated socket. The question index must be the active round and the
answer must be one of `ক`, `খ`, `গ`, `ঘ`.

Acknowledgement:

```json
{ "success": true, "correct": true }
```

Invalid payload acknowledgement:

```json
{ "success": false, "message": "Answer payload is invalid." }
```

Other errors: `409` not in battle, wrong phase/index/already answered; generic
failure returns `Answer submission failed. Please retry.` Do not send the same
answer repeatedly after a successful acknowledgement.

### `QUIT_BATTLE`

Payload may be omitted. Acknowledgement:

```json
{ "success": true }
```

The worker schedules a forfeit. If no battle exists, the acknowledgement is a
failure and the UI should return to idle. Quitting can contribute to the
forfeit restriction.

### `SEND_CHAT_MESSAGE`

```json
{ "message": "gg!" }
```

Battle chat is separate from friend chat. It is limited to 500 characters and
40 messages per minute, retained only for the battle lifetime/history bound.
The server emits `CHAT_MESSAGE` to every battle participant, including the
sender:

```json
{
  "_id": "messageId",
  "userId": "senderId",
  "username": "student",
  "avatar_url": null,
  "text": "gg!",
  "createdAt": "ISO date"
}
```

Render only the server event; do not add an optimistic duplicate. Battle chat
messages use `text` (friend-chat messages use a different contract); accept
`message` only when reading legacy snapshots. Use a timeout acknowledgement and
keep the input text if the acknowledgement times out or fails.

Errors: `400` invalid/empty/overlong message, `403` not a player,
`409` battle inactive/not current battle, `429` rate limit, `404` unavailable
chat, and generic `Chat message could not be sent.`.

### `display_typing`

The frontend normally receives this server event rather than sending it:

```json
{ "userId": "userId", "isTyping": true }
```

Bot typing is generated by workers. Show it ephemerally and clear it after a
short timeout.

## Battle lifecycle

```text
idle
  -> connect /battle
  -> POST /battle/start
  -> searching
      -> NO_OPPONENT_FOUND -> idle
      -> STARTING_BATTLE -> starting
          -> NEXT_QUESTION -> active
              -> SUBMIT_ANSWER / ROUND_TIMEOUT
              -> NEXT_QUESTION (repeat 10 rounds)
              -> USER_DISCONNECTED -> reconnecting
                  -> USER_RECONNECTED -> active
                  -> FORFEITING_BATTLE -> finalizing
              -> FINALIZE_BATTLE -> finished
```

On browser backgrounding or network changes, preserve the battle ID locally,
reconnect the namespace with `reconnect: true`, and trust the snapshot rather
than replaying old answers. On finalization, clear active-battle UI only after
processing the final event.

## Bot behavior visible to frontend

Bot answers arrive through the same round events as human answers. Bot chat
uses the same `CHAT_MESSAGE` and typing events. Replies are short, usually
2–4 words, and may be English, Bangla, or Banglish. The frontend should not
label a bot message differently unless `players[].isBot` identifies the bot.

## Battle error/recovery table

| Situation | Event/response | UI action |
|---|---|---|
| Access token expired | handshake error | refresh once and reconnect |
| Duplicate battle socket | handshake error | close duplicate |
| Redis battle state lost | `BATTLE_ERROR` | show match unavailable; return idle |
| Match rollback | `BATTLE_ERROR` | clear search; allow retry |
| Socket disconnect | `USER_DISCONNECTED` after cleanup | show grace countdown |
| Reconnect success | snapshot + `USER_RECONNECTED` | replace local state |
| Answer rejected | ack failure | keep current question; correct UI |
| Chat rate limited | ack `429` | disable chat temporarily |
| Finalization | `FINALIZE_BATTLE` | show authoritative result |

Never decide a battle winner from a local timer, local score, or socket close
alone.
