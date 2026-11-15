# Auth and Academic Frontend Contract

All paths are relative to `/api/v1`. Authentication routes deliberately use
`Cache-Control: no-store`. Academic routes require the current access token.

## Authentication

### `POST /auth/register`

Request is `multipart/form-data`; JSON is not accepted for the avatar flow.

| Field | Required | Rules |
|---|---:|---|
| `username` | Yes | Trimmed, at least 3 characters; stored lowercase |
| `email` | Yes | Valid email; normalized lowercase |
| `password` | Yes | Minimum validator length |
| `avatar` | Yes | Image file, less than 5 MB |

Successful `201` data:

```json
{
  "userProfile": {
    "id": "ObjectId",
    "username": "student",
    "email": "student@example.com",
    "avatar": "https://...",
    "isEmailVerified": false
  }
}
```

The account cannot password-login before email verification. Common errors:

- `400`: invalid fields, unsupported upload, duplicate username/email, or
  registration data rejected.
- `413`/upload error: file too large or not an image.
- `503`: email queue/dependency unavailable after account creation handling.

### `POST /auth/login`

```json
{ "email": "student@example.com", "password": "secret" }
```

Success returns an access token and sets the HTTP-only refresh cookie:

```json
{
  "accessToken": "short-lived-token",
  "userProfile": {
    "id": "ObjectId",
    "username": "student",
    "email": "student@example.com",
    "role": "MEMBER",
    "tier": "FREE"
  }
}
```

Errors: `400` validation; `401` wrong credentials; `403` inactive account,
unverified email, or social-provider account requiring its provider login.

### Refresh/logout/password/email flows

`POST /auth/refresh` has no JSON body and requires the refresh cookie. It
rotates the refresh token and invalidates the previous session token:

```json
{
  "user": { "id": "ObjectId", "username": "student", "email": "..." },
  "accessToken": "new-token"
}
```

On any malformed, expired, revoked, or missing cookie, treat the result as a
logged-out state. Clear the cookie server-side and route to login; do not keep
retrying.

`POST /auth/logout` accepts cookies with or without a current access token. It
is intentionally graceful: even a corrupt/missing cookie is cleaned and the
client can safely return to the logged-out state. `POST /auth/logout-all`
requires authentication and invalidates all sessions.

`POST /auth/forgot-password`:

```json
{ "email": "student@example.com" }
```

The response must not reveal whether the account exists. `POST
/auth/reset-password/:token` accepts `{ "password": "new-password" }`; the
token is a 64-character hexadecimal reset token. `POST
/auth/change-password` accepts `currentPassword` and `newPassword`, requires
authentication, and terminates other sessions.

`POST /auth/verify-email/:token` uses a 64-character hexadecimal token and
returns an access token plus refresh cookie. `POST
/auth/send-verification-email` accepts `{ "email": "..." }`.

Google OAuth is a browser redirect flow: navigate to `/auth/google`; Google
returns to `/auth/google/callback`. The backend sets the HTTP-only refresh
cookie and places the short-lived access token in the callback URL fragment
(`/#token=...`), which the frontend must read once, store in memory, and
immediately remove from the address bar. Do not treat the callback as a JSON
API or store either token in localStorage.

## Academic data model

Academic practice is deliberately not timed. There is no answer duration,
attempt status, or manual completion status.

Each user/subject/chapter has a `ChapterReport`:

```json
{
  "right_pool": ["questionId"],
  "wrong_pool": ["questionId"],
  "wrong_answers": {
    "questionId": "খ"
  },
  "total_right_answer": 12,
  "total_wrong_answer": 5
}
```

`right_pool` and `wrong_pool` describe the current state of each question.
`wrong_answers` stores the most recent incorrect choice for review.
`total_right_answer` and `total_wrong_answer` are cumulative answer-attempt
counters. Every submitted answer increments exactly one counter, even when the
same question was answered before. Moving a question from wrong to right
changes the pools but does not erase historical counters.

Analytics:

```text
total_attempts = total_right_answer + total_wrong_answer
accuracy = total_right_answer / total_attempts * 100
```

If there are no attempts, accuracy is `0`. Completion is separate:

```text
completed_questions = right_pool.length
remaining_questions = max(0, total_questions - completed_questions)
completion_percentage = completed_questions / total_questions * 100
```

Therefore a chapter may have `accuracy: 60` while `completion_percentage:
100`; accuracy is historical performance, not current pool state.

### Question shape

Remaining pages intentionally omit the correct answer:

```json
{
  "_id": "ObjectId",
  "board": "DHAKA",
  "college": null,
  "year": 2024,
  "question_number": "12",
  "context": null,
  "question": "Question text",
  "options": ["...", "...", "...", "..."],
  "sub_statements": [],
  "sub_question": null,
  "has_image": false,
  "image": null,
  "subject_code": "BIO",
  "chapter": 1
}
```

