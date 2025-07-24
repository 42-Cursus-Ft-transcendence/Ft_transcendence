import { blockExplorerTemplate } from "../templates/blockExplorerTemplate.js";
export function renderBlockExplorer(container, onBack) {
    container.innerHTML = blockExplorerTemplate;
    // Get DOM elements
    const backBtn = container.querySelector("#backBtn");
    const searchBtn = container.querySelector("#searchBtn");
    const searchInput = container.querySelector("#searchInput");
    const latestBlocksContainer = container.querySelector("#latestBlocks");
    const tournamentScoresContainer = container.querySelector("#tournamentScores");
    const blockModal = container.querySelector("#blockModal");
    const closeModalBtn = container.querySelector("#closeModal");
    const blockDetailsContainer = container.querySelector("#blockDetails");
    // Stats elements
    const latestBlockNumberEl = container.querySelector("#latestBlockNumber");
    const totalTournamentsEl = container.querySelector("#totalTournaments");
    // Event listeners
    backBtn.addEventListener("click", () => onBack());
    searchBtn.addEventListener("click", () => handleSearch());
    searchInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            handleSearch();
        }
    });
    closeModalBtn.addEventListener("click", () => {
        blockModal.classList.add("hidden");
    });
    // Close modal when clicking outside
    blockModal.addEventListener("click", (e) => {
        if (e.target === blockModal) {
            blockModal.classList.add("hidden");
        }
    });
    // Add keyboard navigation for containers
    const addKeyboardNavigation = (container) => {
        container.addEventListener("keydown", (e) => {
            const scrollAmount = 100;
            switch (e.key) {
                case "ArrowUp":
                    e.preventDefault();
                    container.scrollBy({ top: -scrollAmount, behavior: "smooth" });
                    break;
                case "ArrowDown":
                    e.preventDefault();
                    container.scrollBy({ top: scrollAmount, behavior: "smooth" });
                    break;
                case "Home":
                    e.preventDefault();
                    container.scrollTo({ top: 0, behavior: "smooth" });
                    break;
                case "End":
                    e.preventDefault();
                    container.scrollTo({
                        top: container.scrollHeight,
                        behavior: "smooth",
                    });
                    break;
            }
        });
        // Make containers focusable
        container.setAttribute("tabindex", "0");
    };
    // Add keyboard navigation to both containers
    addKeyboardNavigation(latestBlocksContainer);
    addKeyboardNavigation(tournamentScoresContainer);
    // Add scroll indicators
    const addScrollIndicators = (container) => {
        const updateScrollIndicators = () => {
            const { scrollTop, scrollHeight, clientHeight } = container;
            const scrollPercentage = (scrollTop / (scrollHeight - clientHeight)) * 100;
            // Add visual feedback for scroll position
            if (scrollTop === 0) {
                container.classList.add("scroll-top");
                container.classList.remove("scroll-bottom", "scroll-middle");
            }
            else if (scrollTop + clientHeight >= scrollHeight - 1) {
                container.classList.add("scroll-bottom");
                container.classList.remove("scroll-top", "scroll-middle");
            }
            else {
                container.classList.add("scroll-middle");
                container.classList.remove("scroll-top", "scroll-bottom");
            }
        };
        container.addEventListener("scroll", updateScrollIndicators);
        updateScrollIndicators(); // Initial check
    };
    addScrollIndicators(latestBlocksContainer);
    addScrollIndicators(tournamentScoresContainer);
    // API functions to fetch real blockchain data from local database
    async function fetchTransactions(page = 1, limit = 20) {
        try {
            const response = await fetch(`/api/transactions?page=${page}&limit=${limit}`, {
                method: "GET",
                credentials: "include",
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        }
        catch (error) {
            console.error("Error fetching transactions:", error);
            return {
                transactions: [],
                pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
            };
        }
    }
    async function fetchTransactionByHash(hash) {
        try {
            const response = await fetch(`/api/transactions/${hash}`, {
                method: "GET",
                credentials: "include",
            });
            if (!response.ok) {
                if (response.status === 404) {
                    return null;
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        }
        catch (error) {
            console.error("Error fetching transaction by hash:", error);
            return null;
        }
    }
    // Convert database transactions to blocks format for display
    function transactionsToBlocks(transactions) {
        // Group transactions by block number (use 0 for pending transactions)
        const blockGroups = {};
        transactions.forEach((tx) => {
            const blockNum = tx.block_number || 0; // Use 0 for pending transactions
            if (!blockGroups[blockNum]) {
                blockGroups[blockNum] = [];
            }
            blockGroups[blockNum].push(tx);
        });
        // Convert to Block format using real blockchain data
        return Object.entries(blockGroups)
            .map(([blockNumber, txs]) => {
            const blockNum = parseInt(blockNumber);
            return {
                number: blockNum,
                hash: txs[0]?.hash || "N/A",
                timestamp: new Date(txs[0]?.timestamp || Date.now()).getTime(),
                transactions: txs.length,
                gasUsed: txs
                    .reduce((sum, tx) => sum + (tx.gas_used || 0), 0)
                    .toString(),
                gasLimit: "8000000",
                miner: blockNum === 0 ? "Pending" : "Local Testnet",
            };
        })
            .sort((a, b) => {
            // Sort pending transactions (block 0) to top, then by block number desc
            if (a.number === 0 && b.number !== 0)
                return -1;
            if (b.number === 0 && a.number !== 0)
                return 1;
            return b.number - a.number;
        });
    }
    // Convert database transactions to tournament format for display
    function transactionsToTournaments(transactions) {
        return transactions
            .filter((tx) => tx.status === "confirmed")
            .map((tx) => ({
            id: tx.game_id,
            winner: tx.userName ||
                tx.player_address.slice(0, 6) + "..." + tx.player_address.slice(-4),
            score: tx.score.toString(),
            participants: [tx.player_address],
            timestamp: new Date(tx.timestamp).getTime(),
            blockHash: tx.hash,
        }))
            .sort((a, b) => b.timestamp - a.timestamp);
    }
    // Store current transaction data
    let currentTransactions = [];
    let currentBlocks = [];
    let currentTournaments = [];
    // Fetch real data from local blockchain database
    async function loadBlockchainData() {
        try {
            const data = await fetchTransactions(1, 100); // Get more transactions for better block grouping
            // Handle both array and object responses
            currentTransactions = Array.isArray(data)
                ? data
                : data.transactions || [];
            currentBlocks = transactionsToBlocks(currentTransactions);
            currentTournaments = transactionsToTournaments(currentTransactions);
        }
        catch (error) {
            console.error("Error loading blockchain data:", error);
            // Fallback to empty arrays if API fails
            currentTransactions = [];
            currentBlocks = [];
            currentTournaments = [];
        }
    }
    function formatTimestamp(timestamp) {
        return new Date(timestamp).toLocaleString();
    }
    function formatHash(hash) {
        if (hash.length > 20) {
            return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
        }
        return hash;
    }
    async function renderLatestBlocks() {
        if (currentBlocks.length === 0) {
            latestBlocksContainer.innerHTML =
                '<div class="text-center text-gray-400 py-4">No blockchain data available</div>';
            return;
        }
        latestBlocksContainer.innerHTML = currentBlocks
            .slice(0, 10)
            .map((block) => {
            const blockLabel = block.number === 0 ? "Pending" : `#${block.number}`;
            const blockClass = block.number === 0
                ? "border-yellow-400 hover:border-yellow-500"
                : "border-pink-400 hover:border-pink-500";
            return `
        <div class="bg-black/30 border ${blockClass} rounded p-2 cursor-pointer block-item transition" data-block='${JSON.stringify(block)}'>
          <div class="flex justify-between items-center mb-1">
            <div class="text-accent font-arcade text-xs">${blockLabel}</div>
            <div class="text-green-300 text-xs">${formatTimestamp(block.timestamp)}</div>
          </div>
          <div class="text-white text-xs mb-1 font-mono">
            ${formatHash(block.hash)}
          </div>
          <div class="flex justify-between text-xs">
            <span class="text-green-400">${block.transactions} txns</span>
            <span class="text-blue-300">${parseInt(block.gasUsed || "0").toLocaleString()} gas</span>
          </div>
        </div>
      `;
        })
            .join("");
        // Add click listeners to blocks
        latestBlocksContainer.querySelectorAll(".block-item").forEach((item) => {
            item.addEventListener("click", () => {
                const blockData = JSON.parse(item.getAttribute("data-block"));
                showBlockDetails(blockData);
            });
        });
    }
    async function renderTournamentScores() {
        if (currentTournaments.length === 0) {
            tournamentScoresContainer.innerHTML =
                '<div class="text-center text-gray-400 py-4">No tournament data available</div>';
            return;
        }
        tournamentScoresContainer.innerHTML = currentTournaments
            .slice(0, 10)
            .map((tournament) => `
      <div class="bg-black/30 border border-pink-400 hover:border-pink-500 rounded p-2 transition">
        <div class="flex justify-between items-center mb-1">
          <div class="text-accent font-arcade text-xs">Game ${tournament.id}</div>
          <div class="text-green-300 text-xs">${formatTimestamp(tournament.timestamp)}</div>
        </div>
        <div class="mb-1">
          <span class="text-white text-xs">🏆 Player: </span>
          <span class="text-accent font-bold text-xs">${tournament.winner}</span>
          <span class="text-green-400 text-xs"> Score: ${tournament.score}</span>
        </div>
        <div class="text-blue-300 text-xs font-mono">
          ${formatHash(tournament.blockHash)}
        </div>
      </div>
    `)
            .join("");
    }
    function showBlockDetails(block) {
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
          <div class="text-xs mt-1">${((parseInt(block.gasUsed) / parseInt(block.gasLimit)) *
            100).toFixed(1)}% used</div>
        </div>
      </div>
    `;
        blockModal.classList.remove("hidden");
    }
    async function handleSearch() {
        const query = searchInput.value.trim();
        if (!query) {
            return;
        }
        if (query.startsWith("0x")) {
            // Searching for transaction hash
            const transaction = await fetchTransactionByHash(query);
            if (transaction) {
                const block = {
                    number: transaction.block_number || 0,
                    hash: transaction.hash,
                    timestamp: new Date(transaction.timestamp).getTime(),
                    transactions: 1,
                    gasUsed: transaction.gas_used?.toString() || "0",
                    gasLimit: "8000000",
                    miner: "Local Testnet",
                };
                showBlockDetails(block);
            }
            else {
                alert("Transaction not found in local blockchain database.");
            }
        }
        else if (!isNaN(parseInt(query))) {
            // Searching for block number
            const blockNumber = parseInt(query);
            const block = currentBlocks.find((b) => b.number === blockNumber);
            if (block) {
                showBlockDetails(block);
            }
            else {
                alert("Block not found in local blockchain database.");
            }
        }
        else {
            alert("Invalid search query. Please enter a transaction hash (0x...) or block number.");
        }
        searchInput.value = "";
    }
    // Update stats
    async function updateStats() {
        latestBlockNumberEl.textContent =
            currentBlocks[0]?.number.toString() || "N/A";
        totalTournamentsEl.textContent = currentTournaments.length.toString();
    }
    // Initialize the component
    function initializeBlockExplorer() {
        return loadBlockchainData()
            .then(() => {
            console.log("✅ Blockchain data loaded");
            return updateStats();
        })
            .then(() => {
            console.log("✅ Stats updated");
            return renderLatestBlocks();
        })
            .then(() => {
            console.log("✅ Latest blocks rendered");
            return renderTournamentScores();
        })
            .then(() => {
            console.log("✅ Tournament scores rendered");
        })
            .catch((err) => {
            console.error("❌ Error during initialization:", err);
        });
    }
    // Auto-refresh every 30 seconds to get latest blockchain data
    const refreshInterval = setInterval(() => {
        loadBlockchainData()
            .then(() => {
            console.log("🔄 Refresh: Blockchain data loaded");
            return updateStats();
        })
            .then(() => {
            console.log("🔄 Refresh: Stats updated");
            return renderLatestBlocks();
        })
            .then(() => {
            console.log("🔄 Refresh: Latest blocks rendered");
            return renderTournamentScores();
        })
            .then(() => {
            console.log("🔄 Refresh: Tournament scores rendered");
        })
            .catch((err) => {
            console.error("❌ Error during refresh:", err);
        });
    }, 30_000);
    // Initialize with real data
    initializeBlockExplorer();
    // Cleanup function (would be called when component unmounts)
    // In this case, we'll store it on the container for potential cleanup
    container.cleanup = () => {
        clearInterval(refreshInterval);
    };
}
//# sourceMappingURL=blockExplorerController.js.map