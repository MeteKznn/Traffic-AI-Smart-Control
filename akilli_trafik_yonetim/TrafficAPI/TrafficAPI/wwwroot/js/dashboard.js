/* wwwroot/js/dashboard.js */

// SÄ°MÃœLASYON DURUMLARI
let simPhase = 'NS_GREEN'; // NS_GREEN, NS_YELLOW, EW_GREEN, EW_YELLOW, ALL_RED
let simTimer = 30; // Aktif fazÄ±n kalanÄ±
let simMode = 'AUTO'; // AUTO, MANUAL, EMERGENCY
let vehicles = [];
let simPhysicsInterval;
let simTimerInterval;

// KAVÅAK AYARLARI
let currentConfig = {
    nsTime: 30, // Dikey Yol YeÅŸil SÃ¼resi
    ewTime: 30, // Yatay Yol YeÅŸil SÃ¼resi
    yellowTime: 3 // SarÄ± IÅŸÄ±k SÃ¼resi
};

let allIntersections = [];

function initDashboard() {
    loadMapsDropdown();
    startSimulation();
    fetchDashboardStats();
    renderDashboardCharts();
    renderSystemLogs();
}

// ------------------------------
// API & KAVÅAK YÃ–NETÄ°MÄ°
// ------------------------------
async function loadMapsDropdown() {
    const token = localStorage.getItem('traffic_token');
    if(!token) return;

    try {
        const res = await fetch('/api/Map', { headers: { 'Authorization': token }});
        if (res.ok) {
            allIntersections = await res.json();
            const select = document.getElementById('intersection-selector');
            select.innerHTML = '<option value="">KavÅŸak SeÃ§iniz...</option>';
            
            allIntersections.forEach(map => {
                select.innerHTML += `<option value="${map.id}">${map.name}</option>`;
            });

            if(allIntersections.length > 0) {
                select.value = allIntersections[0].id;
                loadSelectedIntersection();
            }
            
            // Populate builder list
            renderIntersectionList();
        }
    } catch(e) { console.error("Haritalar yÃ¼klenemedi", e); }
}

function loadSelectedIntersection() {
    const select = document.getElementById('intersection-selector');
    const selectedId = select.value;
    if(!selectedId) return;

    const map = allIntersections.find(m => m.id == selectedId);
    if(!map) return;

    try {
        const cfg = JSON.parse(map.layoutData);
        // Etiketleri gÃ¼ncelle
        document.querySelector('.label-w').innerText = (cfg.hName || 'BROADWAY').toUpperCase();
        document.querySelector('.label-n').innerText = (cfg.vName || '42ND ST').toUpperCase();
        document.querySelector('.location-info h3').innerText = map.name;

        // SÃ¼releri gÃ¼ncelle
        currentConfig.nsTime = parseInt(cfg.vTime) || 30;
        currentConfig.ewTime = parseInt(cfg.hTime) || 30;

        // Sayfaya ilk girildiginde sureleri Arduino'ya gonder
        if(typeof sendCommandToArduino === 'function') {
            sendCommandToArduino('TIME_NS:' + (currentConfig.nsTime * 1000));
            setTimeout(() => {
                sendCommandToArduino('TIME_EW:' + (currentConfig.ewTime * 1000));
            }, 200);
        }

        // DÃ¶ngÃ¼yÃ¼ sÄ±fÄ±rla
        simPhase = 'NS_GREEN';
        simTimer = currentConfig.nsTime;
        updateLightsDOM();
    } catch(e) { console.error("KavÅŸak verisi okunamadÄ±."); }
}

async function saveIntersectionConfig() {
    const id = document.getElementById('cfg-id').value;
    const name = document.getElementById('cfg-name').value;
    const hName = document.getElementById('cfg-h-name').value;
    const hTime = document.getElementById('cfg-h-time').value;
    const vName = document.getElementById('cfg-v-name').value;
    const vTime = document.getElementById('cfg-v-time').value;

    if(!name) return alert("KavÅŸak adÄ± zorunludur!");

    const layoutData = {
        hName: hName || "Yatay Cadde",
        hTime: hTime || 30,
        vName: vName || "Dikey Cadde",
        vTime: vTime || 30
    };

    const token = localStorage.getItem('traffic_token');
    const method = id ? 'PUT' : 'POST';
    const url = id ? `/api/Map/${id}` : '/api/Map';

    try {
        const res = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token
            },
            body: JSON.stringify({ Name: name, LayoutData: JSON.stringify(layoutData) })
        });
        
        if(res.ok) {
            alert(id ? "KavÅŸak gÃ¼ncellendi!" : "KavÅŸak baÅŸarÄ±yla kaydedildi!");
            loadMapsDropdown(); // Listeyi yenile
            prepareNewIntersection();
        } else {
            alert("Ä°ÅŸlem baÅŸarÄ±sÄ±z.");
        }
    } catch(e) { alert("Sunucuya baÄŸlanÄ±lamadÄ±."); }
}

