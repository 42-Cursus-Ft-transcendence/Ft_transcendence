import { friendsTemplate, createFriendCard, createPendingRequestCard } from "../templates/friendsTemplate.js";
// Store the current WebSocket and container for friends notifications
let currentSocket = null;
let currentContainer = null;
export async function renderFriends(container, socket, onBack) {
    container.innerHTML = friendsTemplate;
    // Bind back button
    bindBackButton(container, onBack);
    // Setup WebSocket message handling for friends
    setupFriendsWebSocketHandling(socket, container);
    // Load friends data and bind content
    await bindFriendsContent(container);
    // Setup event listeners
    bindFriendsInteractions(container);
}
function bindBackButton(container, onBack) {
    const backBtn = container.querySelector('#backBtn');
    backBtn.addEventListener('click', () => {
        cleanupFriendsWebSocketHandling();
        onBack();
    });
}
async function bindFriendsContent(container) {
    try {
        console.log('>> Loading friends data...');
        // Fetch friends and pending requests
        const friendsData = await fetchFriends();
        // Update friends grid
        updateFriendsGrid(container, friendsData.friends, friendsData.pendingRequests);
    }
    catch (error) {
        console.error('Error loading friends data:', error);
        showError(container, 'Failed to load friends data');
    }
}
function updateFriendsGrid(container, friends, pendingRequests) {
    const friendsGrid = container.querySelector('#friends-grid');
    // Combine friends and pending requests for display
    const allCards = [];
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
    }
    else {
        friendsGrid.innerHTML = allCards.join('');
    }
}
function bindFriendsInteractions(container) {
    // Add friend button
    const addFriendBtn = container.querySelector('#add-friend-btn');
    const modal = container.querySelector('#add-friend-modal');
    const closeModalBtn = container.querySelector('#close-modal');
    const cancelBtn = container.querySelector('#cancel-add-friend');
    const sendRequestBtn = container.querySelector('#send-friend-request');
    const usernameInput = container.querySelector('#friend-username');
    const errorElement = container.querySelector('#error-add-friend');
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
        }
        catch (error) {
            showError(error.message || 'Failed to send friend request');
        }
        finally {
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
        const target = e.target;
        const actionBtn = target.closest('.friend-action-btn');
        const requestBtn = target.closest('.request-action-btn');
        if (actionBtn) {
            const userId = parseInt(actionBtn.dataset.userId);
            // Only remove action is available now
            if (confirm('Are you sure you want to remove this friend?')) {
                try {
                    await removeFriend(userId);
                    await bindFriendsContent(container);
                }
                catch (error) {
                    console.error('Friend action error:', error);
                    alert(error.message || 'Failed to remove friend');
                }
            }
        }
        if (requestBtn) {
            const action = requestBtn.dataset.action;
            const userId = parseInt(requestBtn.dataset.userId);
            await handleRequestAction(action, userId, container);
        }
    });
    // Error handling helper functions
    function showError(message) {
        errorElement.textContent = message;
        errorElement.classList.remove('hidden');
    }
    function clearError() {
        errorElement.textContent = '';
        errorElement.classList.add('hidden');
    }
}
async function handleRequestAction(action, userId, container) {
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
    }
    catch (error) {
        console.error('Request action error:', error);
        alert(error.message || 'Failed to perform action');
    }
}
// API functions
async function fetchFriends() {
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
    }
    catch (error) {
        console.error('Error fetching friends:', error);
        throw error;
    }
}
async function sendFriendRequest(username) {
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
    }
    catch (error) {
        console.error('Error sending friend request:', error);
        throw error;
    }
}
async function acceptFriendRequest(userId) {
    try {
        const response = await fetch(`/api/friends/request/${userId}/accept`, {
            method: 'POST',
            credentials: 'include'
        });
        if (!response.ok) {
            throw new Error('Failed to accept friend request');
        }
        console.log('Friend request accepted');
    }
    catch (error) {
        console.error('Error accepting friend request:', error);
        throw error;
    }
}
async function declineFriendRequest(userId) {
    try {
        const response = await fetch(`/api/friends/request/${userId}/decline`, {
            method: 'POST',
            credentials: 'include'
        });
        if (!response.ok) {
            throw new Error('Failed to decline friend request');
        }
        console.log('Friend request declined');
    }
    catch (error) {
        console.error('Error declining friend request:', error);
        throw error;
    }
}
async function cancelFriendRequest(userId) {
    try {
        const response = await fetch(`/api/friends/request/${userId}/cancel`, {
            method: 'DELETE',
            credentials: 'include'
        });
        if (!response.ok) {
            throw new Error('Failed to cancel friend request');
        }
        console.log('Friend request cancelled');
    }
    catch (error) {
        console.error('Error cancelling friend request:', error);
        throw error;
    }
}
async function removeFriend(userId) {
    try {
        const response = await fetch(`/api/friends/${userId}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        if (!response.ok) {
            throw new Error('Failed to remove friend');
        }
        console.log('Friend removed successfully');
    }
    catch (error) {
        console.error('Error removing friend:', error);
        throw error;
    }
}
function showError(container, message) {
    const friendsGrid = container.querySelector('#friends-grid');
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
function setupFriendsWebSocketHandling(socket, container) {
    // Store references for message handling
    currentSocket = socket;
    currentContainer = container;
    // Add message listener for friends notifications
    socket.addEventListener('message', handleWebSocketMessage);
    console.log('✅ Friends WebSocket handling setup complete');
}
function handleWebSocketMessage(event) {
    if (!currentContainer)
        return;
    try {
        const message = JSON.parse(event.data);
        handleFriendsWebSocketMessage(message, currentContainer);
    }
    catch (error) {
        // Not all messages are for friends
    }
}
function handleFriendsWebSocketMessage(message, container) {
    switch (message.type) {
        case 'friend_system_ready':
            console.log('Friend notification system ready');
            break;
        case 'friend_notification':
            handleFriendNotification(message.notification, container);
            break;
        default:
            // Ignore other message types
            break;
    }
}
async function handleFriendNotification(notification, container) {
    console.log('📱 Friend notification received:', notification);
    switch (notification.type) {
        case 'friend_request_received':
            // New friend request received - refresh the page
            await bindFriendsContent(container);
            break;
        case 'friend_request_accepted':
            // Friend request was accepted - refresh the page
            await bindFriendsContent(container);
            break;
        case 'friend_request_declined':
            // Friend request was declined - refresh the page
            await bindFriendsContent(container);
            break;
        case 'friend_removed':
            // You were removed as a friend - refresh the page
            await bindFriendsContent(container);
            break;
        case 'friend_online':
            // Friend came online - update their status
            updateFriendStatus(notification.data.userId, 'online', container);
            break;
        case 'friend_offline':
            // Friend went offline - update their status
            updateFriendStatus(notification.data.userId, 'offline', container);
            break;
    }
}
function updateFriendStatus(userId, status, container) {
    const friendCards = container.querySelectorAll('.friend-action-btn');
    friendCards.forEach(card => {
        if (parseInt(card.getAttribute('data-user-id') || '0') === userId) {
            const friendCard = card.closest('.bg-gradient-to-br');
            if (friendCard) {
                // Update status indicator
                const statusIndicator = friendCard.querySelector('.w-4.h-4');
                if (statusIndicator) {
                    statusIndicator.className = `absolute -bottom-1 -right-1 w-4 h-4 ${status === 'online' ? 'bg-green-500' : 'bg-gray-500'} rounded-full border-2 border-black shadow-lg`;
                }
                // Update status text
                const statusText = friendCard.querySelector('.text-xs.text-purple-300');
                if (statusText) {
                    statusText.textContent = status === 'online' ? 'Online' : 'Offline';
                }
            }
        }
    });
}
// Cleanup function to remove WebSocket message listener when leaving the friends page
function cleanupFriendsWebSocketHandling() {
    if (currentSocket) {
        currentSocket.removeEventListener('message', handleWebSocketMessage);
        currentSocket = null;
    }
    currentContainer = null;
    console.log('🧹 Friends WebSocket handling cleaned up');
}
//# sourceMappingURL=friendsControllers.js.map