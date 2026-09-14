using CloudSafe.Api.Data;
using CloudSafe.Api.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace CloudSafe.Api.Controllers;

[ApiController]
[Route("api")]
[Authorize]
public class UserController(AppDbContext db) : ControllerBase
{
    private Guid CurrentUserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    // GET /api/currentUser
    [HttpGet("currentUser")]
    public async Task<IActionResult> GetCurrentUser()
    {
        var user = await db.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == CurrentUserId);

        if (user is null) return Unauthorized();

        var unread = await db.Notices
            .CountAsync(n => n.UserId == CurrentUserId && n.Status == Models.NoticeStatus.Unread);

        return Ok(new
        {
            data = new CurrentUserDto(
                UserId: user.Id.ToString(),
                Name: user.Name,
                Avatar: user.Avatar ?? "https://gw.alipayobjects.com/zos/antfincdn/XAosXuNZyF/BiazfanxmamNRoxxVxka.png",
                Email: user.Email,
                Phone: user.Phone,
                Title: user.Title,
                Signature: user.Signature,
                Group: user.Group,
                Address: user.Address,
                Access: user.Role,
                NotifyCount: unread,
                UnreadCount: unread
            )
        });
    }

    // PUT /api/currentUser
    [HttpPut("currentUser")]
    public async Task<IActionResult> UpdateCurrentUser([FromBody] UpdateUserRequest req)
    {
        var user = await db.Users.FindAsync(CurrentUserId);
        if (user is null) return NotFound();

        if (req.Name is not null) user.Name = req.Name;
        if (req.Email is not null) user.Email = req.Email;
        if (req.Phone is not null) user.Phone = req.Phone;
        if (req.Title is not null) user.Title = req.Title;
        if (req.Signature is not null) user.Signature = req.Signature;
        if (req.Group is not null) user.Group = req.Group;
        if (req.Address is not null) user.Address = req.Address;
        user.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();
        return Ok(new { success = true });
    }
}
