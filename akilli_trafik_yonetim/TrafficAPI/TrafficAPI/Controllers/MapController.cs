using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TrafficAPI.Data;
using TrafficAPI.Models;

namespace TrafficAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class MapController : ControllerBase
    {
        private readonly AppDbContext _context;

        public MapController(AppDbContext context)
        {
            _context = context;
        }

        // Kullanıcının tokenını kontrol eden yardımcı metod (Basit yetkilendirme)
        private async Task<bool> IsAuthorized(string token)
        {
            if (string.IsNullOrEmpty(token)) return false;
            return await _context.Users.AnyAsync(u => u.Token == token);
        }

        [HttpGet]
        public async Task<IActionResult> GetLayouts([FromHeader(Name = "Authorization")] string token)
        {
            if (!await IsAuthorized(token)) return Unauthorized();

            var layouts = await _context.MapLayouts.OrderByDescending(m => m.Id).ToListAsync();
            return Ok(layouts);
        }

        [HttpPost]
        public async Task<IActionResult> SaveLayout([FromHeader(Name = "Authorization")] string token, [FromBody] MapLayout layout)
        {
            if (!await IsAuthorized(token)) return Unauthorized();

            layout.CreatedAt = DateTime.Now;
            _context.MapLayouts.Add(layout);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Harita başarıyla kaydedildi!", id = layout.Id });
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteLayout([FromHeader(Name = "Authorization")] string token, int id)
        {
            if (!await IsAuthorized(token)) return Unauthorized();

            var layout = await _context.MapLayouts.FindAsync(id);
            if (layout == null) return NotFound();

            _context.MapLayouts.Remove(layout);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Harita silindi." });
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateLayout([FromHeader(Name = "Authorization")] string token, int id, [FromBody] MapLayout updatedLayout)
        {
            if (!await IsAuthorized(token)) return Unauthorized();

            var layout = await _context.MapLayouts.FindAsync(id);
            if (layout == null) return NotFound();

            layout.Name = updatedLayout.Name;
            layout.LayoutData = updatedLayout.LayoutData;
            
            await _context.SaveChangesAsync();

            return Ok(new { message = "Harita başarıyla güncellendi!" });
        }
    }
}
