// src/front/public/js/app.ts
// 1) Home view with a Play button
function homeView() {
    return "\n    <h1>\uD83C\uDFD3 Pong Arcade</h1>\n    <p>Ready to play?</p>\n    <button id=\"playbutton\" class=\"px-4 py-2 bg-accent text-white rounded\">Play Pong</button>\n  ";
}
// 2) Pong view (canvas only)
function pongView() {
    return "\n    <canvas id=\"pongCanvas\" width=\"600\" height=\"400\"\n            class=\"border-2 border-primary block mx-auto\"></canvas>\n  ";
}
// 3) Pong initialization (as before)
function startPong() {
    var canvas = document.getElementById('pongCanvas');
    var ctx = canvas.getContext('2d');
    // … your paddle/ball & loop code …
}
// 4) Define your routes
var routes = {
    home: {
        render: homeView,
        init: function () {
            console.log("route is working");
            var btn = document.getElementById('playbutton');
            if (!btn)
                return;
            btn.addEventListener('click', function () {
                // Change the hash to "#pong", which triggers the router
                location.hash = 'pong';
            });
        }
    },
    pong: {
        render: pongView,
        init: startPong
    }
};
// 5) The router
function router() {
    var _a;
    var name = location.hash.slice(1) || 'home';
    var route = routes[name] || routes.home;
    // Inject the HTML
    var appEl = document.getElementById('app');
    appEl.innerHTML = route.render();
    // Call the init (attach button handlers or start game)
    (_a = route.init) === null || _a === void 0 ? void 0 : _a.call(route);
}
// 6) Listen for hash changes and initial load
window.addEventListener('hashchange', router);
window.addEventListener('load', router);
