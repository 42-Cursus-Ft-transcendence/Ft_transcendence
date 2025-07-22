import { profileTemplate } from "../templates/profileTemplate.js";

// API interfaces based on backend structure
interface UserProfile {
    idUser: number;
    userName: string;
    email: string;
    avatarURL: string;
    elo: number;
    wins: number;
    losses: number;
    gamesPlayed: number;
}

interface MatchHistory {
    matchId: string;
    opponent: string;
    opponentId: number;
    result: 'win' | 'loss';
    playerScore: number;
    opponentScore: number;
    eloChange: number;
    matchDate: string;
}

interface LeaderboardEntry {
    userId: number;
    userName: string;
    avatarURL: string;
    elo: number;
    wins: number;
    losses: number;
    gamesPlayed: number;
    rank?: number;
    isCurrentUser?: boolean;
}

export async function renderProfile(container: HTMLElement, onBack: () => void) {
    container.innerHTML = profileTemplate;

    // Bind back button
    bindBackButton(container, onBack);

    // Load user data and bind content
    await bindProfileContent(container);

    // Setup tab navigation
    bindTabNavigation(container);
}

function bindBackButton(container: HTMLElement, onBack: () => void) {
    const backBtn = container.querySelector<HTMLButtonElement>('#backBtn')!;
    backBtn.addEventListener('click', () => {
        onBack();
    });
}

async function bindProfileContent(container: HTMLElement) {
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
    } catch (error) {
        console.error('Error loading profile data:', error);
        showError(container, 'Failed to load profile data');
    }
}

function updateProfileTab(container: HTMLElement, profile: UserProfile) {
    // Update avatar
    const avatar = container.querySelector<HTMLImageElement>('#profile-avatar')!;
    if (profile.avatarURL) {
        avatar.src = profile.avatarURL;
    }

    // Update username
    const username = container.querySelector('#profile-username')!;
    username.textContent = profile.userName;

    // Update ELO
    const elo = container.querySelector('#profile-elo')!;
    const eloBar = container.querySelector<HTMLElement>('#profile-elo-bar')!;
    const rankImg = container.querySelector<HTMLImageElement>('#profile-rank')!;

    elo.textContent = profile.elo.toString();
    
    // Calculate rank based on ELO (every 500 points)
    const rankInfo = getRankFromElo(profile.elo);
    
    // Update rank image
    if (rankInfo.image) {
        rankImg.src = `assets/rank/${rankInfo.image}`;
        rankImg.alt = rankInfo.name;
        rankImg.style.display = 'block';
    } else {
        // Hide image if no rank image available (Iron)
        rankImg.style.display = 'none';
    }
    
    // ELO bar based on progress within current rank
    const eloPercentage = ((profile.elo % 500) / 500) * 100;
    eloBar.style.width = `${eloPercentage}%`;

    // Update wins and losses
    const wins = container.querySelector('#profile-wins')!;
    const losses = container.querySelector('#profile-losses')!;
    const winrate = container.querySelector('#profile-winrate')!;

    wins.textContent = profile.wins.toString();
    losses.textContent = profile.losses.toString();

    const totalGames = profile.wins + profile.losses;
    const winratePercentage = totalGames > 0 ? Math.round((profile.wins / totalGames) * 100) : 0;
    winrate.textContent = `${winratePercentage}%`;
}

function updateHistoryTab(container: HTMLElement, matches: MatchHistory[]) {
    const historyContainer = container.querySelector('#match-history')!;

    if (matches.length === 0) {
        historyContainer.innerHTML = '<div class="text-center text-gray-400 py-8">No matches played yet</div>';
        return;
    }

    const matchElements = matches.slice(0, 10).map(match => {
        const resultClass = match.result === 'win' ? 'green' : 'red';
        const resultText = match.result === 'win' ? 'Victory' : 'Defeat';
        const eloChangeText = match.eloChange > 0 ? `+${match.eloChange}` : match.eloChange.toString();
        const scoreText = `${match.playerScore}-${match.opponentScore}`;

        // Format date
        const date = new Date(match.matchDate);
        const timeAgo = getTimeAgo(date);

        return `
            <div class="bg-black/30 border border-${resultClass}-500/50 rounded-lg p-4 flex items-center justify-between">
                <div class="flex items-center space-x-4">
                    <div class="w-3 h-3 bg-${resultClass}-500 rounded-full"></div>
                    <div>
                        <div class="text-white font-semibold">${resultText} vs. ${match.opponent}</div>
                        <div class="text-gray-400 text-sm">${timeAgo} • Score: ${scoreText}</div>
                    </div>
                </div>
                <div class="text-${resultClass}-400 font-bold">${eloChangeText} ELO</div>
            </div>
        `;
    }).join('');

    historyContainer.innerHTML = matchElements;
}

