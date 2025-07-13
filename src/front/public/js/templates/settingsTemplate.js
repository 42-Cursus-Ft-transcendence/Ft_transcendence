export const settingsTemplate = `
<div class="w-full h-full flex flex-col items-center justify-center p-6  bg-black/70 backdrop-blur-sm rounded-[40px] shadow-neon font-arcade text-green-400 relative">
  <button
      id="backBtn"
      class="absolute top-3 right-6 text-pink-400 hover:text-pink-200 text-2xl"
    >&times;</button>

  <!-- Onglets -->
  <div class="border-b border-pink-500 mb-6 w-full">
    <nav class="flex space-x-4 justify-center" aria-label="Tabs">
      <button data-tab="account" class="tab-btn py-2 px-4 text-blue-300 border-b-2 border-transparent hover:text-blue-200 transition-colors">
        Account
      </button>
      <button data-tab="gameplay" class="tab-btn py-2 px-4 text-blue-300 border-b-2 border-transparent hover:text-blue-200 transition-colors">
        Gameplay
      </button>
      <button data-tab="security" class="tab-btn py-2 px-4 text-blue-300 border-b-2 border-transparent hover:text-blue-200 transition-colors">
        Security
      </button>
    </nav>
  </div>

  <div id="settings-content" class="w-full flex-1 flex items-center justify-center">
    <!-- ACCOUNT -->
    <div id="tab-account" class="tab-content hidden w-full max-w-lg">
      <form id="form-account" class="w-3/5 mx-auto space-y-6">
        <!-- Photo de profil -->
        <div class="flex flex-col items-center">
          <img id="profile-img" src="./assets/lucian.webp" alt="Avatar" class="w-24 h-24 rounded-full border-2 border-pink-500 mb-2"/>
          <button type="button" id="change-photo-btn" class="text-sm text-pink-400 underline">Change Photo</button>
        </div>
        <!-- Username -->
        <div>
          <label class="block mb-1">Username</label>
          <input type="text" id="username-input" name="username" value="CurrentName" class="w-full  px-4 py-2  bg-black/30 placeholder-green-600
               text-green-400 outline-none
               border border-pink-500
               rounded-lg
               focus:border-blue-400
               transition"/>
        </div>
        <!-- Email -->
        <div>
          <label class="block mb-1">Email</label>
          <input type="email" id="email-input" name="email" value="user@example.com" class="w-full  px-4 py-2  bg-black/30 placeholder-green-600
               text-green-400 outline-none
               border border-pink-500
               rounded-lg
               focus:border-blue-400
               transition"/>
        </div>
        <!-- Save -->
        <div class="text-center">
          <button type="submit" class="threeD-button-set">Save</button>
        </div>
      </form>
    </div>

    <!-- GAMEPLAY -->
    <div id="tab-gameplay" class="tab-content hidden space-y-4">
      <h2 class="text-xl text-pink-400">Gameplay Settings</h2>
      <form id="form-gameplay" class="space-y-4">
        <div class="flex items-center justify-between">
          <label>Game Difficulty</label>
          <select name="difficulty" class="bg-black/50 border border-pink-500 rounded p-2">
            <option>Easy</option>
            <option selected>Normal</option>
            <option>Hard</option>
          </select>
        </div>
        <div class="flex items-center justify-between">
          <label>Aim Assist</label>
          <select name="aimAssist" class="bg-black/50 border border-pink-500 rounded p-2">
            <option>Off</option>
            <option selected>Standard</option>
            <option>Strong</option>
          </select>
        </div>
        <div class="flex items-center justify-between">
          <label>Snap to Target</label>
          <input type="checkbox" name="snapToTarget" class="h-5 w-5 text-pink-500 focus:ring-pink-400"/>
        </div>
        <button type="submit" class="threeD-button-set">
          Save Gameplay
        </button>
      </form>
    </div>

    <!-- SECURITY -->
    <div id="tab-security" class="tab-content hidden space-y-4">
      <h2 class="text-xl text-pink-400">Security Settings</h2>
      <form id="form-security" class="space-y-4">
        <div>
          <label class="block mb-1">Current Password</label>
          <input type="password" name="currentPassword"
                 class="w-full bg-black/50 border border-pink-500 rounded p-2"/>
        </div>
        <div>
          <label class="block mb-1">New Password</label>
          <input type="password" name="newPassword"
                 class="w-full bg-black/50 border border-pink-500 rounded p-2"/>
        </div>
        <div class="flex items-center justify-between">
          <label>Two-Factor Auth</label>
          <input type="checkbox" name="twoFactor" class="h-5 w-5 text-pink-500"/>
        </div>
        <button type="submit" class="threeD-button-set"> Save Security </button>
      </form>
    </div>
  </div>
</div>
`;
//# sourceMappingURL=settingsTemplate.js.map