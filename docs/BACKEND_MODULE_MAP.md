# Backend Architecture and Persistence Map

This document explains how the backend is divided so a frontend developer can
reason about ownership, durability, workers, and eventual consistency without
opening source files.

## Runtime components

```text
server.js/app.js
  ├─ Express middleware, CORS, security, JSON/multipart parsing
  ├─ /api/v1 route tree
  └─ HTTP server + Socket.IO

MongoDB
  ├─ users, sessions, mcqs
  ├─ chapter_reports, subject_reports
  ├─ battle_reports, battle_histories
  ├─ notifications, chats
  └─ indexes enforce lookup/uniqueness rules

Redis
  ├─ Socket.IO pub/sub adapter
  ├─ matchmaking and battle state
  ├─ socket ownership/reconnect locks
  ├─ rate limits and TTL state
  ├─ friend invitation records
  └─ global leaderboard sorted set

BullMQ worker
  ├─ delayed matchmaking fallback
  ├─ round start/timeout/next-question jobs
  ├─ bot answers and bot chat
  ├─ disconnect forfeits and finalization
  └─ verification/password email delivery
```

The frontend only sees REST and Socket.IO. Redis and queue state is never a
frontend contract.

## Module responsibilities

| Module | Owns | Frontend surface |
|---|---|---|
| `auth` | Account, sessions, refresh rotation, password/email/OAuth | `/auth/*` |
| `academic` | MCQ filtering, answer attempts, pools, analytics/reset | `/academic/*` |
| `user` | Profile, avatar, embedded relationships, username search | `/users/*` |
| `notification` | Durable notification creation/retention/seen/live delivery | REST + `/notifications` |
| `chat` | Friend authorization, bounded durable messages, rate/presence | `/chat` |
| `battle-friend` | Invitation TTL/accept/cancel | `/friend-battles/*` |
| `battle` | Matchmaking, Redis battle state, rounds, battle chat, reconnect | `/battle/start` + `/battle` |
| `leaderboard` | Score synchronization and rank/top reads | `/leaderboard/*` |
| `workers` | Delayed and durable asynchronous transitions | No direct frontend call |

## MongoDB persistence

### User

Credentials and profile metadata, avatar, account status, token version, and
embedded friend relationships. The browser receives only selected fields from
each endpoint; password and security fields are never frontend data.

### Session

One refresh session per login/device with hashed refresh token, expiry,
validity, IP/user-agent metadata. Refresh rotates tokens. Logout invalidates
the current session; logout-all invalidates all sessions.

### MCQ

Question content and answer. Remaining-question responses strip the answer.
Wrong/right review responses intentionally include answer information.

### ChapterReport

Unique by `(user_id, subject_code, chapter)`. Stores current
`right_pool`, `wrong_pool`, latest `wrong_answers`, and cumulative
`total_right_answer`/`total_wrong_answer`. Pool changes are current state;
counters are historical analytics.

### SubjectReport

Internal subject-to-chapter report links. The frontend consumes the calculated
subject report response, not this linking collection.

### BattleReport/BattleHistory

`BattleReport` is the user's aggregate score/performance/streak. `BattleHistory`
is an immutable finalized battle record. Finalization is idempotent by battle
ID, then leaderboard synchronization runs.

### Notification

Recipient, actor, type, arbitrary type-specific payload, seen/seenAt, and
createdAt. MongoDB is the source of truth; live socket delivery is best effort.

### Chat

One sorted participant-pair document with embedded messages. `$slice` keeps
the newest 100. Unfriend deletes the pair document permanently.

## Redis and queue semantics

Redis keys have TTLs to prevent stale battles and locks. Battle state is
ephemeral but intentionally survives a socket reconnect. The Redis adapter
allows a user connected to one API process to receive events published by
another process.

BullMQ jobs are delayed, retryable, and idempotency-guarded. A `202 waiting`
matchmaking response means the HTTP request is finished; the browser must keep
the battle socket alive and wait for `STARTING_BATTLE`, `NO_OPPONENT_FOUND`, or
`BATTLE_ERROR`.

Important worker transitions:

1. Matchmaking atomically claims a compatible waiting user.
2. If no human opponent is found, a delayed bot fallback may run.
3. A battle starts with sanitized questions and a Redis state document.
4. `next_question` emits the question and schedules a 45-second timeout.
5. Answers increment state atomically; the second answer advances the round.
6. Timeout records unanswered state and advances.
7. Disconnect schedules a short grace-period forfeit; reconnect cancels it.
8. Finalization writes history/report once, cleans Redis/jobs, emits result,
   and synchronizes leaderboard scores.

## Request pipeline and errors

```text
HTTP
 -> CORS/security/body/upload middleware
 -> authentication when route requires it
 -> Zod validation when route defines it
 -> controller
 -> service
 -> MongoDB/Redis/queue
 -> ApiResponse
```

Socket authentication occurs during namespace handshake. Socket operation
errors are returned by acknowledgement or a namespace-specific error event.
Never assume a socket event was persisted until its acknowledgement says
success.

## Consistency rules

- Reads are safe to repeat.
- Mutations must not be blindly retried after a lost response.
- After a lost mutation response, reload authoritative state first.
- A socket reconnect replaces state with a snapshot.
- A live message/event may arrive twice; deduplicate by durable ID.
- A notification may be persisted even when live delivery fails.
- A leaderboard may briefly lag finalization; refresh after result.
- A user can be zero-score and must not be treated as absent.

## Security and rendering

Access tokens are short-lived and refresh tokens are HTTP-only. Render chat,
notification, profile, and username text as text, not executable HTML. Treat
Cloudinary/avatar/question-image URLs as external untrusted URLs. Do not expose
correct answers before the academic submission/review phase.
