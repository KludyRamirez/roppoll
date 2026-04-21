namespace Propl.Api.Models;

public class PollOption
{
    public int Id { get; set; }
    public required string Text { get; set; }

    // 0 = Option A, 1 = Option B — controls display order
    public int DisplayOrder { get; set; }

    // Foreign key
    public int PollId { get; set; }
    public Poll Poll { get; set; } = null!;

    // Navigation
    public List<Vote> Votes { get; set; } = [];
}
