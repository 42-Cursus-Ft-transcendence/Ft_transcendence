// src/front/tailwind.config.js
module.exports = {
  content: [
    // Où Tailwind va chercher les classes à inclure
    './public/**/*.html',
    './public/**/*.js'
  ],
  theme: {
    extend: {
      // Palette rétro minimaliste : verts et noirs arcade
      colors: {
        background: '#080808',
        primary: '#00FF00',
        accent:  '#FFD700'
      },
      fontFamily: {
        // Police monospaced style arcade
        arcade: ['"Press Start 2P"', 'monospace']
      },
      // On peut ajouter d'autres extensions (shadows, spacing…) ici
    }
  },
  plugins: []
};
