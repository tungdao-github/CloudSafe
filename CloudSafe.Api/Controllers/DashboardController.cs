using CloudSafe.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace CloudSafe.Api.Controllers;

[ApiController]
[Route("api/dashboard")]
[Authorize]
public class DashboardController(AppDbContext db) : ControllerBase
{
    private Guid CurrentUserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    // GET /api/dashboard/fake_analysis_chart_data
    [HttpGet("fake_analysis_chart_data")]
    public async Task<IActionResult> AnalysisChartData()
    {
        var today = DateTime.UtcNow.Date;

        // Visit data: files uploaded per day for last 10 days
        var uploadsByDay = await db.EncryptedFiles
            .Where(f => f.OwnerId == CurrentUserId && f.CreatedAt >= today.AddDays(-10))
            .GroupBy(f => f.CreatedAt.Date)
            .Select(g => new { Date = g.Key, Count = g.Count() })
            .ToListAsync();

        var visitData = Enumerable.Range(0, 10).Select(i =>
        {
            var d = today.AddDays(-9 + i);
            return new { x = d.ToString("yyyy-MM-dd"), y = uploadsByDay.FirstOrDefault(u => u.Date == d)?.Count ?? Random.Shared.Next(3, 20) };
        }).ToList();

        // Files by type
        var byMime = await db.EncryptedFiles
            .Where(f => f.OwnerId == CurrentUserId && f.Status != Models.FileStatus.Deleted)
            .GroupBy(f => f.MimeType)
            .Select(g => new { x = MapMimeToLabel(g.Key), y = g.Count() })
            .ToListAsync();

        // Monthly data
        var salesData = Enumerable.Range(1, 12).Select(m => new
        {
            x = $"Tháng {m}",
            y = Random.Shared.Next(20, 200)
        }).ToList();

        // Search keywords (top file names)
        var searchData = await db.EncryptedFiles
            .Where(f => f.OwnerId == CurrentUserId)
            .OrderByDescending(f => f.CreatedAt)
            .Take(10)
            .Select(f => new { index = 1, keyword = f.OriginalName, count = Random.Shared.Next(10, 300), range = Random.Shared.Next(-20, 50) })
            .ToListAsync();

        return Ok(new
        {
            data = new
            {
                visitData,
                visitData2 = visitData,
                salesData,
                searchData,
                salesTypeData = byMime.Any() ? byMime.Cast<object>().ToList() : DefaultSalesTypeData(),
                salesTypeDataOnline = DefaultSalesTypeData(),
                salesTypeDataOffline = DefaultSalesTypeData(),
                offlineData = Enumerable.Range(0, 10).Select(i => new { date = $"T{i + 1}", value = Random.Shared.Next(50, 300) }),
                offlineChartData = Enumerable.Range(0, 20).Select(i => new { date = today.AddHours(-i).ToString("MM-dd HH:mm"), value = Random.Shared.Next(100, 500) }),
                radarData = new[]
                {
                    new { name = "Cá nhân", label = "Mã hóa", value = 80 },
                    new { name = "Cá nhân", label = "Bảo mật", value = 70 },
                    new { name = "Cá nhân", label = "Tốc độ", value = 60 },
                    new { name = "Cá nhân", label = "Chia sẻ", value = 50 },
                    new { name = "Cá nhân", label = "Lưu trữ", value = 90 },
                    new { name = "Nhóm", label = "Mã hóa", value = 90 },
                    new { name = "Nhóm", label = "Bảo mật", value = 85 },
                    new { name = "Nhóm", label = "Tốc độ", value = 70 },
                    new { name = "Nhóm", label = "Chia sẻ", value = 80 },
                    new { name = "Nhóm", label = "Lưu trữ", value = 75 },
                }
            }
        });
    }

    // GET /api/dashboard/fake_workplace_chart_data
    [HttpGet("fake_workplace_chart_data")]
    public IActionResult WorkplaceChartData() => AnalysisChartData().Result;

    // GET /api/dashboard/project/notice
    [HttpGet("project/notice")]
    public async Task<IActionResult> ProjectNotice()
    {
        var files = await db.EncryptedFiles
            .Where(f => f.OwnerId == CurrentUserId)
            .OrderByDescending(f => f.CreatedAt)
            .Take(8)
            .Select(f => new
            {
                id = f.Id,
                title = f.OriginalName,
                logo = "https://gw.alipayobjects.com/zos/rmsportal/WdGqmHpayyMjiEhcKoVE.png",
                description = $"Mã hóa {f.Algorithm} — {f.CreatedAt:dd/MM/yyyy}",
                updatedAt = f.UpdatedAt,
                member = "Nguyễn Admin",
                href = "/files/list",
                memberLink = "/account/center"
            })
            .ToListAsync();

        return Ok(new { data = files });
    }

    // GET /api/dashboard/activities
    [HttpGet("activities")]
    public async Task<IActionResult> Activities()
    {
        var files = await db.EncryptedFiles
            .Where(f => f.OwnerId == CurrentUserId)
            .OrderByDescending(f => f.CreatedAt)
            .Take(6)
            .ToListAsync();

        var activities = files.Select(f => new
        {
            id = f.Id,
            updatedAt = f.CreatedAt,
            user = new { name = "Nguyễn Admin", avatar = "https://gw.alipayobjects.com/zos/antfincdn/XAosXuNZyF/BiazfanxmamNRoxxVxka.png" },
            @event = new[]
            {
                new { type = "at", value = f.OriginalName },
                new { type = "link", value = "tệp đã mã hóa" }
            },
            template = "@{user} đã tải lên @{at} vào @{time}",
        });

        return Ok(new { data = activities });
    }

    // GET /api/dashboard/stats
    [HttpGet("stats")]
    public async Task<IActionResult> Stats()
    {
        var totalFiles = await db.EncryptedFiles.CountAsync(f => f.OwnerId == CurrentUserId && f.Status != Models.FileStatus.Deleted);
        var sharedFiles = await db.EncryptedFiles.CountAsync(f => f.OwnerId == CurrentUserId && f.Status == Models.FileStatus.Shared);
        var activeKeys = await db.RsaKeyPairs.CountAsync(k => k.OwnerId == CurrentUserId && k.Status == Models.KeyStatus.Active);
        var totalSize = await db.EncryptedFiles
            .Where(f => f.OwnerId == CurrentUserId && f.Status != Models.FileStatus.Deleted)
            .SumAsync(f => (long?)f.FileSizeBytes) ?? 0;

        return Ok(new
        {
            data = new
            {
                totalFiles,
                sharedFiles,
                activeKeys,
                totalSizeBytes = totalSize,
                securityScore = 98
            }
        });
    }

    private static List<object> DefaultSalesTypeData() =>
    [
        new { x = "PDF/Tài liệu", y = 4544 },
        new { x = "Excel/Bảng tính", y = 3321 },
        new { x = "Word/Văn bản", y = 3113 },
        new { x = "Hình ảnh", y = 2341 },
        new { x = "Archive/ZIP", y = 1231 },
        new { x = "Khác", y = 1231 },
    ];

    private static string MapMimeToLabel(string mime) => mime switch
    {
        "application/pdf" => "PDF/Tài liệu",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" => "Excel/Bảng tính",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" => "Word/Văn bản",
        var m when m.StartsWith("image/") => "Hình ảnh",
        "application/zip" => "Archive/ZIP",
        _ => "Khác"
    };
}
