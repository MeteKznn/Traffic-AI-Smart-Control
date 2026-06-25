-- SQL Server (T-SQL) Veritabanı ve Tablo Oluşturma Scripti
-- Bu scripti SSMS üzerinde yeni bir sorgu açarak çalıştırın.

IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'TrafficDB')
BEGIN
    CREATE DATABASE TrafficDB;
END
GO

USE TrafficDB;
GO

-- 1. Trafik Logları Tablosu
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'TrafficLogs')
BEGIN
    CREATE TABLE TrafficLogs (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        SensorStatus BIT NOT NULL, 
        LightStatus NVARCHAR(10) NOT NULL, 
        LocationName NVARCHAR(100) NULL,
        CreatedAt DATETIME DEFAULT GETDATE()
    );
END
GO

-- 2. Kullanıcılar (Admin) Tablosu
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Users')
BEGIN
    CREATE TABLE Users (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        Username NVARCHAR(50) NOT NULL UNIQUE,
        PasswordHash NVARCHAR(255) NOT NULL, -- Gerçek projede hashlenmeli, burada demo için düz metin veya basit hash kullanacağız
        Email NVARCHAR(100) NOT NULL,
        Phone NVARCHAR(20) NULL,
        CreatedAt DATETIME DEFAULT GETDATE(),
        Token NVARCHAR(255) NULL -- Basit kimlik doğrulama oturumu için
    );
END
GO

-- 3. Harita (Map Layouts) Tablosu
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'MapLayouts')
BEGIN
    CREATE TABLE MapLayouts (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        Name NVARCHAR(100) NOT NULL,
        LayoutData NVARCHAR(MAX) NOT NULL, -- JSON formatında grid verisi tutulacak
        CreatedAt DATETIME DEFAULT GETDATE()
    );
END
GO

-- Default bir admin kullanıcısı ekleyelim (Şifre: admin123)
IF NOT EXISTS (SELECT * FROM Users WHERE Username = 'admin')
BEGIN
    INSERT INTO Users (Username, PasswordHash, Email) VALUES ('admin', 'admin123', 'admin@traffic.com');
END
GO
