import { friendsTemplate, createFriendCard, createPendingRequestCard } from "../templates/friendsTemplate.js";

// API interfaces for friends functionality
interface Friend {
    userId: number;
    userName: string;
    avatarURL: string;
    status: 'online' | 'offline' | 'in-game';
    lastSeen?: string;
    isOnline: boolean;
}

interface FriendRequest {
    requestId: number;
    userId: number;
    userName: string;
    avatarURL: string;
    requestedAt: string;
    type: 'sent' | 'received';
}

interface FriendListResponse {
    friends: Friend[];
    pendingRequests: FriendRequest[];
}

export async function renderFriends(container: HTMLElement, onBack: () => void) {
    container.innerHTML = friendsTemplate;

    // Bind back button
    bindBackButton(container, onBack);

    // Load friends data and bind content
    await bindFriendsContent(container);

    // Setup event listeners
    bindFriendsInteractions(container);
}

function bindBackButton(container: HTMLElement, onBack: () => void) {
    const backBtn = container.querySelector<HTMLButtonElement>('#backBtn')!;
    backBtn.addEventListener('click', () => {
        onBack();
    });
}

async function bindFriendsContent(container: HTMLElement) {
    try {
        console.log('>> Loading friends data...');

        // Fetch friends and pending requests
        const friendsData = await fetchFriends();

        // Update friends grid
        updateFriendsGrid(container, friendsData.friends, friendsData.pendingRequests);

    } catch (error) {
        console.error('Error loading friends data:', error);
        showError(container, 'Failed to load friends data');
    }
}

function updateFriendsGrid(container: HTMLElement, friends: Friend[], pendingRequests: FriendRequest[]) {
    const friendsGrid = container.querySelector('#friends-grid')!;

    // Combine friends and pending requests for display
    const allCards: string[] = [];

    // Add friend cards
    friends.forEach(friend => {
        allCards.push(createFriendCard(friend));
    });

    // Add pending request cards
    pendingRequests.forEach(request => {
        allCards.push(createPendingRequestCard(request));
    });

    // Display message if no friends or requests
    if (allCards.length === 0) {
        friendsGrid.innerHTML = `
            <div class="col-span-full text-center py-12">
                <div class="text-gray-400 text-lg mb-4">
                    <i class="bx bx-user-plus text-6xl mb-4 block text-purple-400"></i>
                    No friends yet!
                </div>
                <p class="text-gray-500 text-sm">Click "Add Friend" to get started</p>
            </div>
        `;
    } else {
        friendsGrid.innerHTML = allCards.join('');
    }
}

function bindFriendsInteractions(container: HTMLElement) {
    // Add friend button
    const addFriendBtn = container.querySelector('#add-friend-btn')!;
    const modal = container.querySelector('#add-friend-modal')!;
    const closeModalBtn = container.querySelector('#close-modal')!;
    const cancelBtn = container.querySelector('#cancel-add-friend')!;
    const sendRequestBtn = container.querySelector<HTMLButtonElement>('#send-friend-request')!;
    const usernameInput = container.querySelector<HTMLInputElement>('#friend-username')!;
    const errorElement = container.querySelector('#error-add-friend')!;

    // Open modal
    addFriendBtn.addEventListener('click', () => {
        modal.classList.remove('hidden');
        usernameInput.focus();
        clearError();
    });

    // Close modal
    const closeModal = () => {
        modal.classList.add('hidden');
        usernameInput.value = '';
        clearError();
    };

    closeModalBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);

    // Click outside to close
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });

    // Send friend request
    sendRequestBtn.addEventListener('click', async () => {
        const username = usernameInput.value.trim();

        if (!username) {
            showError('Please enter a username');
            return;
        }

        try {
            sendRequestBtn.disabled = true;
            sendRequestBtn.textContent = 'Sending...';

            await sendFriendRequest(username);

            // Success - close modal and refresh
            closeModal();
            await bindFriendsContent(container);

        } catch (error: any) {
            showError(error.message || 'Failed to send friend request');
        } finally {
            sendRequestBtn.disabled = false;
            sendRequestBtn.textContent = 'Send';
        }
    });

    // Enter key to send request
    usernameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendRequestBtn.click();
        }
    });

    // Friend action buttons (using event delegation)
    container.addEventListener('click', async (e) => {
        const target = e.target as HTMLElement;
        const actionBtn = target.closest('.friend-action-btn') as HTMLButtonElement;
        const requestBtn = target.closest('.request-action-btn') as HTMLButtonElement;

        if (actionBtn) {
            const action = actionBtn.dataset.action;
            const userId = parseInt(actionBtn.dataset.userId!);

            await handleFriendAction(action!, userId, container);
        }

        if (requestBtn) {
            const action = requestBtn.dataset.action;
            const userId = parseInt(requestBtn.dataset.userId!);

            await handleRequestAction(action!, userId, container);
        }
    });

    // Error handling helper functions
    function showError(message: string) {
        errorElement.textContent = message;
        errorElement.classList.remove('hidden');
    }

    function clearError() {
        errorElement.textContent = '';
        errorElement.classList.add('hidden');
    }
}

