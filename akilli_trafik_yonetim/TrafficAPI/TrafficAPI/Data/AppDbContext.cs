using Microsoft.EntityFrameworkCore;
using TrafficAPI.Models;

namespace TrafficAPI.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public DbSet<TrafficLog> TrafficLogs { get; set; }
        public DbSet<User> Users { get; set; }
        public DbSet<MapLayout> MapLayouts { get; set; }
    }
}
