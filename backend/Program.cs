using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using RopPoll.Api.Data;
using RopPoll.Api.Services;

var builder = WebApplication.CreateBuilder(args);

// --- 1. Database: Register EF Core with PostgreSQL ---
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("Default")));

// --- 1b. Email Service: Gmail SMTP for password reset emails ---
builder.Services.AddScoped<IEmailService, EmailService>();

// --- 2. Authentication: Configure JWT Bearer ---
// This tells ASP.NET how to validate incoming JWT tokens
var jwtKey = builder.Configuration["Jwt:Key"]!;
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,           // Reject expired tokens
            ValidateIssuerSigningKey = true,    // Verify the signature
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            ClockSkew = TimeSpan.Zero          // No tolerance for expiry (default is 5 min!)
        };
    });

// --- 3. CORS: Allow the React frontend to call our API ---
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins("http://localhost:5173")  // Vite dev server
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();  // Required for cookies (refresh token)
    });
});

builder.Services.AddControllers();
builder.Services.AddOpenApi();

var app = builder.Build();

// --- 4. Middleware pipeline (order matters!) ---
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors();             // Must be before Auth
app.UseAuthentication();   // Reads the JWT from the Authorization header
app.UseAuthorization();    // Enforces [Authorize] attributes

app.MapControllers();

app.Run();
