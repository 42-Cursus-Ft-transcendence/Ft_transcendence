export const settingsTemplate = `
<div class="w-full h-full flex flex-col items-center p-6 bg-black/70 backdrop-blur-sm rounded-[40px] shadow-neon font-arcade text-green-400 relative">
  <!-- Back Button -->
  <button id="backBtn" class="absolute top-3 right-6 text-pink-400 hover:text-pink-200 text-2xl">&times;</button>

  <!-- Onglets (fixes en haut) -->
  <div class="sticky top-0 w-full  z-10 border-b border-pink-500">
    <nav class="flex space-x-4 justify-center py-2" aria-label="Tabs">
      <button data-tab="account" class="tab-btn py-2 px-4 text-blue-300 border-b-2 border-transparent hover:text-blue-200 transition-colors hover:cursor-pointer">
        Account
      </button>
      <button data-tab="gameplay" class="tab-btn py-2 px-4 text-blue-300 border-b-2 border-transparent hover:text-blue-200 transition-colors hover:cursor-pointer">
        Gameplay
      </button>
      <button data-tab="security" class="tab-btn py-2 px-4 text-blue-300 border-b-2 border-transparent hover:text-blue-200 transition-colors hover:cursor-pointer">
        Security
      </button>
    </nav>
  </div>

  <!-- Contenu scrollable -->
  <div id="settings-content" class="w-full flex-1 overflow-y-auto py-4 scrollbar-thin scrollbar-thumb-pink-500 scrollbar-track-transparent hover:scrollbar-thumb-pink-600">
    <!-- ACCOUNT -->
    <div id="tab-account" class="tab-content hidden w-full max-w-lg mx-auto space-y-6">
      <form id="form-account" class="w-full space-y-6">
        <div class="flex flex-col items-center">
          <!-- Modal Selector -->
          <div id="avatar-selector" class="hidden fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-20">
            <div class="p-4 rounded-lg grid grid-cols-4 gap-4">
              <!-- Loop over assets/icons in build -->
              <img class="avatar-option w-16 h-16 rounded-full border-2 border-pink-500 cursor-pointer" data-src="assets/icone/Garen_Border.webp" src="/assets/icone/Garen_Border.webp" />
              <img class="avatar-option w-16 h-16 rounded-full border-2 border-pink-500 cursor-pointer" data-src="assets/icone/Garen.webp" src="assets/icone/Garen.webp" />
              <img class="avatar-option w-16 h-16 rounded-full border-2 border-pink-500 cursor-pointer" data-src="assets/icone/Lucian_Border.webp" src="assets/icone/Lucian_Border.webp" />
              <img class="avatar-option w-16 h-16 rounded-full border-2 border-pink-500 cursor-pointer" data-src="assets/icone/Lucian.webp" src="assets/icone/Lucian.webp" />
              <img class="avatar-option w-16 h-16 rounded-full border-2 border-pink-500 cursor-pointer" data-src="assets/icone/Demacia_Vice.webp" src="assets/icone/Demacia_Vice.webp" />
              <img class="avatar-option w-16 h-16 rounded-full border-2 border-pink-500 cursor-pointer" data-src="assets/icone/Legendary_Handshake.webp" src="assets/icone/Legendary_Handshake.webp" />
              <!-- ... other icons ... -->
              <!-- Import option -->
              <div id="avatar-import" class="w-16 h-16 flex items-center justify-center border-2 border-dashed border-pink-500 rounded-full cursor-pointer">
                <img class="avatar-option w-12 h-12 cursor-pointer" data-src="assets/icone/Legendary_Handshake.webp" src="assets/icone/import-arrow.svg" />
              </div>
            </div>
          </div>
          <img id="profile-img" src="assets/icone/Lucian.webp" alt="Avatar" class="w-24 h-24 rounded-full border-2 border-pink-500 mb-2 cursor-pointer" />
        </div>
        <div>
          <label class="block mb-1">Username</label>
          <input type="text" id="username-input" name="username" class="w-full px-4 py-2 bg-black/30 placeholder-green-600 text-green-400 outline-none border border-pink-500 rounded-lg focus:border-blue-400 transition" />
          <p id="error-username" class="text-red-500 text-sm hidden"></p>
        </div>
        <div>
          <label class="block mb-1">Email</label>
          <input type="email" id="email-input" name="email" class="w-full px-4 py-2 bg-black/30 placeholder-green-600 text-green-400 outline-none border border-pink-500 rounded-lg focus:border-blue-400 transition" />
          <p id="error-email" class="text-red-500 text-sm hidden"></p>
        </div>
        <div class="text-center">
          <button type="submit" id="accountSubmitBtn" class="threeD-button-set">
            <span id="accountSubmitText">Save</span>
          </button>
        </div>
        <input id="avatar-file-input" type="file" accept="image/*" class="hidden" />
      </form>
    </div>

    <!-- GAMEPLAY -->
    <div id="tab-gameplay" class="tab-content hidden w-full max-w-lg mx-auto space-y-6">
  <form id="form-gameplay" class="w-full space-y-4">
    <!-- AI Difficulty & Assist -->
    <div class="flex items-center justify-between">
      <label>AI Difficulty</label>
      <select name="difficulty" class="bg-black/50 border border-pink-500 rounded p-2">
        <option>Easy</option>
        <option selected>Normal</option>
        <option>Hard</option>
      </select>
    </div>

    <!-- VISUAL SETTINGS -->
    <div class="flex items-center justify-between">
          <label>Color Theme</label>
          <select name="colorTheme" class="bg-black/50 border border-pink-500 rounded p-2">
            <option>Vaporwave</option>
            <option>Cyberpunk</option>
            <option>Retro</option>
            <option>Monochrome</option>
          </select>
        </div>
        <div class="flex items-center justify-between">
          <label>Ball Color</label>
          <input type="color" name="ballColor" value="#ff00aa" class="h-8 w-12 p-0 border-0 bg-transparent" />
        </div>
        <div class="flex items-center justify-between">
          <label>Paddle Color</label>
          <input type="color" name="paddleColor" value="#00f0ff" class="h-8 w-12 p-0 border-0 bg-transparent" />
        </div>
        <div class="flex items-center justify-between">
          <label>Glow Intensity</label>
          <input type="range" name="glowIntensity" min="0" max="20" value="10" class="w-1/2" />
        </div>
        <div class="flex items-center justify-between">
          <label>Trail Length</label>
          <input type="range" name="trailLength" min="0" max="30" value="0" class="w-1/2" />
        </div>
        <div class="flex items-center justify-between">
          <label>Background Color</label>
          <input type="color" name="bgColor" value="#000000" class="h-8 w-12 p-0 border-0 bg-transparent" />
        </div>
        <div class="flex items-center justify-between">
          <label>Background Opacity</label>
          <input type="range" name="bgOpacity" min="0" max="100" value="70" class="w-1/2" />
        </div>

        <!-- CONTROL KEYBINDS -->
        <div class="flex items-center justify-between">
          <label>P1 Up Key</label>
          <input id="p1UpKey" name="p1UpKey" readonly
                 placeholder="Press a key"
                 class="w-24 bg-black/50 border border-pink-500 rounded p-2 text-center cursor-pointer" />
        </div>
        <div class="flex items-center justify-between">
          <label>P1 Down Key</label>
          <input id="p1DownKey" name="p1DownKey" readonly
                 placeholder="Press a key"
                 class="w-24 bg-black/50 border border-pink-500 rounded p-2 text-center cursor-pointer" />
        </div>
        <div class="flex items-center justify-between">
          <label>P2 Up Key</label>
          <input id="p2UpKey" name="p2UpKey" readonly
                 placeholder="Press a key"
                 class="w-24 bg-black/50 border border-pink-500 rounded p-2 text-center cursor-pointer" />
        </div>
        <div class="flex items-center justify-between">
          <label>P2 Down Key</label>
          <input id="p2DownKey" name="p2DownKey" readonly
                 placeholder="Press a key"
                 class="w-24 bg-black/50 border border-pink-500 rounded p-2 text-center cursor-pointer" />
        </div>

        <!-- Save -->
        <div class="text-center">
          <button type="submit" class="threeD-button-set">Save Gameplay</button>
        </div>
      </form>
    </div>

    <!-- SECURITY -->
    <div id="tab-security" class="tab-content hidden w-full max-w-lg mx-auto space-y-6">
      <form id="form-security" class="w-full space-y-4">
        <div>
          <label class="block mb-1">Current Password</label>
          <input type="password" name="currentPassword"
            class="w-full px-4 py-2 bg-black/30 placeholder-green-600 text-green-400 outline-none border border-pink-500 rounded-lg focus:border-blue-400 transition" />
          <p id="error-current" class="text-red-500 text-sm hidden"></p>
        </div>
        <div>
          <label class="block mb-1">New Password</label>
          <input type="password" name="newPassword"
            class="w-full px-4 py-2 bg-black/30 placeholder-green-600 text-green-400 outline-none border border-pink-500 rounded-lg focus:border-blue-400 transition" />
          <p id="error-new" class="text-red-500 text-sm hidden"></p>
        </div>
        <div class="flex items-center justify-between">
          <label>Two-Factor Auth</label>
          <input type="checkbox" name="twoFactor" class="h-5 w-5 text-pink-500" />
        </div>
        <div class="text-center">
          <button type="submit" id="securitySubmitBtn" class="threeD-button-set">
            <span id="securitySubmitText">Save Security</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</div>
`;
