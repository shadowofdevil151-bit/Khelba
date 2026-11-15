# Khelba — Bengali HSC learning + competitive quiz

## What it does
- MCQ academy (practice / wrong review / chapter browse)
- Live 1v1 battles (Redis-backed state, WebSocket, bot fallback)
- Chapter notes
- Friends + chat
- Leaderboard + streaks

## Stack
- Backend: Node.js, Express, MongoDB, Redis, BullMQ, Socket.IO (in `/src`, `app.js`, `server.js`)
- Frontend: Next.js App Router, Tailwind (in `/frontend`)
- Real-time battle orchestration: see `/docs/battle-architecture.md`

## Local setup
Backend:
  cp .env.example .env   # fill in
  npm install
  npm run dev
Frontend:
  cd frontend && cp .env.example .env.local
  npm install && npm run dev

## Design docs
See `/docs` for API endpoints, battle state model, and report schema.