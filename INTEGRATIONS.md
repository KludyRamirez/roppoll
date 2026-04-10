# How ChatGPT and SignalR Work in RopPoll

---

## Part 1 — ChatGPT (OpenAI)

### What is it doing in this app?

When a poll's timer runs out, the app asks GPT-4o-mini to pick one of the two options and give a short reason. That opinion gets displayed on the poll card as "AI's take."

---

### Step 1 — The API key

The backend reads the key from User Secrets (never hard-coded):

```json
// appsettings.json
"OpenAI": {
  "ApiKey": ""
}
```

```bash
dotnet user-secrets set "OpenAI:ApiKey" "sk-..."
```

ASP.NET's dependency injection makes `IConfiguration` available anywhere in the backend. The service reads the key from it at call time.

---

### Step 2 — The service (`OpenAiService.cs`)

This is the only file that talks to OpenAI. It has one job: given a question and two options, return which one GPT picks and why.

```csharp
var client = new OpenAIClient(apiKey);
var chat   = client.GetChatClient("gpt-4o-mini");
```

A prompt is built telling GPT to reply in a strict format:

```
CHOICE: <A or B>
REASON: <one punchy sentence, max 20 words>
```

Why a strict format? Because we need to parse the reply in code. Free-form text is hard to split reliably.

```csharp
var prompt =
    $"""
    You are participating in a two-option poll. Pick EXACTLY ONE of the two options below.
    Reply in this exact format, nothing else:
    CHOICE: <A or B>
    REASON: <one punchy sentence, max 20 words>

    Poll question: {question}
    Option A: {optionA}
    Option B: {optionB}
    """;
```

The response is sent and the text is parsed:

```csharp
var response = await chat.CompleteChatAsync([new UserChatMessage(prompt)]);
var text     = response.Value.Content[0].Text.Trim();
return Parse(text);
```

`Parse()` splits the reply into lines, finds the `CHOICE:` and `REASON:` lines, and converts `A` → index `0`, `B` → index `1`.

---

### Step 3 — Who calls the service?

`OpenAiService` is never called directly from a controller (no HTTP endpoint triggers it). It is called by the **background service** `PollExpiryService`, which runs on a 30-second loop:

```
Every 30 seconds:
  1. Find all polls where Status = Active AND ExpiresAt has passed
  2. Mark them as Expired
  3. For each expired poll → call OpenAiService.GetOpinionAsync()
  4. Save the AI's choice and reason to the database
  5. Broadcast the result to all connected browsers (via SignalR)
```

If the AI call fails for any reason (network error, bad format, etc.), the poll's `AiStatus` is set to `Failed` and the error is logged — the app keeps running normally.

---

### Step 4 — How is it registered?

In `Program.cs`:

```csharp
builder.Services.AddScoped<IOpenAiService, OpenAiService>();
```

