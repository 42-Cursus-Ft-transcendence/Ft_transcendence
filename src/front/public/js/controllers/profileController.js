import { profileTemplate, createMatchHistoryItem, createLeaderboardEntry } from "../templates/profileTemplate.js";
export async function renderProfile(container, onBack) {
    container.innerHTML = profileTemplate;
    // Bind back button
    bindBackButton(container, onBack);
    // Load user data and bind content
    await bindProfileContent(container);
    // Setup tab navigation
    bindTabNavigation(container);
}
function bindBackButton(container, onBack) {
    const backBtn = container.querySelector('#backBtn');
    backBtn.addEventListener('click', () => {
        onBack();
    });
}
async function bindProfileContent(container) {
    try {
        // Fetch user profile data from API
        const userProfile = await fetchUserProfile();
        // Update profile tab
        updateProfileTab(container, userProfile);
        // Load and update history tab
        const matchHistory = await fetchMatchHistory();
        updateHistoryTab(container, matchHistory);
        // Load and update ranking tab
        const leaderboard = await fetchLeaderboard();
        updateRankingTab(container, leaderboard, userProfile);
    }
    catch (error) {
        console.error('Error loading profile data:', error);
        showError(container, 'Failed to load profile data');
    }
}
function updateProfileTab(container, profile) {
    // Update avatar
    const avatar = container.querySelector('#profile-avatar');
    if (profile.avatarURL) {
        avatar.src = profile.avatarURL;
    }
    // Update username
    const username = container.querySelector('#profile-username');
    username.textContent = profile.userName;
    // Update ELO
    const elo = container.querySelector('#profile-elo');
    const eloBar = container.querySelector('#profile-elo-bar');
    const rankImg = container.querySelector('#profile-rank');
    elo.textContent = profile.elo.toString();
    // Calculate rank based on ELO (every 500 points)
    const rankInfo = getRankFromElo(profile.elo);
    // Update rank image
    if (rankInfo.image) {
        rankImg.src = `assets/rank/${rankInfo.image}`;
        rankImg.alt = rankInfo.name;
        rankImg.style.display = 'block';
    }
    else {
        // Hide image if no rank image available (Iron)
        rankImg.style.display = 'none';
    }
    // ELO bar based on progress within current rank
    const eloPercentage = ((profile.elo % 500) / 500) * 100;
    eloBar.style.width = `${eloPercentage}%`;
    // Update wins and losses (using ranked stats since they correspond to ELO)
    const wins = container.querySelector('#profile-wins');
    const losses = container.querySelector('#profile-losses');
    const winrate = container.querySelector('#profile-winrate');
    wins.textContent = profile.rankedWins.toString();
    losses.textContent = profile.rankedLosses.toString();
    const rankedGames = profile.rankedWins + profile.rankedLosses;
    const winratePercentage = rankedGames > 0 ? Math.round((profile.rankedWins / rankedGames) * 100) : 0;
    winrate.textContent = `${winratePercentage}%`;
    // Add a small indicator to show these are ranked stats
    const statsContainer = container.querySelector('#profile-stats');
    if (statsContainer && !statsContainer.querySelector('.ranked-indicator')) {
        const indicator = document.createElement('div');
        indicator.className = 'ranked-indicator text-xs text-yellow-400 mt-1 text-center';
        indicator.textContent = `Ranked Games Only (${rankedGames} total)`;
        statsContainer.appendChild(indicator);
    }
}
function updateHistoryTab(container, matches) {
    const historyContainer = container.querySelector('#match-history');
    if (matches.length === 0) {
        historyContainer.innerHTML = '<div class="text-center text-gray-400 py-8">No matches played yet</div>';
        return;
    }
    const matchElements = matches.slice(0, 10).map(match => {
        const resultClass = match.result === 'win' ? 'green' : 'red';
        const resultText = match.result === 'win' ? 'Victory' : 'Defeat';
        const eloChangeText = match.eloChange > 0 ? `+${match.eloChange}` : match.eloChange.toString();
        const scoreText = `${match.playerScore}-${match.opponentScore}`;
        // Match type badge
        const typeText = match.type === 'ranked' ? 'RANKED' : 'CASUAL';
        const typeBadgeClass = match.type === 'ranked' ? 'bg-yellow-600' : 'bg-gray-600';
        // ELO display (only for ranked matches) - improved styling
        const eloDisplay = match.type === 'ranked' ?
            `<div class="flex flex-col items-end">
                <div class="text-${resultClass}-400 font-bold text-lg">${eloChangeText}</div>
                <div class="text-gray-400 text-xs">ELO</div>
             </div>` :
            `<div class="flex flex-col items-end">
                <div class="text-gray-500 font-bold text-lg">--</div>
                <div class="text-gray-500 text-xs">CASUAL</div>
             </div>`;
        // Format date
        const date = new Date(match.matchDate);
        const timeAgo = getTimeAgo(date);
        // Use template function
        return createMatchHistoryItem({
            resultClass,
            resultText,
            opponent: match.opponent,
            typeText,
            typeBadgeClass,
            timeAgo,
            scoreText,
            eloDisplay
        });
    }).join('');
    historyContainer.innerHTML = matchElements;
}
function updateRankingTab(container, leaderboard, userProfile) {
    const leaderboardContainer = container.querySelector('#leaderboard');
    if (leaderboard.length === 0) {
        leaderboardContainer.innerHTML = '<div class="text-center text-gray-400 py-8">No ranking data available</div>';
        return;
    }
    const leaderboardElements = leaderboard.map((entry, index) => {
        const rank = index + 1;
        const rankClass = rank === 1 ? 'yellow' : rank === 2 ? 'gray' : rank === 3 ? 'orange' : 'blue';
        const borderClass = entry.isCurrentUser ? 'border-2 border-green-500' : `border border-${rankClass}-500`;
        const bgClass = entry.isCurrentUser ? 'from-green-600/30 to-blue-600/30' : `from-${rankClass}-600/30 to-${rankClass}-500/30`;
        // Use template function
        return createLeaderboardEntry({
            rank,
            rankClass,
            borderClass,
            bgClass,
            avatarURL: entry.avatarURL,
            userName: entry.userName,
            isCurrentUser: entry.isCurrentUser || false,
            wins: entry.wins,
            losses: entry.losses,
            elo: entry.elo
        });
    }).join('');
    leaderboardContainer.innerHTML = leaderboardElements;
}
function bindTabNavigation(container) {
    let currentTab = "profile";
    const nav = container.querySelector('nav[aria-label="Profile Tabs"]');
    // Activate default tab
    const defaultButton = container.querySelector(`button[data-tab="${currentTab}"]`);
    defaultButton.classList.add("border-pink-500", "text-white");
    container.querySelector(`#tab-${currentTab}`).classList.remove("hidden");
    // Add click listeners to all tab buttons
    nav.addEventListener('click', (e) => {
        const target = e.target;
        if (target.matches('button[data-tab]')) {
            const newTab = target.getAttribute('data-tab');
            // Don't switch if it's the same tab
            if (newTab === currentTab)
                return;
            // Remove active state from current tab
            const currentButton = container.querySelector(`button[data-tab="${currentTab}"]`);
            currentButton.classList.remove("border-pink-500", "text-white");
            container.querySelector(`#tab-${currentTab}`).classList.add("hidden");
            // Add active state to new tab
            target.classList.add("border-pink-500", "text-white");
            container.querySelector(`#tab-${newTab}`).classList.remove("hidden");
            currentTab = newTab;
        }
    });
}
// Real API functions
async function fetchUserProfile() {
    try {
        console.log('>> Fetching user profile from /api/me...');
        // Get user info with ranking data included
        const userResponse = await fetch('/api/me', {
            method: 'GET',
            credentials: 'include'
        });
        if (!userResponse.ok) {
            throw new Error('Failed to fetch user profile');
        }
        const userData = await userResponse.json();
        // The /me endpoint now includes all the data we need
        const profile = {
            idUser: userData.idUser,
            userName: userData.userName,
            email: userData.email,
            avatarURL: userData.avatarURL || 'assets/icone/Lucian.webp',
            elo: userData.elo || 0,
            // Ranked match stats
            rankedWins: userData.rankedWins || 0,
            rankedLosses: userData.rankedLosses || 0,
            rankedGamesPlayed: userData.rankedGamesPlayed || 0,
            // Total match stats (including normal games)
            totalWins: userData.totalWins || 0,
            totalLosses: userData.totalLosses || 0,
            totalGamesPlayed: userData.totalGamesPlayed || 0
        };
        console.log('>> Successfully fetched user profile:', profile.userName, 'ELO:', profile.elo);
        return profile;
    }
    catch (error) {
        console.error('Error fetching user profile:', error);
        throw error;
    }
}
async function fetchMatchHistory() {
    try {
        console.log('>> Fetching match history from API...');
        const response = await fetch('/api/match-history', {
            method: 'GET',
            credentials: 'include'
        });
        if (!response.ok) {
            console.error('Failed to fetch match history:', response.status, response.statusText);
            return [];
        }
        const data = await response.json();
        if (!data.matches || !Array.isArray(data.matches)) {
            console.error('Invalid match history data structure');
            return [];
        }
        // Transform backend data to frontend interface
        const matchHistory = data.matches.map((match) => ({
            matchId: match.matchId,
            opponent: match.opponent,
            opponentId: 0, // Backend doesn't provide opponent ID in current structure
            result: match.won ? 'win' : 'loss',
            playerScore: match.playerScore,
            opponentScore: match.opponentScore,
            eloChange: match.eloChange,
            matchDate: match.date,
            type: match.type || 'normal' // Include match type
        }));
        console.log(`>> Successfully fetched ${matchHistory.length} matches`);
        return matchHistory;
    }
    catch (error) {
        console.error('Error fetching match history:', error);
        return [];
    }
}
async function fetchLeaderboard() {
    try {
        const response = await fetch('/api/leaderboard?limit=20', {
            method: 'GET',
            credentials: 'include'
        });
        if (!response.ok) {
            throw new Error('Failed to fetch leaderboard');
        }
        const leaderboard = await response.json();
        // Get current user info to mark them in leaderboard
        const userResponse = await fetch('/api/me', {
            method: 'GET',
            credentials: 'include'
        });
        let currentUserId = null;
        if (userResponse.ok) {
            const userData = await userResponse.json();
            currentUserId = userData.idUser;
        }
        return leaderboard.map((entry, index) => ({
            userId: entry.userId,
            userName: entry.userName,
            avatarURL: entry.avatarURL || 'assets/icone/Lucian.webp',
            elo: entry.elo,
            wins: entry.wins,
            losses: entry.losses,
            gamesPlayed: entry.gamesPlayed,
            rank: index + 1,
            isCurrentUser: entry.userId === currentUserId
        }));
    }
    catch (error) {
        console.error('Error fetching leaderboard:', error);
        throw error;
    }
}
// Helper functions
function getRankFromElo(elo) {
    const ranks = [
        { name: "Iron", minElo: 0 }, // No image available for Iron
        { name: "Bronze", image: "Bronze.png", minElo: 500 },
        { name: "Silver", image: "Silver.png", minElo: 1000 },
        { name: "Gold", image: "Gold.png", minElo: 1500 },
        { name: "Platinum", image: "Platinum.png", minElo: 2000 },
        { name: "Diamond", image: "Diamond.png", minElo: 2500 },
        { name: "Master", image: "Master.png", minElo: 3000 },
        { name: "Grandmaster", image: "Grandmaster.png", minElo: 3500 },
        { name: "Challenger", image: "Challenger.png", minElo: 4000 }
    ];
    // Find the highest rank that the player qualifies for
    for (let i = ranks.length - 1; i >= 0; i--) {
        if (elo >= ranks[i].minElo) {
            return ranks[i];
        }
    }
    return ranks[0]; // Default to Iron
}
function getTimeAgo(date) {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    // Handle future dates (clock skew)
    if (diffMs < 0) {
        return 'Just now';
    }
    if (diffMins < 60) {
        return diffMins <= 1 ? 'Just now' : `${diffMins} minutes ago`;
    }
    else if (diffHours < 24) {
        return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
    }
    else if (diffDays < 7) {
        return diffDays === 1 ? 'Yesterday' : `${diffDays} days ago`;
    }
    else {
        return date.toLocaleDateString();
    }
}
function showError(container, message) {
    // Find a suitable place to show the error
    const contentDiv = container.querySelector('#profile-content');
    if (contentDiv) {
        contentDiv.innerHTML = `
            <div class="text-center text-red-400 py-8">
                <i class="bx bx-error text-4xl mb-4"></i>
                <div class="text-lg font-semibold mb-2">Error</div>
                <div class="text-sm">${message}</div>
            </div>
        `;
    }
}
//# sourceMappingURL=profileController.js.map