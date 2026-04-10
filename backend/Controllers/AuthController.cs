using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using RopPoll.Api.Data;
using RopPoll.Api.Dtos;
using RopPoll.Api.Models;
using RopPoll.Api.Services;

namespace RopPoll.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController(AppDbContext db, IConfiguration config, IEmailService emailService, IWebHostEnvironment env) : ControllerBase
{
    // ========================
    // POST /api/auth/register
    // ========================
    [HttpPost("register")]
    public async Task<ActionResult<AuthResponse>> Register(RegisterRequest request)
    {
        // 1. Check if user already exists
        if (await db.Users.AnyAsync(u => u.Email == request.Email))
            return Conflict(new { message = "Email already registered" });

        // 2. Hash the password with BCrypt
        //    BCrypt automatically generates a salt and embeds it in the hash.
        //    Verify later with BCrypt.Net.BCrypt.Verify(password, hash)
        var user = new User
        {
            Email = request.Email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password)
        };

        db.Users.Add(user);
        await db.SaveChangesAsync();

        // 3. Generate tokens and return
        return Ok(await CreateAuthResponse(user));
    }

    // ========================
    // POST /api/auth/login
    // ========================
    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest request)
    {
        // 1. Find the user
        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == request.Email);
        if (user is null)
            return Unauthorized(new { message = "Invalid email or password" });

        // 2. Verify the password against the stored hash
        if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            return Unauthorized(new { message = "Invalid email or password" });

        // 3. Generate tokens and return
        return Ok(await CreateAuthResponse(user));
    }

    // ========================
    // POST /api/auth/refresh
    // ========================
    // No [Authorize] — this is called when the access token has EXPIRED
    [HttpPost("refresh")]
    public async Task<ActionResult<AuthResponse>> Refresh()
    {
        // 1. Read the refresh token from the HttpOnly cookie
        var refreshTokenValue = Request.Cookies["refreshToken"];
        if (string.IsNullOrEmpty(refreshTokenValue))
            return Unauthorized(new { message = "No refresh token" });

        // 2. Find the token in the database
        var refreshToken = await db.RefreshTokens
            .Include(rt => rt.User)
            .FirstOrDefaultAsync(rt => rt.Token == refreshTokenValue);

        // 3. Validate: exists? not revoked? not expired?
        if (refreshToken is null || refreshToken.IsRevoked || refreshToken.ExpiresAt < DateTime.UtcNow)
            return Unauthorized(new { message = "Invalid refresh token" });

        // 4. Token Rotation: revoke the old token before issuing a new one
        //    This is a security measure — if an attacker stole the old token,
        //    they can't use it because it's now revoked.
        refreshToken.IsRevoked = true;
        await db.SaveChangesAsync();

        // 5. Issue new tokens
        return Ok(await CreateAuthResponse(refreshToken.User));
    }

    // ========================
    // GET /api/auth/me
    // ========================
    // [Authorize] means only requests with a valid JWT can access this
    [Authorize]
    [HttpGet("me")]
    public async Task<ActionResult<UserDto>> Me()
    {
        // The JWT middleware already validated the token and extracted claims.
        // We read the user ID from the "sub" claim.
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userIdClaim is null)
            return Unauthorized();

        var user = await db.Users.FindAsync(int.Parse(userIdClaim));
        if (user is null)
            return NotFound();

        return Ok(new UserDto { Id = user.Id, Email = user.Email });
    }

    // ========================
    // POST /api/auth/logout
    // ========================
    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        var refreshTokenValue = Request.Cookies["refreshToken"];
        if (!string.IsNullOrEmpty(refreshTokenValue))
        {
            var refreshToken = await db.RefreshTokens
                .FirstOrDefaultAsync(rt => rt.Token == refreshTokenValue);
            if (refreshToken is not null)
            {
                refreshToken.IsRevoked = true;
                await db.SaveChangesAsync();
            }
        }

        // Clear the cookie — must use the same Secure/SameSite as when it was set
        Response.Cookies.Delete("refreshToken", RefreshCookieOptions());

        return Ok(new { message = "Logged out" });
    }

    // ========================
    // POST /api/auth/forgot-password
    // ========================
    // Public — anyone can request a password reset (they just need the email)
    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword(ForgotPasswordRequest request)
    {
        // SECURITY: Always return 200 even if the email doesn't exist.
        // This prevents attackers from discovering which emails are registered.
        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == request.Email);
        if (user is null)
            return Ok(new { message = "If that email exists, a reset link has been sent." });

        // Generate a cryptographically random token
        var tokenValue = Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));

        var resetToken = new PasswordResetToken
        {
            Token = tokenValue,
            ExpiresAt = DateTime.UtcNow.AddHours(1), // 1-hour window to reset
            UserId = user.Id
        };

        db.PasswordResetTokens.Add(resetToken);
        await db.SaveChangesAsync();

        // Send the email with the reset link
        await emailService.SendPasswordResetEmailAsync(user.Email, tokenValue);

        return Ok(new { message = "If that email exists, a reset link has been sent." });
    }

    // ========================
    // POST /api/auth/reset-password
    // ========================
    // Public — the user clicks the link from their email
    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword(ResetPasswordRequest request)
    {
        // 1. Find the token in the database
        var resetToken = await db.PasswordResetTokens
            .Include(rt => rt.User)
            .FirstOrDefaultAsync(rt => rt.Token == request.Token);

        // 2. Validate: exists? not used? not expired?
        if (resetToken is null || resetToken.IsUsed || resetToken.ExpiresAt < DateTime.UtcNow)
            return BadRequest(new { message = "Invalid or expired reset token" });

        // 3. Hash the new password and update the user
        resetToken.User.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);

        // 4. Mark the token as used (one-time use)
        resetToken.IsUsed = true;

        // 5. Revoke all existing refresh tokens for this user
        //    This logs out all sessions — a security measure so that if
        //    someone else had access, they're kicked out after a password change.
        var activeRefreshTokens = await db.RefreshTokens
            .Where(rt => rt.UserId == resetToken.UserId && !rt.IsRevoked)
            .ToListAsync();

        foreach (var rt in activeRefreshTokens)
            rt.IsRevoked = true;

        await db.SaveChangesAsync();

        return Ok(new { message = "Password has been reset successfully" });
    }

    // ========================
    // Helper: Generate JWT + Refresh Token
    // ========================
    private async Task<AuthResponse> CreateAuthResponse(User user)
    {
        // --- Access Token (JWT) ---
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Email, user.Email),
            // "jti" = JWT ID — a unique identifier for this specific token
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(config["Jwt:Key"]!));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var expiresMinutes = int.Parse(config["Jwt:AccessTokenExpirationMinutes"]!);

        var token = new JwtSecurityToken(
            issuer: config["Jwt:Issuer"],
            audience: config["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(expiresMinutes),
            signingCredentials: credentials
        );

        var accessToken = new JwtSecurityTokenHandler().WriteToken(token);

        // --- Refresh Token ---
        // Use a cryptographically random string (NOT a JWT — it doesn't need claims)
        var refreshTokenValue = Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));
        var refreshTokenExpiry = int.Parse(config["Jwt:RefreshTokenExpirationDays"]!);

        var refreshToken = new RefreshToken
        {
            Token = refreshTokenValue,
            ExpiresAt = DateTime.UtcNow.AddDays(refreshTokenExpiry),
            UserId = user.Id
        };

        db.RefreshTokens.Add(refreshToken);
        await db.SaveChangesAsync();

        // Set the refresh token as an HttpOnly cookie.
        // In production: Secure=true + SameSite=None (cross-origin HTTPS).
        // In development: Secure=false + SameSite=Lax (localhost HTTP is fine;
        //   browsers treat all localhost ports as same-site).
        Response.Cookies.Append("refreshToken", refreshTokenValue, RefreshCookieOptions(refreshToken.ExpiresAt));

        return new AuthResponse
        {
            AccessToken = accessToken,
            User = new UserDto { Id = user.Id, Email = user.Email }
        };
    }

    // ========================
    // Helper: Environment-aware refresh cookie options
    // ========================
    private CookieOptions RefreshCookieOptions(DateTimeOffset? expires = null)
    {
        var isDev = env.IsDevelopment();
        var opts = new CookieOptions
        {
            HttpOnly = true,
            Secure = !isDev,
            SameSite = isDev ? SameSiteMode.Lax : SameSiteMode.None,
        };
        if (expires.HasValue) opts.Expires = expires;
        return opts;
    }
}
