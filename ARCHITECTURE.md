# RopPoll Authentication Architecture

A complete guide to how the authentication system works end-to-end, from database to browser.

---

## Table of Contents

1. [High-Level Overview](#high-level-overview)
2. [Why This Stack?](#why-this-stack)
3. [Security Model: Access Token vs Refresh Token](#security-model-access-token-vs-refresh-token)
4. [Backend (ASP.NET + PostgreSQL)](#backend-aspnet--postgresql)
   - [Database Schema](#database-schema)
   - [Entity Framework Core](#entity-framework-core)
   - [JWT Generation](#jwt-generation)
   - [Password Hashing with BCrypt](#password-hashing-with-bcrypt)
   - [Auth Endpoints](#auth-endpoints)
   - [Program.cs Middleware Pipeline](#programcs-middleware-pipeline)
5. [Frontend (React + Vite)](#frontend-react--vite)
   - [Axios Instance & Interceptors](#axios-instance--interceptors)
   - [The Mutex Problem & Solution](#the-mutex-problem--solution)
   - [Zustand Auth Store](#zustand-auth-store)
   - [TanStack Query Hooks](#tanstack-query-hooks)
   - [Page Reload: How Sessions Survive](#page-reload-how-sessions-survive)
6. [The Complete Auth Flow](#the-complete-auth-flow)
   - [Registration](#1-registration)
   - [Login](#2-login)
   - [Making Authenticated Requests](#3-making-authenticated-requests)
   - [Access Token Expires → Auto-Refresh](#4-access-token-expires--auto-refresh)
   - [Page Reload → Session Restore](#5-page-reload--session-restore)
   - [Logout](#6-logout)
7. [Forgot Password Flow](#forgot-password-flow)
   - [How It Works](#how-it-works)
   - [Security Decisions](#security-decisions)
   - [Gmail SMTP Setup](#gmail-smtp-setup)
   - [Forgot Password Sequence Diagram](#forgot-password-sequence-diagram)
8. [Token Rotation: Why It Matters](#token-rotation-why-it-matters)
9. [Project Structure](#project-structure)
10. [Common Questions](#common-questions)

---

## High-Level Overview

```
┌─────────────────────────────────────────────────────┐
│  React Frontend (Vite, port 5173)                   │
│  ┌───────────┐  ┌──────────┐  ┌──────────────────┐ │
│  │  Zustand   │  │ TanStack │  │  Axios Instance  │ │
│  │  (auth     │  │  Query   │  │  + Interceptors  │ │
│  │   store)   │  │  (hooks) │  │  + Mutex lock    │ │
│  └───────────┘  └──────────┘  └──────────────────┘ │
│         ↕              ↕               ↕            │
│    Access Token    API calls     Auto-refresh       │
│    in memory       via hooks     when 401           │
└────────────────────────┬────────────────────────────┘
                         │ REST API (JSON over HTTP)
┌────────────────────────┴────────────────────────────┐
│  ASP.NET Backend (port 5000)                        │
│  ┌──────────────┐  ┌────────────────────────────┐   │
│  │ AuthController│  │ JWT Access Token (15 min)  │   │
│  │  /register    │  │ Refresh Token (7 days)     │   │
│  │  /login       │  │   stored in DB             │   │
│  │  /refresh     │  │   sent as HttpOnly cookie  │   │
│  │  /logout      │  └────────────────────────────┘   │
│  │  /me          │                                   │
│  └──────────────┘                                    │
│         ↕                                            │
│  Entity Framework Core (ORM)                         │
└────────────────────────┬─────────────────────────────┘
                         │ SQL
                   ┌─────┴─────┐
                   │ PostgreSQL │
                   │  (port 5432) │
                   └───────────┘
```

The frontend and backend are completely separate applications. They communicate exclusively through REST API calls (JSON over HTTP). The frontend runs on port 5173 (Vite dev server), the backend on port 5000 (ASP.NET Kestrel).

---

## Why This Stack?

| Technology | Role | Why we chose it |
|---|---|---|
| **React** | UI framework | Component-based, huge ecosystem, industry standard |
| **Vite** | Build tool | Blazing fast HMR (Hot Module Replacement), modern ESM-based |
| **Axios** | HTTP client | Interceptors let us auto-attach tokens and auto-refresh on 401 |
| **TanStack Query** | Server state management | Caching, loading/error states, automatic re-fetching |
| **Zustand** | Client state management | Minimal boilerplate, no providers needed, great TypeScript support |
| **async-mutex (Mutex)** | Concurrency control | Prevents multiple simultaneous token refresh requests |
| **ASP.NET** | Backend framework | Strongly typed, high performance, built-in JWT middleware |
| **Entity Framework Core** | ORM | Maps C# classes to database tables, handles migrations |
| **PostgreSQL** | Database | Reliable, feature-rich relational database |
| **BCrypt** | Password hashing | Industry standard, auto-salting, resistant to brute force |
| **JWT** | Access tokens | Stateless authentication — server doesn't need to look up sessions |

### Why Zustand AND TanStack Query?

This is a common question. They serve different purposes:

- **Zustand** manages **client state** — things that exist only in the browser: "Is the user logged in? What's their access token?" These aren't fetched from the server repeatedly; they're set once and updated on login/logout.

- **TanStack Query** manages **server state** — data that comes from the API: "What does the /me endpoint return? Is it loading? Is it stale?" It handles caching, background re-fetching, and deduplication.

You *could* do everything in Zustand, but you'd end up reimplementing caching, loading states, and stale-while-revalidate logic that TanStack Query gives you for free.

---

## Security Model: Access Token vs Refresh Token

This is a **dual-token** authentication system. Understanding why we use two tokens is critical.

### The Problem with a Single Token

If you use just one long-lived token:
- **Stored in localStorage?** → Vulnerable to XSS (Cross-Site Scripting). Any malicious script can read `localStorage` and steal the token.
- **Stored in an HttpOnly cookie?** → Safe from XSS, but vulnerable to CSRF (Cross-Site Request Forgery) unless you add CSRF protection.
- **Short-lived?** → Users have to log in every 15 minutes. Terrible UX.
- **Long-lived?** → If stolen, the attacker has access for weeks.

### The Two-Token Solution

| | Access Token | Refresh Token |
|---|---|---|
| **Purpose** | Authenticate API requests | Get new access tokens |
| **Lifetime** | Short (15 minutes) | Long (7 days) |
| **Stored where** | JavaScript memory (variable) | HttpOnly cookie |
| **Sent how** | `Authorization: Bearer <token>` header | Automatically by browser (cookie) |
| **Can JS read it?** | Yes (it's in a variable) | **No** (HttpOnly flag) |
| **If stolen** | Attacker has 15 min of access | Can't be stolen by XSS |
| **Format** | JWT (contains user claims) | Random string (opaque) |

### Why this is secure:

1. **XSS attack?** The attacker can read the access token from memory, but it expires in 15 minutes. They **cannot** read the refresh token because it's HttpOnly.

2. **CSRF attack?** The refresh token cookie is sent automatically, but the attacker can't read the response. They'd get a new access token set in the response body, but CORS prevents them from reading cross-origin responses.

3. **Token stolen from network?** HTTPS encrypts everything in transit.

4. **Database breach?** Refresh tokens in the DB are hashed/can be revoked. Passwords are hashed with BCrypt (irreversible).

---

## Backend (ASP.NET + PostgreSQL)

### Database Schema

Two tables in PostgreSQL:

```
┌──────────────────────────┐       ┌───────────────────────────────┐
│         Users             │       │       RefreshTokens            │
├──────────────────────────┤       ├───────────────────────────────┤
│ Id          (int, PK)     │──┐    │ Id          (int, PK)          │
│ Email       (text, unique)│  │    │ Token       (text, indexed)    │
│ PasswordHash(text)        │  │    │ ExpiresAt   (timestamp)        │
│ CreatedAt   (timestamp)   │  └───>│ UserId      (int, FK → Users)  │
└──────────────────────────┘       │ IsRevoked   (bool)             │
                                    │ CreatedAt   (timestamp)        │
                                    └───────────────────────────────┘
```

**Key design decisions:**
- `Email` has a unique index — prevents duplicate registrations at the DB level
- `Token` has an index — fast lookups when validating refresh tokens
- `IsRevoked` enables token rotation (explained later)
- One user can have many refresh tokens (one per device/session)

**Corresponding C# models:**

```
backend/Models/User.cs          → Maps to the Users table
backend/Models/RefreshToken.cs  → Maps to the RefreshTokens table
```

### Entity Framework Core

EF Core is an **ORM (Object-Relational Mapper)**. Instead of writing raw SQL, you work with C# objects and EF Core translates them to SQL.

```csharp
// Instead of: INSERT INTO Users (Email, PasswordHash) VALUES ('...', '...')
// You write:
var user = new User { Email = "...", PasswordHash = "..." };
db.Users.Add(user);
await db.SaveChangesAsync();

// Instead of: SELECT * FROM Users WHERE Email = '...'
// You write:
var user = await db.Users.FirstOrDefaultAsync(u => u.Email == email);
```

**The DbContext** (`backend/Data/AppDbContext.cs`) is the main class:
- It inherits from `DbContext` (EF Core's base class)
- Each `DbSet<T>` property maps to a table
- `OnModelCreating` configures indexes and constraints

**Migrations** are how EF Core manages schema changes:
```bash
dotnet ef migrations add InitialCreate  # Generates a migration file
dotnet ef database update               # Applies it to PostgreSQL
```

This created the actual tables in the database based on our C# models.

### JWT Generation

A JWT (JSON Web Token) has three parts separated by dots: `header.payload.signature`

```
eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIiwiZW1haWwiOiJ0ZXN0QHRlc3QuY29tIiwiZXhwIjoxNzE1MH0.abc123signature
```

**Header:** Algorithm used (HS256) — `{"alg": "HS256"}`
**Payload:** Claims (data) — `{"sub": "1", "email": "test@test.com", "exp": 1715000}`
**Signature:** HMAC-SHA256(header + payload, secret_key)

In our code (`AuthController.cs`, `CreateAuthResponse` method):

```csharp
var claims = new[]
{
    new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),  // "sub" — who is this?
    new Claim(ClaimTypes.Email, user.Email),                    // user's email
    new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()) // unique token ID
};

var token = new JwtSecurityToken(
    issuer: "RopPoll",           // Who issued this token
    audience: "RopPoll",         // Who is it intended for
    claims: claims,              // The data inside the token
    expires: DateTime.UtcNow.AddMinutes(15),  // When it expires
    signingCredentials: credentials            // How it's signed
);
```

The server **signs** the token with a secret key. When a request comes in, the JWT middleware:
1. Decodes the token
2. Verifies the signature matches (proves it wasn't tampered with)
3. Checks the expiration time
4. Extracts the claims (user ID, email) and makes them available via `User.FindFirstValue()`

### Password Hashing with BCrypt

**Never store passwords in plain text.** BCrypt is a one-way hash function:

```csharp
// Registration — hash the password
var hash = BCrypt.Net.BCrypt.HashPassword("mypassword123");
// Result: "$2a$11$K3GfS.yK7VpOxQXzHfVuOe..." (60 characters, includes the salt)

// Login — verify the password against the hash
var isValid = BCrypt.Net.BCrypt.Verify("mypassword123", hash);  // true
var isValid = BCrypt.Net.BCrypt.Verify("wrongpassword", hash);  // false
```

**Why BCrypt specifically?**
- **Auto-salting:** Each password gets a random salt (prevents rainbow table attacks)
- **Adaptive:** You can increase the work factor as hardware gets faster
- **Slow by design:** Takes ~100ms to hash, making brute force impractical

### Auth Endpoints

All endpoints are in `backend/Controllers/AuthController.cs`:

#### `POST /api/auth/register`
```
Request:  { "email": "user@example.com", "password": "secret123" }
Response: { "accessToken": "eyJ...", "user": { "id": 1, "email": "user@example.com" } }
Cookie:   refreshToken=abc123... (HttpOnly, Secure, SameSite=None)
```

Flow:
1. Check if email already exists → 409 Conflict if so
2. Hash the password with BCrypt
3. Save user to database
4. Generate access token (JWT) + refresh token (random string)
5. Save refresh token to database
6. Set refresh token as HttpOnly cookie
7. Return access token + user info in response body

#### `POST /api/auth/login`
```
Request:  { "email": "user@example.com", "password": "secret123" }
Response: { "accessToken": "eyJ...", "user": { "id": 1, "email": "user@example.com" } }
Cookie:   refreshToken=abc123... (HttpOnly, Secure, SameSite=None)
```

Flow:
1. Find user by email → 401 if not found
2. Verify password with BCrypt → 401 if wrong
3. Generate and return tokens (same as register)

**Security note:** The error message is intentionally vague ("Invalid email or password") — never reveal whether the email exists or the password is wrong. This prevents email enumeration attacks.

#### `POST /api/auth/refresh`
```
Request:  (no body — reads the refreshToken cookie)
Response: { "accessToken": "eyJ...", "user": { "id": 1, "email": "user@example.com" } }
Cookie:   refreshToken=NEW_TOKEN... (replaces old cookie)
```

Flow:
1. Read refresh token from HttpOnly cookie
2. Look it up in the database (with the associated User)
3. Validate: exists? not revoked? not expired?
4. **Revoke the old token** (token rotation!)
5. Generate new access token + new refresh token
6. Return new tokens

This endpoint is **not protected** by `[Authorize]` — it's called specifically when the access token has expired.

#### `GET /api/auth/me`
```
Request:  Authorization: Bearer eyJ...
Response: { "id": 1, "email": "user@example.com" }
```

Flow:
1. `[Authorize]` attribute triggers JWT validation middleware
2. Middleware validates token signature, expiry, issuer, audience
3. If valid, extracts claims and puts them on `User` (the `ClaimsPrincipal`)
4. Controller reads the user ID from claims and fetches from database

#### `POST /api/auth/logout`
```
Request:  (reads the refreshToken cookie)
Response: { "message": "Logged out" }
Cookie:   refreshToken=(deleted)
```

Flow:
1. Read refresh token from cookie
2. Mark it as revoked in the database
3. Delete the cookie from the browser

### Program.cs Middleware Pipeline

```csharp
// The order of middleware matters! Requests flow top to bottom.

app.UseCors();             // 1. CORS — allows frontend (port 5173) to call API (port 5000)
app.UseAuthentication();   // 2. Reads JWT from Authorization header, validates it
app.UseAuthorization();    // 3. Enforces [Authorize] attributes on controllers

app.MapControllers();      // 4. Routes request to the correct controller method
```

**Why CORS?** Browsers enforce the Same-Origin Policy — a page on `localhost:5173` cannot call `localhost:5000` without the server explicitly allowing it. Our CORS config says:
- `WithOrigins("http://localhost:5173")` — only allow our frontend
- `AllowCredentials()` — allow cookies to be sent (critical for refresh token!)

**Why does order matter?**
- CORS must run first so the browser's preflight (`OPTIONS`) request gets answered
- Authentication must run before Authorization — you can't check permissions without knowing who the user is

---

## Frontend (React + Vite)

### Axios Instance & Interceptors

**File: `frontend/src/lib/axios.ts`**

We create a custom Axios instance instead of using the global `axios` directly. This lets us configure it once and use it everywhere.

```typescript
const api = axios.create({
  baseURL: "http://localhost:5000/api",
  withCredentials: true,  // ← THIS IS CRITICAL
});
```

**`withCredentials: true`** tells the browser to include cookies with cross-origin requests. Without this, the refresh token cookie would never be sent to the backend.

#### Request Interceptor (runs before every request)

```
Your code calls: api.get("/auth/me")

Interceptor adds the access token:
  → GET /api/auth/me
  → Authorization: Bearer eyJhbGciOi...
```

This means you never have to manually add the token to requests — the interceptor does it automatically.

#### Response Interceptor (runs after every response)

```
API returns 401 (token expired)
  → Interceptor catches it
  → Acquires Mutex lock
  → Calls POST /api/auth/refresh (cookie sent automatically)
  → Gets new access token
  → Retries the original request with new token
  → Releases Mutex lock
  → Your code gets the successful response (never sees the 401!)
```

The `_retry` flag on each request prevents infinite loops — if the retried request also gets a 401, we don't retry again; we redirect to login.

### The Mutex Problem & Solution

**The Problem:**

Imagine the user's access token expires. The frontend has 3 API calls in flight:

```
Request A → 401 (expired token)
Request B → 401 (expired token)
Request C → 401 (expired token)
```

Without a Mutex, all three try to refresh simultaneously:

```
Request A → POST /api/auth/refresh → ✓ Success (old refresh token rotated)
Request B → POST /api/auth/refresh → ✗ FAILS (old token is now revoked!)
Request C → POST /api/auth/refresh → ✗ FAILS (old token is now revoked!)
```

Requests B and C fail because the refresh endpoint uses **token rotation** — the first refresh revokes the old token and issues a new one. The other requests are still trying to use the old token.

**The Solution: async-mutex**

```
Request A → 401 → Acquires Mutex lock → Refreshes token → Retries → Releases lock
Request B → 401 → Waits for Mutex...  → Lock released! → Retries with new token ✓
Request C → 401 → Waits for Mutex...  → Lock released! → Retries with new token ✓
```

Only the first request actually calls the refresh endpoint. The others wait, then retry with the fresh access token that's now stored in memory.

```typescript
const refreshMutex = new Mutex();

// In the response interceptor:
const release = await refreshMutex.acquire();  // Block if another refresh is in progress
try {
  // ... refresh the token ...
} finally {
  release();  // Always release, even if refresh fails
}
```

### Zustand Auth Store

**File: `frontend/src/stores/authStore.ts`**

Zustand creates a global store that any component can subscribe to. When state changes, only components that use the changed piece re-render.

```typescript
const useAuthStore = create<AuthState>((set) => ({
  user: null,         // The logged-in user object (or null)
  isLoading: true,    // True while checking for existing session

  login: async (email, password) => { ... },
  register: async (email, password) => { ... },
  logout: async () => { ... },
  refreshAuth: async () => { ... },
}));
```

**Why `isLoading` starts as `true`:**

When the user refreshes the page:
1. React renders
2. The access token is gone (it was in memory)
3. `user` is `null`
4. Without `isLoading`, the app would redirect to `/login` immediately
5. But `isLoading: true` shows a loading screen instead
6. `refreshAuth()` runs, restores the session from the cookie
7. `isLoading` becomes `false`, `user` is populated
8. App renders the dashboard — user never sees the login page!

**Why store the access token in memory?**

```typescript
// In axios.ts (NOT in Zustand, NOT in localStorage)
let accessToken: string | null = null;
```

- **Not localStorage** → XSS attacks can't read it with `localStorage.getItem()`
- **Not sessionStorage** → same XSS vulnerability
- **Not a cookie** → we'd need CSRF protection
- **In a JS variable** → only accessible to our code, lost on page refresh (refresh token restores it)

### TanStack Query Hooks

**File: `frontend/src/hooks/useAuth.ts`**

TanStack Query provides two main primitives:

#### `useQuery` — for reading data (GET requests)

```typescript
export function useMe() {
  return useQuery({
    queryKey: ["me"],          // Unique cache key
    queryFn: () => api.get("/auth/me").then(r => r.data),
    enabled: !!user,           // Only fetch when logged in
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}
```

This gives your component:
- `data` — the API response
- `isLoading` — true while fetching
- `isError` / `error` — if the request failed
- Automatic caching — subsequent calls reuse cached data
- Background re-fetching — refreshes data when the window regains focus

#### `useMutation` — for changing data (POST/PUT/DELETE)

```typescript
export function useLogin() {
  return useMutation({
    mutationFn: ({ email, password }) => login(email, password),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
  });
}
```

This gives your component:
- `mutate(data)` / `mutateAsync(data)` — trigger the mutation
- `isPending` — true while the request is in flight (for loading spinners)
- `isError` / `error` — if it failed (for error messages)
- `onSuccess` — callback to invalidate stale cached data

**Why `invalidateQueries` on success?** After login, the cached "me" data is outdated (there was no user before). Invalidating tells TanStack Query to re-fetch it.

### Page Reload: How Sessions Survive

This is the most important piece to understand. Here's exactly what happens:

```
1. User is logged in, using the app
   - Access token: in memory (JS variable) ✓
   - Refresh token: in HttpOnly cookie ✓

2. User presses F5 (page reload)
   - Browser destroys all JavaScript state
   - Access token: GONE ✗
   - Refresh token: STILL IN COOKIE ✓ (cookies survive reloads)

3. React app loads fresh
   - App.tsx mounts
   - useEffect calls refreshAuth()

4. refreshAuth() runs
   - POST /api/auth/refresh (cookie is sent automatically by the browser)
   - Server validates the refresh token
   - Server responds with new access token + sets new refresh token cookie
   - Access token is stored in memory again
   - user state is set in Zustand
   - isLoading becomes false

5. App renders the dashboard
   - User never sees the login page
   - Seamless experience!
```

The key insight: **HttpOnly cookies survive page reloads, but JavaScript variables don't.** The refresh token (cookie) is used to restore the access token (variable) on every page load.

---

## The Complete Auth Flow

### 1. Registration

```
Browser                              Server                          Database
  │                                    │                                │
  │ POST /api/auth/register            │                                │
  │ { email, password }                │                                │
  │ ──────────────────────────────────>│                                │
  │                                    │ Check email exists?            │
  │                                    │ ──────────────────────────────>│
  │                                    │                  No            │
  │                                    │ <──────────────────────────────│
  │                                    │                                │
  │                                    │ BCrypt.HashPassword(password)  │
  │                                    │                                │
  │                                    │ INSERT User                    │
  │                                    │ ──────────────────────────────>│
  │                                    │                  Created       │
  │                                    │ <──────────────────────────────│
  │                                    │                                │
  │                                    │ Generate JWT (15 min)          │
  │                                    │ Generate random refresh token  │
  │                                    │                                │
  │                                    │ INSERT RefreshToken             │
  │                                    │ ──────────────────────────────>│
  │                                    │                  Saved          │
  │                                    │ <──────────────────────────────│
  │                                    │                                │
  │ 200 { accessToken, user }          │                                │
  │ Set-Cookie: refreshToken=abc...    │                                │
  │ <──────────────────────────────────│                                │
  │                                    │                                │
  │ Store access token in memory       │                                │
  │ Store user in Zustand              │                                │
  │ (Cookie stored automatically       │                                │
  │  by browser)                       │                                │
```

### 2. Login

Same as registration, except:
- Instead of creating a user, we find one by email
- Instead of hashing, we verify: `BCrypt.Verify(password, storedHash)`
- Returns 401 if email not found or password wrong

### 3. Making Authenticated Requests

```
Browser                              Server
  │                                    │
  │ GET /api/auth/me                   │
  │ Authorization: Bearer eyJ...       │  ← Axios interceptor adds this
  │ ──────────────────────────────────>│
  │                                    │
  │                                    │ JWT Middleware:
  │                                    │   1. Decode token
  │                                    │   2. Verify signature with secret key
  │                                    │   3. Check not expired
  │                                    │   4. Extract claims (userId, email)
  │                                    │
  │                                    │ [Authorize] passes ✓
  │                                    │
  │                                    │ Controller reads userId from claims
  │                                    │ Fetches user from database
  │                                    │
  │ 200 { id: 1, email: "..." }       │
  │ <──────────────────────────────────│
```

### 4. Access Token Expires → Auto-Refresh

```
Browser                              Server
  │                                    │
  │ GET /api/auth/me                   │
  │ Authorization: Bearer eyJ...(expired)
  │ ──────────────────────────────────>│
  │                                    │
  │ 401 Unauthorized                   │  ← Token expired!
  │ <──────────────────────────────────│
  │                                    │
  │ Axios interceptor catches 401      │
  │ Acquires Mutex lock                │
  │                                    │
  │ POST /api/auth/refresh             │
  │ Cookie: refreshToken=abc...        │  ← Browser sends cookie automatically
  │ ──────────────────────────────────>│
  │                                    │
  │                                    │ Find token "abc..." in database
  │                                    │ Verify: not revoked, not expired
  │                                    │ REVOKE old token (rotation!)
  │                                    │ Generate new access + refresh tokens
  │                                    │
  │ 200 { accessToken: "new...", user }│
  │ Set-Cookie: refreshToken=xyz...    │  ← New refresh token
  │ <──────────────────────────────────│
  │                                    │
  │ Store new access token in memory   │
  │ Releases Mutex lock                │
  │                                    │
  │ RETRY: GET /api/auth/me            │
  │ Authorization: Bearer new...       │  ← Uses new token!
  │ ──────────────────────────────────>│
  │                                    │
  │ 200 { id: 1, email: "..." }       │  ← Success!
  │ <──────────────────────────────────│
```

Your component code never sees any of this — it just gets the successful response.

### 5. Page Reload → Session Restore

```
[User presses F5]

Browser                              Server
  │                                    │
  │ All JS state destroyed             │
  │ Access token: GONE                 │
  │ Refresh cookie: STILL EXISTS       │
  │                                    │
  │ React app loads                    │
  │ App.tsx useEffect → refreshAuth()  │
  │                                    │
  │ POST /api/auth/refresh             │
  │ Cookie: refreshToken=xyz...        │  ← Cookie survived the reload!
  │ ──────────────────────────────────>│
  │                                    │
  │                                    │ Validate token → OK
  │                                    │ Rotate tokens
  │                                    │
  │ 200 { accessToken, user }          │
  │ Set-Cookie: refreshToken=new...    │
  │ <──────────────────────────────────│
  │                                    │
  │ isLoading = false                  │
  │ user = { id: 1, email: "..." }    │
  │ Render dashboard ✓                 │
```

### 6. Logout

```
Browser                              Server                          Database
  │                                    │                                │
  │ POST /api/auth/logout              │                                │
  │ Cookie: refreshToken=xyz...        │                                │
  │ ──────────────────────────────────>│                                │
  │                                    │ Find token, mark IsRevoked=true│
  │                                    │ ──────────────────────────────>│
  │                                    │                                │
  │ 200 { message: "Logged out" }      │                                │
  │ Set-Cookie: refreshToken=(deleted) │                                │
  │ <──────────────────────────────────│                                │
  │                                    │                                │
  │ Clear access token from memory     │                                │
  │ Clear user from Zustand            │
  │ Clear TanStack Query cache         │
  │ Redirect to /login                 │
```

---

## Forgot Password Flow

### How It Works

The forgot password feature lets users reset their password via email. It introduces a new database table, a backend email service, and two new endpoints.

```
User clicks               Server generates         User receives email
"Forgot password?"  ──>   reset token (1 hour) ──> with reset link
                          saves to DB               ┌─────────────────────────┐
                          sends email via Gmail      │ Click to reset:         │
                                                    │ localhost:5173/          │
                                                    │   reset-password?       │
                                                    │   token=abc123...       │
                                                    └─────────────────────────┘
                                                              │
User enters new           Server validates token              │
password on the    <───── hashes new password   <─────────────┘
reset page                revokes all sessions
                          marks token as used
```

### Security Decisions

| Decision | Why |
|---|---|
| **Always return "If that email exists..."** | Prevents email enumeration — attackers can't discover which emails are registered by trying different addresses |
| **Token expires in 1 hour** | Limits the window of attack if the email is intercepted |
| **One-time use (`IsUsed` flag)** | Even if someone finds the token later, it can't be reused |
| **Revoke all refresh tokens on reset** | If someone else had access to the account, they're immediately logged out from every device |
| **Random token (not JWT)** | No need for claims — it's just a lookup key. Random bytes are simpler and equally secure |

### Gmail SMTP Setup

The email service uses Gmail's SMTP server to send password reset emails. To use it:

1. **Enable 2-Factor Authentication** on your Google account
2. **Generate an App Password**: Google Account → Security → 2-Step Verification → App passwords
3. **Update `appsettings.json`**:

```json
"Email": {
  "SenderEmail": "your-email@gmail.com",
  "SenderName": "RopPoll",
  "SmtpServer": "smtp.gmail.com",
  "SmtpPort": 587,
  "AppPassword": "your-16-char-app-password"
}
```

**Why an App Password?** Gmail blocks regular password authentication from third-party apps. App Passwords are special 16-character passwords that bypass this restriction. They only work when 2FA is enabled, adding an extra layer of security.

**How the EmailService works:**
- Uses .NET's built-in `SmtpClient` — no external packages needed
- Connects to `smtp.gmail.com:587` with TLS encryption
- Sends an HTML email containing a clickable reset link
- The link points to the frontend: `http://localhost:5173/reset-password?token=abc123...`

### Forgot Password Sequence Diagram

#### Step 1: User requests a reset

```
Browser                              Server                          Database
  │                                    │                                │
  │ POST /api/auth/forgot-password     │                                │
  │ { "email": "user@test.com" }       │                                │
  │ ──────────────────────────────────>│                                │
  │                                    │ Find user by email             │
  │                                    │ ──────────────────────────────>│
  │                                    │              Found             │
  │                                    │ <──────────────────────────────│
  │                                    │                                │
  │                                    │ Generate random token          │
  │                                    │ INSERT PasswordResetToken      │
  │                                    │   (expires in 1 hour)          │
  │                                    │ ──────────────────────────────>│
  │                                    │                                │
  │                                    │ Send email via Gmail SMTP ────────> user@test.com
  │                                    │                                │    (reset link)
  │ 200 "If that email exists,         │                                │
  │      a reset link has been sent"   │                                │
  │ <──────────────────────────────────│                                │
```

**Note:** If the email does NOT exist, the server still returns 200 with the same message. This prevents attackers from discovering which emails are registered.

#### Step 2: User clicks the link and resets password

```
Browser                              Server                          Database
  │                                    │                                │
  │ User clicks link in email          │                                │
  │ → opens /reset-password?token=abc  │                                │
  │ → enters new password              │                                │
  │                                    │                                │
  │ POST /api/auth/reset-password      │                                │
  │ { "token": "abc", "newPassword": "new123" }                        │
  │ ──────────────────────────────────>│                                │
  │                                    │ Find token "abc" in DB         │
  │                                    │ ──────────────────────────────>│
  │                                    │ Found, not used, not expired   │
  │                                    │ <──────────────────────────────│
  │                                    │                                │
  │                                    │ BCrypt.HashPassword("new123")  │
  │                                    │ UPDATE user's PasswordHash     │
  │                                    │ SET token IsUsed = true        │
  │                                    │ REVOKE all refresh tokens      │
  │                                    │ ──────────────────────────────>│
  │                                    │                                │
  │ 200 "Password has been reset"      │                                │
  │ <──────────────────────────────────│                                │
  │                                    │                                │
  │ Frontend shows success message     │                                │
  │ → link to /login                   │                                │
```

### New Files Added

| File | Purpose |
|---|---|
| `backend/Models/PasswordResetToken.cs` | Database entity — stores the token, expiry, and `IsUsed` flag |
| `backend/Services/EmailService.cs` | Sends emails via Gmail SMTP. Uses `IEmailService` interface for testability |
| `frontend/src/pages/ForgotPasswordPage.tsx` | Form to enter email address, shows success message after submission |
| `frontend/src/pages/ResetPasswordPage.tsx` | Reads token from URL, form to enter new password + confirmation |

### New Endpoints

#### `POST /api/auth/forgot-password`
```
Request:  { "email": "user@test.com" }
Response: { "message": "If that email exists, a reset link has been sent." }
```

#### `POST /api/auth/reset-password`
```
Request:  { "token": "abc123...", "newPassword": "newsecret123" }
Response: { "message": "Password has been reset successfully" }
```

---

## Token Rotation: Why It Matters

Every time a refresh token is used, the old one is **revoked** and a new one is issued. This is called **token rotation**.

**Without rotation:**
```
Attacker steals refresh token "abc"
Attacker uses "abc" → gets access ✓
User uses "abc" → gets access ✓
Both have access indefinitely!
```

**With rotation:**
```
User uses refresh token "abc" → gets new token "xyz", "abc" is revoked
Attacker tries "abc" → REJECTED (revoked!)

OR:

Attacker uses "abc" first → gets new token "def", "abc" is revoked
User tries "abc" → REJECTED → user has to log in again
This alerts the user that something is wrong
```

Token rotation ensures that a stolen refresh token has a very limited useful life — at most until the legitimate user's next refresh.

---

## Project Structure

```
roppoll/
│
├── backend/                              # ASP.NET Web API
│   ├── Controllers/
│   │   └── AuthController.cs             # All auth endpoints + token generation
│   │
│   ├── Data/
│   │   └── AppDbContext.cs               # EF Core DbContext (DB connection)
│   │
│   ├── Dtos/
│   │   └── AuthDtos.cs                   # Request/Response shapes (never expose models directly)
│   │
│   ├── Models/
│   │   ├── User.cs                       # User entity (Id, Email, PasswordHash)
│   │   ├── RefreshToken.cs               # Refresh token entity (Token, ExpiresAt, IsRevoked)
│   │   └── PasswordResetToken.cs         # Reset token entity (Token, ExpiresAt, IsUsed)
│   │
│   ├── Services/
│   │   └── EmailService.cs              # Gmail SMTP email sender (IEmailService interface)
│   │
│   ├── Migrations/                       # Auto-generated by EF Core
│   │   └── *_InitialCreate.cs            # SQL to create tables
│   │
│   ├── Program.cs                        # App configuration (DB, JWT, CORS, email, middleware)
│   ├── appsettings.json                  # Connection string, JWT secret, Gmail SMTP config
│   └── RopPoll.Api.csproj               # NuGet packages
│
├── frontend/                             # React + Vite + TypeScript
│   └── src/
│       ├── lib/
│       │   └── axios.ts                  # Custom Axios instance + interceptors + Mutex
│       │
│       ├── stores/
│       │   └── authStore.ts              # Zustand store (user state, login/logout actions)
│       │
│       ├── hooks/
│       │   └── useAuth.ts                # TanStack Query hooks (useLogin, useRegister, useMe, useLogout)
│       │
│       ├── pages/
│       │   ├── LoginPage.tsx             # Login form UI (+ "Forgot password?" link)
│       │   ├── RegisterPage.tsx          # Registration form UI
│       │   ├── DashboardPage.tsx         # Protected page (shows user info)
│       │   ├── ForgotPasswordPage.tsx    # Enter email to request reset link
│       │   └── ResetPasswordPage.tsx     # Enter new password (reads token from URL)
│       │
│       ├── App.tsx                       # Routing + page-reload refresh (useEffect → refreshAuth)
│       └── main.tsx                      # Entry point
│
└── ARCHITECTURE.md                       # This file
```

---

## Common Questions

### Q: Why not store the access token in localStorage?

**localStorage is readable by any JavaScript on the page.** If your site has an XSS vulnerability (a malicious script injected into your page), that script can call `localStorage.getItem("accessToken")` and send it to an attacker. By keeping the token in a JavaScript variable, it's much harder to exfiltrate — the attacker would need to find and execute code that references that specific variable.

### Q: Why not just use one token in an HttpOnly cookie?

You could! This is actually simpler. But then every request sends the token as a cookie, which makes you vulnerable to **CSRF attacks** (a malicious site can trigger a request to your API and the browser will automatically include the cookie). You'd need to implement CSRF protection (like a CSRF token). The dual-token approach avoids this because the access token is sent in a header, which can't be set by cross-origin requests.

### Q: What happens if both tokens expire?

The user is redirected to the login page. The refresh token lasts 7 days, so this only happens if the user hasn't visited the site in a week.

### Q: Why is ClockSkew set to TimeSpan.Zero?

By default, the JWT middleware allows 5 minutes of clock drift between server and client. This means a token set to expire at 12:00 would still be accepted at 12:05. We set it to zero because:
1. Our client and server are on the same machine in development
2. We have automatic refresh — there's no need for tolerance
3. It could effectively extend your 15-minute token to 20 minutes

### Q: Why use BCrypt instead of SHA-256 or MD5?

SHA-256 and MD5 are **fast** hash functions — they can compute billions of hashes per second. That's bad for passwords because an attacker can brute-force them quickly. BCrypt is **intentionally slow** (~100ms per hash) and includes a configurable work factor. It also automatically generates and embeds a random salt, preventing rainbow table attacks.

### Q: What is the Mutex actually doing in code?

`async-mutex` provides a `Mutex` class with `acquire()` and `release()` methods. When you call `acquire()`:
- If no one holds the lock → you get it immediately, returns a `release` function
- If someone holds the lock → you wait (the Promise doesn't resolve until the lock is available)

This serializes access to the refresh logic. Even though JavaScript is single-threaded, async operations can interleave — multiple 401 handlers can be "in flight" simultaneously because they all `await` the refresh call.

### Q: How do I run this project?

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

Open http://localhost:5173 in your browser.
