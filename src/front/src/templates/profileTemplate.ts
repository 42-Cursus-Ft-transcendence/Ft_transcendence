export const profileTemplate = `
<div class="w-full h-full flex flex-col items-center p-6 bg-black/70 backdrop-blur-sm rounded-[40px] shadow-neon font-arcade text-green-400 relative">
  <!-- Back Button -->
  <button type="button" id="backBtn" class="absolute top-3 right-6 text-pink-400 hover:text-pink-200 text-2xl">&times;</button>

  <!-- Navigation Tabs -->
  <div class="sticky top-0 w-full z-10 border-b border-pink-500">
    <nav class="flex space-x-4 justify-center py-2" aria-label="Profile Tabs">
      <button type="button" data-tab="profile" class="tab-btn py-2 px-4 text-blue-300 border-b-2 border-transparent hover:text-blue-200 transition-colors hover:cursor-pointer">
        Profile
      </button>
      <button type="button" data-tab="history" class="tab-btn py-2 px-4 text-blue-300 border-b-2 border-transparent hover:text-blue-200 transition-colors hover:cursor-pointer">
        History
      </button>
      <button type="button" data-tab="ranking" class="tab-btn py-2 px-4 text-blue-300 border-b-2 border-transparent hover:text-blue-200 transition-colors hover:cursor-pointer">
        Ranking
      </button>
    </nav>
  </div>

  <!-- Content Container -->
  <div id="profile-content" class="w-full flex-1 overflow-y-auto py-4 scrollbar-thin scrollbar-thumb-pink-500 scrollbar-track-transparent hover:scrollbar-thumb-pink-600">
    
    <!-- PROFILE TAB -->
    <div id="tab-profile" class="tab-content hidden w-full max-w-md mx-auto">
      <div class="bg-gradient-to-br from-green-900/30 to-blue-900/30 backdrop-blur-sm border border-green-500/50 rounded-3xl p-6 shadow-neon">
        <!-- Profile Header -->
        <div class="flex flex-col items-center mb-6">
          <div class="relative mb-4">
            <img id="profile-avatar" src="assets/icone/Lucian.webp" alt="Avatar" 
                 class="w-24 h-24 rounded-full border-4 border-yellow-400 shadow-lg shadow-yellow-400/50" />
          </div>
          <h2 id="profile-username" class="text-2xl font-bold text-white mb-1">Loading...</h2>
          <p id="profile-realname" class="text-gray-400 text-sm">Loading...</p>
        </div>

        <!-- ELO Progress -->
        <div class="mb-6">
          <div class="flex justify-between items-center mb-2">
            <span class="text-sm text-gray-300">ELO Rating</span>
            <span class="text-sm text-gray-300"><span id="profile-elo">0</span></span>
          </div>
          <div class="w-full bg-gray-700 rounded-full h-3">
            <div id="profile-elo-bar" class="bg-gradient-to-r from-yellow-500 to-orange-500 h-3 rounded-full transition-all duration-500" style="width: 0%"></div>
          </div>
          <div class="flex justify-between text-xs text-gray-400 mt-1">
            <span>Bronze</span>
            <span>Silver</span>
            <span>Gold</span>
          </div>
        </div>

        <!-- Stats Grid -->
        <div class="grid grid-cols-2 gap-4">
          <div class="bg-black/30 rounded-2xl p-4 text-center border border-green-500/30">
            <div id="profile-wins" class="text-3xl font-bold text-green-400 mb-1">0</div>
            <div class="text-gray-400 text-sm">Wins</div>
          </div>
          <div class="bg-black/30 rounded-2xl p-4 text-center border border-red-500/30">
            <div id="profile-losses" class="text-3xl font-bold text-red-400 mb-1">0</div>
            <div class="text-gray-400 text-sm">Losses</div>
          </div>
        </div>

        <!-- Win Rate -->
        <div class="mt-4 text-center">
          <div class="text-lg font-bold text-yellow-400">
            Win Rate: <span id="profile-winrate">0%</span>
          </div>
        </div>
      </div>
    </div>

    <!-- HISTORY TAB -->
    <div id="tab-history" class="tab-content hidden w-full max-w-2xl mx-auto">
      <div class="space-y-4">
        <h3 class="text-xl font-bold text-center text-pink-500 mb-6">Match History</h3>
        
        <div id="match-history" class="space-y-3">
          <!-- Match items will be dynamically inserted here -->
          <div class="text-center text-gray-400 py-8">Loading match history...</div>
        </div>
      </div>
    </div>

    <!-- RANKING TAB -->
    <div id="tab-ranking" class="tab-content hidden w-full max-w-2xl mx-auto">
      <div class="space-y-4">
        <h3 class="text-xl font-bold text-center text-pink-500 mb-6">Global Ranking</h3>
        
        <div id="leaderboard" class="space-y-2">
          <!-- Leaderboard items will be dynamically inserted here -->
          <div class="text-center text-gray-400 py-8">Loading leaderboard...</div>
        </div>
      </div>
    </div>

  </div>
</div>
`;