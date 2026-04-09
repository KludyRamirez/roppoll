using System.ComponentModel.DataAnnotations;

namespace RopPoll.Api.Dtos;

// Request DTOs — what the client sends to us

public class RegisterRequest
{
    [Required, EmailAddress]
    public required string Email { get; set; }

    [Required, MinLength(6)]
    public required string Password { get; set; }
}

public class LoginRequest
{
    [Required, EmailAddress]
    public required string Email { get; set; }

    [Required]
    public required string Password { get; set; }
}

// Response DTOs — what we send back to the client

public class AuthResponse
{
    public required string AccessToken { get; set; }
    public required UserDto User { get; set; }
    // Note: Refresh token is NOT in the response body — it's in an HttpOnly cookie
}

public class UserDto
{
    public int Id { get; set; }
    public required string Email { get; set; }
}

// Password reset DTOs

public class ForgotPasswordRequest
{
    [Required, EmailAddress]
    public required string Email { get; set; }
}

public class ResetPasswordRequest
{
    [Required]
    public required string Token { get; set; }

    [Required, MinLength(6)]
    public required string NewPassword { get; set; }
}
