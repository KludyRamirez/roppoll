namespace RopPoll.Api.Models;

public class Vote
{
    public int Id { get; set; }
    public DateTime VotedAt { get; set; } = DateTime.UtcNow;

    // Foreign keys
    public int PollId { get; set; }
    public Poll Poll { get; set; } = null!;

    public int VoterId { get; set; }
    public User Voter { get; set; } = null!;

    public int OptionId { get; set; }
    public PollOption Option { get; set; } = null!;
}
