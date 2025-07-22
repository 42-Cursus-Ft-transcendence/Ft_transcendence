export const profileTemplate = `
<div class="w-full h-full flex flex-col items-center p-6 bg-black/70 backdrop-blur-sm rounded-[40px] shadow-neon font-arcade text-green-400 relative">
  <!-- Back Button -->
  <button type="button" id="backBtn" class="absolute top-3 right-6 text-pink-400 hover:text-purple-300 text-2xl transition-colors">&times;</button>

  <!-- Navigation Tabs -->
  <div class="sticky top-0 w-full z-10 border-b border-pink-500">
    <nav class="flex space-x-4 justify-center py-2" aria-label="Profile Tabs">
      <button type="button" data-tab="profile" class="tab-btn py-2 px-4 text-cyan-300 border-b-2 border-transparent hover:text-pink-400 hover:border-pink-400 transition-all hover:cursor-pointer">
        Profile
      </button>
      <button type="button" data-tab="history" class="tab-btn py-2 px-4 text-cyan-300 border-b-2 border-transparent hover:text-pink-400 hover:border-pink-400 transition-all hover:cursor-pointer">
        History
      </button>
      <button type="button" data-tab="ranking" class="tab-btn py-2 px-4 text-cyan-300 border-b-2 border-transparent hover:text-pink-400 hover:border-pink-400 transition-all hover:cursor-pointer">
        Ranking
      </button>
    </nav>
  </div>

  <!-- Content Container -->
  <div id="profile-content" class="w-full flex-1 overflow-y-auto py-4 scrollbar-thin scrollbar-thumb-purple-500 scrollbar-track-transparent hover:scrollbar-thumb-pink-500">
    
    <!-- PROFILE TAB -->
    <div id="tab-profile" class="tab-content hidden w-full max-w-md mx-auto">
      <div class="bg-gradient-to-br from-purple-900/40 via-pink-900/30 to-black/50 backdrop-blur-sm border border-purple-400/50 rounded-3xl p-6 shadow-lg shadow-purple-500/30">
        <!-- Profile Header -->
        <div class="flex flex-col items-center mb-6">
          <div class="relative mb-4">
            <img id="profile-avatar" src="assets/icone/Lucian.webp" alt="Avatar" 
                 class="w-24 h-24 rounded-full border-4 border-pink-400 shadow-lg shadow-pink-400/60" />
          </div>
          <h2 id="profile-username" class="text-2xl font-bold text-white mb-1 drop-shadow-lg">Loading...</h2>
        </div>

        <!-- ELO Progress -->
        <div class="mb-6">
          <div class="flex justify-between items-center mb-2">
            <span class="text-sm text-purple-300">ELO Rating</span>
            <span class="text-sm text-pink-300"><span id="profile-elo">0</span></span>
          </div>
          <div class="w-full bg-purple-900/50 rounded-full h-3 border border-purple-500/30">
            <div id="profile-elo-bar" class="bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-400 h-3 rounded-full transition-all duration-500 shadow-lg" style="width: 0%"></div>
          </div>
          <div class="flex justify-center mt-2">
            <img id="profile-rank" src="" alt="Rank" class="w-32 h-32" />
          </div>
        </div>

        <!-- Stats Grid -->
        <div class="grid grid-cols-2 gap-4">
          <div class="bg-purple-900/40 rounded-2xl p-4 text-center border border-cyan-400/40 shadow-lg shadow-cyan-400/20">
            <div id="profile-wins" class="text-3xl font-bold text-cyan-400 mb-1 drop-shadow-lg">0</div>
            <div class="text-purple-300 text-sm">Wins</div>
          </div>
          <div class="bg-purple-900/40 rounded-2xl p-4 text-center border border-pink-400/40 shadow-lg shadow-pink-400/20">
            <div id="profile-losses" class="text-3xl font-bold text-pink-400 mb-1 drop-shadow-lg">0</div>
            <div class="text-purple-300 text-sm">Losses</div>
          </div>
        </div>

        <!-- Win Rate -->
        <div class="mt-4 text-center">
          <div class="text-lg font-bold text-white drop-shadow-lg">
            Win Rate: <span id="profile-winrate" class="text-pink-400">0%</span>
          </div>
        </div>
      </div>
    </div>

    <!-- HISTORY TAB -->
    <div id="tab-history" class="tab-content hidden w-full max-w-2xl mx-auto">
      <div class="space-y-4">
        <h3 class="text-xl font-bold text-center text-pink-400 mb-6 drop-shadow-lg">Match History</h3>
        
        <div id="match-history" class="space-y-3">
          <!-- Match items will be dynamically inserted here -->
          <div class="text-center text-purple-300 py-8">Loading match history...</div>
        </div>
      </div>
    </div>

    <!-- RANKING TAB -->
    <div id="tab-ranking" class="tab-content hidden w-full max-w-2xl mx-auto">
      <div class="space-y-4">
        <h3 class="text-xl font-bold text-center text-pink-400 mb-6 drop-shadow-lg">Global Ranking</h3>
        
        <div id="leaderboard" class="space-y-2">
          <!-- Leaderboard items will be dynamically inserted here -->
          <div class="text-center text-purple-300 py-8">Loading leaderboard...</div>
        </div>
      </div>
    </div>

  </div>
</div>
`;
//# sourceMappingURL=profileTemplate.js.map