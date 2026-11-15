# Khelba Frontend Integration Contract

This is the contract a frontend developer should use without reading the
backend source. It describes what the browser sends, what the backend returns,
which side owns each piece of state, and what the UI must do after every
success, error, reconnect, timeout, and partial network failure.

The backend is an Express API plus three authenticated Socket.IO namespaces:

```text
Browser
  ├─ REST /api/v1/auth, academic, users, notifications, friend-battles
  │    └─ MongoDB services, Redis services, Cloudinary, BullMQ
  ├─ Socket.IO /battle
  │    └─ matchmaking, questions, answers, battle chat, reconnect
  ├─ Socket.IO /notifications
  │    └─ durable notification snapshot and live notification:new
  └─ Socket.IO /chat
       └─ durable friend chat snapshot, live messages, typing, presence
```

The frontend must never call MongoDB, Redis, BullMQ, Cloudinary, worker
handlers, or internal service functions. It must use only the contracts in
this document.

The Khelba logo links to the authenticated home page (`/`), which presents a
compact user welcome and profile summary. Sidebar navigation uses the shared
route loading screen while a destination loads. The sidebar expands on hover
and collapses when the pointer leaves.

## 1. Environment and common rules

All REST paths below are relative to:

```text
{BACKEND_ORIGIN}/api/v1
```

Every normal REST success uses this envelope:

```json
{
  "statusCode": 200,
  "data": {},
  "message": "Human-readable message",
  "success": true
}
```

`data` may be an object, array, or `null`. The HTTP status and `statusCode`
normally match. IDs are MongoDB ObjectId strings unless explicitly described
as a UUID or battle ID.

Every REST error is handled by the global error middleware. The exact envelope
is:

```json
{
  "statusCode": 400,
  "data": {
    "success": false,
    "status": 400,
    "message": "Validation Error",
    "errors": {
      "body.email": "Invalid email address."
    }
  },
  "message": "Validation Error",
  "success": false
}
```

The frontend should display `data.message` when present, otherwise the top
level `message`. Never display a development stack trace.

### Status meanings

| Code | Meaning | Frontend action |
|---:|---|---|
| 400 | Malformed input, validation failure, invalid ID, unsupported value | Show field/action validation; do not retry unchanged |
| 401 | Missing, expired, invalid, or revoked authentication | Refresh once, then log in if refresh fails |
| 403 | Authenticated but forbidden | Stop the action and explain permission/state |
| 404 | User, question, notification, or eligible resource not found | Refresh relevant list or show unavailable |
| 409 | Valid request conflicts with current state | Reload authoritative state; do not blind-retry |
| 410 | Temporary request/resource expired | Remove stale UI item |
| 429 | Rate limit or temporary restriction | Show retry delay; do not tight-loop |
| 500 | Unexpected server error | Show generic retry message and log client context |
| 503 | Dependency unavailable/startup/shutdown | Show temporary unavailable state |

### Authentication transport

REST access token:

```http
Authorization: Bearer <accessToken>
```

Refresh token: HTTP-only cookie named `refreshToken`. Browser requests that
use the cookie must set `credentials: "include"`. Do not put the refresh token
in localStorage, sessionStorage, Redux state, or JavaScript-readable cookies.
Keep the access token in memory where possible.

Socket connection:

```js
io(`${backendOrigin}/battle`, {
  auth: { accessToken, reconnect: false }
});
```

The same form works for `/notifications` and `/chat`. A bearer header is also
accepted in environments that support `extraHeaders`. A missing or invalid
token rejects the Socket.IO handshake with a connection error; it does not
produce a normal application event.

### Access-token recovery algorithm

1. Send the request with the current access token.
2. On the first `401`, pause requests and call `POST /auth/refresh` once with
   credentials included.
3. Replace the in-memory access token with the returned token.
4. Retry the original request once.
5. If refresh fails, disconnect all namespaces, clear in-memory auth state, and
   route to login.
6. Never retry refresh recursively or retry a mutation indefinitely.

## 2. Which state is authoritative?

| State | Authoritative source | Frontend behavior |
|---|---|---|
| Login/session | Auth REST response and refresh cookie | Store access token in memory |
| Profile/friends | REST response | Replace local object after mutation |
| Academic questions/reports | REST response | Replace the affected chapter/subject state |
| Durable notifications | Notification REST/socket snapshot | Merge live event, replace on snapshot |
| Direct chat history | `chat:snapshot` | Replace conversation on open/reconnect |
| Direct chat live message | `chat:message` | Append exactly once |
| Battle state | `/battle` events and snapshot | Replace state on snapshot |
| Leaderboard | REST read at refresh time | Do not infer rank from a visible top-ten list |

