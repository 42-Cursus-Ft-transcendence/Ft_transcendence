import { blockExplorerTemplate } from "../templates/blockExplorerTemplate.js";

interface Block {
  number: number;
  hash: string;
  timestamp: number;
  transactions: number;
  gasUsed: string;
  gasLimit: string;
  miner: string;
}

interface Tournament {
  id: string;
  winner: string;
  score: string;
  participants: string[];
  timestamp: number;
  blockHash: string;
}

export function renderBlockExplorer(container: HTMLElement, onBack: () => void): void {
  container.innerHTML = blockExplorerTemplate;
  
  // Get DOM elements
  const backBtn = container.querySelector<HTMLButtonElement>('#backBtn')!;
  const searchBtn = container.querySelector<HTMLButtonElement>('#searchBtn')!;
  const searchInput = container.querySelector<HTMLInputElement>('#searchInput')!;
  const latestBlocksContainer = container.querySelector<HTMLElement>('#latestBlocks')!;
  const tournamentScoresContainer = container.querySelector<HTMLElement>('#tournamentScores')!;
  const blockModal = container.querySelector<HTMLElement>('#blockModal')!;
  const closeModalBtn = container.querySelector<HTMLButtonElement>('#closeModal')!;
  const blockDetailsContainer = container.querySelector<HTMLElement>('#blockDetails')!;
  
  // Stats elements
  const latestBlockNumberEl = container.querySelector<HTMLElement>('#latestBlockNumber')!;
  const totalTournamentsEl = container.querySelector<HTMLElement>('#totalTournaments')!;

  // Event listeners
  backBtn.addEventListener('click', () => onBack());
  
  searchBtn.addEventListener('click', () => handleSearch());
  
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  });

  closeModalBtn.addEventListener('click', () => {
    blockModal.classList.add('hidden');
  });

  // Close modal when clicking outside
  blockModal.addEventListener('click', (e) => {
    if (e.target === blockModal) {
      blockModal.classList.add('hidden');
    }
  });

  // Add keyboard navigation for containers
  const addKeyboardNavigation = (container: HTMLElement) => {
    container.addEventListener('keydown', (e) => {
      const scrollAmount = 100;
      
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          container.scrollBy({ top: -scrollAmount, behavior: 'smooth' });
          break;
        case 'ArrowDown':
          e.preventDefault();
          container.scrollBy({ top: scrollAmount, behavior: 'smooth' });
          break;
        case 'Home':
          e.preventDefault();
          container.scrollTo({ top: 0, behavior: 'smooth' });
          break;
        case 'End':
          e.preventDefault();
          container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
          break;
      }
    });
    
    // Make containers focusable
    container.setAttribute('tabindex', '0');
  };

  // Add keyboard navigation to both containers
  addKeyboardNavigation(latestBlocksContainer);
  addKeyboardNavigation(tournamentScoresContainer);

  // Add scroll indicators
  const addScrollIndicators = (container: HTMLElement) => {
    const updateScrollIndicators = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const scrollPercentage = (scrollTop / (scrollHeight - clientHeight)) * 100;
      
      // Add visual feedback for scroll position
      if (scrollTop === 0) {
        container.classList.add('scroll-top');
        container.classList.remove('scroll-bottom', 'scroll-middle');
      } else if (scrollTop + clientHeight >= scrollHeight - 1) {
        container.classList.add('scroll-bottom');
        container.classList.remove('scroll-top', 'scroll-middle');
      } else {
        container.classList.add('scroll-middle');
        container.classList.remove('scroll-top', 'scroll-bottom');
      }
    };
    
    container.addEventListener('scroll', updateScrollIndicators);
    updateScrollIndicators(); // Initial check
  };

  addScrollIndicators(latestBlocksContainer);
  addScrollIndicators(tournamentScoresContainer);

  // Mock data - In real implementation, this would come from Avalanche blockchain API
  function generateMockBlocks(): Block[] {
    const blocks: Block[] = [];
    const currentTime = Date.now();
    
    for (let i = 0; i < 5; i++) {
      blocks.push({
        number: 150000 - i,
        hash: `0x${Math.random().toString(16).slice(2, 18)}...${Math.random().toString(16).slice(2, 10)}`,
        timestamp: currentTime - (i * 60000), // 1 minute intervals
        transactions: Math.floor(Math.random() * 100) + 1,
        gasUsed: (Math.random() * 8000000).toFixed(0),
        gasLimit: "8000000",
        miner: `0x${Math.random().toString(16).slice(2, 12)}...${Math.random().toString(16).slice(2, 6)}`
      });
    }
    
    return blocks;
  }

  function generateMockTournaments(): Tournament[] {
    const tournaments: Tournament[] = [];
    const players = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank'];
    
    for (let i = 0; i < 3; i++) {
      const winner = players[Math.floor(Math.random() * players.length)];
      const loser = players[Math.floor(Math.random() * players.length)];
      
      tournaments.push({
        id: `tournament_${Date.now() - i * 3600000}`,
        winner,
        score: `${Math.floor(Math.random() * 5) + 5}-${Math.floor(Math.random() * 4)}`,
        participants: [winner, loser],
        timestamp: Date.now() - (i * 3600000), // 1 hour intervals
        blockHash: `0x${Math.random().toString(16).slice(2, 18)}...${Math.random().toString(16).slice(2, 10)}`
      });
    }
    
    return tournaments;
  }

  function formatTimestamp(timestamp: number): string {
    return new Date(timestamp).toLocaleString();
  }

  function formatHash(hash: string): string {
    if (hash.length > 20) {
      return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
    }
    return hash;
  }

  function renderLatestBlocks(): void {
    const blocks = generateMockBlocks();
    
    latestBlocksContainer.innerHTML = blocks.map(block => `
      <div class="bg-black/30 border border-pink-400 hover:border-pink-500 rounded p-2 cursor-pointer block-item transition" data-block='${JSON.stringify(block)}'>
        <div class="flex justify-between items-center mb-1">
          <div class="text-accent font-arcade text-xs">#${block.number}</div>
          <div class="text-green-300 text-xs">${formatTimestamp(block.timestamp)}</div>
        </div>
        <div class="text-white text-xs mb-1 font-mono">
          ${formatHash(block.hash)}
        </div>
        <div class="flex justify-between text-xs">
          <span class="text-green-400">${block.transactions} txns</span>
          <span class="text-blue-300">${parseInt(block.gasUsed).toLocaleString()} gas</span>
        </div>
      </div>
    `).join('');

    // Add click listeners to blocks
    latestBlocksContainer.querySelectorAll('.block-item').forEach(item => {
      item.addEventListener('click', () => {
        const blockData = JSON.parse(item.getAttribute('data-block')!);
        showBlockDetails(blockData);
      });
    });
  }

  function renderTournamentScores(): void {
    const tournaments = generateMockTournaments();
    
    tournamentScoresContainer.innerHTML = tournaments.map(tournament => `
      <div class="bg-black/30 border border-pink-400 hover:border-pink-500 rounded p-2 transition">
        <div class="flex justify-between items-center mb-1">
          <div class="text-accent font-arcade text-xs">Tournament #${tournament.id.split('_')[1]}</div>
          <div class="text-green-300 text-xs">${formatTimestamp(tournament.timestamp)}</div>
        </div>
        <div class="mb-1">
          <span class="text-white text-xs">🏆 Winner: </span>
          <span class="text-accent font-bold text-xs">${tournament.winner}</span>
          <span class="text-green-400 text-xs"> ${tournament.score}</span>
        </div>
        <div class="text-blue-300 text-xs font-mono">
          ${formatHash(tournament.blockHash)}
        </div>
      </div>
    `).join('');
  }

  function showBlockDetails(block: Block): void {
    blockDetailsContainer.innerHTML = `
      <div class="space-y-3">
        <div><span class="text-accent">Block Number:</span> ${block.number}</div>
        <div><span class="text-accent">Hash:</span> ${block.hash}</div>
        <div><span class="text-accent">Timestamp:</span> ${formatTimestamp(block.timestamp)}</div>
        <div><span class="text-accent">Transactions:</span> ${block.transactions}</div>
        <div><span class="text-accent">Gas Used:</span> ${parseInt(block.gasUsed).toLocaleString()} / ${parseInt(block.gasLimit).toLocaleString()}</div>
        <div><span class="text-accent">Miner:</span> ${block.miner}</div>
        <div class="mt-4 pt-3 border-t border-accent/30">
          <div class="text-accent mb-2">Gas Usage:</div>
          <div class="bg-black/50 rounded h-4 border border-accent/30">
            <div class="bg-accent h-full rounded" style="width: ${(parseInt(block.gasUsed) / parseInt(block.gasLimit)) * 100}%"></div>
          </div>
          <div class="text-xs mt-1">${((parseInt(block.gasUsed) / parseInt(block.gasLimit)) * 100).toFixed(1)}% used</div>
        </div>
      </div>
    `;
    
    blockModal.classList.remove('hidden');
  }

  function handleSearch(): void {
    const query = searchInput.value.trim();
    
    if (!query) {
      return;
    }

    // Mock search functionality - in real implementation would query blockchain
    if (query.startsWith('0x')) {
      // Searching for hash
      const mockBlock: Block = {
        number: Math.floor(Math.random() * 150000),
        hash: query.length > 20 ? query : `${query}${'0'.repeat(66 - query.length)}`,
        timestamp: Date.now() - Math.random() * 86400000,
        transactions: Math.floor(Math.random() * 100) + 1,
        gasUsed: (Math.random() * 8000000).toFixed(0),
        gasLimit: "8000000",
        miner: `0x${Math.random().toString(16).slice(2, 12)}...${Math.random().toString(16).slice(2, 6)}`
      };
      
      showBlockDetails(mockBlock);
    } else if (!isNaN(parseInt(query))) {
      // Searching for block number
      const mockBlock: Block = {
        number: parseInt(query),
        hash: `0x${Math.random().toString(16).slice(2, 18)}...${Math.random().toString(16).slice(2, 10)}`,
        timestamp: Date.now() - Math.random() * 86400000,
        transactions: Math.floor(Math.random() * 100) + 1,
        gasUsed: (Math.random() * 8000000).toFixed(0),
        gasLimit: "8000000",
        miner: `0x${Math.random().toString(16).slice(2, 12)}...${Math.random().toString(16).slice(2, 6)}`
      };
      
      showBlockDetails(mockBlock);
    } else {
      alert('Invalid search query. Please enter a block hash (0x...) or block number.');
    }
    
    searchInput.value = '';
  }

  // Update stats
  function updateStats(): void {
    const blocks = generateMockBlocks();
    const tournaments = generateMockTournaments();
    
    latestBlockNumberEl.textContent = blocks[0]?.number.toString() || 'N/A';
    totalTournamentsEl.textContent = tournaments.length.toString();
  }

  // Initialize the component
  updateStats();
  renderLatestBlocks();
  renderTournamentScores();
  
  // Auto-refresh every 30 seconds (simulating real blockchain updates)
  const refreshInterval = setInterval(() => {
    updateStats();
    renderLatestBlocks();
    renderTournamentScores();
  }, 30000);

  // Cleanup function (would be called when component unmounts)
  // In this case, we'll store it on the container for potential cleanup
  (container as any).cleanup = () => {
    clearInterval(refreshInterval);
  };
}