### `GET /academic/remaining-questions`

Query:

```text
subject_code= BIO
chapter= 1
limit= 600
cursor= optional-question-id
```

`limit` defaults to 50 and has a maximum of 600. `cursor` is the last
question `_id` from the previous response. Results exclude `right_pool`, but
wrong-pool questions remain available for practice.

Data:

```json
{
  "questions": [],
  "next_cursor": "ObjectId-or-null",
  "has_more": false,
  "progress": {
    "total_questions": 100,
    "completed_questions": 20,
    "wrong_questions": 5,
    "remaining_questions": 80,
    "completion_percentage": 20,
    "total_right_answer": 24,
    "total_wrong_answer": 10,
    "total_attempts": 34,
    "accuracy": 70.59
  }
}
```

Errors: `400` missing/invalid subject, chapter, limit, or cursor; `404` no
eligible questions exist for the subject/chapter.

### `POST /academic/submit-answer`

```json
{
  "subject_code": "BIO",
  "chapter": 1,
  "answers": [
    { "question_id": "ObjectId", "answer": "ক" },
    { "question_id": "ObjectId", "answer": "খ" }
  ]
}
```

Allowed answer keys are `ক`, `খ`, `গ`, `ঘ`. IDs must be unique, valid, belong
to the requested subject/chapter, and the batch must be within the configured
maximum of 100.

The server calculates correctness from MongoDB, updates pools atomically per
question, increments the cumulative right/wrong counter, and returns:

```json
{
  "results": [
    {
      "question_id": "ObjectId",
      "selected_answer": "ক",
      "correct_answer": "খ",
      "correct": false
    }
  ],
  "progress": {}
}
```

After submission, render a batch result view that lists every submitted question,
the selected answer, and the correct option. The answer key is returned only
after the user's submission; it is not included in the remaining-question
response. The academy navigation is subject-first: `/academy` lists subjects,
`/academy/:subject` lists chapters and wrong-answer review links, and opening a
chapter presents the batch-size setup before the questions.

Errors: `400` invalid answer key, duplicate IDs, invalid IDs, batch too large,
or question IDs not belonging to the chapter; `404` chapter has no eligible
questions; `500` means the batch was not safely completed and should be
reloaded before retrying.

### Wrong/right review

`GET /academic/wrong-questions` uses the same query as remaining questions but
selects only `wrong_pool` and includes:

```json
{
  "selected_answer": "খ",
  "correct_answer": "গ"
}
```

The frontend must show `selected_answer` red and `correct_answer` green. A
missing selected answer is `null` only for legacy/incomplete data.

`GET /academic/right-questions` selects `right_pool` and includes the answer
field so the correct option can be shown.

### `POST /academic/mark-as-done`

```json
{
  "subject_code": "BIO",
  "chapter": 1,
  "question_ids": ["ObjectId"]
}
```

Only IDs currently in `wrong_pool` move to `right_pool`; cumulative counters
are unchanged. This action is not an answer attempt. Response:

```json
{ "marked_count": 2, "progress": {} }
```

### Reset

Preferred `POST /academic/reset` body:

```json
{ "subject_code": "BIO", "chapters": [1, 2, 3] }
```

The array must contain unique positive chapter numbers and is bounded by the
academic batch limit. The matching chapter reports and subject links are
deleted, including historical counters for those reset chapters:

```json
{ "reset_chapters": [1, 2, 3], "deleted_chapters": 3 }
```

`DELETE /academic/delete` is a backward-compatible alias with the same body
and behavior.

### `GET /academic/report`

Query: `subject_code`.

The response contains one entry per chapter and a totals object. Each chapter
has `total_questions`, `completed_questions`, `wrong_questions`,
`remaining_questions`, `completion_percentage`, `total_right_answer`,
`total_wrong_answer`, `total_attempts`, and `accuracy`. Totals sum the same
fields across chapters and calculate total accuracy from total counters, not
from an average of chapter percentages.

## Academic UI state machine

```text
load remaining
  ├─ 200 -> render questions and progress
  ├─ 401 -> refresh once
  ├─ 404 -> show empty/unavailable chapter
  └─ other -> retry state

submit batch
  ├─ 200 -> show overall batch score and each selected/correct option
  ├─ result page -> allow another batch, chapter review, or subject navigation
  ├─ 400 -> keep answers, show validation, do not silently discard
  └─ 409/5xx -> reload chapter before allowing retry

wrong review -> mark-as-done -> replace wrong/right lists and report
reset -> clear local chapter state and request fresh remaining questions
```
