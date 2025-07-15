export const blockExplorerTemplate = `
<div class="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 text-white">
  <!-- Header -->
  <div class="bg-black/90 border-b border-accent/30 sticky top-0 z-40">
    <div class="container mx-auto px-6 py-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-4">
          <h1 class="font-arcade text-2xl text-accent">BLOCKCHAIN EXPLORER</h1>
          <div class="text-xs text-white/70 font-arcade">Avalanche Testnet</div>
        </div>
        <button id="backBtn" class="threeD-button-set px-6 py-2 text-sm">← Back to Game</button>
      </div>
    </div>
  </div>

  <!-- Main Content -->
  <div class="container mx-auto px-6 py-8">
    
    <!-- Search Section -->
    <div class="mb-8">
      <div class="bg-black/50 backdrop-blur-md border border-accent/20 rounded-xl p-6">
        <h2 class="font-arcade text-lg text-accent mb-4">🔍 Search Blockchain</h2>
        <div class="flex flex-col md:flex-row gap-3">
          <input 
            type="text" 
            id="searchInput" 
            placeholder="Enter block hash, transaction hash, or block number..."
            class="flex-1 bg-black/30 border border-accent/30 text-white p-3 rounded-lg focus:border-accent outline-none transition-colors"
          />
          <button id="searchBtn" class="bg-accent hover:bg-accent/80 text-black font-bold px-8 py-3 rounded-lg transition-colors">
            SEARCH
          </button>
        </div>
      </div>
    </div>

    <!-- Stats Grid -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <div class="bg-black/40 backdrop-blur-md border border-accent/20 rounded-xl p-6">
        <div class="text-accent font-arcade text-sm mb-2">LATEST BLOCK</div>
        <div id="latestBlockNumber" class="text-2xl font-bold">Loading...</div>
      </div>
      <div class="bg-black/40 backdrop-blur-md border border-accent/20 rounded-xl p-6">
        <div class="text-accent font-arcade text-sm mb-2">TOTAL TOURNAMENTS</div>
        <div id="totalTournaments" class="text-2xl font-bold">Loading...</div>
      </div>
      <div class="bg-black/40 backdrop-blur-md border border-accent/20 rounded-xl p-6">
        <div class="text-accent font-arcade text-sm mb-2">AVG BLOCK TIME</div>
        <div id="avgBlockTime" class="text-2xl font-bold">~2.0s</div>
      </div>
    </div>

    <!-- Main Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
      
      <!-- Latest Blocks -->
      <div class="bg-black/40 backdrop-blur-md border border-accent/20 rounded-xl p-6">
        <div class="flex items-center justify-between mb-6">
          <h2 class="font-arcade text-lg text-accent">📦 Latest Blocks</h2>
          <div class="text-xs text-white/50">Auto-refresh: 30s</div>
        </div>
        <div id="latestBlocks" class="space-y-3 max-h-96 overflow-y-auto">
          <div class="text-white/70 text-center py-8">Loading blocks...</div>
        </div>
      </div>

      <!-- Tournament Scores -->
      <div class="bg-black/40 backdrop-blur-md border border-accent/20 rounded-xl p-6">
        <div class="flex items-center justify-between mb-6">
          <h2 class="font-arcade text-lg text-accent">🏆 Tournament Results</h2>
          <div class="text-xs text-white/50">On-chain verified</div>
        </div>
        <div id="tournamentScores" class="space-y-3 max-h-96 overflow-y-auto">
          <div class="text-white/70 text-center py-8">Loading tournament data...</div>
        </div>
      </div>
    </div>
  </div>

  <!-- Block Details Modal -->
  <div id="blockModal" class="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center hidden z-50">
    <div class="bg-black/90 border border-accent/50 rounded-xl p-8 max-w-4xl w-full mx-6 max-h-[80vh] overflow-y-auto">
      <div class="flex justify-between items-center mb-6">
        <h3 class="font-arcade text-xl text-accent">Block Details</h3>
        <button id="closeModal" class="text-accent hover:text-white text-2xl">✕</button>
      </div>
      <div id="blockDetails" class="space-y-4">
        <!-- Block details will be populated here -->
      </div>
    </div>
  </div>
</div>`;
//# sourceMappingURL=blockExplorerTemplate.js.map