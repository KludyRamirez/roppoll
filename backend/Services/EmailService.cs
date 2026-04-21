using System.Net;
using System.Net.Mail;

namespace Propl.Api.Services;

// Interface — allows us to swap implementations (e.g., mock for testing)
public interface IEmailService
{
    Task SendPasswordResetEmailAsync(string toEmail, string resetToken);
}

public class EmailService(IConfiguration config) : IEmailService
{
    public async Task SendPasswordResetEmailAsync(string toEmail, string resetToken)
    {
        var frontendUrl = config["FrontendUrl"]!;
        var resetLink = $"{frontendUrl}/reset-password?token={resetToken}";

        var senderEmail = config["Email:SenderEmail"]!;
        var senderName = config["Email:SenderName"]!;
        var smtpServer = config["Email:SmtpServer"]!;
        var smtpPort = int.Parse(config["Email:SmtpPort"]!);
        var appPassword = config["Email:AppPassword"]!;

        // Build the email message
        var message = new MailMessage
        {
            From = new MailAddress(senderEmail, senderName),
            Subject = "Reset Your Password — Propl",
            IsBodyHtml = true,
            Body = $"""
                <h2>Password Reset Request</h2>
                <p>You requested a password reset. Click the link below to set a new password:</p>
                <p><a href="{resetLink}">Reset My Password</a></p>
                <p>This link expires in <strong>1 hour</strong>.</p>
                <p>If you didn't request this, you can safely ignore this email.</p>
                <br/>
                <p style="color: gray; font-size: 12px;">— Propl</p>
                """
        };
        message.To.Add(toEmail);

        // Gmail SMTP setup:
        //   Server: smtp.gmail.com
        //   Port: 587 (TLS)
        //   Auth: your Gmail + App Password (NOT your regular password)
        using var smtp = new SmtpClient(smtpServer, smtpPort)
        {
            Credentials = new NetworkCredential(senderEmail, appPassword),
            EnableSsl = true // TLS encryption — Gmail requires this
        };

        await smtp.SendMailAsync(message);
    }
}
