/* wwwroot/js/auth.js */
const API_URL = '/api/Auth';

function toggleAuth(type) {
    if (type === 'register') {
        document.getElementById('login-form-container').classList.add('hidden');
        document.getElementById('register-form-container').classList.remove('hidden');
    } else {
        document.getElementById('register-form-container').classList.add('hidden');
        document.getElementById('login-form-container').classList.remove('hidden');
    }
}

async function login() {
    const user = document.getElementById('login-username').value;
    const pass = document.getElementById('login-password').value;

    if(!user || !pass) return alert('Lütfen tüm alanları doldurun!');

    try {
        const res = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: user, password: pass })
        });

        const data = await res.json();
        
        if (res.ok) {
            localStorage.setItem('traffic_token', data.token);
            localStorage.setItem('traffic_username', data.username);
            window.location.reload();
        } else {
            alert(data.message);
        }
    } catch (err) {
        alert('Sunucuya bağlanılamadı.');
    }
}

async function register() {
    const user = document.getElementById('reg-username').value;
    const pass = document.getElementById('reg-password').value;
    const email = document.getElementById('reg-email').value;
    const phone = document.getElementById('reg-phone')?.value || '';

    if(!user || !pass || !email) return alert('Kullanıcı adı, şifre ve E-Posta zorunludur!');

    try {
        const res = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: user, password: pass, email: email, phone: phone })
        });

        const data = await res.json();
        alert(data.message);
        
        if (res.ok) {
            toggleAuth('login');
        }
    } catch (err) {
        alert('Sunucuya bağlanılamadı.');
    }
}

async function logout() {
    const token = localStorage.getItem('traffic_token');
    if(token) {
        try {
            await fetch(`${API_URL}/logout`, {
                method: 'POST',
                headers: { 'Authorization': token }
            });
        } catch (e) {
            console.error("Logout API failed", e);
        }
    }
    localStorage.removeItem('traffic_token');
    localStorage.removeItem('traffic_username');
    window.location.reload();
}

async function loadUserProfile() {
    const token = localStorage.getItem('traffic_token');
    if(!token) return;

    try {
        const res = await fetch(`${API_URL}/me`, {
            headers: { 'Authorization': token }
        });
        if(res.ok) {
            const data = await res.json();
            document.getElementById('set-username').value = data.username || '';
            document.getElementById('set-email').value = data.email || '';
            document.getElementById('set-phone').value = data.phone || '';
        }
    } catch(e) { console.error(e); }
}

async function updateUserProfile() {
    const token = localStorage.getItem('traffic_token');
    if(!token) return;

    const email = document.getElementById('set-email').value;
    const phone = document.getElementById('set-phone').value;
    const password = document.getElementById('set-password').value;

    try {
        const res = await fetch(`${API_URL}/me`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': token 
            },
            body: JSON.stringify({ email, phone, password })
        });

        const data = await res.json();
        if(res.ok) {
            alert(data.message);
            document.getElementById('set-password').value = '';
        } else {
            alert("Güncelleme başarısız.");
        }
    } catch(e) { console.error(e); }
}
