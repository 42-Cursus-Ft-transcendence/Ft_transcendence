import { loginTemplate } from '../templates/loginTemplate.js';
import { navigate } from '../index.js';
import { initSocket } from '../index.js';
export function renderLogin(container, onSuccess) {
    container.innerHTML = loginTemplate;
    const form = container.querySelector('#loginForm');
    const btn = container.querySelector('#submitBtn');
    const txt = container.querySelector('#submitText');
    const nameInput = container.querySelector('#name');
    const passInput = container.querySelector('#password');
    const errName = container.querySelector('#error-name');
    const errPass = container.querySelector('#error-password');
    const singupLink = container.querySelector('a[href="#signup"]');
    singupLink.addEventListener('click', e => {
        e.preventDefault();
        navigate('signup');
    });
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        // 1) Reset des erreurs
        [errName, errPass].forEach(p => {
            p.textContent = '';
            p.classList.add('hidden');
        });
        // 2) Validation front
        let valid = true;
        if (nameInput.value.trim().length === 0) {
            errName.textContent = 'Username is required';
            errName.classList.remove('hidden');
            valid = false;
        }
        if (passInput.value.length === 0) {
            errPass.textContent = 'Password is required';
            errPass.classList.remove('hidden');
            valid = false;
        }
        if (!valid)
            return;
        btn.disabled = true;
        txt.textContent = 'Connection ...';
        try {
            console.log('Sending fetch...');
            const res = await fetch('/login', {
                method: 'POST',
                headers: { 'content-Type': 'application/json' },
                credentials: 'include', // pour que le cookie HttpOnly soit envoyé/stocké
                body: JSON.stringify({
                    userName: nameInput.value.trim(),
                    password: passInput.value
                })
            });
            if (res.ok) {
                const { userName, email, idUser } = await res.json();
                const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
                // Wait for socket to connect before proceeding
                const socket = initSocket(`${protocol}://${location.host}/ws`);
                socket.onopen = () => {
                    console.log('✅ WebSocket connected, proceeding to menu');
                    localStorage.setItem('userId', idUser.toString());
                    localStorage.setItem('userName', userName);
                    localStorage.setItem('email', email);
                    onSuccess();
                };
                socket.onerror = (error) => {
                    console.error('❌ WebSocket connection failed:', error);
                    alert('Failed to establish real-time connection');
                };
            }
            else if (res.status === 401) {
                errName.innerHTML = 'Invalid <br/>username or password';
                errName.classList.remove('hidden');
            }
            else {
                const { error } = await res.json();
                alert(error || 'Unknown error');
            }
        }
        catch (networkError) {
            alert('Unable to contact the server');
        }
        finally {
            btn.disabled = false;
            txt.textContent = 'LOG IN';
        }
    });
}
//# sourceMappingURL=loginController.js.map