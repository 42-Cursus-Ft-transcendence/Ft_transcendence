export const arcadeTemplate = `
<div class="relative zoomable inline-block">
  <!-- Image in foreground, ignore pointer events -->
  <img
    src="./assets/arcademachine.png"
    alt="borne arcade"
    class="relative z-10 filter brightness-100 hover:brightness-75 transition pointer-events-none"
  />

  <!-- Interactive div under the image -->
  <div
    id="app"
    class="absolute inset-0 z-0 top-[34%] left-[20.9%] w-[58.4%] h-[37%]
           flex items-center justify-center font-arcade
           bg-[url('./assets/bg-machine.gif')] bg-cover bg-center pointer-events-auto"
  ></div>
</div>
`;
