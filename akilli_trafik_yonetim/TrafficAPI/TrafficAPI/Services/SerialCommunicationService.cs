using System;
using System.IO.Ports;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;

namespace TrafficAPI.Services
{
    public class SerialCommunicationService : BackgroundService
    {
        private readonly ILogger<SerialCommunicationService> _logger;
        private readonly IConfiguration _configuration;
        private SerialPort _serialPort;
        public string LatestArduinoState { get; private set; } = "NS_GREEN";

        public SerialCommunicationService(ILogger<SerialCommunicationService> logger, IConfiguration configuration)
        {
            _logger = logger;
            _configuration = configuration;
            
            // Port adini appsettings.json dosyasindan al, bulamazsa COM3 kullan
            string portName = _configuration["ArduinoPort"] ?? "COM3";
            
            _serialPort = new SerialPort(portName, 9600); 
            _serialPort.ReadTimeout = 500;
            _serialPort.WriteTimeout = 500;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            try
            {
                _serialPort.Open();
                _logger.LogInformation($"Serial Port {_serialPort.PortName} basariyla acildi. Arduino bekleniyor...");
            }
            catch (Exception ex)
            {
                _logger.LogError($"Serial Port ({_serialPort.PortName}) acilirken hata olustu. Port dogru mu? Hata: {ex.Message}");
                return; // Port acilamadiysa servisi durdur
            }

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    if (_serialPort.IsOpen && _serialPort.BytesToRead > 0)
                    {
                        string message = _serialPort.ReadLine();
                        if (message.StartsWith("STATE:")) { LatestArduinoState = message.Substring(6).Trim(); }
                        _logger.LogInformation($"Arduino'dan gelen mesaj: {message.Trim()}");
                    }
                }
                catch (TimeoutException) { } 
                catch (Exception ex)
                {
                    _logger.LogError($"Serial Port okuma hatasi: {ex.Message}");
                }

                await Task.Delay(50, stoppingToken);
            }

            if (_serialPort.IsOpen)
            {
                _serialPort.Close();
            }
        }

        public void SendCommand(string command)
        {
            if (_serialPort != null && _serialPort.IsOpen)
            {
                try
                {
                    _serialPort.WriteLine(command);
                    _logger.LogInformation($"Arduino'ya GONDERILEN komut: {command}");
                }
                catch (Exception ex)
                {
                    _logger.LogError($"Komut gonderilirken hata: {ex.Message}");
                }
            }
            else
            {
                _logger.LogWarning("Serial Port kapali veya bagli degil, komut gonderilemedi.");
            }
        }
    }
}

