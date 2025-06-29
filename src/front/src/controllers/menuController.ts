import { menuTemplate } from "../templates/menuTemplate.js";

export type ScreenChoise = '2player' | 'ia' | 'online' | 'profile' | 'settings' ;

export function renderMenu(container: HTMLElement, socket: WebSocket, onSelect: (choice: ScreenChoise) => void): void
{
    container.innerHTML = menuTemplate;

    const arcadeEl = document.querySelector<HTMLElement>('.zoomable')!;
  
    // Zoom sur le container au clic d'un bouton
    const zoomIn = () => arcadeEl.classList.add('zoomed');

    if (arcadeEl.classList.contains('zoomed'))
      arcadeEl.classList.remove('zoomed');
    
    container.querySelector('#btn2p')!
    .addEventListener('click', () => {
      zoomIn();
      socket.send(JSON.stringify({ type: 'start', vs: 'player' }));
      onSelect('2player');
    });

    container.querySelector('#btnIa')!
    .addEventListener('click', () => {
      zoomIn();
      socket.send(JSON.stringify({ type: 'start', vs: 'bot', difficulty: 0.1 }));
      onSelect('ia');
    });
    container.querySelector('#btnOnline')!
      .addEventListener('click', () => {
        zoomIn();
        onSelect('online')
      });
    container.querySelector('#btnProfile')!
      .addEventListener('click', () => {
        zoomIn();
        onSelect('profile')
      });
    container.querySelector('#btnSettings')!
      .addEventListener('click', () => {
        zoomIn();
        onSelect('settings')
      });
}