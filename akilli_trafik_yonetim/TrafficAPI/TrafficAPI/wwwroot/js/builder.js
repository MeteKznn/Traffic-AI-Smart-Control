/* wwwroot/js/builder.js */
let activeTool = 'road-h';
let isDrawing = false;

function initBuilder() {
    const grid = document.getElementById('builder-grid');
    grid.innerHTML = '';
    
    // 15x10 Grid (Dashboard CSS ile uyumlu)
    for(let i=0; i<150; i++) {
        const cell = document.createElement('div');
        cell.className = 'grid-cell';
        cell.dataset.index = i;
        
        // Fare olayları (Fırça mantığı)
        cell.addEventListener('mousedown', (e) => { isDrawing = true; paintCell(cell); });
        cell.addEventListener('mouseenter', (e) => { if(isDrawing) paintCell(cell); });
        cell.addEventListener('mouseup', () => { isDrawing = false; });
        
        grid.appendChild(cell);
    }
    
    // Grid dışına çıkınca çizmeyi bırak
    grid.addEventListener('mouseleave', () => { isDrawing = false; });
    document.addEventListener('mouseup', () => { isDrawing = false; });
}

function selectTool(type, element) {
    activeTool = type;
    document.querySelectorAll('.tool-item').forEach(el => el.classList.remove('active'));
    element.classList.add('active');
}

function paintCell(cell) {
    // Silerken temizle
    if (activeTool === 'eraser') {
        cell.className = 'grid-cell';
        cell.innerHTML = '';
        cell.dataset.itemType = '';
        cell.dataset.roadType = '';
        return;
    }

    // Seçili yol tipini (Cadde/Sokak) al
    const roadType = document.querySelector('input[name="roadType"]:checked').value;
    
    // Temizle
    cell.className = 'grid-cell';
    cell.innerHTML = '';
    
    cell.dataset.itemType = activeTool;
    
    if(activeTool === 'road-h') {
        cell.classList.add('cell-road-h', roadType);
        cell.dataset.roadType = roadType;
    }
    if(activeTool === 'road-v') {
        cell.classList.add('cell-road-v', roadType);
        cell.dataset.roadType = roadType;
    }
    if(activeTool === 'intersection') {
        cell.classList.add('cell-intersection', roadType);
        cell.dataset.roadType = roadType;
    }
    if(activeTool === 'light') {
        cell.classList.add('cell-light', roadType);
        cell.dataset.roadType = roadType;
        cell.innerHTML = `
            <div class="tl-body">
                <div class="tl-light red active"></div>
                <div class="tl-light yellow"></div>
                <div class="tl-light green"></div>
            </div>
        `;
    }
}

async function saveMap() {
    const cells = document.querySelectorAll('#builder-grid .grid-cell');
    let mapData = [];
    
    cells.forEach(c => {
        if(c.dataset.itemType) {
            mapData.push({ 
                index: c.dataset.index, 
                type: c.dataset.itemType,
                roadClass: c.dataset.roadType || ''
            });
        }
    });

    if(mapData.length === 0) return alert("Harita boş! Lütfen ızgaraya tıklayarak yollar çizin.");

    const layoutName = prompt("Harita için bir isim girin:", "Yeni Şehir Planı");
    if(!layoutName) return;

    const token = localStorage.getItem('traffic_token');
    
    try {
        const res = await fetch('/api/Map', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token
            },
            body: JSON.stringify({ Name: layoutName, LayoutData: JSON.stringify(mapData) })
        });
        
        const data = await res.json();
        if(res.ok) {
            alert(data.message);
            if(typeof loadMapsDropdown === 'function') loadMapsDropdown();
        }
        else alert("Kaydetme başarısız.");
    } catch(e) {
        alert("Sunucuya bağlanılamadı.");
    }
}
