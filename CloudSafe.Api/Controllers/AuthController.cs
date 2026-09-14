using CloudSafe.Api.Data;
using CloudSafe.Api.DTOs;
using CloudSafe.Api.Models;
using CloudSafe.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CloudSafe.Api.Controllers;

[ApiController]
[Route("api/login")]
public class AuthController(AppDbContext db, IJwtService jwt, ILogger<AuthController> logger) : ControllerBase
{
    // POST /api/login/account
    [HttpPost("account")]
    public async Task<IActionResult> Login([FromBody] LoginRequest req)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Username == req.Username);
        if (user is null || !BCrypt.Net.BCrypt.Verify(req.Password, user.PasswordHash))
        {
            logger.LogWarning("Đăng nhập thất bại: {Username}", req.Username);
            return Ok(new LoginResult("error", req.Type, "guest"));
        }

        var token = jwt.GenerateToken(user);

        Response.Cookies.Append("cloudsafe_token", token, new CookieOptions
        {
            HttpOnly = true,
            SameSite = SameSiteMode.Lax,
            Expires = DateTimeOffset.UtcNow.AddDays(7)
        });

        logger.LogInformation("Đăng nhập thành công: {Username}", req.Username);
        return Ok(new
        {
            status = "ok",
            type = req.Type,
            currentAuthority = user.Role,
            token
        });
    }

    // POST /api/login/outLogin
    [HttpPost("outLogin")]
    public IActionResult Logout()
    {
        Response.Cookies.Delete("cloudsafe_token");
        return Ok(new { success = true });
    }
}

[ApiController]
[Route("api/register")]
public class RegisterController(AppDbContext db, IJwtService jwt) : ControllerBase
{
    // POST /api/register/account
    [HttpPost("account")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest req)
    {
        if (await db.Users.AnyAsync(u => u.Username == req.Username))
            return BadRequest(new { success = false, message = "Tên đăng nhập đã tồn tại" });

        if (await db.Users.AnyAsync(u => u.Email == req.Email))
            return BadRequest(new { success = false, message = "Email đã được sử dụng" });

        var user = new User
        {
            Username = req.Username,
            Email = req.Email,
            Name = req.Name ?? req.Username,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password),
            Role = "user"
        };

        db.Users.Add(user);
        await db.SaveChangesAsync();

        var token = jwt.GenerateToken(user);
        return Ok(new { success = true, token, userId = user.Id });
    }
}