Socket events are delivery mechanisms, not proof of durable persistence. If a
socket event is missed, reconnect and request/consume the relevant snapshot.

## 3. Critical frontend rules

1. Do not render a locally-created direct-chat message immediately after
   `chat:send`. The backend emits `chat:message` to the sender as well as the
   recipient. Render the server event only. This prevents duplicate messages.
2. Do not add a local optimistic battle answer to the opponent's score. Wait
   for `PLAYER_ANSWERED`, `NEXT_QUESTION`, or `FINALIZE_BATTLE`.
3. Do not trust a client-supplied `userId` as the sender. The authenticated
   socket identifies the sender.
4. Do not expose the correct academic answer on remaining-question screens.
5. Wrong-review items intentionally contain both `selected_answer` and
   `correct_answer`; color the former red and the latter green.
6. Academic practice has no timer and no answer-duration field.
7. Chat notification payloads never contain message text.
8. A user with zero battle score is still a valid leaderboard participant.
9. Cursor pagination uses `next_cursor`, not page numbers.
10. Disable a mutation control while its request/acknowledgement is pending.

## 4. REST route catalogue

| Method | Path | Auth | Purpose |
|---|---|---:|---|
| POST | `/auth/register` | No | Multipart account creation |
| POST | `/auth/login` | No | Password login |
| POST | `/auth/refresh` | Cookie | Rotate session/access token |
| POST | `/auth/logout` | Optional | Revoke current session and clear cookies |
| POST | `/auth/logout-all` | Yes | Revoke all sessions |
| POST | `/auth/forgot-password` | No | Start password reset |
| POST | `/auth/reset-password/:token` | No | Set new password |
| POST | `/auth/change-password` | Yes | Change password and revoke other sessions |
| POST | `/auth/verify-email/:token` | No | Verify email and establish session |
| POST | `/auth/send-verification-email` | No | Resend verification |
| GET | `/auth/google` | No | Start Google OAuth |
| GET | `/auth/google/callback` | No | OAuth callback redirect |
| GET | `/academic/remaining-questions` | Yes | Uncompleted question page |
| POST | `/academic/submit-answer` | Yes | Record answer attempts |
| GET | `/academic/wrong-questions` | Yes | Review wrong pool |
| GET | `/academic/right-questions` | Yes | Review right pool |
| POST | `/academic/mark-as-done` | Yes | Move wrong IDs to right pool |
| POST | `/academic/reset` | Yes | Reset one or many chapters |
| DELETE | `/academic/delete` | Yes | Backward-compatible reset alias |
| GET | `/academic/report` | Yes | Subject/chapter analytics |
| GET | `/notifications` | Yes | Durable notification list |
| POST | `/notifications/seen` | Yes | Mark notifications seen |
| GET | `/users/me` | Yes | Own profile |
| GET | `/users/friends` | Yes | Friend relationships and profiles |
| POST | `/users/search` | Yes | Username prefix search |
| PATCH | `/users/me` | Yes | Profile/avatar update |
| POST | `/users/:userId/friend-request` | Yes | Request/re-request friendship |
| POST | `/users/:userId/friend-response` | Yes | Accept/reject incoming request |
| DELETE | `/users/:userId/friend` | Yes | Unfriend and delete direct chat |
| POST | `/battle/start` | Yes | Enter matchmaking |
| POST | `/friend-battles` | Yes | Create friend battle invitation |
| POST | `/friend-battles/:requestId/accept` | Yes | Accept invitation |
| POST | `/friend-battles/:requestId/cancel` | Yes | Cancel invitation |
| GET | `/leaderboard` | No | Public top ten, including zero-score users |
| GET | `/leaderboard/me` | Yes | Current score and rank |

The complete request/response/error details are split into:

- [Auth and Academic](./FRONTEND_AUTH_ACADEMIC.md)
- [Social, Chat, Notifications, Friend Battles, Leaderboard](./FRONTEND_SOCIAL.md)
- [Battle and Socket.IO](./FRONTEND_BATTLE.md)
- [Backend modules and persistence](./BACKEND_MODULE_MAP.md)
