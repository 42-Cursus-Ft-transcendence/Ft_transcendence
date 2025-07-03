import { signupTemplate } from '../templates/signupTemplate.js';
import { navigate } from '../index.js';
export function renderSignup(container, onSuccess) {
    container.innerHTML = signupTemplate;
    const form = container.querySelector('#signupForm');
    const btn = container.querySelector('#submitBtn');
    const txt = container.querySelector('#submitText');
    const nameInput = container.querySelector('#name');
    const emailInput = container.querySelector('#email');
    const passInput = container.querySelector('#password');
    const errName = container.querySelector('#error-name');
    const errEmail = container.querySelector('#error-email');
    const errPass = container.querySelector('#error-password');
    const loginLinker = container.querySelector('a[href="#login"]');
    loginLinker.addEventListener('click', e => {
        e.preventDefault();
        navigate('login');
    });
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        // 1) Reset des erreurs
        [errName, errEmail, errPass].forEach(p => {
            p.textContent = '';
            p.classList.add('hidden');
        });
        // 2) Validation front
        let valid = true;
        if (nameInput.value.trim().length === 0) {
            errName.textContent = 'Le nom est requis';
            errName.classList.remove('hidden');
            valid = false;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.value)) {
            errEmail.textContent = 'Email invalide';
            errEmail.classList.remove('hidden');
            valid = false;
        }
        if (passInput.value.length < 8) {
            errPass.textContent = 'Le mot de passe doit faire ≥ 8 caractères';
            errPass.classList.remove('hidden');
            valid = false;
        }
        if (!valid)
            return;
        btn.disabled = true;
        txt.textContent = 'Creation in progress…';
        try {
            console.log('Sending fetch...');
            const res = await fetch('/signup', {
                method: 'POST',
                headers: { 'content-Type': 'application/json' },
                body: JSON.stringify({
                    userName: nameInput.value.trim(),
                    email: emailInput.value.trim(),
                    password: passInput.value
                })
            });
            if (res.status === 201) {
                const { idUser } = await res.json();
                console.log('Utilisateur créé #', idUser);
                onSuccess();
            }
            else {
                const err = await res.json();
                if (res.status === 400) {
                    errName.textContent = err.error;
                    errName.classList.remove('hidden');
                }
                else
                    alert(err.error || 'Unknown error');
            }
        }
        catch (networkError) {
            alert('Unable to contact the server');
        }
        finally {
            btn.disabled = false;
            txt.textContent = 'Create account';
        }
    });
}
//# sourceMappingURL=signupController.js.map