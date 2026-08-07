using Microsoft.EntityFrameworkCore;
using BusTrackerApi.Models;

namespace BusTrackerApi.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public DbSet<User> Users { get; set; }
        public DbSet<UserSession> UserSessions { get; set; }
        public DbSet<Bus> Buses { get; set; }
        public DbSet<BusTrackerApi.Models.Route> Routes { get; set; }
        public DbSet<Trip> Trips { get; set; }
        public DbSet<Report> Reports { get; set; }
        public DbSet<Comment> Comments { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Configure relationships
            modelBuilder.Entity<Trip>()
                .HasOne(t => t.Route)
                .WithMany()
                .HasForeignKey(t => t.RouteId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Trip>()
                .HasOne(t => t.Bus)
                .WithMany()
                .HasForeignKey(t => t.BusId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Trip>()
                .HasOne(t => t.Driver)
                .WithMany()
                .HasForeignKey(t => t.DriverId)
                .OnDelete(DeleteBehavior.SetNull);

            modelBuilder.Entity<Report>()
                .HasOne(r => r.User)
                .WithMany()
                .HasForeignKey(r => r.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Comment>()
                .HasOne(c => c.User)
                .WithMany()
                .HasForeignKey(c => c.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}
