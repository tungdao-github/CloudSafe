using System.Text;
using CloudSafe.Api.Data;
using CloudSafe.Api.Middleware;
using CloudSafe.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Serilog;

// ── Serilog ─────────────────────────────────────────────────────────
Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .WriteTo.File("logs/cloudsafe-.log", rollingInterval: RollingInterval.Day)
    .Enrich.FromLogContext()
    .CreateLogger();

var builder = WebApplication.CreateBuilder(args);
builder.Host.UseSerilog();

// ── Services ─────────────────────────────────────────────────────────
builder.Services.AddControllers()
    .AddJsonOptions(o =>
    {
        o.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
        o.JsonSerializerOptions.DefaultIgnoreCondition =
            System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull;
    });

// EF Core — SQL Server
builder.Services.AddDbContext<AppDbContext>(opt =>
    opt.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection"))
);

// JWT Auth
var jwtSecret = builder.Configuration["Jwt:Secret"]
    ?? throw new InvalidOperationException("Jwt:Secret is required");

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(opt =>
    {
        opt.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
            ValidateIssuer = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"] ?? "CloudSafe",
            ValidateAudience = true,
            ValidAudience = builder.Configuration["Jwt:Audience"] ?? "CloudSafe",
            ValidateLifetime = true,
            ClockSkew = TimeSpan.Zero
        };

        // Support cookie-based token as well
        opt.Events = new JwtBearerEvents
        {
            OnMessageReceived = ctx =>
            {
                if (string.IsNullOrEmpty(ctx.Token))
                    ctx.Token = ctx.Request.Cookies["cloudsafe_token"];
                return Task.CompletedTask;
            }
        };
    });
// builder.Services.Configure<FormOptions>(o =>
// {
//     o.MultipartBodyLengthLimit = 500 * 1024 * 1024;
// });
builder.Services.AddAuthorization();

// CORS — allow Ant Design Pro dev server
builder.Services.AddCors(opt =>
    opt.AddDefaultPolicy(p => p
        .WithOrigins(
            "http://localhost:8000",
            "http://localhost:3000",
            "https://cloudsafe.vn"
        )
        .AllowAnyHeader()
        .AllowAnyMethod()
        .AllowCredentials()
    )
);

// Swagger / OpenAPI
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "CloudSafe API",
        Version = "v1",
        Description = "Hệ thống mã hóa dữ liệu đám mây AES-256-GCM + RSA-OAEP"
    });

    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Nhập JWT token: Bearer {token}"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme { Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" } },
            []
        }
    });
});

// DI
builder.Services.AddScoped<IJwtService, JwtService>();

// ── Build ─────────────────────────────────────────────────────────────
var app = builder.Build();

// ── Migrations on startup ─────────────────────────────────────────────
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();
    Log.Information("Database migration applied");
}

// ── Middleware pipeline ───────────────────────────────────────────────
app.UseMiddleware<ErrorHandlingMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "CloudSafe API v1");
        c.RoutePrefix = "swagger";
    });
}

app.UseSerilogRequestLogging();
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();


// Health check
app.MapGet("/health", () => new { status = "ok", app = "CloudSafe API", version = "1.0.0" });

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();

    if (!db.Users.Any())
    {
        db.Users.AddRange(
            new CloudSafe.Api.Models.User
            {
                Id = new Guid("00000000-0000-0000-0000-000000000001"),
                Username = "admin",
                Email = "admin@cloudsafe.vn",
                Name = "Nguyễn Admin",
                Role = "admin",
                Title = "Quản trị viên hệ thống",
                Address = "215 Lạch Tray, Ngô Quyền, Hải Phòng",
                Phone = "0225-3888888",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("admin123"),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            },
            new CloudSafe.Api.Models.User
            {
                Id = new Guid("00000000-0000-0000-0000-000000000002"),
                Username = "user",
                Email = "user@cloudsafe.vn",
                Name = "Người Dùng",
                Role = "user",
                Title = "Nhân viên",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("user123"),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            }
        );
        db.SaveChanges();
        Log.Information("Seeded 2 accounts: admin/admin123, user/user123");
    }
}
// Log.Information("CloudSafe API started on {Env}", app.Environment.EnvironmentName);
app.Run();
