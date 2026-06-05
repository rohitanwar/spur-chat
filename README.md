# Spur AI Support Chat

A mini AI customer support agent with a live chat widget. Built as a take‑home assignment for Spur’s founding full‑stack engineer role.

- **Backend:** Node.js + TypeScript, Express, PostgreSQL, Redis, OpenAI‑compatible LLM
- **Frontend:** Svelte + TypeScript (Vite)

---

## Features

- Persistent chat sessions with full conversation history
- AI agent that answers store FAQs using a real LLM
- Works with any OpenAI‑compatible API (OpenAI, Anthropic, local Ollama, etc.)
- Session sidebar for switching between conversations
- Mobile‑friendly with collapsible sidebar
- Robust input validation and graceful error handling

---

## How to run locally (without Docker)

### Prerequisites
- Node.js ≥ 22
- PostgreSQL (local or remote)
- Redis (optional; the app runs without it)

### 1. Clone the repo
```bash
git clone <repo-url>
cd spur-chat
```

### Backend setup
```bash
cd backend
cp .env.example .env
# Edit .env with your LLM API key, database URL, etc.
npm install
npm run dev          # starts on http://localhost:3000
```

### Frontend setup
```bash
cd frontend
npm install
# Create .env for frontend config (optional, defaults to localhost)
echo "VITE_API_BASE=http://localhost:3000/api/chat" > .env
npm run dev             # starts on http://localhost:5173
```

### DB Setup

Run the following SQL inside the psql prompt.

```sql
CREATE USER spur_user WITH PASSWORD 'spur_password';
CREATE DATABASE spur_chat OWNER spur_user;
\q
```

### Redis (optional)

Make sure Redis is running on the default port (6379).

## Docker setup

A single docker-compose.yml at the project root launches PostgreSQL, Redis, and the backend (the frontend is served separately by nginx or Vite dev server).

### 1. Set your API Key

```bash
export LLM_API_KEY=sk-...
```
Or create a .env file in the project root (same level as docker-compose.yml) with:

```bash
LLM_API_KEY=sk-...
```

### 2. Start the backend stack

```bash
docker compose up --build
```

- Backend health check: http://localhost:3000/health
- The backend is now accessible at http://localhost:3000

### 3. Frontend

You can run the frontend separately with `npm run dev` in the `frontend` folder, pointing `VITE_API_BASE` to `http://localhost:3000/api/chat`.

## Architecture overview

### Backend
```text
backend/src/
├── index.ts                  # Express app setup, routes, server start
├── config.ts                 # Reads env vars, exports config object
├── types.ts                  # TypeScript interfaces (Message, Conversation)
├── db/
│   ├── index.ts              # pg Pool, runs migrations on startup
│   └── migrations/
│       └── 001_initial.sql   # Creates conversations & messages tables
├── cache/
│   └── cacheService.ts       # Redis wrapper; gracefully degrades if Redis is down
├── services/
│   ├── chatService.ts        # Core message handling: validation, persistence, LLM call
│   └── llmService.ts         # LLM provider abstraction (OpenAI‑compatible)
├── routes/
│   ├── chat.ts               # POST /api/chat/message
│   ├── history.ts            # GET /api/chat/history/:sessionId
│   └── sessions.ts           # GET /api/chat/sessions
└── middleware/
    └── errorHandler.ts       # Global Express error handler
```

### Key design decision:

- Key design decisions:
- Cache‑aside with invalidation: After saving a new message, the Redis cache is deleted and the full history is re‑fetched from the DB. This ensures the LLM never sees stale context.
- LLM abstraction: The llmService uses config.llmBaseUrl and config.llmModel so you can switch providers with zero code changes.
- Input validation: Empty messages and messages over 2000 characters are rejected with a 400 status and a descriptive error.
- Error handling: All LLM API failures (auth, rate limits, timeouts) are caught and returned as a friendly string; the frontend displays them like a normal AI reply.
- Session persistence: sessionId is stored in localStorage. On reload, the full history is fetched from the backend.

### Frontend 

```text
frontend/src/
├── App.svelte    # Main chat UI with sidebar, message list, input, and mobile toggle
├── main.ts       # Vite entry point
└── config.ts     # (optional) typed config using import.meta.env
```

The Svelte app is a single component that manages all chat state. It uses fetch to call the backend, with optimistic UI updates and automatic scrolling. On mobile, the sidebar becomes a slide‑out drawer.

## LLM Notes

- Provider: Works with any OpenAI‑compatible API. Set LLM_BASE_URL and LLM_MODEL to use Anthropic, local Ollama, etc. Default is gpt-4o-mini.
- Prompting: The system prompt hard‑codes store policies (shipping, returns, support hours). Conversation history is sent as alternating user/assistant messages for context. The model is instructed to answer concisely and offer a human agent for anything outside the policies.

## Trade‑offs & “If I had more time”

- Streaming: Responses are not streamed. Streaming would greatly improve perceived responsiveness.
- Rate limiting: No rate limiting on the chat endpoint. Adding express-rate-limit with Redis would be straightforward.
- FAQ data: Store policies are hard‑coded. Moving them to a database and injecting only relevant facts (simple RAG) would make the agent more scalable.
- Authentication: No user authentication. A production system would need at least a session token or user login.
- Migration tooling: The migration runs inline at startup. A proper migration library (e.g., node-pg-migrate) would support rollbacks and versioning.

## License

MIT License