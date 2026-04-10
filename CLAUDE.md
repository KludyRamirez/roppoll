# RopPoll — CLAUDE.md

## Project Overview

Full-stack social polling app. Users post two-option polls, others vote, and when the timer expires an AI gives its opinion. The final screen shows Human results vs AI opinion in real time.

- **Frontend:** React + TypeScript (Vite), port 5173
- **Backend:** ASP.NET Web API (.NET 10), port 5153
- **Database:** PostgreSQL 17

---

## How to Run

**Prerequisite:** Ensure PostgreSQL is running.
```bash
brew services start postgresql@17
```

**Terminal 1 — Backend:**
```bash
cd backend
dotnet run
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
```

App is at **http://localhost:5173**.

---

## Development Workflow

Follow this loop for every change:

```
write → lint → type check → test → fix → repeat → push
```

### Frontend
```bash
cd frontend

# 1. Lint
npm run lint

# 2. Type check
npx tsc --noEmit

# 3. Build (catches any remaining errors)
npm run build
```

### Backend
```bash
cd backend

# 1. Type check + build
dotnet build

# 2. Manual API test (curl or the test script below)
curl -s http://localhost:5153/api/polls
```

### Push
Only push when lint, type check, and build all pass cleanly.
```bash
git add <files>
git commit -m "description"
git push
```

CI runs automatically on push (`.github/workflows/ci.yml`) — backend build + frontend tsc + vite build in parallel.

---

## Tech Stack

### Backend
| Package | Purpose |
|---|---|
| `Npgsql.EntityFrameworkCore.PostgreSQL` | EF Core driver for PostgreSQL |
| `Microsoft.EntityFrameworkCore.Design` | Enables `dotnet ef` CLI migrations |
| `Microsoft.AspNetCore.Authentication.JwtBearer` | JWT validation middleware |
| `BCrypt.Net-Next` | Password hashing |
| `OpenAI` | GPT-4o-mini opinion on poll expiry |

### Frontend
| Package | Purpose |
|---|---|
| `axios` | HTTP client with interceptors |
| `@tanstack/react-query` | Server state, caching, mutations |
| `zustand` | Client state (auth user, access token) |
| `react-router-dom` | Client-side routing |
| `async-mutex` | Prevents race conditions on token refresh |
| `@microsoft/signalr` | Real-time poll expiry updates |

---

## Project Structure

```
roppoll/
├── backend/
│   ├── Controllers/
│   │   ├── AuthController.cs         # Auth endpoints (register, login, refresh, etc.)
│   │   └── PollsController.cs        # Poll CRUD + voting
│   ├── Data/AppDbContext.cs           # EF Core DbContext
│   ├── Dtos/
│   │   ├── AuthDtos.cs               # Auth request/response shapes
│   │   └── PollDtos.cs               # Poll request/response shapes
│   ├── Hubs/PollHub.cs               # SignalR hub — receives real-time broadcasts
│   ├── Models/
│   │   ├── User.cs
│   │   ├── RefreshToken.cs
│   │   ├── PasswordResetToken.cs
│   │   ├── Poll.cs                   # PollStatus + AiStatus enums
│   │   ├── PollOption.cs
│   │   └── Vote.cs
│   ├── Services/
│   │   ├── ClaudeService.cs          # OpenAI gpt-4o-mini opinion (IClaudeService)
│   │   ├── EmailService.cs           # Gmail SMTP password reset (IEmailService)
│   │   └── PollExpiryService.cs      # BackgroundService — expires polls + calls AI
│   ├── Program.cs                    # App config + middleware pipeline
│   └── appsettings.json              # Non-sensitive config only
│
├── frontend/src/
│   ├── lib/
│   │   ├── axios.ts                  # Axios instance + interceptors + Mutex
│   │   └── signalr.ts                # HubConnectionBuilder factory
│   ├── stores/authStore.ts           # Zustand store (user, isLoading)
│   ├── hooks/
│   │   ├── useAuth.ts                # Auth mutations (login, register, logout, etc.)
│   │   ├── usePolls.ts               # Poll queries + mutations
│   │   └── usePollHub.ts             # SignalR subscription — patches feed cache
│   ├── types/poll.ts                 # Poll/PollOption types + DURATION_OPTIONS
│   ├── components/PollCard.tsx       # Expandable inline poll card
│   └── pages/
│       ├── LoginPage.tsx
│       ├── RegisterPage.tsx
│       ├── ForgotPasswordPage.tsx
│       ├── ResetPasswordPage.tsx
│       ├── PollFeedPage.tsx          # Main feed (nav + poll list + SignalR)
│       └── CreatePollPage.tsx        # Create poll form
│
├── .github/workflows/ci.yml          # CI: backend build + frontend tsc + vite build
├── ARCHITECTURE.md                   # Full system design explanation
└── CLAUDE.md                         # This file
```

