namespace RopPoll.Api.Models;

public class PasswordResetToken
{
    public int Id { get; set; }

    // The random token sent in the email link
    public required string Token { get; set; }

    // Short-lived — 1 hour. After that, user must request a new one.
    public DateTime ExpiresAt { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // One-time use — once the password is reset, this token can't be reused
    public bool IsUsed { get; set; }

    // Links to the user who requested the reset
    public int UserId { get; set; }
    public User User { get; set; } = null!;
}
