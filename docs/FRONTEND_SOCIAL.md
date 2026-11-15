# Social, Notification, Chat, Friend Battle, and Leaderboard Contract

All REST paths are relative to `/api/v1`. User, notification, chat, and friend
battle mutations are authenticated. The browser never writes a chat message
into its own list optimistically: the backend broadcasts the saved message to
both the sender and recipient.

## User profile

### `GET /users/me`

Returns the authenticated user:

```json
{
  "_id": "userId",
  "username": "student",
  "email": "student@example.com",
  "avatar": {
    "publicId": "cloudinary-id",
    "url": "https://...",
    "mimeType": "image/jpeg"
  },
  "profile": {
    "institution": null,
    "bio": null,
    "gender": null,
    "education_level": "HSC",
    "education_year": 1
  },
  "friends": []
}
```

### `GET /users/:userId/profile`

Requires authentication and returns only public profile fields: `_id`,
`username`, `avatar`, and `profile`. It never returns the user's email or friend
list. Inactive or missing accounts return not found.

Profile defaults are `institution: null`, `bio: null`, `gender: null`,
`education_level: HSC`, `education_year: 1`. Education level is `SSC`, `HSC`,
or `SCHOOL`. Years are 1–2 for SSC/HSC and 1–8 for SCHOOL.

### `PATCH /users/me`

JSON profile fields:

```json
{
  "institution": "Dhaka College",
  "bio": "Short bio",
  "gender": "optional",
  "education_level": "HSC",
  "education_year": 1
}
```

Use multipart form data when changing the avatar; the field name is `avatar`.
The file must be an image under 5 MB. Fields are partial updates. When changing
education level without supplying a year, the backend resets the year to 1.

Errors: `400` invalid level/year or upload; `401` unauthenticated; `404` user
missing; Cloudinary/dependency errors are server failures. A replaced avatar's
old Cloudinary image is removed after the new profile is saved.

## Friends

Friend relationships are embedded in each user document:

```json
{
  "user": "otherUserId",
  "status": "requested|accepted|rejected",
  "requestedBy": "requesterId",
  "updatedAt": "ISO date",
  "profile": {}
}
```

### `GET /users/friends`

Returns every relationship plus the current profile of the other user. A
pending incoming request has `status: requested` and
`requestedBy !== currentUserId`. A pending outgoing request has
`requestedBy === currentUserId`.

### `POST /users/search`

Body:

```json
{ "username": "ale" }
```

Search is lowercase, escaped, username-prefix matching. `ale` matches
`alex07` and `alex_harmouzi`, but not a username with `ale` only in the middle.
The current user is excluded; results are sorted by username and capped at 20:

```json
[
  {
    "_id": "userId",
    "username": "alex07",
    "avatar": { "url": "https://..." },
    "profile": {}
  }
]
```

Debounce autocomplete and do not send empty input. Errors: `400` empty or
overlong search text; `401` missing auth.

### Friend request endpoints

`POST /users/:userId/friend-request` has no body. It rejects self-requests
(`400`), an accepted friendship (`409`), and a duplicate pending request
(`409`). A previously rejected relationship is replaced with a new requested
relationship in both user documents. The recipient receives a durable
`friend_request` notification.

`POST /users/:userId/friend-response` body:

```json
{ "accept": true }
```

Only an incoming pending request may be accepted/rejected. Missing, outgoing,
or already-completed requests return `404`. Acceptance updates both embedded
relationships to `accepted` and creates `friend_request_accepted`; rejection
uses `friend_request_rejected`.

`DELETE /users/:userId/friend` removes both relationships and permanently
deletes the direct chat document. It is safe for an already-missing
relationship. The UI must close the conversation and remove its cached
messages after success.

## Durable notifications

### REST

`GET /notifications` returns newest-first notification documents:

```json
{
  "_id": "notificationId",
  "recipient": "userId",
  "actor": "actorId-or-null",
  "type": "friend_request",
  "payload": {},
  "seen": false,
  "seenAt": null,
  "createdAt": "ISO date"
}
```

Important types:

| Type | Payload meaning |
|---|---|
| `friend_request` | Requester's public context |
| `friend_request_accepted` | Acceptor's public context |
| `friend_request_rejected` | Rejector's public context |
| `friend_chat` | `payload.senderId` and username only; never message text |
| `friend_battle_request` | Request ID, battle subject/chapter, expiry context |
| `friend_battle_accepted` | Invitation accepted |
| `friend_battle_abandoned` | Cancelled or expired request |
| Other/system types | Render by type and tolerate unknown future types |

`POST /notifications/seen` accepts either:

```json
{ "ids": ["notificationId"] }
```

or an empty/omitted IDs value to mark all. Seen notifications are retained only
as bounded recent history and expire after cleanup. Unseen notifications are
not discarded merely because the user has more than 15; retention protects
unseen items.

### `/notifications` Socket.IO namespace

Connect with the access token. On connection the server emits:

```text
notification:snapshot
```

Payload is the notification array. Replace, do not append, local notification
state on snapshot.

The server then emits:

```text
notification:new
```

with one notification document. Append it unless its `_id` already exists.

Client event:

```text
notification:seen
```

Payload is an ID array or empty/omitted. Optional acknowledgement:

```json
{ "success": true, "marked": true }
```

Socket errors are acknowledgement responses when a callback is supplied.
Reconnect receives a fresh snapshot.

## Direct friend chat (`/chat`)