`Scoped` means a new instance is created per database scope. `PollExpiryService` manually creates a scope to get it (because background services are singletons and can't directly inject scoped services):

```csharp
using var scope  = scopeFactory.CreateScope();
var claude = scope.ServiceProvider.GetRequiredService<IOpenAiService>();
```

---

### Step 5 — How is the result shown in the UI?

The frontend's `PollCard` component reads three fields from the poll object:

| Field | Value |
|---|---|
| `aiStatus` | `"Pending"`, `"Complete"`, or `"Failed"` |
| `aiChoiceOptionId` | the ID of the option GPT chose |
| `aiExplanation` | the one-sentence reason |

When a poll expires (`status === "Expired"`), the card shows:
- **Pending** → "Waiting for AI's opinion..."
- **Complete** → the chosen option is highlighted, the reason is shown
- **Failed** → "AI couldn't give an opinion"

---

## Part 2 — SignalR

### What problem does it solve?

Without SignalR, a user would have to manually refresh the page to see that a poll expired and to get the AI's opinion. With SignalR, the server **pushes** the update to every open browser tab the moment it happens.

---

### What is SignalR?

SignalR is a library that gives you a **persistent connection** between the browser and the server. Under the hood it uses WebSockets (with fallbacks to long-polling if WebSockets aren't available). Once the connection is open, either side can send messages to the other at any time.

In RopPoll, only the **server sends** — clients just listen.

---

### Step 1 — The Hub (`PollHub.cs`)

A Hub is the server-side endpoint that clients connect to. Ours is intentionally empty:

```csharp
public class PollHub : Hub { }
```

There are no methods defined because clients never send anything to the server over SignalR. The server sends to clients. The Hub class just needs to exist so SignalR has an endpoint to map.

It is registered and mapped in `Program.cs`:

```csharp
builder.Services.AddSignalR();          // register the service
app.MapHub<PollHub>("/hubs/polls");     // expose it at this URL
```

---

### Step 2 — Broadcasting from the server

`PollExpiryService` holds a reference to `IHubContext<PollHub>`. This is how the background service sends messages to all connected clients:

```csharp
await hubContext.Clients.All.SendAsync("PollUpdated", MapToPublicResponse(poll));
```

- `Clients.All` — every browser tab currently connected
- `"PollUpdated"` — the event name (the client listens for this exact string)
- `MapToPublicResponse(poll)` — the full poll object serialized as JSON

---

### Step 3 — The client connection (`signalr.ts`)

On the frontend, a connection is built using the `@microsoft/signalr` package:

```typescript
export function createPollHubConnection() {
  return new signalR.HubConnectionBuilder()
    .withUrl("http://localhost:5001/hubs/polls", { withCredentials: true })
    .withAutomaticReconnect()   // auto-reconnect if the connection drops
    .build();
}
```

`withAutomaticReconnect()` means if the server restarts or the network hiccups, the client silently tries to reconnect rather than giving up.

---

### Step 4 — Listening for events (`usePollHub.ts`)

`usePollHub` is a React hook that:
1. Creates the connection
2. Registers a listener for `"PollUpdated"`
3. Starts the connection
4. Cleans up (stops the connection) when the component unmounts

```typescript
connection.on("PollUpdated", (broadcast: Poll) => {
  // patch the poll in React Query's cache
  queryClient.setQueriesData<Poll[]>({ queryKey: ["polls"] }, (old) =>
    old?.map((p) => {
      if (p.id !== broadcast.id) return p;
      return {
        ...broadcast,
        isCreator:    p.isCreator,     // preserve — server doesn't know who you are
        hasVoted:     p.hasVoted,
        votedOptionId: p.votedOptionId,
      };
    }) ?? old
  );
});

connection.start();
```

**Why preserve `isCreator`, `hasVoted`, `votedOptionId`?**
The server broadcasts one copy of the poll to everyone. It doesn't know which browser tab belongs to which user, so it sends those fields as `false`/`null`. The client already knows its own state (from when it fetched or voted), so we keep the client's version of those fields instead of overwriting them with the generic broadcast values.

---

### Step 5 — Where is the hook used?

`usePollHub()` is called once inside `PollFeedPage`:

```typescript
export default function PollFeedPage() {
  usePollHub(); // one line — sets up the live connection for the whole feed
  ...
}
```

As long as the feed page is open, the connection is alive. If you navigate away, the hook's cleanup function runs and the connection is stopped.

---

## The Full Flow End-to-End

```
User creates poll (60 second timer)
        │
        ▼
[30s tick] PollExpiryService notices poll has expired
        │
        ├─► Marks poll as Expired in DB
        │
        ├─► Calls OpenAiService.GetOpinionAsync()
        │         │
        │         └─► Sends prompt to OpenAI gpt-4o-mini
        │             Parses CHOICE + REASON from reply
        │
        ├─► Saves AI choice + explanation to DB
        │
        └─► hubContext.Clients.All.SendAsync("PollUpdated", poll)
                  │
                  ▼
        [Every open browser tab]
        usePollHub receives "PollUpdated"
        Patches poll in React Query cache
        React re-renders the PollCard
        → User sees "Expired" badge + AI's opinion
           without refreshing the page
```
