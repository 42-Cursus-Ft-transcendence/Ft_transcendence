export const settingsTemplate = `
<div class="w-full h-full flex flex-col items-center p-6 bg-black/70 backdrop-blur-sm rounded-[40px] shadow-neon font-arcade text-green-400 relative">
  <!-- Back Button -->
  <button type="button" id="backBtn" class="absolute top-3 right-6 text-pink-400 hover:text-pink-200 text-2xl">&times;</button>

  <!-- Onglets (fixes en haut) -->
  <div class="sticky top-0 w-full  z-10 border-b border-pink-500">
    <nav class="flex space-x-4 justify-center py-2" aria-label="Tabs">
      <button type="button" data-tab="account" class="tab-btn py-2 px-4 text-blue-300 border-b-2 border-transparent hover:text-blue-200 transition-colors hover:cursor-pointer">
        Account
      </button>
      <button type="button" data-tab="gameplay" class="tab-btn py-2 px-4 text-blue-300 border-b-2 border-transparent hover:text-blue-200 transition-colors hover:cursor-pointer">
        Gameplay
      </button>
      <button type="button" data-tab="security" class="tab-btn py-2 px-4 text-blue-300 border-b-2 border-transparent hover:text-blue-200 transition-colors hover:cursor-pointer">
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
          <!-- Avatar Selector Modal -->
          <div id="avatar-selector" class="hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-md animate-fadeIn">
            <div class="flex items-center justify-center w-full h-full">
              <div class="bg-black/70 backdrop-blur-sm border border-pink-500 rounded-lg shadow-neon w-full max-w-md p-6 space-y-4 animate-scaleIn">
                <div class="flex justify-between items-center">
                  <h2 class="text-lg font-semibold text-pink-500">Choose Avatar</h2>
                  <button type="button" id="avatar-close" class="text-pink-400 hover:text-pink-200 text-2xl transition-colors">&times;</button>
                </div>
                
                <div class="text-center space-y-4">
                  <div class="grid grid-cols-4 gap-3">
                    <!-- Predefined avatars -->
                    <img class="avatar-option w-16 h-16 rounded-full border-2 border-pink-500/50 hover:border-pink-500 cursor-pointer transition-colors" 
                         data-src="assets/icone/Garen_Border.webp" src="/assets/icone/Garen_Border.webp" />
                    <img class="avatar-option w-16 h-16 rounded-full border-2 border-pink-500/50 hover:border-pink-500 cursor-pointer transition-colors" 
                         data-src="assets/icone/Garen.webp" src="assets/icone/Garen.webp" />
                    <img class="avatar-option w-16 h-16 rounded-full border-2 border-pink-500/50 hover:border-pink-500 cursor-pointer transition-colors" 
                         data-src="assets/icone/Lucian_Border.webp" src="assets/icone/Lucian_Border.webp" />
                    <img class="avatar-option w-16 h-16 rounded-full border-2 border-pink-500/50 hover:border-pink-500 cursor-pointer transition-colors" 
                         data-src="assets/icone/Lucian.webp" src="assets/icone/Lucian.webp" />
                    <img class="avatar-option w-16 h-16 rounded-full border-2 border-pink-500/50 hover:border-pink-500 cursor-pointer transition-colors" 
                         data-src="assets/icone/Demacia_Vice.webp" src="assets/icone/Demacia_Vice.webp" />
                    <img class="avatar-option w-16 h-16 rounded-full border-2 border-pink-500/50 hover:border-pink-500 cursor-pointer transition-colors" 
                         data-src="assets/icone/Legendary_Handshake.webp" src="assets/icone/Legendary_Handshake.webp" />
                    
                    <!-- Upload custom avatar -->
                    <div id="avatar-import" class="w-16 h-16 flex items-center justify-center border-2 border-dashed border-pink-500/50 hover:border-pink-500 rounded-full cursor-pointer transition-colors bg-black/30 hover:bg-black/50">
                      <i class="bx bx-arrow-in-down-square-half text-pink-500 text-2xl"></i>
                    </div>
                  </div>
                </div>
                
                <div class="min-h-[20px] flex items-center justify-center">
                  <p id="error-avatar-modal" class="text-red-500 text-xs text-center hidden"></p>
                </div>
              </div>
            </div>
          </div>
          <img id="profile-img" src="assets/icone/Lucian.webp" alt="Avatar" class="w-24 h-24 rounded-full border-2 border-pink-500 mb-2 cursor-pointer" />
        </div>
        <div>
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <i class='bx bx-user text-pink-500'></i> 
            </div>
            <input type="text" id="username-input" name="username" placeholder="Username" class="w-full pl-10 pr-4 py-3
                   bg-black/30 placeholder-blue-300
                   text-green-400 outline-none
                   border border-pink-500/30
                   rounded-lg
                   focus:border-pink-500
                   transition" />
          </div>
          <p id="error-username" class="text-red-500 text-xs mt-1 hidden"></p>
        </div>
        <div>
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <i class='bx bx-envelope text-pink-500'></i> 
            </div>
            <input type="email" id="email-input" name="email" placeholder="Email Address" class="w-full pl-10 pr-4 py-3
                   bg-black/30 placeholder-blue-300
                   text-green-400 outline-none
                   border border-pink-500/30
                   rounded-lg
                   focus:border-pink-500
                   transition" />
          </div>
          <p id="error-email" class="text-red-500 text-xs mt-1 hidden"></p>
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
          <input id="p1UpKey" name="p1UpKey" data-key="Player 1 Up" readonly
                 placeholder="Click to set"
                 class="keybind-input w-24 bg-black/50 border border-pink-500 rounded p-2 text-center cursor-pointer hover:border-yellow-400" />
        </div>
        <div class="flex items-center justify-between">
          <label>P1 Down Key</label>
          <input id="p1DownKey" name="p1DownKey" data-key="Player 1 Down" readonly
                 placeholder="Click to set"
                 class="keybind-input w-24 bg-black/50 border border-pink-500 rounded p-2 text-center cursor-pointer hover:border-yellow-400" />
        </div>
        <div class="flex items-center justify-between">
          <label>P2 Up Key</label>
          <input id="p2UpKey" name="p2UpKey" data-key="Player 2 Up" readonly
                 placeholder="Click to set"
                 class="keybind-input w-24 bg-black/50 border border-pink-500 rounded p-2 text-center cursor-pointer hover:border-yellow-400" />
        </div>
        <div class="flex items-center justify-between">
          <label>P2 Down Key</label>
          <input id="p2DownKey" name="p2DownKey" data-key="Player 2 Down" readonly
                 placeholder="Click to set"
                 class="keybind-input w-24 bg-black/50 border border-pink-500 rounded p-2 text-center cursor-pointer hover:border-yellow-400" />
        </div>

        <!-- Save -->
        <div class="text-center">
          <button type="submit" class="threeD-button-set">Save Gameplay</button>
        </div>
      </form>
    </div>

    <!-- SECURITY -->
    <div id="tab-security" class="tab-content hidden w-full max-w-lg mx-auto space-y-6">
      <!-- Boutons de choix -->
      <div class="flex justify-center space-x-4 mb-6">
        <button type="button" id="btn-change-password" class="threeD-button-set">Change Password</button>
        <button type="button" id="btn-change-2fa" class="threeD-button-set">Toggle 2FA</button>
      </div>

      <!-- Formulaire mot de passe -->
      <form id="form-password" class="space-y-4 hidden">
        <div>
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <i class='bx bx-lock text-pink-500'></i> 
            </div>
            <input type="password" name="currentPassword" placeholder="Current Password" class="w-full pl-10 pr-12 py-3
                   bg-black/30 placeholder-blue-300
                   text-green-400 outline-none
                   border border-pink-500/30
                   rounded-lg
                   focus:border-pink-500
                   transition" />
            <div class="absolute inset-y-0 right-0 pr-3 flex items-center">
              <i class="bx bx-eye-slash text-blue-300 cursor-pointer hover:text-pink-400 transition"></i>
            </div>
          </div>
          <p id="error-current-pw" class="text-red-500 text-xs mt-1 hidden"></p>
        </div>
        <div>
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <i class='bx bx-lock text-pink-500'></i> 
            </div>
            <input type="password" name="newPassword" placeholder="New Password" class="w-full pl-10 pr-12 py-3
                   bg-black/30 placeholder-blue-300
                   text-green-400 outline-none
                   border border-pink-500/30
                   rounded-lg
                   focus:border-pink-500
                   transition" />
            <div class="absolute inset-y-0 right-0 pr-3 flex items-center">
              <i class="bx bx-eye-slash text-blue-300 cursor-pointer hover:text-pink-400 transition"></i>
            </div>
          </div>
          <p id="error-new-pw" class="text-red-500 text-xs mt-1 hidden"></p>
        </div>
        <div>
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <i class='bx bx-lock text-pink-500'></i> 
            </div>
            <input type="password" name="confirmPassword" placeholder="Confirm New Password" class="w-full pl-10 pr-12 py-3
                   bg-black/30 placeholder-blue-300
                   text-green-400 outline-none
                   border border-pink-500/30
                   rounded-lg
                   focus:border-pink-500
                   transition" />
            <div class="absolute inset-y-0 right-0 pr-3 flex items-center">
              <i class="bx bx-eye-slash text-blue-300 cursor-pointer hover:text-pink-400 transition"></i>
            </div>
          </div>
          <p id="error-confirm-pw" class="text-red-500 text-xs mt-1 hidden"></p>
        </div>
        <div class="text-center">
          <button type="submit" id="passwordSubmitBtn" class="threeD-button-set">
            <span id="passwordSubmitText">Save Password</span>
          </button>
        </div>
      </form>

      <!-- Formulaire 2FA -->
      <form id="form-2fa" class="space-y-4 hidden">
        <div>
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <i class='bx bx-lock text-pink-500'></i> 
            </div>
            <input type="password" name="currentPassword" placeholder="Current Password" class="w-full pl-10 pr-12 py-3
                   bg-black/30 placeholder-blue-300
                   text-green-400 outline-none
                   border border-pink-500/30
                   rounded-lg
                   focus:border-pink-500
                   transition" />
            <div class="absolute inset-y-0 right-0 pr-3 flex items-center">
              <i class="bx bx-eye-slash text-blue-300 cursor-pointer hover:text-pink-400 transition"></i>
            </div>
          </div>
          <p id="error-current-2fa" class="text-red-500 text-xs mt-1 hidden"></p>
        </div>
        <div class="flex items-center space-x-2">
          <input type="checkbox" name="twoFactor" id="twoFactorCheckbox" class="h-5 w-5" />
          <label for="twoFactorCheckbox">Enable Two‑Factor Auth</label>
        </div>
        <div class="text-center">
          <button type="submit" id="twoSubmitBtn" class="threeD-button-set">
            <span id="twofaSubmitText">Save 2FA</span>
          </button>
        </div>
      </form>
    </div>
    <div id="twofa-modal" class="hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-md">
      <div class="flex items-center justify-center w-full h-full">
        <div class="bg-black/60 backdrop-blur-sm border border-pink-500 rounded-lg shadow-neon w-full max-w-sm p-4 space-y-3">
      <div class="flex justify-between items-center">
        <h2 class="text-sm font-semibold text-pink-400">Enable 2FA</h2>
        <button type="button" id="twofa-close" class="absolute top-2 right-2 text-pink-400 hover:text-pink-200 text-2xl">&times;</button>
      </div>
      <ol class="list-decimal list-inside text-green-400 space-y-2 text-xs">
        <li>
          <span class="text-xs font-medium">Download app</span>
          <p class="text-xs text-gray-400 ml-9" style="font-size: 7px;">Download a mobile authentication app.</p>
        </li>
        <li>
          <span class="text-xs font-medium">Scan QR Code</span>
          <p class="text-xs text-gray-400 ml-9" style="font-size: 7px;">Scan this QR code using your authenticator app.</p>
          <div class="flex justify-center mt-1">
            <img id="twofa-qr" src="" alt="QR Code"
                 class="w-24 h-24 border border-pink-500 rounded shadow-neon" />
          </div>
        </li>
        <li>
          <span class="text-xs font-medium">Enter Code</span>
          <p class="text-xs text-gray-400 ml-9" style="font-size: 7px;">Enter the 6‑digit verification code:</p>
          <div class="flex justify-center space-x-1 my-3">
            <input type="text" maxlength="1"
                   class="w-8 h-8 text-xs text-center bg-black/50 border border-pink-500 rounded focus:border-blue-400 outline-none text-green-400 shadow-inner" />
            <input type="text" maxlength="1"
                   class="w-8 h-8 text-xs text-center bg-black/50 border border-pink-500 rounded focus:border-blue-400 outline-none text-green-400 shadow-inner" />
            <input type="text" maxlength="1"
                   class="w-8 h-8 text-xs text-center bg-black/50 border border-pink-500 rounded focus:border-blue-400 outline-none text-green-400 shadow-inner" />
            <input type="text" maxlength="1"
                   class="w-8 h-8 text-xs text-center bg-black/50 border border-pink-500 rounded focus:border-blue-400 outline-none text-green-400 shadow-inner" />
            <input type="text" maxlength="1"
                   class="w-8 h-8 text-xs text-center bg-black/50 border border-pink-500 rounded focus:border-blue-400 outline-none text-green-400 shadow-inner" />
            <input type="text" maxlength="1"
                   class="w-8 h-8 text-xs text-center bg-black/50 border border-pink-500 rounded focus:border-blue-400 outline-none text-green-400 shadow-inner" />
          </div>
        </li>
      </ol>
      <div class="min-h-[20px] flex items-center justify-center">
        <p id="error-2fa-modal" class="text-red-500 text-xs text-center hidden"></p>
      </div>
      </div>
    </div>
  </div>

  <!-- Keybind Capture Modal -->
  <div id="keybind-modal" class="hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-md animate-fadeIn">
    <div class="flex items-center justify-center w-full h-full">
      <div class="bg-black/70 backdrop-blur-sm border border-pink-500 rounded-lg shadow-neon w-full max-w-sm p-6 space-y-4 animate-scaleIn">
        <div class="flex justify-end">
          <button type="button" id="keybind-close" class="text-pink-400 hover:text-pink-200 text-2xl transition-colors">&times;</button>
        </div>
        
        <div class="text-center space-y-4">
          <div class="flex flex-col items-center space-y-2">
            <i class="bx bx-keyboard text-pink-500 text-4xl"></i>
            <p class="text-blue-300 text-sm">Setting keybind for:</p>
            <p id="keybind-target" class="text-pink-500 font-semibold"></p>
          </div>
          
          <div class="bg-black/50 border-2 border-pink-500 rounded-lg p-4 min-h-[60px] flex items-center justify-center">
            <p id="keybind-display" class="text-green-400 text-xl">Press any key</p>
          </div>
          
          <div class="space-y-2">
            <p class="text-blue-300 text-xs">Press the key you want to assign</p>
          </div>
        </div>
        
        <div class="flex justify-center">
          <button id="keybind-confirm" class="threeD-button-set">
            Confirm
          </button>
        </div>
        
        <div class="min-h-[20px] flex items-center justify-center">
          <p id="error-keybind-modal" class="text-red-500 text-xs text-center hidden"></p>
        </div>
      </div>
    </div>
  </div>
</div>
`;
//# sourceMappingURL=settingsTemplate.js.map