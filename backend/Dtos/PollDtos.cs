using System.ComponentModel.DataAnnotations;
using RopPoll.Api.Models;

namespace RopPoll.Api.Dtos;

// ─── Request DTOs ───────────────────────────────────────────

public class CreatePollRequest
{
    [Required, MinLength(5), MaxLength(300)]
    public required string Question { get; set; }

    [Required, MinLength(1), MaxLength(100)]
    public required string OptionA { get; set; }

    [Required, MinLength(1), MaxLength(100)]
    public required string OptionB { get; set; }

    // Allowed values: 60, 300, 900, 3600, 86400
    [Required]
    public int DurationSeconds { get; set; }
}

// ─── Response DTOs ──────────────────────────────────────────

public class PollOptionResponse
{
    public int Id { get; set; }
    public required string Text { get; set; }
    public int DisplayOrder { get; set; }
    public int VoteCount { get; set; }
}

public class PollResponse
{
    public int Id { get; set; }
    public required string Question { get; set; }
    public int DurationSeconds { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime ExpiresAt { get; set; }
    public PollStatus Status { get; set; }
    public AiStatus AiStatus { get; set; }

    // Creator info
    public int CreatorId { get; set; }
    public required string CreatorEmail { get; set; }

    // Caller-specific flags (null if not authenticated)
    public bool IsCreator { get; set; }
    public bool HasVoted { get; set; }
    public int? VotedOptionId { get; set; }

    // Always included — vote counts visible in real-time (active and expired)
    public List<PollOptionResponse> Options { get; set; } = [];
    public int TotalVotes { get; set; }

    // Only populated when AiStatus == Complete
    public int? AiChoiceOptionId { get; set; }
    public string? AiExplanation { get; set; }
}
