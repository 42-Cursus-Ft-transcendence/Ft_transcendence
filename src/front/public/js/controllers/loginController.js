import { loginTemplate } from '../templates/loginTemplate.js';
export function renderLogin(container, onSuccess) {
    container.innerHTML = loginTemplate;
    const form = container.querySelector('#loginForm');
    const btn = container.querySelector('#submitBtn');
    const txt = container.querySelector('#submitText');
    const nameInput = container.querySelector('#name');
    const passInput = container.querySelector('#password');
    const errName = container.querySelector('#error-name');
    const errPass = container.querySelector('#error-password');
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
        if (passInput.value.trim().length === 0) {
            errPass.textContent = 'Password is required';
            errPass.classList.remove('hidden');
            valid = false;
        }
        if (!valid)
            return;
        btn.disabled = true;
        txt.textContent = 'Connection ...';
        try {
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