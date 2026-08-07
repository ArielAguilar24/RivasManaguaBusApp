using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using BusTrackerApi.Data;
using BusTrackerApi.Hubs;
using BusTrackerApi.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace BusTrackerApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TripsController : BaseApiController
    {
        private readonly IHubContext<TrackingHub> _hubContext;

        public TripsController(AppDbContext context, IHubContext<TrackingHub> hubContext) : base(context)
        {
            _hubContext = hubContext;
        }

        // GET: api/trips
        // Passengers search for trips based on origin/destination
        [HttpGet]
        public async Task<IActionResult> GetTrips([FromQuery] string? origin, [FromQuery] string? destination)
        {
            var query = _context.Trips
                .Include(t => t.Route)
                .Include(t => t.Bus)
                .AsQueryable();

            if (!string.IsNullOrEmpty(origin))
            {
                query = query.Where(t => t.Route!.Origin.ToLower() == origin.ToLower());
            }

            if (!string.IsNullOrEmpty(destination))
            {
                query = query.Where(t => t.Route!.Destination.ToLower() == destination.ToLower());
            }

            var trips = await query.ToListAsync();
            return Ok(trips);
        }

        // GET: api/trips/{id}
        // Detailed information about a single trip, with related comments and reports
        [HttpGet("{id}")]
        public async Task<IActionResult> GetTripDetails(int id)
        {
            var trip = await _context.Trips
                .Include(t => t.Route)
                .Include(t => t.Bus)
                .Include(t => t.Driver)
                .Include(t => t.Comments).ThenInclude(c => c.User)
                .Include(t => t.Reports).ThenInclude(r => r.User)
                .FirstOrDefaultAsync(t => t.Id == id);

            if (trip == null)
            {
                return NotFound(new { message = "Trip not found." });
            }

            // Map comments and reports to avoid circular references and hide password hashes
            var details = new
            {
                trip.Id,
                trip.RouteId,
                trip.BusId,
                trip.DriverId,
                trip.Status,
                trip.CurrentLatitude,
                trip.CurrentLongitude,
                trip.LastUpdated,
                Route = trip.Route == null ? null : new
                {
                    trip.Route.Id,
                    trip.Route.Origin,
                    trip.Route.Destination,
                    trip.Route.ScheduledDeparture,
                    trip.Route.Fare
                },
                Bus = trip.Bus == null ? null : new
                {
                    trip.Bus.Id,
                    trip.Bus.PlateNumber,
                    trip.Bus.BusNumber,
                    trip.Bus.DriverName,
                    trip.Bus.CompanyName,
                    trip.Bus.Capacity,
                    trip.Bus.Type
                },
                Driver = trip.Driver == null ? null : new
                {
                    trip.Driver.Id,
                    trip.Driver.Username
                },
                Comments = trip.Comments.Select(c => new
                {
                    c.Id,
                    c.Content,
                    c.Timestamp,
                    Username = c.User?.Username ?? "Anónimo"
                }).OrderByDescending(c => c.Timestamp).ToList(),
                Reports = trip.Reports.Select(r => new
                {
                    r.Id,
                    r.StatusReport,
                    r.DelayMinutes,
                    r.Occupancy,
                    r.Timestamp,
                    Username = r.User?.Username ?? "Anónimo"
                }).OrderByDescending(r => r.Timestamp).ToList()
            };

            return Ok(details);
        }

        // GET: api/trips/driver
        // Returns trips assigned to the logged-in driver or unassigned scheduled trips they can start
        [HttpGet("driver")]
        public async Task<IActionResult> GetDriverTrips()
        {
            var user = await GetCurrentUserAsync();
            if (user == null || user.Role != "Driver")
            {
                return Unauthorized(new { message = "Only drivers can view driver panel trips." });
            }

            var trips = await _context.Trips
                .Include(t => t.Route)
                .Include(t => t.Bus)
                .Where(t => t.DriverId == user.Id || (t.DriverId == null && t.Status == "Scheduled"))
                .ToListAsync();

            return Ok(trips);
        }

        // POST: api/trips/{id}/assign
        // Driver assigns themselves to a scheduled trip
        [HttpPost("{id}/assign")]
        public async Task<IActionResult> AssignTrip(int id)
        {
            var user = await GetCurrentUserAsync();
            if (user == null || user.Role != "Driver")
            {
                return Unauthorized(new { message = "Only drivers can assign themselves to trips." });
            }

            var trip = await _context.Trips.FirstOrDefaultAsync(t => t.Id == id);
            if (trip == null)
            {
                return NotFound(new { message = "Trip not found." });
            }

            if (trip.DriverId != null && trip.DriverId != user.Id)
            {
                return BadRequest(new { message = "This trip is already assigned to another driver." });
            }

            trip.DriverId = user.Id;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Trip successfully assigned.", trip });
        }

        // POST: api/trips/{id}/start
        // Driver starts the trip, status becomes EnRoute
        [HttpPost("{id}/start")]
        public async Task<IActionResult> StartTrip(int id)
        {
            var user = await GetCurrentUserAsync();
            if (user == null || user.Role != "Driver")
            {
                return Unauthorized(new { message = "Only drivers can start trips." });
            }

            var trip = await _context.Trips.Include(t => t.Route).FirstOrDefaultAsync(t => t.Id == id);
            if (trip == null)
            {
                return NotFound(new { message = "Trip not found." });
            }

            if (trip.DriverId == null)
            {
                trip.DriverId = user.Id;
            }
            else if (trip.DriverId != user.Id)
            {
                return BadRequest(new { message = "You are not the driver assigned to this trip." });
            }

            trip.Status = "EnRoute";
            // Seed starting coordinate based on origin
            if (trip.Route != null && trip.Route.Origin.ToLower() == "managua")
            {
                trip.CurrentLatitude = 12.1464;
                trip.CurrentLongitude = -86.2305;
            }
            else
            {
                trip.CurrentLatitude = 11.4378;
                trip.CurrentLongitude = -85.8263;
            }

            trip.LastUpdated = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            // Notify passengers via SignalR
            await _hubContext.Clients.Group($"Trip_{id}").SendAsync("ReceiveLocationUpdate", new
            {
                TripId = id.ToString(),
                Latitude = trip.CurrentLatitude,
                Longitude = trip.CurrentLongitude,
                Status = trip.Status
            });

            return Ok(new { message = "Trip started successfully.", trip });
        }

        // POST: api/trips/{id}/status
        // Driver updates trip status (Delayed, Arrived, Cancelled)
        [HttpPost("{id}/status")]
        public async Task<IActionResult> UpdateStatus(int id, [FromBody] string status)
        {
            var user = await GetCurrentUserAsync();
            if (user == null || user.Role != "Driver")
            {
                return Unauthorized(new { message = "Only drivers can update trip status." });
            }

            var trip = await _context.Trips.FirstOrDefaultAsync(t => t.Id == id);
            if (trip == null)
            {
                return NotFound(new { message = "Trip not found." });
            }

            if (trip.DriverId != user.Id)
            {
                return BadRequest(new { message = "You are not the driver assigned to this trip." });
            }

            trip.Status = status;
            trip.LastUpdated = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            // Broadcast status change
            await _hubContext.Clients.Group($"Trip_{id}").SendAsync("ReceiveLocationUpdate", new
            {
                TripId = id.ToString(),
                Latitude = trip.CurrentLatitude,
                Longitude = trip.CurrentLongitude,
                Status = trip.Status
            });

            return Ok(new { message = "Trip status updated.", trip });
        }

        public class LocationDto
        {
            public double Latitude { get; set; }
            public double Longitude { get; set; }
        }

        // POST: api/trips/{id}/location
        // Driver updates active GPS location
        [HttpPost("{id}/location")]
        public async Task<IActionResult> UpdateLocation(int id, [FromBody] LocationDto dto)
        {
            var user = await GetCurrentUserAsync();
            if (user == null || user.Role != "Driver")
            {
                return Unauthorized(new { message = "Only drivers can update GPS location." });
            }

            var trip = await _context.Trips.FirstOrDefaultAsync(t => t.Id == id);
            if (trip == null)
            {
                return NotFound(new { message = "Trip not found." });
            }

            if (trip.DriverId != user.Id)
            {
                return BadRequest(new { message = "You are not the driver assigned to this trip." });
            }

            trip.CurrentLatitude = dto.Latitude;
            trip.CurrentLongitude = dto.Longitude;
            trip.LastUpdated = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            // Broadcast GPS update
            await _hubContext.Clients.Group($"Trip_{id}").SendAsync("ReceiveLocationUpdate", new
            {
                TripId = id.ToString(),
                Latitude = trip.CurrentLatitude,
                Longitude = trip.CurrentLongitude,
                Status = trip.Status
            });

            return Ok(new { message = "GPS coordinates updated." });
        }

        public class CommentDto
        {
            public string Content { get; set; } = string.Empty;
        }

        // POST: api/trips/{id}/comment
        // Passengers submit comment
        [HttpPost("{id}/comment")]
        public async Task<IActionResult> AddComment(int id, [FromBody] CommentDto dto)
        {
            var user = await GetCurrentUserAsync();
            if (user == null)
            {
                return Unauthorized(new { message = "You must be logged in to comment." });
            }

            if (string.IsNullOrWhiteSpace(dto.Content))
            {
                return BadRequest(new { message = "Comment content cannot be empty." });
            }

            var comment = new Comment
            {
                TripId = id,
                UserId = user.Id,
                Content = dto.Content,
                Timestamp = DateTime.UtcNow
            };

            _context.Comments.Add(comment);
            await _context.SaveChangesAsync();

            // Broadcast comment to passengers watching this trip detail page
            await _hubContext.Clients.Group($"Trip_{id}").SendAsync("ReceiveComment", new
            {
                Id = comment.Id,
                Content = comment.Content,
                Timestamp = comment.Timestamp,
                Username = user.Username
            });

            return Ok(comment);
        }

        public class ReportDto
        {
            public string StatusReport { get; set; } = "Left"; // Left, NotLeft, Delayed
            public int DelayMinutes { get; set; }
            public string Occupancy { get; set; } = "Medium"; // Empty, Medium, Full
        }

        // POST: api/trips/{id}/report
        // Passengers submit a crowdsourced departure status / occupancy level report
        [HttpPost("{id}/report")]
        public async Task<IActionResult> AddReport(int id, [FromBody] ReportDto dto)
        {
            var user = await GetCurrentUserAsync();
            if (user == null)
            {
                return Unauthorized(new { message = "You must be logged in to report." });
            }

            var report = new Report
            {
                TripId = id,
                UserId = user.Id,
                StatusReport = dto.StatusReport,
                DelayMinutes = dto.DelayMinutes,
                Occupancy = dto.Occupancy,
                Timestamp = DateTime.UtcNow
            };

            _context.Reports.Add(report);
            await _context.SaveChangesAsync();

            // Broadcast report update to active clients
            await _hubContext.Clients.Group($"Trip_{id}").SendAsync("ReceiveReport", new
            {
                Id = report.Id,
                StatusReport = report.StatusReport,
                DelayMinutes = report.DelayMinutes,
                Occupancy = report.Occupancy,
                Timestamp = report.Timestamp,
                Username = user.Username
            });

            return Ok(report);
        }
    }
}
