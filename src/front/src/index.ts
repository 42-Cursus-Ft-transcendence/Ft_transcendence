import { renderSignup }    from './controllers/signupController.js';
import { renderMenu }      from './controllers/menuController.js';
import { renderPong }      from './controllers/pongController.js';
import { renderOnline }    from './controllers/onlineController.js';
import { renderProfile }   from './controllers/profileController.js';
import { renderSettings }  from './controllers/settingsController.js';

// Type des écrans disponibles
export type Screen =
  | 'signup'
  | 'menu'
  | '2player'
  | 'ia'
  | 'online'
  | 'profile'
  | 'settings';

let socket: WebSocket;

const root = document.getElementById('root') as HTMLElement;

 
function doRender(screen: Screen) {
    if (screen === 'signup') 
        renderSignup(root, () => navigate('menu'));
    else 
    {
        const app = document.getElementById('app');
        if (!app) 
            throw new Error('Le template arcade n’a pas été monté');
    
        switch (screen) 
        {
            case 'menu':
                renderMenu(app, socket, choice => navigate(choice));
                break;
            case '2player':
                renderPong(app, socket, () => navigate('menu'));
                break;
            case 'ia':
                renderPong(app, socket, () => navigate('menu'));
                break;
            case 'online':
                renderOnline(app, () => navigate('menu'));
                break;
            case 'profile':
                renderProfile(app, () => navigate('menu'));
                break;
            case 'settings':
                renderSettings(app, () => navigate('menu'));
                break;
            default:
                renderSignup(root, () => navigate('menu'));
                break;
        }
    }
}

/**
 * Change d'écran et met à jour l'historique
 */
function navigate(screen: Screen) {
    // 1️⃣ history.pushState({ screen }, '', `?screen=${screen}`);
    //    • Ajoute une entrée dans l’historique du navigateur, sans recharger la page.
    //    • Le premier argument ({ screen }) est l’objet d’état que l’on stocke.
    //    • Le second argument ('') est le titre (majoritairement ignoré par les navigateurs).
    //    • Le troisième (`?screen=${screen}`) est la nouvelle URL affichée (paramètre query).
    //
    //    Conséquence : l’URL change en “?screen=menu” (ou autre), et l’utilisateur
    //    pourra utiliser la flèche ← pour revenir à l’état précédent.
    history.pushState({ screen }, '', `?screen=${screen}`);

    // 2️⃣ doRender(screen);
    //    • Appelle la fonction qui affiche l’écran correspondant dans le DOM.
    //    • C’est ici que l’on va effectivement injecter le formulaire, le menu, le jeu, etc.
    doRender(screen);
}



// Au chargement initial du document HTML
window.addEventListener('DOMContentLoaded', () => {
    const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
    socket = new WebSocket(`${protocol}://${location.host}/ws`);
    socket.onopen  = () => console.log('✅ WebSocket connectée');
    socket.onerror = err => console.error('❌ Erreur WebSocket', err);
    socket.onclose = () => console.log('⚠️ WebSocket fermée');
    // 3️⃣ const params = new URLSearchParams(location.search);
    //    • Récupère la chaîne de requête dans l’URL (tout ce qui suit le “?”).
    //    • Exemple : pour “index.html?screen=pong”, params contient { screen: 'pong' }.
    const params = new URLSearchParams(location.search);

    // 4️⃣ const s = params.get('screen') as Screen;
    //    • Extrait la valeur du paramètre “screen” (ou null si absent).
    //    • Le “as Screen” dit à TypeScript de considérer la valeur comme l’un de nos écrans.
    const s = params.get('screen') as Screen;

    // 5️⃣ const initial = s || 'signup';
    //    • Si on a lu un écran valide (p.ex. 'pong'), on l’utilise.
    //    • Sinon on retombe sur 'signup' par défaut.
    const initial = s || 'signup';

    // 6️⃣ history.replaceState({ screen: initial }, '', location.href);
    //    • Remplace l’entrée courante de l’historique (celle du chargement de la page).
    //    • Synchronise history.state avec l’écran qu’on va afficher.
    //    • L’URL n’est pas modifiée (on passe location.href pour être certain).
    history.replaceState({ screen: initial }, '', location.href);

    // 7️⃣ doRender(initial);
    //    • Affiche immédiatement l’écran déterminé (signup ou autre) sans attendre
    //      une interaction utilisateur.
    doRender(initial);
});

// Lorsque l’utilisateur clique sur Précédent/Suivant
window.addEventListener('popstate', event => {
    // 8️⃣ const screen = (event.state as { screen?: Screen })?.screen;
    //    • event.state est l’objet qu’on a passé à pushState/replaceState.
    //    • On y extrait la propriété `screen` (ou undefined si absent).
    const screen = (event.state as { screen?: Screen })?.screen;

    // 9️⃣ doRender(screen || 'signup');
    //    • Si on a bien un état (un écran), on l’affiche.
    //    • Sinon on retombe sur 'signup'.
    //    • Cela permet de restaurer l’UI exactement comme elle était.
    doRender(screen || 'signup');
});