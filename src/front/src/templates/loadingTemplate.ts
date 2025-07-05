export const waitingTemplate = `
<div class="relative w-[300px] h-[200px] rounded-xl animated-border overflow-hidden">
  <div class="absolute inset-0 bg-black/60 backdrop-blur-md text-green-300 font-arcade flex flex-col items-center justify-center p-4">
    <!-- Close button as a cross -->
    <button
      id="backBtn"
      class="absolute top-2 right-2 text-pink-400 hover:text-pink-200 text-2xl"
    >&times;</button>

    <!-- Message -->
    <p class="text-xs text-pink-400 mb-4 drop-shadow-lg text-center">
      Searching for another player…
    </p>

    <!-- Loader centered -->
    <div class="loader"></div>
  </div>
</div>
`;
