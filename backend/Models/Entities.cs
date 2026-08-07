using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace BusTrackerApi.Models
{
    public class User
    {
        public int Id { get; set; }
        public string Username { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string PhoneNumber { get; set; } = string.Empty;
        [JsonIgnore]
        public string PasswordHash { get; set; } = string.Empty;
        public string Role { get; set; } = "Passenger"; // Passenger, Driver
    }

    public class UserSession
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public string Token { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime ExpiresAt { get; set; } = DateTime.UtcNow.AddDays(7);
        public User? User { get; set; }
    }

    public class Bus
    {
        public int Id { get; set; }
        public string PlateNumber { get; set; } = string.Empty;
        public string BusNumber { get; set; } = string.Empty;
        public string DriverName { get; set; } = string.Empty;
        public string CompanyName { get; set; } = string.Empty;
        public int Capacity { get; set; }
        public string Type { get; set; } = "Ordinary"; // Express, Ordinary
    }

    public class Route
    {
        public int Id { get; set; }
        public string Origin { get; set; } = string.Empty; // Rivas, Managua
        public string Destination { get; set; } = string.Empty; // Managua, Rivas
        public string ScheduledDeparture { get; set; } = string.Empty; // e.g., "06:00 AM"
        public double Fare { get; set; } // price in Cordobas
    }

    public class Trip
    {
        public int Id { get; set; }
        public int RouteId { get; set; }
        public int BusId { get; set; }
        public int? DriverId { get; set; } // The User.Id of the driver
        public string Status { get; set; } = "Scheduled"; // Scheduled, EnRoute, Delayed, Arrived, Cancelled
        public double CurrentLatitude { get; set; } = 11.4378; // Default Rivas Terminal lat
        public double CurrentLongitude { get; set; } = -85.8263; // Default Rivas Terminal lng
        public DateTime LastUpdated { get; set; } = DateTime.UtcNow;

        public Route? Route { get; set; }
        public Bus? Bus { get; set; }
        public User? Driver { get; set; }

        public ICollection<Report> Reports { get; set; } = new List<Report>();
        public ICollection<Comment> Comments { get; set; } = new List<Comment>();
    }

    public class Report
    {
        public int Id { get; set; }
        public int TripId { get; set; }
        public int UserId { get; set; }
        public string StatusReport { get; set; } = string.Empty; // Left, NotLeft, Delayed
        public int DelayMinutes { get; set; }
        public string Occupancy { get; set; } = "Medium"; // Empty, Medium, Full
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;

        public User? User { get; set; }
    }

    public class Comment
    {
        public int Id { get; set; }
        public int TripId { get; set; }
        public int UserId { get; set; }
        public string Content { get; set; } = string.Empty;
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;

        public User? User { get; set; }
    }
}
