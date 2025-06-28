import { initPongApp } from './pong.js';
export function initSignupForm() {
    const form = document.getElementById('signupForm');
    const form_block = document.getElementById('form');
    const btn = document.getElementById('submitBtn');
    const txt = document.getElementById('submitText');
    const nameInput = document.getElementById('name');
    const emailInput = document.getElementById('email');
    const passInput = document.getElementById('password');
    const errName = document.getElementById('error-name');
    const errEmail = document.getElementById('error-email');
    const errPass = document.getElementById('error-password');
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
        else {
            form_block.remove();
            const wrapperHtml = `
            <div class="relative inline-block">
             <img src="./assets/arcade.png" alt="borne arcade" class="filter brightness-100 hover:brightness-75 transition" />
             <div
               class="absolute top-[14.7%] left-[16.3%] w-[67.7%] h-[40%]
                       rounded-[40px] flex items-center justify-center font-arcade
                      bg-[url('./assets/bg-machine.gif')] bg-cover bg-center"
               id="app">
             </div>
               </div>
         `;
            document.body.insertAdjacentHTML('beforeend', wrapperHtml);
            initPongApp();
        }
    });
}
//# sourceMappingURL=form.js.map