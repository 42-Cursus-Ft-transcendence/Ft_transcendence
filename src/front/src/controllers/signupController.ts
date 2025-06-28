import { signupTemplate } from '../templates/signupTemplate.js';
import { arcadeTemplate } from '../templates/arcadeTemplate.js';

export function renderSignup(container:  HTMLElement, onSuccess: () => void): void
{
    container.innerHTML = signupTemplate;

    const form = container.querySelector<HTMLFormElement>('#signupForm')!;
    const btn = container.querySelector<HTMLButtonElement>('#submitBtn')!;
    const txt = container.querySelector<HTMLSpanElement>('#submitText')!;
    const nameInput = container.querySelector<HTMLInputElement>('#name')!;
    const emailInput = container.querySelector<HTMLInputElement>('#email')!;
    const passInput = container.querySelector<HTMLInputElement>('#password')!;
    const errName = container.querySelector<HTMLParagraphElement>('#error-name')!;
    const errEmail = container.querySelector<HTMLParagraphElement>('#error-email')!;
    const errPass = container.querySelector<HTMLParagraphElement>('#error-password')!;

    form.addEventListener('submit', async e => {
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

        if (!valid) return;
        else
        {
            container.innerHTML = arcadeTemplate;
            onSuccess();
        }
    });
}