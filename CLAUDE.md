# RopPoll — CLAUDE.md

## Project Overview

Full-stack web application with end-to-end JWT authentication (login, register, forgot/reset password).

- **Frontend:** React + TypeScript (Vite), port 5173
- **Backend:** ASP.NET Web API (.NET 10), port 5000
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
dotnet run --urls "http://localhost:5000"
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
```

App is at **http://localhost:5173**.

---

## Tech Stack

### Backend
| Package | Purpose |
|---|---|
| `Npgsql.EntityFrameworkCore.PostgreSQL` | EF Core driver for PostgreSQL |
| `Microsoft.EntityFrameworkCore.Design` | Enables `dotnet ef` CLI migrations |
| `Microsoft.AspNetCore.Authentication.JwtBearer` | JWT validation middleware |
| `BCrypt.Net-Next` | Password hashing |

### Frontend
| Package | Purpose |
|---|---|
| `axios` | HTTP client with interceptors |
| `@tanstack/react-query` | Server state, caching, mutations |
| `zustand` | Client state (auth user, access token) |
| `react-router-dom` | Client-side routing |
| `async-mutex` | Prevents race conditions on token refresh |

---

## Project Structure

```
roppoll/
├── backend/
│   ├── Controllers/AuthController.cs     # All 6 auth endpoints
│   ├── Data/AppDbContext.cs              # EF Core DbContext
│   ├── Dtos/AuthDtos.cs                 # Request/Response shapes
│   ├── Models/
│   │   ├── User.cs
│   │   ├── RefreshToken.cs
│   │   └── PasswordResetToken.cs
│   ├── Services/EmailService.cs          # Gmail SMTP (IEmailService)
│   ├── Program.cs                        # App config + middleware pipeline
│   └── appsettings.json                  # Non-sensitive config only
│
├── frontend/src/
│   ├── lib/axios.ts                      # Axios instance + interceptors + Mutex
│   ├── stores/authStore.ts               # Zustand store
│   ├── hooks/useAuth.ts                  # Auth mutations (login, register, logout, etc.)
│   ├── hooks/usePolls.ts                 # Poll queries + mutations
│   ├── types/poll.ts                     # Poll/PollOption types + DURATION_OPTIONS
│   ├── components/PollCard.tsx           # Expandable inline poll card
│   └── pages/
│       ├── LoginPage.tsx
│       ├── RegisterPage.tsx
│       ├── ForgotPasswordPage.tsx
│       ├── ResetPasswordPage.tsx
│       ├── PollFeedPage.tsx              # Main feed (nav + poll list)
│       └── CreatePollPage.tsx            # Create poll form
│
├── ARCHITECTURE.md                       # Full system design explanation
└── CLAUDE.md                             # This file
```

---

## Auth Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Create account, returns JWT + sets refresh cookie |
| POST | `/api/auth/login` | Public | Login, returns JWT + sets refresh cookie |
| POST | `/api/auth/refresh` | Public | Exchange refresh cookie for new token pair |
| GET | `/api/auth/me` | `[Authorize]` | Returns current user from JWT claims |
| POST | `/api/auth/logout` | Public | Revokes refresh token + clears cookie |
| POST | `/api/auth/forgot-password` | Public | Emails reset link (always returns 200) |
| POST | `/api/auth/reset-password` | Public | Validates token, updates password, revokes all sessions |

---

## Database

**Connection:** managed via User Secrets (not in appsettings.json).

```bash
# View secrets
cd backend && dotnet user-secrets list

# Update a secret
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
dotnet user-secrets set "Claude:ApiKey" "sk-ant-..."
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

Full explanation: see [ARCHITECTURE.md](ARCHITECTURE.md).
