namespace RopPoll.Api.Models;

public class User
{
    public int Id { get; set; }
    public required string Email { get; set; }
    public required string PasswordHash { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation property — one user can have many refresh tokens (multiple sessions)
    public List<RefreshToken> RefreshTokens { get; set; } = [];
}