Standalone chat is Socket.IO only. The old REST chat controller is not mounted
as a public route. The durable conversation is one MongoDB document per sorted
pair and contains only the latest 100 messages.

Connect:

```js
const chatSocket = io(`${backendOrigin}/chat`, {
  auth: { accessToken }
});
```

### Connection configuration

The first server event is:

```text
chat:config
```

```json
{
  "maxMessageLength": 500,
  "messagesPerMinute": 40,
  "historyLimit": 100
}
```

### Open and snapshot

Client:

```text
chat:open
```

```json
{ "userId": "friendUserId" }
```

The backend validates both IDs, verifies accepted friendship, clears
`friend_chat` notifications from that friend, marks this socket as viewing the
conversation, and emits:

```text
chat:snapshot
```

```json
{
  "userId": "friendUserId",
  "messages": [
    {
      "_id": "messageId",
      "sender": "senderId",
      "text": "hello 🙂",
      "createdAt": "ISO date"
    }
  ]
}
```

Replace the conversation list with the snapshot. Errors are `400` malformed
user ID, `403` users are not friends, and `500` unexpected persistence failure.

Send `chat:close` with `{ "userId": "friendUserId" }` when leaving a
conversation. The socket also clears its presence on disconnect. Presence keys
expire automatically, so a crashed client cannot suppress notifications
forever. A client that stays on a conversation should send `chat:presence`
with `{ "userId": "friendUserId" }` periodically if the UI is long-lived.

### Send and receive

Client:

```text
chat:send
```

```json
{ "recipientId": "friendUserId", "text": "hello 🙂" }
```

Rules:

- Text must be non-empty, trimmed, and at most 500 characters.
- Only accepted friends may send.
- Sender limit is 40 messages per 60 seconds.
- MongoDB retains only the latest 100 messages.
- Sender identity comes from the authenticated socket, not payload.

The backend saves first, then emits the same event to both user rooms:

```text
chat:message
```

```json
{
  "conversationUserId": "senderId",
  "_id": "messageId",
  "sender": "senderId",
  "text": "hello 🙂",
  "createdAt": "ISO date"
}
```

**Important:** the backend emits to the sender too. The frontend must listen
for this event and must not insert the outgoing message separately. This is
the required duplicate-prevention rule.

Successful acknowledgement:

```json
{ "success": true, "message": { "...": "server message" } }
```

If the recipient is offline or is not currently viewing this conversation,
the backend creates a `friend_chat` notification containing sender identity
only. If the recipient is currently viewing the sender's conversation, no
notification is persisted; the live `chat:message` is sufficient.

### Typing

Client:

```text
chat:typing
```

```json
{ "recipientId": "friendUserId", "isTyping": true }
```

The backend verifies friendship and emits only to the recipient:

```json
{ "userId": "senderId", "isTyping": true }
```

Typing is ephemeral. It is not saved and should time out in the UI even if the
`false` event is lost.

### Chat failures

If an acknowledgement callback is supplied, errors are returned there.
Without a callback, the server emits `chat:error`:

```json
{
  "success": false,
  "statusCode": 403,
  "message": "You can chat only with friends."
}
```

Possible messages/statuses: `400` invalid user ID or text length/content,
`403` not friends, `409` conversation/action no longer valid, `429` rate
limit, and `500` generic persistence failure. On `429`, do not resend in a
tight loop. On `403` after an unfriend event, close the conversation.

## Friend battle invitations

### `POST /friend-battles`

```json
{
  "user_id": "friendUserId",
  "subject_code": "BIO",
  "chapter": 1
}
```

The target must be an accepted friend. The request is stored in Redis for one
minute. Response:

```json
{
  "requestId": "uuid",
  "online": true,
  "expiresIn": 60
}
```

`online` only means a battle socket was present at request time. Errors:
`400` malformed subject/chapter/user; `403` not friends; `404` target missing;
`409` already has a conflicting battle/request; `429` restricted after
repeated forfeits.

The target receives `friend_battle_request` through the notification system
even if offline. If cancelled or expired, it becomes
`friend_battle_abandoned`.

`POST /friend-battles/:requestId/accept` has no body. Only the target may
accept, both users must remain friends, both battle sockets must be connected,
and the request must not be expired. Success returns `{ "battleId": "..." }`.
Errors are `403`, `404`, `409`, or `410`.

`POST /friend-battles/:requestId/cancel` has no body and is requester-only.
Success removes the waiting request and notifies the target as abandoned.

## Leaderboard

`GET /leaderboard` is public and returns at most ten entries:

```json
[
  {
    "position": 1,
    "userId": "userId",
    "username": "student",
    "battleScore": 120
  }
]
```

Battle score is persisted in `BattleReport` and synchronized into the Redis
sorted set after idempotent battle finalization. Users with no battle report
or zero score are valid participants. If fewer than ten users have positive
scores, the response is filled with zero-score users in deterministic `_id`
order. Zero-score entries share the first rank after all positive scores.

`GET /leaderboard/me` requires authentication:

```json
{
  "position": 17,
  "battleScore": 0,
  "totalPlayers": 120
}
```

An existing user always receives a numeric score (zero when no battle exists)
and a rank based on users with a strictly greater score. A missing user is
treated as unavailable (`position: null`). Do not calculate a personal rank
from the public top-ten array.

Leaderboard reads are snapshots, not live sockets. Refresh after final battle
events, pull-to-refresh, or a sensible interval. Treat Redis/Mongo temporary
failure as a retryable `500/503`, not as score zero.