function renderIntersectionList() {
    const tbody = document.getElementById('intersection-table-body');
    if(!tbody) return;
    
    tbody.innerHTML = '';
    allIntersections.forEach(map => {
        tbody.innerHTML += `
            <tr>
                <td>${map.name}</td>
                <td>
                    <button class="btn-icon edit" onclick="editIntersection(${map.id})"><i class="fa-solid fa-pen"></i></button>
                    <button class="btn-icon delete" onclick="deleteIntersection(${map.id})"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>
        `;
    });
}

function prepareNewIntersection() {
    document.getElementById('builder-form-title').innerHTML = '<i class="fa-solid fa-map-location-dot"></i> Yeni KavÅŸak OluÅŸtur';
    document.getElementById('cfg-id').value = '';
    document.getElementById('cfg-name').value = '';
    document.getElementById('cfg-h-name').value = '';
    document.getElementById('cfg-h-time').value = '';
    document.getElementById('cfg-v-name').value = '';
    document.getElementById('cfg-v-time').value = '';
}

function editIntersection(id) {
    const map = allIntersections.find(m => m.id == id);
    if(!map) return;
    
    document.getElementById('builder-form-title').innerHTML = '<i class="fa-solid fa-pen"></i> KavÅŸaÄŸÄ± DÃ¼zenle';
    document.getElementById('cfg-id').value = map.id;
    document.getElementById('cfg-name').value = map.name;
    
    try {
        const cfg = JSON.parse(map.layoutData);
        document.getElementById('cfg-h-name').value = cfg.hName || '';
        document.getElementById('cfg-h-time').value = cfg.hTime || '';
        document.getElementById('cfg-v-name').value = cfg.vName || '';
        document.getElementById('cfg-v-time').value = cfg.vTime || '';
    } catch(e) {}
}