---

## API Endpoints

### Auth

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Create account, returns JWT + sets refresh cookie |
| POST | `/api/auth/login` | Public | Login, returns JWT + sets refresh cookie |
| POST | `/api/auth/refresh` | Public | Exchange refresh cookie for new token pair |
| GET | `/api/auth/me` | `[Authorize]` | Returns current user from JWT claims |
| POST | `/api/auth/logout` | Public | Revokes refresh token + clears cookie |
| POST | `/api/auth/forgot-password` | Public | Emails reset link (always returns 200) |
| POST | `/api/auth/reset-password` | Public | Validates token, updates password, revokes all sessions |

### Polls

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/polls` | `[Authorize]` | Create a poll (question + 2 options + duration) |
| GET | `/api/polls` | Public | Paginated feed, newest first |
| GET | `/api/polls/{id}` | Public | Single poll |
| POST | `/api/polls/{id}/vote` | `[Authorize]` | Cast a vote (one per user, active polls only) |

### Real-time

| Endpoint | Protocol | Description |
|---|---|---|
| `/hubs/polls` | SignalR (WebSocket) | Server pushes `PollUpdated` when a poll expires |

---

## Database

**Connection:** managed via User Secrets (not in appsettings.json).

```bash
# View secrets
cd backend && dotnet user-secrets list

# Update connection string
dotnet user-secrets set "ConnectionStrings:Default" "Host=localhost;Database=roppoll;Username=roppoll_user;Password=roppoll_secret"
```

**Migrations:**
```bash
cd backend
dotnet ef migrations add <MigrationName>
dotnet ef database update
```

**Tables:** `Users`, `RefreshTokens`, `PasswordResetTokens`, `Polls`, `PollOptions`, `Votes`

---

## Secrets (User Secrets — never in git)

All sensitive values are stored in `~/.microsoft/usersecrets/`. To configure:

```bash
cd backend
dotnet user-secrets set "ConnectionStrings:Default" "Host=localhost;Database=roppoll;Username=roppoll_user;Password=roppoll_secret"
dotnet user-secrets set "Jwt:Key" "<min-32-char-secret>"
dotnet user-secrets set "Email:SenderEmail" "your@gmail.com"
dotnet user-secrets set "Email:AppPassword" "your-16-char-app-password"
dotnet user-secrets set "OpenAI:ApiKey" "sk-..."
```

Non-sensitive config (SMTP server, JWT issuer, token lifetimes) lives in `appsettings.json` and is safe to commit.

---

## Key Architecture Decisions

- **Access token** (15 min JWT) → stored in JS memory, sent via `Authorization` header
- **Refresh token** (7 days, random string) → stored in DB + HttpOnly cookie (XSS-safe)
- **Token rotation** → every refresh revokes the old token and issues a new one
- **Mutex** (`async-mutex`) → prevents duplicate refresh calls when multiple requests fail with 401 simultaneously
- **Page reload** → `App.tsx` calls `refreshAuth()` on mount, restoring the session from the cookie
- **Forgot password** → always returns 200 regardless of whether email exists (prevents enumeration)
- **Password reset** → revokes all active refresh tokens (logs out all devices)
- **Poll expiry** → `PollExpiryService` ticks every 30s, marks expired polls, calls GPT-4o-mini, broadcasts via SignalR
- **SignalR broadcast** → server-to-client only; user-specific fields (`isCreator`, `hasVoted`) are preserved from the client's local cache
- **Inline feed** → no detail page; polls expand in-place on the feed

Full explanation: see [ARCHITECTURE.md](ARCHITECTURE.md).
