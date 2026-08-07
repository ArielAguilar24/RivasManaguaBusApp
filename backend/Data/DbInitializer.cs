using System;
using System.Linq;
using BusTrackerApi.Models;
using BusTrackerApi.Services;

namespace BusTrackerApi.Data
{
    public static class DbInitializer
    {
        public static void Initialize(AppDbContext context)
        {
            context.Database.EnsureCreated();

            // If routes exist and count is comprehensive, skip re-seeding
            if (context.Routes.Count() >= 30)
            {
                return;
            }

            // Clear old routes, buses, and trips to update with full catalog
            if (context.Routes.Any())
            {
                context.Trips.RemoveRange(context.Trips);
                context.Routes.RemoveRange(context.Routes);
                context.Buses.RemoveRange(context.Buses);
                context.SaveChanges();
            }

            // Seed Users if none exist
            if (!context.Users.Any())
            {
                var users = new User[]
                {
                    new User { Username = "conductor1", PasswordHash = PasswordHasher.HashPassword("conductor123"), Role = "Driver" },
                    new User { Username = "conductor2", PasswordHash = PasswordHasher.HashPassword("conductor123"), Role = "Driver" },
                    new User { Username = "pasajero1", PasswordHash = PasswordHasher.HashPassword("pasajero123"), Role = "Passenger" },
                    new User { Username = "pasajero2", PasswordHash = PasswordHasher.HashPassword("pasajero123"), Role = "Passenger" }
                };

                context.Users.AddRange(users);
                context.SaveChanges();
            }

            var driverUsers = context.Users.Where(u => u.Role == "Driver").ToList();

            // Seed Comprehensive List of Buses
            var buses = new Bus[]
            {
                // Rivas -> Managua Buses
                new Bus { PlateNumber = "RI-1011", BusNumber = "05", DriverName = "Don Carlos", CompanyName = "Expreso del Sur", Capacity = 48, Type = "Express" },
                new Bus { PlateNumber = "RI-1024", BusNumber = "21", DriverName = "Don Antonio", CompanyName = "Transportes Nicarao", Capacity = 45, Type = "Express" },
                new Bus { PlateNumber = "RI-2045", BusNumber = "14", DriverName = "Don Guillermo", CompanyName = "COTRAN Rivas", Capacity = 60, Type = "Ordinary" },
                new Bus { PlateNumber = "RI-3045", BusNumber = "12", DriverName = "Don Julio", CompanyName = "Transportes Vargas", Capacity = 55, Type = "Ordinary" },
                new Bus { PlateNumber = "RI-4050", BusNumber = "08", DriverName = "Don Roberto", CompanyName = "Expreso Rivas-Managua", Capacity = 50, Type = "Express" },
                new Bus { PlateNumber = "RI-1025", BusNumber = "22", DriverName = "Don Pedro", CompanyName = "Transportes Nicarao", Capacity = 45, Type = "Express" },
                new Bus { PlateNumber = "RI-5012", BusNumber = "33", DriverName = "Don Mario", CompanyName = "Transportes Chabelo", Capacity = 58, Type = "Ordinary" },
                new Bus { PlateNumber = "RI-1012", BusNumber = "06", DriverName = "Don José", CompanyName = "Expreso del Sur", Capacity = 48, Type = "Express" },
                new Bus { PlateNumber = "RI-3046", BusNumber = "13", DriverName = "Don Luis", CompanyName = "Transportes Vargas", Capacity = 55, Type = "Ordinary" },
                new Bus { PlateNumber = "RI-6010", BusNumber = "01", DriverName = "Don Fernando", CompanyName = "Transportes Ometepe-Managua", Capacity = 50, Type = "Express" },
                new Bus { PlateNumber = "RI-2046", BusNumber = "15", DriverName = "Don Miguel", CompanyName = "COTRAN Rivas", Capacity = 60, Type = "Ordinary" },
                new Bus { PlateNumber = "RI-4051", BusNumber = "09", DriverName = "Don Javier", CompanyName = "Expreso Rivas-Managua", Capacity = 50, Type = "Express" },
                new Bus { PlateNumber = "RI-1026", BusNumber = "23", DriverName = "Don Manuel", CompanyName = "Transportes Nicarao", Capacity = 45, Type = "Express" },
                new Bus { PlateNumber = "RI-7020", BusNumber = "17", DriverName = "Don Enrique", CompanyName = "Transportes San Jorge", Capacity = 55, Type = "Ordinary" },
                new Bus { PlateNumber = "RI-1013", BusNumber = "07", DriverName = "Don Alejandro", CompanyName = "Expreso del Sur", Capacity = 48, Type = "Express" },
                new Bus { PlateNumber = "RI-3047", BusNumber = "16", DriverName = "Don Rafael", CompanyName = "Transportes Vargas", Capacity = 55, Type = "Ordinary" },

                // Managua -> Rivas Buses
                new Bus { PlateNumber = "M-1224", BusNumber = "88", DriverName = "Don Francisco", CompanyName = "Transportes Nicarao", Capacity = 50, Type = "Express" },
                new Bus { PlateNumber = "M-2341", BusNumber = "30", DriverName = "Don Gabriel", CompanyName = "COTRAN Rivas", Capacity = 60, Type = "Ordinary" },
                new Bus { PlateNumber = "M-3412", BusNumber = "10", DriverName = "Don Daniel", CompanyName = "Expreso del Sur", Capacity = 48, Type = "Express" },
                new Bus { PlateNumber = "M-8899", BusNumber = "45", DriverName = "Don Marcos", CompanyName = "Transportes Vargas", Capacity = 60, Type = "Ordinary" },
                new Bus { PlateNumber = "M-4512", BusNumber = "34", DriverName = "Don Esteban", CompanyName = "Transportes Chabelo", Capacity = 58, Type = "Ordinary" },
                new Bus { PlateNumber = "M-5610", BusNumber = "19", DriverName = "Don Gonzalo", CompanyName = "Expreso Rivas-Managua", Capacity = 50, Type = "Express" },
                new Bus { PlateNumber = "M-1225", BusNumber = "89", DriverName = "Don Jorge", CompanyName = "Transportes Nicarao", Capacity = 50, Type = "Express" },
                new Bus { PlateNumber = "M-2342", BusNumber = "31", DriverName = "Don Ricardo", CompanyName = "COTRAN Rivas", Capacity = 60, Type = "Ordinary" },
                new Bus { PlateNumber = "M-3413", BusNumber = "11", DriverName = "Don Eduardo", CompanyName = "Expreso del Sur", Capacity = 48, Type = "Express" },
                new Bus { PlateNumber = "M-8900", BusNumber = "46", DriverName = "Don Oscar", CompanyName = "Transportes Vargas", Capacity = 60, Type = "Ordinary" },
                new Bus { PlateNumber = "M-6011", BusNumber = "02", DriverName = "Don Armando", CompanyName = "Transportes Ometepe-Managua", Capacity = 50, Type = "Express" },
                new Bus { PlateNumber = "M-5611", BusNumber = "20", DriverName = "Don Sergio", CompanyName = "Expreso Rivas-Managua", Capacity = 50, Type = "Express" },
                new Bus { PlateNumber = "M-1226", BusNumber = "90", DriverName = "Don Mauricio", CompanyName = "Transportes Nicarao", Capacity = 50, Type = "Express" },
                new Bus { PlateNumber = "M-4513", BusNumber = "35", DriverName = "Don Ramón", CompanyName = "Transportes Chabelo", Capacity = 58, Type = "Ordinary" },
                new Bus { PlateNumber = "M-3414", BusNumber = "15", DriverName = "Don Alberto", CompanyName = "Expreso del Sur", Capacity = 48, Type = "Express" },
                new Bus { PlateNumber = "M-2343", BusNumber = "32", DriverName = "Don Benjamín", CompanyName = "COTRAN Rivas", Capacity = 60, Type = "Ordinary" }
            };

            context.Buses.AddRange(buses);
            context.SaveChanges();

            // Seed Comprehensive Routes
            var routes = new BusTrackerApi.Models.Route[]
            {
                // Rivas -> Managua Schedules
                new BusTrackerApi.Models.Route { Origin = "Rivas", Destination = "Managua", ScheduledDeparture = "04:30 AM", Fare = 120.00 },
                new BusTrackerApi.Models.Route { Origin = "Rivas", Destination = "Managua", ScheduledDeparture = "05:00 AM", Fare = 120.00 },
                new BusTrackerApi.Models.Route { Origin = "Rivas", Destination = "Managua", ScheduledDeparture = "05:30 AM", Fare = 85.00 },
                new BusTrackerApi.Models.Route { Origin = "Rivas", Destination = "Managua", ScheduledDeparture = "06:15 AM", Fare = 85.00 },
                new BusTrackerApi.Models.Route { Origin = "Rivas", Destination = "Managua", ScheduledDeparture = "07:00 AM", Fare = 120.00 },
                new BusTrackerApi.Models.Route { Origin = "Rivas", Destination = "Managua", ScheduledDeparture = "08:00 AM", Fare = 120.00 },
                new BusTrackerApi.Models.Route { Origin = "Rivas", Destination = "Managua", ScheduledDeparture = "09:00 AM", Fare = 85.00 },
                new BusTrackerApi.Models.Route { Origin = "Rivas", Destination = "Managua", ScheduledDeparture = "10:00 AM", Fare = 120.00 },
                new BusTrackerApi.Models.Route { Origin = "Rivas", Destination = "Managua", ScheduledDeparture = "11:00 AM", Fare = 85.00 },
                new BusTrackerApi.Models.Route { Origin = "Rivas", Destination = "Managua", ScheduledDeparture = "12:00 PM", Fare = 120.00 },
                new BusTrackerApi.Models.Route { Origin = "Rivas", Destination = "Managua", ScheduledDeparture = "01:00 PM", Fare = 85.00 },
                new BusTrackerApi.Models.Route { Origin = "Rivas", Destination = "Managua", ScheduledDeparture = "02:00 PM", Fare = 120.00 },
                new BusTrackerApi.Models.Route { Origin = "Rivas", Destination = "Managua", ScheduledDeparture = "03:00 PM", Fare = 120.00 },
                new BusTrackerApi.Models.Route { Origin = "Rivas", Destination = "Managua", ScheduledDeparture = "04:00 PM", Fare = 85.00 },
                new BusTrackerApi.Models.Route { Origin = "Rivas", Destination = "Managua", ScheduledDeparture = "05:00 PM", Fare = 120.00 },
                new BusTrackerApi.Models.Route { Origin = "Rivas", Destination = "Managua", ScheduledDeparture = "06:00 PM", Fare = 85.00 },

                // Managua -> Rivas Schedules
                new BusTrackerApi.Models.Route { Origin = "Managua", Destination = "Rivas", ScheduledDeparture = "05:00 AM", Fare = 120.00 },
                new BusTrackerApi.Models.Route { Origin = "Managua", Destination = "Rivas", ScheduledDeparture = "06:00 AM", Fare = 85.00 },
                new BusTrackerApi.Models.Route { Origin = "Managua", Destination = "Rivas", ScheduledDeparture = "06:30 AM", Fare = 120.00 },
                new BusTrackerApi.Models.Route { Origin = "Managua", Destination = "Rivas", ScheduledDeparture = "07:15 AM", Fare = 85.00 },
                new BusTrackerApi.Models.Route { Origin = "Managua", Destination = "Rivas", ScheduledDeparture = "08:15 AM", Fare = 85.00 },
                new BusTrackerApi.Models.Route { Origin = "Managua", Destination = "Rivas", ScheduledDeparture = "09:15 AM", Fare = 120.00 },
                new BusTrackerApi.Models.Route { Origin = "Managua", Destination = "Rivas", ScheduledDeparture = "10:15 AM", Fare = 120.00 },
                new BusTrackerApi.Models.Route { Origin = "Managua", Destination = "Rivas", ScheduledDeparture = "11:00 AM", Fare = 85.00 },
                new BusTrackerApi.Models.Route { Origin = "Managua", Destination = "Rivas", ScheduledDeparture = "12:00 PM", Fare = 120.00 },
                new BusTrackerApi.Models.Route { Origin = "Managua", Destination = "Rivas", ScheduledDeparture = "01:00 PM", Fare = 85.00 },
                new BusTrackerApi.Models.Route { Origin = "Managua", Destination = "Rivas", ScheduledDeparture = "01:30 PM", Fare = 120.00 },
                new BusTrackerApi.Models.Route { Origin = "Managua", Destination = "Rivas", ScheduledDeparture = "02:30 PM", Fare = 120.00 },
                new BusTrackerApi.Models.Route { Origin = "Managua", Destination = "Rivas", ScheduledDeparture = "03:30 PM", Fare = 120.00 },
                new BusTrackerApi.Models.Route { Origin = "Managua", Destination = "Rivas", ScheduledDeparture = "04:30 PM", Fare = 85.00 },
                new BusTrackerApi.Models.Route { Origin = "Managua", Destination = "Rivas", ScheduledDeparture = "05:30 PM", Fare = 120.00 },
                new BusTrackerApi.Models.Route { Origin = "Managua", Destination = "Rivas", ScheduledDeparture = "06:30 PM", Fare = 85.00 }
            };

            context.Routes.AddRange(routes);
            context.SaveChanges();

            // Link every Route to its corresponding Bus and generate Trips
            int driver1Id = driverUsers.Count > 0 ? driverUsers[0].Id : 1;
            int driver2Id = driverUsers.Count > 1 ? driverUsers[1].Id : driver1Id;

            for (int i = 0; i < routes.Length; i++)
            {
                var route = routes[i];
                var bus = buses[i % buses.Length];

                // Assign default driver to first couple of active trips
                int? assignedDriverId = null;
                string initialStatus = "Scheduled";
                double initialLat = route.Origin.ToLower() == "managua" ? 12.1464 : 11.4378;
                double initialLng = route.Origin.ToLower() == "managua" ? -86.2305 : -85.8263;

                if (i == 5) // Rivas -> Managua 08:00 AM
                {
                    assignedDriverId = driver1Id;
                }
                else if (i == 18) // Managua -> Rivas 06:30 AM
                {
                    assignedDriverId = driver2Id;
                }

                var trip = new Trip
                {
                    RouteId = route.Id,
                    BusId = bus.Id,
                    DriverId = assignedDriverId,
                    Status = initialStatus,
                    CurrentLatitude = initialLat,
                    CurrentLongitude = initialLng,
                    LastUpdated = DateTime.UtcNow
                };

                context.Trips.Add(trip);
            }

            context.SaveChanges();
        }
    }
}
