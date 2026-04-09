namespace RopPoll.Api.Models;

public enum PollStatus
{
    Active,
    Expired
}

public enum AiStatus
{
    Pending,   // Timer hasn't expired yet
    Complete,  // Claude gave an opinion
    Failed     // Claude API call failed
}

public class Poll
{
    public int Id { get; set; }
    public required string Question { get; set; }

    // Duration in seconds — one of: 60, 300, 900, 3600, 86400
    public int DurationSeconds { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Computed at creation: CreatedAt + DurationSeconds
    public DateTime ExpiresAt { get; set; }

    public PollStatus Status { get; set; } = PollStatus.Active;
    public AiStatus AiStatus { get; set; } = AiStatus.Pending;

    // Set by ClaudeService after the poll expires
    public int? AiChoiceOptionId { get; set; }
    public string? AiExplanation { get; set; }

    // Foreign key — who created this poll
    public int CreatorId { get; set; }
    public User Creator { get; set; } = null!;

    // Navigation properties
    public List<PollOption> Options { get; set; } = [];
    public List<Vote> Votes { get; set; } = [];
}
