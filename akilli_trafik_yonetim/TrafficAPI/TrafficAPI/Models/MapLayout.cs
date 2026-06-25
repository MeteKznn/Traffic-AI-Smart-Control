using System;
using System.ComponentModel.DataAnnotations;

namespace TrafficAPI.Models
{
    public class MapLayout
    {
        [Key]
        public int Id { get; set; }
        
        [Required]
        [MaxLength(100)]
        public string Name { get; set; }
        
        [Required]
        public string LayoutData { get; set; } // Sürükle bırak JSON verisi
        
        public DateTime CreatedAt { get; set; } = DateTime.Now;
    }
}
