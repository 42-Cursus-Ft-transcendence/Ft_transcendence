export const blockExplorerTemplate = `
<div class="min-h-screen bg-black text-white">
  <!-- Header -->
  <div class="bg-black border-b border-pink-500 sticky top-0 z-20">
    <div class="container mx-auto px-4 py-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-4">
          <h1 class="font-arcade text-2xl text-accent">BLOCKCHAIN EXPLORER</h1>
          <div class="text-xs text-green-400 font-arcade">Avalanche Testnet</div>
        </div>
        <button id="backBtn" class="threeD-button-set px-4 py-2 text-sm">← BACK TO GAME</button>
      </div>
    </div>
  </div>

  <!-- Main Content -->
  <div class="container mx-auto px-4 py-4">
    
    <!-- Search Section -->
    <div class="mb-6">
      <div class="bg-black/50 border border-pink-500 rounded-lg p-4">
        <h2 class="font-arcade text-sm text-accent mb-4">🔍 SEARCH BLOCKCHAIN</h2>
        <div class="flex flex-col gap-2">
          <input 
            type="text" 
            id="searchInput" 
            placeholder="Block hash, transaction hash, or block number..."
            class="w-full bg-black border border-pink-400 text-white p-2 rounded text-sm focus:border-pink-500 outline-none"
          />
          <button id="searchBtn" class="bg-accent text-black font-bold px-4 py-2 rounded text-sm hover:bg-accent/80">
            SEARCH
          </button>
        </div>
      </div>
    </div>

    <!-- Stats Grid -->
    <div class="grid grid-cols-4 gap-4 mb-6">
      <div class="bg-black/50 border border-pink-400 rounded-lg p-4">
        <div class="text-accent font-arcade text-xs mb-1">LATEST BLOCK</div>
        <div id="latestBlockNumber" class="text-lg font-bold text-green-400">Loading...</div>
      </div>
      <div class="bg-black/50 border border-pink-400 rounded-lg p-4">
        <div class="text-accent font-arcade text-xs mb-1">TOURNAMENTS</div>
        <div id="totalTournaments" class="text-lg font-bold text-green-400">Loading...</div>
      </div>
      <div class="bg-black/50 border border-pink-400 rounded-lg p-4">
        <div class="text-accent font-arcade text-xs mb-1">AVG TIME</div>
        <div id="avgBlockTime" class="text-lg font-bold text-green-400">~2.0s</div>
      </div>
      <div class="bg-black/50 border border-pink-400 rounded-lg p-4">
        <div class="text-accent font-arcade text-xs mb-1">GAS PRICE</div>
        <div class="text-lg font-bold text-green-400">25 gwei</div>
      </div>
    </div>

    <!-- Main Content Grid -->
    <div class="grid grid-cols-1 gap-4">
      
      <!-- Latest Blocks -->
      <div class="bg-black/50 border border-pink-400 rounded-lg p-4">
        <div class="flex items-center justify-between mb-4">
          <h2 class="font-arcade text-sm text-accent">📦 LATEST BLOCKS</h2>
          <div class="text-xs text-green-300">Auto-refresh: 30s</div>
        </div>
        <div id="latestBlocks" class="space-y-2 max-w-lg overflow-y-auto scrollbar-thin scrollbar-thumb-pink-500 scrollbar-track-transparent">
          <div class="text-green-300 text-center py-4 text-sm">Loading blocks...</div>
        </div>
      </div>

      <!-- Tournament Scores -->
      <div class="bg-black/50 border border-pink-400 rounded-lg p-4">
        <div class="flex items-center justify-between mb-4">
          <h2 class="font-arcade text-sm text-accent">🏆 TOURNAMENT RESULTS</h2>
          <div class="text-xs text-green-300">On-chain verified</div>
        </div>
        <div id="tournamentScores" class="space-y-2 max-w-lg overflow-y-auto scrollbar-thin scrollbar-thumb-pink-500 scrollbar-track-transparent">
          <div class="text-green-300 text-center py-4 text-sm">Loading tournament data...</div>
        </div>
      </div>
    </div>
  </div>

  <!-- Block Details Modal -->
  <div id="blockModal" class="fixed inset-0 bg-black/70 flex items-center justify-center hidden z-20">
    <div class="bg-black border-2 border-pink-500 rounded-lg p-6 max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto">
      <div class="flex justify-between items-center mb-4">
        <h3 class="font-arcade text-sm text-accent">BLOCK DETAILS</h3>
        <button id="closeModal" class="text-accent hover:text-white text-lg">✕</button>
      </div>
      <div id="blockDetails" class="space-y-2 text-sm">
        <!-- Block details will be populated here -->
      </div>
    </div>
  </div>
</div>`;
//# sourceMappingURL=blockExplorerTemplate.js.map