async function handleFriendAction(action: string, userId: number, container: HTMLElement) {
    try {
        switch (action) {
            case 'invite':
                // TODO: Implement game invitation
                console.log('Inviting user to game:', userId);
                alert('Game invitation feature coming soon!');
                break;

            case 'remove':
                if (confirm('Are you sure you want to remove this friend?')) {
                    await removeFriend(userId);
                    await bindFriendsContent(container);
                }
                break;
        }
    } catch (error: any) {
        console.error('Friend action error:', error);
        alert(error.message || 'Failed to perform action');
    }
}

async function handleRequestAction(action: string, userId: number, container: HTMLElement) {
    try {
        switch (action) {
            case 'accept':
                await acceptFriendRequest(userId);
                await bindFriendsContent(container);
                break;

            case 'decline':
                await declineFriendRequest(userId);
                await bindFriendsContent(container);
                break;

            case 'cancel':
                if (confirm('Are you sure you want to cancel this friend request?')) {
                    await cancelFriendRequest(userId);
                    await bindFriendsContent(container);
                }
                break;
        }
    } catch (error: any) {
        console.error('Request action error:', error);
        alert(error.message || 'Failed to perform action');
    }
}

// API functions
async function fetchFriends(): Promise<FriendListResponse> {
    try {
        const response = await fetch('/api/friends', {
            method: 'GET',
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to fetch friends');
        }

        const data = await response.json();

        return {
            friends: data.friends || [],
            pendingRequests: data.pendingRequests || []
        };
    } catch (error) {
        console.error('Error fetching friends:', error);
        throw error;
    }
}

async function sendFriendRequest(username: string): Promise<void> {
    try {
        const response = await fetch('/api/friends/request', {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to send friend request');
        }

        console.log('Friend request sent successfully');
    } catch (error) {
        console.error('Error sending friend request:', error);
        throw error;
    }
}

async function acceptFriendRequest(userId: number): Promise<void> {
    try {
        const response = await fetch(`/api/friends/request/${userId}/accept`, {
            method: 'POST',
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to accept friend request');
        }

        console.log('Friend request accepted');
    } catch (error) {
        console.error('Error accepting friend request:', error);
        throw error;
    }
}

async function declineFriendRequest(userId: number): Promise<void> {
    try {
        const response = await fetch(`/api/friends/request/${userId}/decline`, {
            method: 'POST',
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to decline friend request');
        }

        console.log('Friend request declined');
    } catch (error) {
        console.error('Error declining friend request:', error);
        throw error;
    }
}

async function cancelFriendRequest(userId: number): Promise<void> {
    try {
        const response = await fetch(`/api/friends/request/${userId}/cancel`, {
            method: 'DELETE',
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to cancel friend request');
        }

        console.log('Friend request cancelled');
    } catch (error) {
        console.error('Error cancelling friend request:', error);
        throw error;
    }
}

async function removeFriend(userId: number): Promise<void> {
    try {
        const response = await fetch(`/api/friends/${userId}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to remove friend');
        }

        console.log('Friend removed successfully');
    } catch (error) {
        console.error('Error removing friend:', error);
        throw error;
    }
}

function showError(container: HTMLElement, message: string) {
    const friendsGrid = container.querySelector('#friends-grid')!;
    friendsGrid.innerHTML = `
        <div class="col-span-full text-center py-12">
            <div class="text-red-400 text-lg mb-4">
                <i class="bx bx-error text-6xl mb-4 block"></i>
                Error
            </div>
            <p class="text-red-300 text-sm">${message}</p>
        </div>
    `;
}