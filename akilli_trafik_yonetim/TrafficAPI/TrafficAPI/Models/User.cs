using System;
using System.ComponentModel.DataAnnotations;

namespace TrafficAPI.Models
{
    public class User
    {
        [Key]
        public int Id { get; set; }
        
        [Required]
        [MaxLength(50)]
        public string Username { get; set; }
        
        [Required]
        [MaxLength(255)]
        public string PasswordHash { get; set; }

        [Required]
        [MaxLength(100)]
        public string Email { get; set; }

        [MaxLength(20)]
        public string? Phone { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.Now;

        [MaxLength(255)]
        public string? Token { get; set; }
    }

    // API İstekleri için DTO'lar (Veri Taşıma Objeleri)
    public class LoginDto
    {
        public string Username { get; set; }
        public string Password { get; set; }
    }

    public class RegisterDto
    {
        public string Username { get; set; }
        public string Password { get; set; }
        public string Email { get; set; }
        public string? Phone { get; set; }
    }

    public class UpdateProfileDto
    {
        public string Email { get; set; }
        public string? Phone { get; set; }
        public string? Password { get; set; }
    }
}
