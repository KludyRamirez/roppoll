using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using RopPoll.Api.Data;
using RopPoll.Api.Dtos;
using RopPoll.Api.Hubs;
using RopPoll.Api.Models;

namespace RopPoll.Api.Services;

// Runs in the background on a 30-second interval.
// 1. Finds Active polls whose ExpiresAt has passed → marks them Expired
// 2. Calls Claude to get an opinion on each expired poll
// 3. Broadcasts the final result to all connected SignalR clients
public class PollExpiryService(
    IServiceScopeFactory scopeFactory,
    IHubContext<PollHub> hubContext,
    ILogger<PollExpiryService> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            await ExpirePollsAsync();
            await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);
        }
    }

    private async Task ExpirePollsAsync()
    {
        using var scope = scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var claude = scope.ServiceProvider.GetRequiredService<IOpenAiService>();

        var now = DateTime.UtcNow;

        var expiredPolls = await db.Polls
            .Include(p => p.Creator)
            .Include(p => p.Options)
                .ThenInclude(o => o.Votes)
            .Include(p => p.Votes)
            .Where(p => p.Status == PollStatus.Active && p.ExpiresAt <= now)
            .AsSplitQuery()
            .ToListAsync();

        if (expiredPolls.Count == 0) return;

        // Mark all as Expired first
        foreach (var poll in expiredPolls)
            poll.Status = PollStatus.Expired;

        await db.SaveChangesAsync();
        logger.LogInformation("Expired {Count} poll(s)", expiredPolls.Count);

        // For each expired poll: ask Claude, save result, broadcast
        foreach (var poll in expiredPolls)
        {
            var optionA = poll.Options.First(o => o.DisplayOrder == 0);
            var optionB = poll.Options.First(o => o.DisplayOrder == 1);

            try
            {
                var (chosenIndex, explanation) = await claude.GetOpinionAsync(
                    poll.Question, optionA.Text, optionB.Text);

                poll.AiChoiceOptionId = chosenIndex == 0 ? optionA.Id : optionB.Id;
                poll.AiExplanation = explanation;
                poll.AiStatus = AiStatus.Complete;

                logger.LogInformation(
                    "Poll {Id}: Claude picked option {Index} — \"{Explanation}\"",
                    poll.Id, chosenIndex, explanation);
            }
            catch (Exception ex)
            {
                poll.AiStatus = AiStatus.Failed;
                logger.LogWarning(ex, "Poll {Id}: Claude opinion failed", poll.Id);
            }

            await db.SaveChangesAsync();

            // Broadcast final state (Expired + AI result) to all clients
            await hubContext.Clients.All.SendAsync("PollUpdated", MapToPublicResponse(poll));
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
        IsCreator = false,
        HasVoted = false,
        VotedOptionId = null,
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
