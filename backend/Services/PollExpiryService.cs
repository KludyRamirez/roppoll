using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using RopPoll.Api.Data;
using RopPoll.Api.Dtos;
using RopPoll.Api.Hubs;
using RopPoll.Api.Models;

namespace RopPoll.Api.Services;

// Runs in the background on a 30-second interval.
// Finds polls that have passed their ExpiresAt time but are still marked Active,
// flips them to Expired, then broadcasts each one to all connected SignalR clients.
public class PollExpiryService(
    IServiceScopeFactory scopeFactory,
    IHubContext<PollHub> hubContext,
    ILogger<PollExpiryService> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Run once immediately on startup to catch any polls that expired
        // while the server was down, then tick every 30 seconds.
        while (!stoppingToken.IsCancellationRequested)
        {
            await ExpirePollsAsync();
            await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);
        }
    }

    private async Task ExpirePollsAsync()
    {
        // BackgroundService is a singleton, but DbContext is scoped.
        // We must create a new scope to resolve it.
        using var scope = scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var now = DateTime.UtcNow;

        var expiredPolls = await db.Polls
            .Include(p => p.Creator)
            .Include(p => p.Options)
                .ThenInclude(o => o.Votes)
            .Include(p => p.Votes)
            .Where(p => p.Status == PollStatus.Active && p.ExpiresAt <= now)
            .ToListAsync();

        if (expiredPolls.Count == 0) return;

        foreach (var poll in expiredPolls)
            poll.Status = PollStatus.Expired;

        await db.SaveChangesAsync();
        logger.LogInformation("Expired {Count} poll(s)", expiredPolls.Count);

        // Broadcast each expired poll to all connected clients.
        // User-specific fields (IsCreator, HasVoted, VotedOptionId) are omitted
        // from the broadcast — the frontend preserves them from its local cache.
        foreach (var poll in expiredPolls)
        {
            var response = MapToPublicResponse(poll);
            await hubContext.Clients.All.SendAsync("PollUpdated", response);
        }
    }

    private static PollResponse MapToPublicResponse(Poll poll) => new()
    {
        Id = poll.Id,
        Question = poll.Question,
        DurationSeconds = poll.DurationSeconds,
        CreatedAt = poll.CreatedAt,
        ExpiresAt = poll.ExpiresAt,
        Status = poll.Status,
        AiStatus = poll.AiStatus,
        CreatorId = poll.CreatorId,
        CreatorEmail = poll.Creator.Email,
        IsCreator = false,       // Unknown at broadcast time
        HasVoted = false,        // Unknown at broadcast time
        VotedOptionId = null,    // Unknown at broadcast time
        TotalVotes = poll.Votes.Count,
        Options = poll.Options
            .OrderBy(o => o.DisplayOrder)
            .Select(o => new PollOptionResponse
            {
                Id = o.Id,
                Text = o.Text,
                DisplayOrder = o.DisplayOrder,
                VoteCount = o.Votes.Count,
            })
            .ToList(),
        AiChoiceOptionId = poll.AiChoiceOptionId,
        AiExplanation = poll.AiExplanation,
    };
}
