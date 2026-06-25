using System;
using System.ComponentModel.DataAnnotations;

namespace TrafficAPI.Models
{
    public class TrafficLog
    {
        [Key]
        public int Id { get; set; }
        
        public bool SensorStatus { get; set; }
        
        [Required]
        [MaxLength(10)]
        public string LightStatus { get; set; }

        [MaxLength(100)]
        public string LocationName { get; set; }
        
        public DateTime CreatedAt { get; set; } = DateTime.Now;
    }
}
