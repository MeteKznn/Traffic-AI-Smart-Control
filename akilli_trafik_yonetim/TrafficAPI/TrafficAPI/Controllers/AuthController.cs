using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TrafficAPI.Data;
using TrafficAPI.Models;

namespace TrafficAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly AppDbContext _context;

        public AuthController(AppDbContext context)
        {
            _context = context;
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginDto dto)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Username == dto.Username && u.PasswordHash == dto.Password);
            
            if (user == null)
            {
                return Unauthorized(new { message = "Kullanıcı adı veya şifre hatalı!" });
            }

            // Basit bir token üretip veritabanına kaydediyoruz (Öğrenci projesi için JWT yerine bu pratik yöntem seçilmiştir)
            user.Token = Guid.NewGuid().ToString();
            await _context.SaveChangesAsync();

            return Ok(new { token = user.Token, username = user.Username });
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterDto dto)
        {
            if (await _context.Users.AnyAsync(u => u.Username == dto.Username))
            {
                return BadRequest(new { message = "Bu kullanıcı adı zaten alınmış." });
            }

            var user = new User
            {
                Username = dto.Username,
                PasswordHash = dto.Password, // Gerçek projelerde şifre hashlenmelidir (BCrypt vb.)
                Email = dto.Email,
                Phone = dto.Phone
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Kayıt başarılı! Şimdi giriş yapabilirsiniz." });
        }

        [HttpPost("logout")]
        public async Task<IActionResult> Logout([FromHeader(Name = "Authorization")] string token)
        {
            if (string.IsNullOrEmpty(token)) return BadRequest();

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Token == token);
            if (user != null)
            {
                user.Token = null; // Token'ı silerek çıkış yap
                await _context.SaveChangesAsync();
            }

            return Ok(new { message = "Çıkış yapıldı." });
        }

        [HttpGet("me")]
        public async Task<IActionResult> GetCurrentUser([FromHeader(Name = "Authorization")] string token)
        {
            if (string.IsNullOrEmpty(token)) return Unauthorized();

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Token == token);
            if (user == null) return Unauthorized();

            return Ok(new {
                username = user.Username,
                email = user.Email,
                phone = user.Phone
            });
        }

        [HttpPut("me")]
        public async Task<IActionResult> UpdateProfile([FromHeader(Name = "Authorization")] string token, [FromBody] UpdateProfileDto dto)
        {
            if (string.IsNullOrEmpty(token)) return Unauthorized();

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Token == token);
            if (user == null) return Unauthorized();

            user.Email = dto.Email;
            user.Phone = dto.Phone;
            
            if (!string.IsNullOrEmpty(dto.Password))
            {
                user.PasswordHash = dto.Password;
            }

            await _context.SaveChangesAsync();
            return Ok(new { message = "Profil başarıyla güncellendi." });
        }
    }
}
