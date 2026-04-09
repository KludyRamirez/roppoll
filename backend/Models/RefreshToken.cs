namespace RopPoll.Api.Models;

public class RefreshToken
{
    public int Id { get; set; }
    public required string Token { get; set; }
    public DateTime ExpiresAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // When a token is used, we revoke it and issue a new one (rotation)
    public bool IsRevoked { get; set; }

    // Foreign key — every refresh token belongs to one user
    public int UserId { get; set; }
    public User User { get; set; } = null!;
}
