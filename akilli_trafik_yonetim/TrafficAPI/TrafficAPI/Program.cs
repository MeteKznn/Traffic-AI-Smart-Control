using Microsoft.EntityFrameworkCore;
using TrafficAPI.Data;
using TrafficAPI.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();

// Arduino ile haberlesme servisini Singleton olarak kaydet
builder.Services.AddSingleton<SerialCommunicationService>();
builder.Services.AddHostedService(provider => provider.GetRequiredService<SerialCommunicationService>());

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddCors(options => {
    options.AddPolicy("AllowAll", policy => {
        policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader();
    });
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

// WWWROOT klasorunu okuyabilmesi icin eklenen statik dosya kodu:
app.UseStaticFiles();

app.UseCors("AllowAll");
app.UseAuthorization();
app.MapControllers();

app.Run();
