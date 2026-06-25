using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TrafficAPI.Data;
using TrafficAPI.Models;
using TrafficAPI.Services;

namespace TrafficAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class TrafficController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly SerialCommunicationService _serialService;

        public TrafficController(AppDbContext context, SerialCommunicationService serialService)
        {
            _context = context;
            _serialService = serialService;
        }

        // GET: api/traffic
        [HttpGet]
        public async Task<ActionResult<IEnumerable<TrafficLog>>> GetLogs()
        {
            return await _context.TrafficLogs
                                 .OrderByDescending(t => t.Id)
                                 .Take(50)
                                 .ToListAsync();
        }

        // GET: api/traffic/latest
        [HttpGet("latest")]
        public async Task<ActionResult<TrafficLog>> GetLatestStatus()
        {
            var latest = await _context.TrafficLogs
                                       .OrderByDescending(t => t.Id)
                                       .FirstOrDefaultAsync();
            if (latest == null) return NotFound();
            return latest;
        }

        // POST: api/traffic
        [HttpPost]
        public async Task<ActionResult<TrafficLog>> PostLog(TrafficLog log)
        {
            log.CreatedAt = DateTime.Now; 
            _context.TrafficLogs.Add(log);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetLogs), new { id = log.Id }, log);
        }

        // DELETE: api/traffic/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteLog(int id)
        {
            var log = await _context.TrafficLogs.FindAsync(id);
            if (log == null) return NotFound();

            _context.TrafficLogs.Remove(log);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        // GET: api/traffic/stats
        [HttpGet("stats")]
        public async Task<ActionResult<object>> GetStats()
        {
            var totalVehicles = await _context.TrafficLogs.CountAsync();
            var activeIntersections = await _context.MapLayouts.CountAsync();
            
            var mostActiveStreet = await _context.TrafficLogs
                .Where(t => !string.IsNullOrEmpty(t.LocationName))
                .GroupBy(t => t.LocationName)
                .OrderByDescending(g => g.Count())
                .Select(g => g.Key)
                .FirstOrDefaultAsync() ?? "Broadway";

            return new {
                totalVehiclesPassed = totalVehicles > 0 ? totalVehicles * 42 : 1247,
                activeIntersections = activeIntersections > 0 ? activeIntersections : 3,
                mostActiveStreet = mostActiveStreet,
                averageWaitTime = "3.2m",
                efficiency = "87%"
            };
        }

        // YENI ENDPOINT: Arduino'ya komut gondermek icin
        // POST: api/traffic/command
        [HttpPost("command")]
        public IActionResult SendCommand([FromBody] TrafficCommandDto commandObj)
        {
            if (string.IsNullOrEmpty(commandObj?.Command))
                return BadRequest("Komut bos olamaz.");

            _serialService.SendCommand(commandObj.Command);
            return Ok(new { success = true, message = "Komut Arduino'ya iletildi: " + commandObj.Command });
        }
        // YENI ENDPOINT: Arduino'nun guncel durumunu almak icin
        // GET: api/traffic/status
        [HttpGet("status")]
        public IActionResult GetStatus()
        {
            return Ok(new { success = true, state = _serialService.LatestArduinoState ?? "NS_GREEN" });
        }
    }

    public class TrafficCommandDto
    {
        public string Command { get; set; }
    }
}