async function deleteIntersection(id) {
    if(!confirm("Bu kavÅŸaÄŸÄ± silmek istediÄŸinize emin misiniz?")) return;
    
    const token = localStorage.getItem('traffic_token');
    try {
        const res = await fetch(`/api/Map/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': token }
        });
        if(res.ok) {
            alert("KavÅŸak silindi.");
            loadMapsDropdown();
            prepareNewIntersection();
        } else {
            alert("Silme iÅŸlemi baÅŸarÄ±sÄ±z.");
        }
    } catch(e) { console.error(e); }
}

async function fetchDashboardStats() {
    const token = localStorage.getItem('traffic_token');
    if(!token) return;

    try {
        const res = await fetch('/api/Traffic/stats', { headers: { 'Authorization': token }});
        if(res.ok) {
            const data = await res.json();
            document.getElementById('dash-total-vehicles').innerText = data.totalVehiclesPassed.toLocaleString();
            document.getElementById('dash-active-intersections').innerText = data.activeIntersections;
            document.getElementById('dash-most-active-street').innerText = data.mostActiveStreet.toUpperCase();
            document.getElementById('dash-avg-wait').innerText = data.averageWaitTime;
        }
    } catch(e) { console.error("Dashboard verisi Ã§ekilemedi", e); }
}

let hourlyChartInstance = null;
let pieChartInstance = null;

function renderDashboardCharts() {
    // Saatlik Trafik Ã‡izgi GrafiÄŸi
    const hourlyCtx = document.getElementById('hourlyTrafficChart');
    if (hourlyCtx) {
        if(hourlyChartInstance) hourlyChartInstance.destroy();
        hourlyChartInstance = new Chart(hourlyCtx, {
            type: 'line',
            data: {
                labels: ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00'],
                datasets: [{
                    label: 'AraÃ§ SayÄ±sÄ±',
                    data: [120, 250, 180, 200, 300, 450, 220],
                    borderColor: '#2563eb',
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, grid: { borderDash: [2, 4] } },
                    x: { grid: { display: false } }
                }
            }
        });
    }

    // KavÅŸak YoÄŸunluk Pasta GrafiÄŸi
    const pieCtx = document.getElementById('intersectionPieChart');
    if (pieCtx) {
        if(pieChartInstance) pieChartInstance.destroy();
        pieChartInstance = new Chart(pieCtx, {
            type: 'doughnut',
            data: {
                labels: ['Merkez KavÅŸak', 'Kuzey BulvarÄ±', 'Sanayi Ã‡Ä±kÄ±ÅŸÄ±', 'Sahil Yolu'],
                datasets: [{
                    data: [40, 25, 20, 15],
                    backgroundColor: ['#2563eb', '#16a34a', '#eab308', '#ef4444'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                    legend: { position: 'bottom' }
                }
            }
        });
    }
}

function renderSystemLogs() {
    const tbody = document.getElementById('system-logs-body');
    if (!tbody) return;

    const logs = [
        { time: '10:45', loc: 'Kuzey BulvarÄ±', type: 'Acil Durum', desc: 'Ambulans geÃ§iÅŸi iÃ§in yeÅŸil dalga aktif edildi.', typeClass: 'text-danger' },
        { time: '10:42', loc: 'Merkez KavÅŸak', type: 'AI MÃ¼dahalesi', desc: 'YoÄŸunluk sebebiyle NS yÃ¶nÃ¼ yeÅŸil sÃ¼resi 15sn artÄ±rÄ±ldÄ±.', typeClass: 'text-primary' },
        { time: '10:30', loc: 'Sanayi Ã‡Ä±kÄ±ÅŸÄ±', type: 'Sistem UyarÄ±sÄ±', desc: 'SensÃ¶r baÄŸlantÄ±sÄ± 2sn koptu, tekrar saÄŸlandÄ±.', typeClass: 'text-warning' },
        { time: '10:15', loc: 'TÃ¼m Sistem', type: 'Rutin Kontrol', desc: 'GÃ¼nlÃ¼k otonom kalibrasyon baÅŸarÄ±yla tamamlandÄ±.', typeClass: 'text-success' },
        { time: '09:50', loc: 'Sahil Yolu', type: 'AI MÃ¼dahalesi', desc: 'Trafik akÄ±ÅŸÄ± rahatladÄ±ÄŸÄ± iÃ§in dÃ¶ngÃ¼ sÃ¼resi kÄ±saltÄ±ldÄ±.', typeClass: 'text-primary' }
    ];

    tbody.innerHTML = '';
    logs.forEach(log => {
        tbody.innerHTML += `
            <tr>
                <td style="color:var(--text-muted); font-size:0.85rem;">${log.time}</td>
                <td style="font-weight:600;">${log.loc}</td>
                <td class="${log.typeClass}" style="font-weight:500;">${log.type}</td>
                <td style="color:var(--text-muted);">${log.desc}</td>
            </tr>
        `;
    });
}


// ------------------------------
// SÄ°MÃœLASYON & STATE MACHINE
// ------------------------------
function startSimulation() {
    if(simTimerInterval) clearInterval(simTimerInterval);
    if(simPhysicsInterval) clearInterval(simPhysicsInterval);
    
    document.getElementById('sim-vehicles').innerHTML = '';
    vehicles = [];
    simPhase = 'NS_GREEN';
    simTimer = currentConfig.nsTime;
    simMode = 'AUTO';
    
    updateLightsDOM();

    // Saniye Dongusu (State Machine) - IPTAL EDILDI! ARTIK MASTER ARDUINO!
    simTimerInterval = setInterval(() => {
        // if(simMode === 'AUTO' || simMode === 'MANUAL') {
        //     simTimer--; // BU SATIR DALGALANMA YAPIYORDU! Iptal edildi.
            
        //     if(simTimer <= 0) {
        //         advancePhase();
        //     }
        // }
        // updateLightsDOM() artik asagidaki fetch intervali icinde cagriliyor.
    }, 1000);

    // AraÃ§ spawnlama
    setInterval(() => {
        if(Math.random() > 0.4) spawnVehicle();
    }, 1500);

    // Fizik dÃ¶ngÃ¼sÃ¼
    simPhysicsInterval = setInterval(updatePhysics, 50);
}

function advancePhase() {
    if(simPhase === 'NS_GREEN') {
        simPhase = 'NS_YELLOW';
        simTimer = currentConfig.yellowTime;
    } 
    else if(simPhase === 'NS_YELLOW') {
        simPhase = 'EW_PREP';
        simTimer = currentConfig.yellowTime;
    }
    else if(simPhase === 'EW_PREP') {
        simPhase = 'EW_GREEN';
        simTimer = currentConfig.ewTime;
    }
    else if(simPhase === 'EW_GREEN') {
        simPhase = 'EW_YELLOW';
        simTimer = currentConfig.yellowTime;
    }
    else if(simPhase === 'EW_YELLOW') {
        simPhase = 'NS_PREP';
        simTimer = currentConfig.yellowTime;
    }
    else if(simPhase === 'NS_PREP') {
        simPhase = 'NS_GREEN';
        simTimer = currentConfig.nsTime;
    }
    else if(simPhase === 'ALL_RED') {
        simPhase = 'NS_PREP';
        simTimer = currentConfig.yellowTime;
    }
}

function updateLightsDOM() {
    const lN = document.getElementById('light-n');
    const lS = document.getElementById('light-s');
    const lE = document.getElementById('light-e');
    const lW = document.getElementById('light-w');

    const setLight = (el, color, text, textColor) => {
        el.querySelector('.green').classList.remove('active');
        el.querySelector('.yellow').classList.remove('active');
        el.querySelector('.red').classList.remove('active');
        el.querySelector('.' + color).classList.add('active');
        el.querySelector('.sim-timer').innerText = text;
        el.querySelector('.sim-timer').style.color = textColor;
    };

    if(simPhase === 'ALL_RED') {
        [lN, lS, lE, lW].forEach(l => setLight(l, 'red', '--', '#ef4444'));
        return;
    }

    if(simPhase === 'NS_GREEN') {
        [lN, lS].forEach(l => setLight(l, 'green', simTimer, '#22c55e'));
        [lE, lW].forEach(l => setLight(l, 'red', simTimer, '#ef4444')); 
    }
    else if(simPhase === 'NS_YELLOW') {
        [lN, lS].forEach(l => setLight(l, 'yellow', simTimer, '#f59e0b')); // NS sarÄ±
        [lE, lW].forEach(l => setLight(l, 'red', simTimer, '#ef4444')); 
    }
    else if(simPhase === 'EW_PREP') {
        [lN, lS].forEach(l => setLight(l, 'red', simTimer, '#ef4444')); 
        [lE, lW].forEach(l => setLight(l, 'yellow', simTimer, '#f59e0b')); // EW yeÅŸile hazÄ±rlanÄ±yor (sarÄ±)
    }
    else if(simPhase === 'EW_GREEN') {
        [lN, lS].forEach(l => setLight(l, 'red', simTimer, '#ef4444')); 
        [lE, lW].forEach(l => setLight(l, 'green', simTimer, '#22c55e'));
    }
    else if(simPhase === 'EW_YELLOW') {
        [lN, lS].forEach(l => setLight(l, 'red', simTimer, '#ef4444')); 
        [lE, lW].forEach(l => setLight(l, 'yellow', simTimer, '#f59e0b')); // EW sarÄ±
    }
    else if(simPhase === 'NS_PREP') {
        [lN, lS].forEach(l => setLight(l, 'yellow', simTimer, '#f59e0b')); // NS yeÅŸile hazÄ±rlanÄ±yor (sarÄ±)
        [lE, lW].forEach(l => setLight(l, 'red', simTimer, '#ef4444'));
    }
}


// ------------------------------
// KONTROL BUTONLARI (TRAFFIC CONTROL)
// ------------------------------
function simEmergency() {
    simMode = 'EMERGENCY';
    simPhase = 'ALL_RED';
    updateLightsDOM();
}

function simExtendGreen() {
    if(simMode !== 'EMERGENCY') {
        if(simPhase.includes('GREEN')) {
            simTimer += 30;
            updateLightsDOM();
        }
    }
}

function simTogglePhase() {
    simMode = 'MANUAL';
    // EÄŸer sarÄ±daysa direkt kÄ±rmÄ±zÄ±lÄ± faza atla, yeÅŸildeyse sarÄ±ya atla
    if(simPhase === 'NS_GREEN') { simPhase = 'NS_YELLOW'; simTimer = currentConfig.yellowTime; }
    else if(simPhase === 'EW_GREEN') { simPhase = 'EW_YELLOW'; simTimer = currentConfig.yellowTime; }
    else { advancePhase(); }
    updateLightsDOM();
}

function simResetAuto() {
    simMode = 'AUTO';
    if(simPhase === 'ALL_RED') advancePhase();
}


// ------------------------------
// FÄ°ZÄ°K VE ARAÃ‡ SÄ°MÃœLASYONU
// ------------------------------
const colors = ['#ef4444', '#3b82f6', '#f59e0b', '#10b981', '#ffffff'];
const directions = ['N', 'S', 'E', 'W'];

function spawnVehicle() {
    const dir = directions[Math.floor(Math.random() * directions.length)];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const id = 'car_' + Date.now() + Math.floor(Math.random()*1000);

    let x, y, width, height, vx, vy;
    const laneOffset = 15;

    if(dir === 'N') { x = 50; y = -10; vx = 0; vy = 1; width = 12; height = 24; } 
    else if(dir === 'S') { x = 50; y = 110; vx = 0; vy = -1; width = 12; height = 24; } 
    else if(dir === 'W') { x = -10; y = 50; vx = 1; vy = 0; width = 24; height = 12; } 
    else if(dir === 'E') { x = 110; y = 50; vx = -1; vy = 0; width = 24; height = 12; }

    const carHtml = document.createElement('div');
    carHtml.id = id;
    carHtml.className = 'sim-car';
    carHtml.style.background = color;
    carHtml.style.width = width + 'px';
    carHtml.style.height = height + 'px';
    
    if(dir === 'N') carHtml.style.transform = `translate(calc(-50% - ${laneOffset}px), 0)`;
    if(dir === 'S') carHtml.style.transform = `translate(calc(-50% + ${laneOffset}px), 0)`;
    if(dir === 'E') carHtml.style.transform = `translate(0, calc(-50% - ${laneOffset}px))`;
    if(dir === 'W') carHtml.style.transform = `translate(0, calc(-50% + ${laneOffset}px))`;

    document.getElementById('sim-vehicles').appendChild(carHtml);
    vehicles.push({ id, dir, x, y, vx, vy, speed: 1.2, active: true });
}

function updatePhysics() {
    vehicles.forEach(car => {
        if(!car.active) return;
        let shouldStop = false;

        // SarÄ± Ä±ÅŸÄ±kta veya kÄ±rmÄ±zÄ±da dur (YeÅŸil deÄŸilse dur)
        const nsGo = simPhase === 'NS_GREEN';
        const ewGo = simPhase === 'EW_GREEN';

        if(car.dir === 'N' && car.y > 33 && car.y < 38 && !nsGo) shouldStop = true;
        if(car.dir === 'S' && car.y < 67 && car.y > 62 && !nsGo) shouldStop = true;
        if(car.dir === 'W' && car.x > 33 && car.x < 38 && !ewGo) shouldStop = true;
        if(car.dir === 'E' && car.x < 67 && car.x > 62 && !ewGo) shouldStop = true;

        // Ã–ndeki araca Ã§arpma kontrolÃ¼
        vehicles.forEach(other => {
            if(other.id !== car.id && other.dir === car.dir) {
                if(car.dir === 'N' && other.y > car.y && other.y - car.y < 9) shouldStop = true;
                if(car.dir === 'S' && other.y < car.y && car.y - other.y < 9) shouldStop = true;
                if(car.dir === 'E' && other.x < car.x && car.x - other.x < 9) shouldStop = true;
                if(car.dir === 'W' && other.x > car.x && other.x - car.x < 9) shouldStop = true;
            }
        });

        if(!shouldStop) {
            car.x += car.vx * car.speed;
            car.y += car.vy * car.speed;
        }

        const domObj = document.getElementById(car.id);
        if(domObj) {
            domObj.style.left = car.x + '%';
            domObj.style.top = car.y + '%';
        }

        if(car.x < -20 || car.x > 120 || car.y < -20 || car.y > 120) {
            if(domObj) domObj.remove();
            car.active = false;
        }
    });

    vehicles = vehicles.filter(c => c.active);
}

window.addEventListener('load', () => {
    initDashboard();
});

// --- ARDUINO HABERLESME ENTEGRASYONU ---
async function sendCommandToArduino(cmd) {
    try {
        const response = await fetch('/api/traffic/command', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ command: cmd })
        });
        const data = await response.json();
        console.log('Arduino Komut Sonucu:', data);
        alert(data.message || "Komut Arduino'ya iletildi.");
    } catch(err) {
        console.error('Arduino Haberlesme Hatasi:', err);
    }
}

// Orijinal UI fonksiyonlarini Arduino'yu tetikleyecek sekilde eziyoruz
const originalSimEmergency = simEmergency;
simEmergency = function() {
    originalSimEmergency(); // Ekrani guncelle
    sendCommandToArduino('MODE:MANUAL_EW'); // Acil durumda yan yolu ac veya istedigimiz bir seyi yap
}

const originalSimResetAuto = simResetAuto;
simResetAuto = function() {
    originalSimResetAuto(); // Ekrani guncelle
    sendCommandToArduino('MODE:AUTO');
}

// Sure kaydetme islemine Arduino'yu dahil et
const originalSaveIntersectionConfig = window.saveIntersectionConfig || function(){};
window.saveIntersectionConfig = function() {
    // UI tarafindaki orijinal kayit calissin
    originalSaveIntersectionConfig();
    
    // UI inputlarindan saniyeleri alalim
    const nsTime = document.getElementById('cfg-v-time').value || 30;
    const ewTime = document.getElementById('cfg-h-time').value || 30;
    
    // Arduino surelerini milisaniye cinsinden gonderelim
    sendCommandToArduino('TIME_NS:' + (nsTime * 1000));
    setTimeout(() => {
        sendCommandToArduino('TIME_EW:' + (ewTime * 1000));
        sendCommandToArduino('MODE:ROUTINE'); // Yeni surelerin isleme girmesi icin rutin moda gec
    }, 500); // 500ms gecikme ile arka arkaya komutlar birbirine girmesin
}


// Dropdown degisikligini yakalayıp Arduino'ya senkronize et
document.addEventListener('DOMContentLoaded', () => {
    const selector = document.getElementById('intersection-selector');
    if(selector) {
        selector.addEventListener('change', () => {
            setTimeout(() => {
                if(typeof currentConfig !== 'undefined' && currentConfig.nsTime && currentConfig.ewTime) {
                    console.log('Kavsak degisti, yeni sureler Arduinoya gonderiliyor...');
                    if(typeof sendCommandToArduino === 'function') {
                        sendCommandToArduino('TIME_NS:' + (currentConfig.nsTime * 1000));
                        setTimeout(() => {
                            sendCommandToArduino('TIME_EW:' + (currentConfig.ewTime * 1000));
                            sendCommandToArduino('MODE:ROUTINE');
                        }, 500);
                    }
                }
            }, 500); // UI'in verileri cekmesi ve currentConfig'i guncellemesi icin kucuk bir gecikme
        });
    }
});


// --- MASTER/SLAVE SENKRONIZASYONU ---
// Web artik kendi kendine faz gecisi YAPAMAZ. Arduino'nun kölesi (Slave) oldu.
window.advancePhase = function() {
    // Iptal edildi.
};

// Arduino'dan gelen duruma gore Web UI guncelleyen dongu
setInterval(async () => {
    try {
        const response = await fetch('/api/traffic/status');
        const data = await response.json();
        if(data && data.success && data.state) {
            // Arduino'dan gelen veri artik NS_GREEN:15 formatinda
            let parts = data.state.split(':');
            simPhase = parts[0]; 
            
            // Saniye sayacini ayarla
            if (parts.length > 1) {
                simTimer = parts[1];
            } else {
                simTimer = '--';
            }
            
            if(typeof updateLightsDOM === 'function') updateLightsDOM();
        }
    } catch(err) {
        // Baglanti yoksa bekle
    }
}, 300); // Daha hizli ve senkronize bir goruntu icin 300ms

// Acil Durum butonunu guncelle (MANUAL_EW yerine EMERGENCY atsin)
window.simEmergency = function() {
    simMode = 'EMERGENCY';
    simPhase = 'ALL_RED';
    if(typeof updateLightsDOM === 'function') updateLightsDOM();
    if(typeof sendCommandToArduino === 'function') sendCommandToArduino('MODE:EMERGENCY'); 
};


// Yeni Modlar
window.simNormalMode = function() {
    simMode = 'ROUTINE';
    if(typeof sendCommandToArduino === 'function') sendCommandToArduino('MODE:ROUTINE');
};

window.simAutoMode = function() {
    simMode = 'AUTO';
    if(typeof sendCommandToArduino === 'function') sendCommandToArduino('MODE:AUTO');
};