function updateRankingTab(container: HTMLElement, leaderboard: LeaderboardEntry[], userProfile: UserProfile) {
    const leaderboardContainer = container.querySelector('#leaderboard')!;

    if (leaderboard.length === 0) {
        leaderboardContainer.innerHTML = '<div class="text-center text-gray-400 py-8">No ranking data available</div>';
        return;
    }

    const leaderboardElements = leaderboard.map((entry, index) => {
        const rank = index + 1;
        const rankClass = rank === 1 ? 'yellow' : rank === 2 ? 'gray' : rank === 3 ? 'orange' : 'blue';
        const borderClass = entry.isCurrentUser ? 'border-2 border-green-500' : `border border-${rankClass}-500`;
        const bgClass = entry.isCurrentUser ? 'from-green-600/30 to-blue-600/30' : `from-${rankClass}-600/30 to-${rankClass}-500/30`;

        return `
            <div class="bg-gradient-to-r ${bgClass} ${borderClass} rounded-lg p-4 flex items-center justify-between">
                <div class="flex items-center space-x-4">
                    <div class="w-8 h-8 bg-${rankClass}-500 rounded-full flex items-center justify-center text-black font-bold">${rank}</div>
                    <img src="${entry.avatarURL || 'assets/icone/Lucian.webp'}" alt="Avatar" class="w-10 h-10 rounded-full border-2 border-${rankClass}-400" />
                    <div>
                        <div class="text-white font-semibold flex items-center">
                            <span>${entry.userName}</span>
                            ${entry.isCurrentUser ? '<span class="ml-2 text-xs bg-green-500 text-black px-2 py-1 rounded-full">YOU</span>' : ''}
                        </div>
                        <div class="text-gray-400 text-sm">${entry.wins} wins • ${entry.losses} losses</div>
                    </div>
                </div>
                <div class="text-${rankClass}-400 font-bold">${entry.elo} ELO</div>
            </div>
        `;
    }).join('');

    leaderboardContainer.innerHTML = leaderboardElements;
}

function bindTabNavigation(container: HTMLElement) {
    let currentTab = "profile";
    const nav = container.querySelector('nav[aria-label="Profile Tabs"]')!;

    // Activate default tab
    const defaultButton = container.querySelector(`button[data-tab="${currentTab}"]`)!;
    defaultButton.classList.add("border-pink-500", "text-white");
    container.querySelector(`#tab-${currentTab}`)!.classList.remove("hidden");

    // Add click listeners to all tab buttons
    nav.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target.matches('button[data-tab]')) {
            const newTab = target.getAttribute('data-tab')!;

            // Don't switch if it's the same tab
            if (newTab === currentTab) return;

            // Remove active state from current tab
            const currentButton = container.querySelector(`button[data-tab="${currentTab}"]`)!;
            currentButton.classList.remove("border-pink-500", "text-white");
            container.querySelector(`#tab-${currentTab}`)!.classList.add("hidden");

            // Add active state to new tab
            target.classList.add("border-pink-500", "text-white");
            container.querySelector(`#tab-${newTab}`)!.classList.remove("hidden");

            currentTab = newTab;
        }
    });
}

// Real API functions
async function fetchUserProfile(): Promise<UserProfile> {
    try {
        // Get basic user info
        const userResponse = await fetch('/api/me', {
            method: 'GET',
            credentials: 'include'
        });

        if (!userResponse.ok) {
            throw new Error('Failed to fetch user profile');
        }

        const userData = await userResponse.json();

        // Get user ranking data
        const leaderboardResponse = await fetch('/api/leaderboard?limit=100', {
            method: 'GET',
            credentials: 'include'
        });

        if (!leaderboardResponse.ok) {
            throw new Error('Failed to fetch ranking data');
        }

        const leaderboard = await leaderboardResponse.json();

        // Find current user in leaderboard
        const userRanking = leaderboard.find((entry: any) => entry.userId === userData.idUser);

        return {
            idUser: userData.idUser,
            userName: userData.userName,
            email: userData.email,
            avatarURL: userData.avatarURL || 'assets/icone/Lucian.webp',
            elo: userRanking?.elo || 4000,
            wins: userRanking?.wins || 0,
            losses: userRanking?.losses || 0,
            gamesPlayed: userRanking?.gamesPlayed || 0
        };
    } catch (error) {
        console.error('Error fetching user profile:', error);
        throw error;
    }
}

async function fetchMatchHistory(): Promise<MatchHistory[]> {
    try {
        // For now, return empty array since there's no specific match history endpoint
        // You might need to add this endpoint to the backend
        console.log('Match history endpoint not implemented yet');
        return [];
    } catch (error) {
        console.error('Error fetching match history:', error);
        return [];
    }
}

async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
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

        return leaderboard.map((entry: any, index: number) => ({
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
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        throw error;
    }
}

// Helper functions
function getRankFromElo(elo: number): { name: string; image?: string } {
    const ranks = [
        { name: "Iron", minElo: 0 }, // No image available for Iron
        { name: "Bronze", image: "Bronze.webp", minElo: 500 },
        { name: "Silver", image: "Silver.webp", minElo: 1000 },
        { name: "Gold", image: "Gold.png", minElo: 1500 },
        { name: "Platinum", image: "Platinum.webp", minElo: 2000 },
        { name: "Diamond", image: "Diamond.webp", minElo: 2500 },
        { name: "Master", image: "Master.webp", minElo: 3000 },
        { name: "Grandmaster", image: "Grandmaster.webp", minElo: 3500 },
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

function getTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) {
        return diffMins <= 1 ? 'Just now' : `${diffMins} minutes ago`;
    } else if (diffHours < 24) {
        return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
    } else if (diffDays < 7) {
        return diffDays === 1 ? 'Yesterday' : `${diffDays} days ago`;
    } else {
        return date.toLocaleDateString();
    }
}

function showError(container: HTMLElement, message: string) {
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