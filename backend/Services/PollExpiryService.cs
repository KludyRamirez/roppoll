using System.Text.Json;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Propl.Api.Data;
using Propl.Api.Dtos;
using Propl.Api.Hubs;
using Propl.Api.Models;

namespace Propl.Api.Services;

// Runs in the background on a 30-second interval.
// 1. Finds Active polls whose ExpiresAt has passed → marks them Expired
// 2. Gets Ro's opinion on each expired poll
// 3. Runs the Ro vs Plo debate
// 4. Broadcasts the final result to all connected SignalR clients
public class PollExpiryService(
    IServiceScopeFactory scopeFactory,
    IHubContext<PollHub> hubContext,
    ILogger<PollExpiryService> logger) : BackgroundService
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

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
        var openAi = scope.ServiceProvider.GetRequiredService<IOpenAiService>();

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

        foreach (var poll in expiredPolls)
            poll.Status = PollStatus.Expired;

        await db.SaveChangesAsync();
        logger.LogInformation("Expired {Count} poll(s)", expiredPolls.Count);

        foreach (var poll in expiredPolls)
        {
            var optionA = poll.Options.First(o => o.DisplayOrder == 0);
            var optionB = poll.Options.First(o => o.DisplayOrder == 1);

            // Step 1: Ro's initial opinion
            int roChosenIndex;
            string roExplanation;
            try
            {
                (roChosenIndex, roExplanation) = await openAi.GetOpinionAsync(
                    poll.Question, optionA.Text, optionB.Text);

                poll.AiChoiceOptionId = roChosenIndex == 0 ? optionA.Id : optionB.Id;
                poll.AiExplanation = roExplanation;
                poll.AiStatus = AiStatus.Complete;

                logger.LogInformation(
                    "Poll {Id}: Ro picked option {Index} — \"{Explanation}\"",
                    poll.Id, roChosenIndex, roExplanation);
            }
            catch (Exception ex)
            {
                poll.AiStatus = AiStatus.Failed;
                poll.DebateStatus = DebateStatus.Failed;
                logger.LogWarning(ex, "Poll {Id}: Ro opinion failed", poll.Id);
                await db.SaveChangesAsync();
                await hubContext.Clients.All.SendAsync("PollUpdated", MapToPublicResponse(poll));
                continue;
            }

            // Step 2: Ro vs Plo debate
            try
            {
                var debateMessages = await openAi.RunDebateAsync(
                    poll.Question, optionA.Text, optionB.Text,
                    roChosenIndex, roExplanation);

                poll.AiDebate = JsonSerializer.Serialize(debateMessages, JsonOptions);
                poll.DebateStatus = DebateStatus.Complete;

                logger.LogInformation(
                    "Poll {Id}: debate complete in {Turns} turns",
                    poll.Id, debateMessages.Count);
            }
            catch (Exception ex)
            {
                poll.DebateStatus = DebateStatus.Failed;
                logger.LogWarning(ex, "Poll {Id}: debate failed", poll.Id);
            }

            await db.SaveChangesAsync();
            await hubContext.Clients.All.SendAsync("PollUpdated", MapToPublicResponse(poll));
        }
    }

    private static PollResponse MapToPublicResponse(Poll poll)
    {
        List<DebateMessage>? debate = null;
        if (poll.AiDebate is not null)
        {
            try { debate = JsonSerializer.Deserialize<List<DebateMessage>>(poll.AiDebate, JsonOptions); }
            catch { /* leave null on corrupt JSON */ }
        }

        return new PollResponse
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
            DebateStatus = poll.DebateStatus,
            AiDebate = debate,
        };
    }
}
