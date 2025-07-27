export const error404Template = `
  <div
    class="relative inline-block mx-auto h-screen overflow-visible z-60
           transform scale-[1.6] origin-center animate-zoom-in"
  >
    <!-- Arcade Machine Frame -->
    <img
      src="./assets/broken_arcademachine.png"
      alt="Broken Arcade Machine"
      class="relative z-0 filter brightness-100 pointer-events-none"
    />

    <!-- Game Screen: 404 + page error -->
    <div
      id="error-screen"
      class="absolute inset-0 z-10 top-[34%] left-[20.9%]
             w-[58.4%] h-[37%] flex flex-col items-center justify-center
             font-arcade text-green-300 pointer-events-auto"
    >
    <h1 
        class="text-6xl animate-flicker animate-text-glitch"
        data-text="404"
      >404</h1>
      <p class="glitch animate-glitch" data-text="page error">page error</p>
      <button
        class="mt-4 px-4 py-2 bg-green-300 text-black font-bold rounded-lg
               hover:bg-green-400 focus:outline-none focus:ring-2 focus:ring-green-500"
        onclick="history.back()"
      >
        Go Back
      </button>
    </div>
  </div>
`;
//# sourceMappingURL=error404Template.js.map