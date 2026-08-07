using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BusTrackerApi.Data;
using BusTrackerApi.Models;
using BusTrackerApi.Services;
using System;
using System.Threading.Tasks;

namespace BusTrackerApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : BaseApiController
    {
        public AuthController(AppDbContext context) : base(context) { }

        public class LoginDto
        {
            public string Username { get; set; } = string.Empty;
            public string Password { get; set; } = string.Empty;
        }

        public class RegisterDto
        {
            public string Username { get; set; } = string.Empty;
            public string Password { get; set; } = string.Empty;
            public string Role { get; set; } = "Passenger"; // Passenger, Driver
            public string FullName { get; set; } = string.Empty;
            public string PhoneNumber { get; set; } = string.Empty;
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Username) || string.IsNullOrWhiteSpace(dto.Password))
            {
                return BadRequest(new { message = "Username and password are required." });
            }

            var usernameNormalized = dto.Username.Trim().ToLower();
            if (await _context.Users.AnyAsync(u => u.Username.ToLower() == usernameNormalized))
            {
                return BadRequest(new { message = "Username already exists." });
            }

            var role = dto.Role == "Driver" ? "Driver" : "Passenger";

            if (role == "Driver" && (string.IsNullOrWhiteSpace(dto.FullName) || string.IsNullOrWhiteSpace(dto.PhoneNumber)))
            {
                return BadRequest(new { message = "Nombre completo y teléfono son obligatorios para conductores." });
            }

            var user = new User
            {
                Username = dto.Username.Trim(),
                PasswordHash = PasswordHasher.HashPassword(dto.Password),
                Role = role,
                FullName = dto.FullName?.Trim() ?? string.Empty,
                PhoneNumber = dto.PhoneNumber?.Trim() ?? string.Empty
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            var token = Guid.NewGuid().ToString("N");
            var session = new UserSession
            {
                UserId = user.Id,
                Token = token,
                CreatedAt = DateTime.UtcNow,
                ExpiresAt = DateTime.UtcNow.AddDays(7)
            };

            _context.UserSessions.Add(session);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                user = new { user.Id, user.Username, user.FullName, user.PhoneNumber, user.Role },
                token = token
            });
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Username) || string.IsNullOrWhiteSpace(dto.Password))
            {
                return BadRequest(new { message = "Username and password are required." });
            }

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Username.ToLower() == dto.Username.Trim().ToLower());
            if (user == null || !PasswordHasher.VerifyPassword(dto.Password, user.PasswordHash))
            {
                return Unauthorized(new { message = "Invalid username or password." });
            }

            var token = Guid.NewGuid().ToString("N");
            var session = new UserSession
            {
                UserId = user.Id,
                Token = token,
                CreatedAt = DateTime.UtcNow,
                ExpiresAt = DateTime.UtcNow.AddDays(7)
            };

            _context.UserSessions.Add(session);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                user = new { user.Id, user.Username, user.FullName, user.PhoneNumber, user.Role },
                token = token
            });
        }

        [HttpGet("me")]
        public async Task<IActionResult> GetMe()
        {
            var user = await GetCurrentUserAsync();
            if (user == null)
            {
                return Unauthorized(new { message = "Invalid or expired session token." });
            }

            return Ok(new { user.Id, user.Username, user.FullName, user.PhoneNumber, user.Role });
        }

        [HttpPost("logout")]
        public async Task<IActionResult> Logout()
        {
            if (Request.Headers.TryGetValue("Authorization", out var authHeader))
            {
                var token = authHeader.ToString().Replace("Bearer ", "").Trim();
                var session = await _context.UserSessions.FirstOrDefaultAsync(s => s.Token == token);
                if (session != null)
                {
                    _context.UserSessions.Remove(session);
                    await _context.SaveChangesAsync();
                }
            }

            return Ok(new { message = "Logged out successfully." });
        }
    }
}
