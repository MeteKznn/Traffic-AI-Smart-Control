// js/app.js

// DİKKAT: ASP.NET Core projeniz çalışırken oluşan localhost adresini buraya yazın.
// Örnek: const API_BASE_URL = 'https://localhost:7205/api/Traffic';
const API_BASE_URL = 'https://localhost:7205/api/Traffic'; 

document.addEventListener('DOMContentLoaded', () => {
    // Sayfa yüklendiğinde verileri çek
    fetchData();

    // Canlı durumu 2 saniyede bir güncelle
    setInterval(fetchLatestStatus, 2000);
});

// Tüm logları çekip tabloya doldurma
async function fetchData() {
    try {
        const response = await fetch(API_BASE_URL);
        if (!response.ok) throw new Error('Sunucu hatası');
        
        const data = await response.json();
        renderTable(data);
        if (data.length > 0) {
            updateLiveStatus(data[0]); // En son kaydı canlı duruma yansıt
        }
    } catch (error) {
        console.error('Bağlantı hatası:', error);
    }
}

// Sadece en son durumu çekme (Canlı İzleme paneli için)
async function fetchLatestStatus() {
    try {
        const response = await fetch(`${API_BASE_URL}/latest`);
        if (!response.ok) throw new Error('Sunucu hatası');

        const latestData = await response.json();
        if (latestData) {
            updateLiveStatus(latestData);
        }
    } catch (error) {
        console.error('Bağlantı hatası:', error);
    }
}

// Yeni veri ekleme (Simülasyon veya dışarıdan gelen istek)
async function addSimulatedData(sensorStatus, lightStatus) {
    const data = {
        sensorStatus: sensorStatus,
        lightStatus: lightStatus
    };

    try {
        const response = await fetch(API_BASE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            fetchData(); // Tabloyu yenile
        } else {
            alert('Hata oluştu!');
        }
    } catch (error) {
        console.error('Ekleme hatası:', error);
    }
}

// Veri Silme
async function deleteData(id) {
    if (!confirm('Bu kaydı silmek istediğinize emin misiniz?')) return;

    try {
        const response = await fetch(`${API_BASE_URL}/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            fetchData(); // Tabloyu yenile
        } else {
            alert('Silme işlemi başarısız oldu.');
        }
    } catch (error) {
        console.error('Silme hatası:', error);
    }
}

// Tabloyu HTML'e işleme
function renderTable(data) {
    const tbody = document.getElementById('table-body');
    tbody.innerHTML = '';

    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">Henüz veri bulunmamaktadır.</td></tr>';
        return;
    }

    data.forEach(item => {
        const tr = document.createElement('tr');
        
        // SQL Server BIT tipi C# tarafında boolean (true/false) olarak gelir
        const isCarPresent = item.sensorStatus === true || item.sensorStatus === 1;
        const sensorText = isCarPresent ? 'Araç Var' : 'Araç Yok';
        const sensorClass = isCarPresent ? 'text-green' : 'text-red';
        
        const lightText = item.lightStatus;
        const lightClass = item.lightStatus.toLowerCase() === 'yesil' ? 'text-green' : 'text-red';

        // Tarih formatlama
        const dateObj = new Date(item.createdAt);
        const formattedDate = dateObj.toLocaleString('tr-TR');

        tr.innerHTML = `
            <td>#${item.id}</td>
            <td class="${sensorClass}">${sensorText}</td>
            <td class="${lightClass}">${lightText}</td>
            <td>${formattedDate}</td>
            <td>
                <button onclick="deleteData(${item.id})" class="btn btn-delete">
                    <i class="fa-solid fa-trash"></i> Sil
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Canlı Panel Görsel Güncellemesi
function updateLiveStatus(latestData) {
    const lightRed = document.getElementById('light-red');
    const lightGreen = document.getElementById('light-green');
    const badge = document.getElementById('sensor-status-badge');

    // Önce tüm ışıkları söndür
    lightRed.classList.remove('active');
    lightGreen.classList.remove('active');

    if (latestData.lightStatus.toLowerCase() === 'yesil') {
        lightGreen.classList.add('active');
        badge.className = 'badge bg-green';
        badge.innerHTML = '<i class="fa-solid fa-car"></i> Araç Geçiyor';
    } else {
        lightRed.classList.add('active');
        badge.className = 'badge bg-red';
        badge.innerHTML = '<i class="fa-solid fa-car-side"></i> Araç Bekleniyor';
    }
}
