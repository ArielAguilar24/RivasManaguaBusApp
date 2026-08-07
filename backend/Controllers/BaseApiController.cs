using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BusTrackerApi.Data;
using BusTrackerApi.Models;
using System;
using System.Threading.Tasks;

namespace BusTrackerApi.Controllers
{
    public class BaseApiController : ControllerBase
    {
        protected readonly AppDbContext _context;

        public BaseApiController(AppDbContext context)
        {
            _context = context;
        }

        protected async Task<User?> GetCurrentUserAsync()
        {
            if (!Request.Headers.TryGetValue("Authorization", out var authHeader))
            {
                return null;
            }

            var token = authHeader.ToString().Replace("Bearer ", "").Trim();
            if (string.IsNullOrEmpty(token))
            {
                return null;
            }

            var session = await _context.UserSessions
                .Include(s => s.User)
                .FirstOrDefaultAsync(s => s.Token == token && s.ExpiresAt > DateTime.UtcNow);

            return session?.User;
        }
    }
}
