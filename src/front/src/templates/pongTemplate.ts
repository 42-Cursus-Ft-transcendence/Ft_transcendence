export const pongTemplate = `
<div class="flex flex-col items-center">

  <!-- Conteneur scoreboard + labels, même largeur que le canvas (500px) -->
  <div class="flex items-center justify-between w-[500px] mb-4">
    <span id="player1Label" class="font-arcade text-accent">Player 1</span>
    <div id="scoreboard" class="text-white text-2xl font-arcade">
      <span id="scoreText">0 – 0</span>
    </div>
    <span id="player2Label" class="font-arcade text-accent">Player 2</span>
  </div>

  <!-- Canvas central -->
  <canvas
    id="pongCanvas"
    width="500"
    height="300"
    class="block bg-black/70"
  ></canvas>

  <!-- Bouton Back -->
  <button
    id="backBtn"
    class="threeD-button-set mt-4"
  >Back</button>
</div>
`