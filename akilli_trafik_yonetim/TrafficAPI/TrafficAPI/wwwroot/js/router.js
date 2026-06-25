/* wwwroot/js/router.js */
document.addEventListener('DOMContentLoaded', () => {
    // Check if logged in
    const token = localStorage.getItem('traffic_token');
    if (token) {
        document.getElementById('auth-screen').classList.add('hidden');
        document.getElementById('app-screen').classList.remove('hidden');
        
        const usernameEl = document.getElementById('current-username');
        if (usernameEl) {
            usernameEl.innerText = localStorage.getItem('traffic_username') || 'Admin';
        }
        
        // Init Dashboard components
        initDashboard();
        // initBuilder(); artik kullanilmiyor
        // fetchLogs(); eger kaldirildiysa kaldirilabilir
    } else {
        document.getElementById('app-screen').classList.add('hidden');
        document.getElementById('auth-screen').classList.remove('hidden');
        
        // Ensure only login form is shown initially
        document.getElementById('register-form-container').classList.add('hidden');
        document.getElementById('login-form-container').classList.remove('hidden');
    }
});

function navigate(pageId, element) {
    // Update active class on sidebar
    document.querySelectorAll('.side-nav li').forEach(li => {
        li.classList.remove('active');
        const dot = li.querySelector('.dot');
        if(dot) dot.remove();
    });
    element.classList.add('active');
    element.innerHTML += '<span class="dot"></span>';

    // Hide all pages
    document.querySelectorAll('.page-section').forEach(section => section.classList.add('hidden'));

    // Show target page
    const targetPage = document.getElementById('page-' + pageId);
    if(targetPage) targetPage.classList.remove('hidden');

    if(pageId === 'settings') {
        loadUserProfile();
    }

    // Update Title (Eger header kaldiysa, yeni tasarimda header icerigini guncellemeye pek gerek yok ama hata vermemesi icin koruyoruz)
    const pageTitleEl = document.getElementById('page-title');
    if(pageTitleEl) {
        const titles = {
            'dashboard': 'Genel Bakış',
            'monitoring': 'Traffic Monitoring',
            'builder': 'Kavşak Oluştur',
            'analytics': 'Analytics',
            'settings': 'Ayarlar'
        };
        pageTitleEl.innerText = titles[pageId] || 'Traffic AI';
    }
}
