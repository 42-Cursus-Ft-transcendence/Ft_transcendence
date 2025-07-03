import { renderSignup }    from './controllers/signupController.js';
import { renderLogin }     from './controllers/loginController.js';
import { renderMenu }      from './controllers/menuController.js';
import { renderPong }      from './controllers/pongController.js';
import { renderOnline }    from './controllers/onlineController.js';
import { renderProfile }   from './controllers/profileController.js';
import { renderSettings }  from './controllers/settingsController.js';
import { arcadeTemplate }  from './templates/arcadeTemplate.js';


// Type des écrans disponibles
export type Screen =
  | 'signup'
  | 'login'
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
        renderSignup(root, () => navigate('login'));
    else if(screen === 'login')
        renderLogin(root, () => navigate('menu'));
    else 
    {
        ensureArcadeFrame()
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
export function navigate(screen: Screen) {
    history.pushState({ screen }, '', `?screen=${screen}`);
    doRender(screen);
}


// Au chargement initial du document HTML
window.addEventListener('DOMContentLoaded', () => {(async () => 
    {
        const profile = await checkAuth();
        const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
        socket = new WebSocket(`${protocol}://${location.host}/ws`);
        socket.onopen  = () => console.log('✅ WebSocket connectée');
        socket.onerror = err => console.error('❌ Erreur WebSocket', err);
        socket.onclose = () => console.log('⚠️ WebSocket fermée');
        
        // Récupère l’écran demandé dans l’URL
        const params = new URLSearchParams(location.search);
        let s = params.get('screen') as Screen;


        if (profile)
            s  = 'menu';
        else
        s = 'login'
        const initial = s;
        console.log(initial);

        // 6️⃣ history.replaceState({ screen: initial }, '', location.href);
        //    • Remplace l’entrée courante de l’historique (celle du chargement de la page).
        //    • Synchronise history.state avec l’écran qu’on va afficher.
        //    • L’URL n’est pas modifiée (on passe location.href pour être certain).
        history.replaceState({ screen: initial }, '', location.href);

        navigate(initial);
    })();
});

// Lorsque l’utilisateur clique sur Précédent/Suivant
window.addEventListener('popstate', async event => {
    let screen = (event.state as { screen?: Screen })?.screen;
    const stillAuth = await checkAuth();

    //   Si connecté, on ne veut jamais login/signup
    if (stillAuth && (screen === 'login' || screen === 'signup')) {
      screen = 'menu';
    }
    // 4) Si déconnecté, et qu’on veut aller au menu, on redirige sur login
    if (!stillAuth && screen === 'menu') {
      screen = 'login';
    }
    console.log("popstate", screen);
    doRender(screen || 'login');
});


function ensureArcadeFrame() {
  // Si #app n'existe pas encore, on l'injecte dans `root`
  if (!document.getElementById('app')) {
    root.innerHTML = arcadeTemplate;
  }
}

async function checkAuth(): Promise<{userName: string, email: string, idUser: number } | null> 
{
    try 
    {
        const res = await fetch('/me', {
          method:      'POST',             
          credentials: 'include'
        })
        if (!res.ok) 
        {
            console.log("non log");
            return null;
        }
            console.log("log");
        return await res.json();
    } 
    catch (err) 
    {
        console.log("err", err);
        return null;
    }
}

function sendLogout() {
  if (navigator.sendBeacon) {
    navigator.sendBeacon('/logout')
  } else {
    fetch('/logout', {
      method: 'POST',
      credentials: 'include',
      keepalive: true
    })
  }
}
