using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RopPoll.Api.Data;
using RopPoll.Api.Dtos;
using RopPoll.Api.Models;

namespace RopPoll.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PollsController(AppDbContext db) : ControllerBase
{
    private static readonly int[] AllowedDurations = [60, 300, 900, 3600, 86400];

    // ════════════════════════════════════════
    // POST /api/polls — Create a new poll
    // ════════════════════════════════════════
    [Authorize]
    [HttpPost]
    public async Task<ActionResult<PollResponse>> Create(CreatePollRequest request)
    {
        if (!AllowedDurations.Contains(request.DurationSeconds))
            return BadRequest(new { message = "Invalid duration. Allowed: 60, 300, 900, 3600, 86400 seconds." });

        var callerId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var now = DateTime.UtcNow;

        var poll = new Poll
        {
            Question = request.Question,
            DurationSeconds = request.DurationSeconds,
            CreatedAt = now,
            ExpiresAt = now.AddSeconds(request.DurationSeconds),
            CreatorId = callerId
        };

        // Create the two options in display order
        poll.Options.Add(new PollOption { Text = request.OptionA, DisplayOrder = 0 });
        poll.Options.Add(new PollOption { Text = request.OptionB, DisplayOrder = 1 });

        db.Polls.Add(poll);
        await db.SaveChangesAsync();

        // Re-fetch with creator info to build the response
        var created = await GetPollWithDetails(poll.Id, callerId);
        return CreatedAtAction(nameof(GetById), new { id = poll.Id }, created);
    }

    // ════════════════════════════════════════
    // GET /api/polls — Feed (public)
    // ════════════════════════════════════════
    [HttpGet]
    public async Task<ActionResult<List<PollResponse>>> GetFeed(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        if (page < 1) page = 1;
        if (pageSize > 50) pageSize = 50;

        var callerId = GetCallerId();

        var polls = await db.Polls
            .Include(p => p.Creator)
            .Include(p => p.Options)
                .ThenInclude(o => o.Votes)
            .Include(p => p.Votes)
            .OrderByDescending(p => p.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return Ok(polls.Select(p => MapToResponse(p, callerId)).ToList());
    }

    // ════════════════════════════════════════
    // GET /api/polls/{id} — Single poll (public)
    // ════════════════════════════════════════
    [HttpGet("{id}")]
    public async Task<ActionResult<PollResponse>> GetById(int id)
    {
        var callerId = GetCallerId();
        var response = await GetPollWithDetails(id, callerId);

        if (response is null)
            return NotFound(new { message = "Poll not found" });

        return Ok(response);
    }

    // ════════════════════════════════════════
    // POST /api/polls/{id}/vote — Cast a vote
    // ════════════════════════════════════════
    [Authorize]
    [HttpPost("{id}/vote")]
    public async Task<ActionResult<PollResponse>> Vote(int id, VoteRequest request)
    {
        var callerId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        // Load the poll with options and votes
        var poll = await db.Polls
            .Include(p => p.Creator)
            .Include(p => p.Options)
                .ThenInclude(o => o.Votes)
            .Include(p => p.Votes)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (poll is null)
            return NotFound(new { message = "Poll not found" });

        // Cannot vote on an expired poll
        if (poll.Status == PollStatus.Expired)
            return BadRequest(new { message = "This poll has already expired" });

        // Creator cannot vote on their own poll
        if (poll.CreatorId == callerId)
            return BadRequest(new { message = "You cannot vote on your own poll" });

        // Verify the chosen option actually belongs to this poll
        var option = poll.Options.FirstOrDefault(o => o.Id == request.OptionId);
        if (option is null)
            return BadRequest(new { message = "Invalid option" });

        // Check if already voted — the DB unique index will also catch this,
        // but checking first gives a cleaner error message
        var alreadyVoted = poll.Votes.Any(v => v.VoterId == callerId);
        if (alreadyVoted)
            return Conflict(new { message = "You have already voted on this poll" });

        // Save the vote
        db.Votes.Add(new Vote
        {
            PollId = id,
            VoterId = callerId,
            OptionId = request.OptionId
        });

        await db.SaveChangesAsync();

        // Re-fetch updated poll and return it
        var updated = await GetPollWithDetails(id, callerId);
        return Ok(updated);
    }

    // ════════════════════════════════════════
    // Helpers
    // ════════════════════════════════════════

    // Reads the caller's user ID from JWT claims.
    // Returns null if the request is unauthenticated.
    private int? GetCallerId()
    {
        var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return claim is null ? null : int.Parse(claim);
    }

    private async Task<PollResponse?> GetPollWithDetails(int pollId, int? callerId)
    {
        var poll = await db.Polls
            .Include(p => p.Creator)
            .Include(p => p.Options)
                .ThenInclude(o => o.Votes)
            .Include(p => p.Votes)
            .FirstOrDefaultAsync(p => p.Id == pollId);

        if (poll is null) return null;

        return MapToResponse(poll, callerId);
    }

    private static PollResponse MapToResponse(Poll poll, int? callerId)
    {
        var callerVote = callerId.HasValue
            ? poll.Votes.FirstOrDefault(v => v.VoterId == callerId.Value)
            : null;

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
            IsCreator = callerId.HasValue && callerId.Value == poll.CreatorId,
            HasVoted = callerVote is not null,
            VotedOptionId = callerVote?.OptionId,
            TotalVotes = poll.Votes.Count,
            Options = poll.Options
                .OrderBy(o => o.DisplayOrder)
                .Select(o => new PollOptionResponse
                {
                    Id = o.Id,
                    Text = o.Text,
                    DisplayOrder = o.DisplayOrder,
                    VoteCount = o.Votes.Count
                })
                .ToList(),
            AiChoiceOptionId = poll.AiChoiceOptionId,
            AiExplanation = poll.AiExplanation
        };
    }
}
