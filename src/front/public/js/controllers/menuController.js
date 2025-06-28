import { menuTemplate } from "../templates/menuTemplate.js";
export function renderMenu(container, socket, onSelect) {
    container.innerHTML = menuTemplate;
    container.querySelector('#btn2p')
        .addEventListener('click', () => {
        socket.send(JSON.stringify({ type: 'start', vs: 'player' }));
        onSelect('2player');
    });
    container.querySelector('#btnIa')
        .addEventListener('click', () => {
        socket.send(JSON.stringify({ type: 'start', vs: 'bot', difficulty: 0.1 }));
        onSelect('ia');
    });
    container.querySelector('#btnOnline')
        .addEventListener('click', () => onSelect('online'));
    container.querySelector('#btnProfile')
        .addEventListener('click', () => onSelect('profile'));
    container.querySelector('#btnSettings')
        .addEventListener('click', () => onSelect('settings'));
}
//# sourceMappingURL=menuController.js.map