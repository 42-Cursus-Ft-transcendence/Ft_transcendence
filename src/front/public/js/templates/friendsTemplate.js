export const friendsTemplate = `
<div class="w-full h-full flex flex-col items-center p-6 bg-black/70 backdrop-blur-sm rounded-[40px] shadow-neon font-arcade text-green-400 relative">
  <!-- Back Button -->
  <button type="button" id="backBtn" class="absolute top-3 right-6 text-pink-400 hover:text-purple-300 text-2xl transition-colors z-20">&times;</button>

  <!-- Header -->
  <div class="w-full text-center mb-6">
    <h1 class="text-3xl font-bold text-white mb-2 drop-shadow-lg">My Friends</h1>
    <div class="w-20 h-1 bg-gradient-to-r from-purple-500 to-pink-500 mx-auto rounded-full"></div>
  </div>

  <!-- Friends Container -->
  <div class="w-full max-w-4xl flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-purple-500 scrollbar-track-transparent hover:scrollbar-thumb-pink-500">
    
    <!-- Friends Grid -->
    <div id="friends-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
      <!-- Friends will be populated here -->
    </div>

    <!-- Add Friend Button -->
    <div class="flex justify-center">
      <button id="add-friend-btn" class="bg-gradient-to-br from-purple-900/40 via-pink-900/30 to-black/50 backdrop-blur-sm border-2 border-dashed border-purple-400/50 hover:border-pink-400 rounded-2xl p-4 w-48 h-32 flex flex-col items-center justify-center transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/30 group">
        <div class="w-12 h-12 rounded-full border-2 border-purple-400/50 group-hover:border-pink-400 flex items-center justify-center mb-2 transition-all duration-300">
          <i class="bx bx-plus text-2xl text-purple-400 group-hover:text-pink-400 transition-colors"></i>
        </div>
        <span class="text-sm font-semibold text-purple-300 group-hover:text-pink-300 transition-colors">Add Friend</span>
      </button>
    </div>
  </div>

  <!-- Add Friend Modal -->
  <div id="add-friend-modal" class="hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-md animate-fadeIn">
    <div class="flex items-center justify-center w-full h-full p-4">
      <div class="bg-gradient-to-br from-purple-900/80 via-pink-900/60 to-black/90 backdrop-blur-sm border border-purple-400/50 rounded-2xl shadow-lg shadow-purple-500/30 w-full max-w-md p-6 space-y-6 animate-scaleIn">
        <div class="flex justify-between items-center">
          <h2 class="text-xl font-semibold text-pink-400 drop-shadow-lg">Add Friend</h2>
          <button type="button" id="close-modal" class="text-pink-400 hover:text-purple-300 text-2xl transition-colors">&times;</button>
        </div>
        
        <div class="space-y-4">
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <i class='bx bx-user text-pink-500'></i>
            </div>
            <input 
              type="text" 
              id="friend-username" 
              placeholder="Username" 
              class="w-full pl-10 pr-4 py-3 bg-black/30 placeholder-blue-300 text-green-400 outline-none border border-pink-500/30 rounded-lg focus:border-pink-500 transition" 
            />
          </div>
          <p id="error-add-friend" class="text-red-400 text-sm hidden"></p>
        </div>
        
        <div class="flex gap-3">
          <button type="button" id="cancel-add-friend" class="threeD-button-cancel">
            Cancel
          </button>
          <button type="button" id="send-friend-request" class="threeD-button-set">
            Send
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- Remove Friend Confirmation Modal -->
  <div id="remove-friend-modal" class="hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-md animate-fadeIn">
    <div class="flex items-center justify-center w-full h-full p-4">
      <div class="bg-gradient-to-br from-purple-900/80 via-pink-900/60 to-black/90 backdrop-blur-sm border border-purple-400/50 rounded-2xl shadow-lg shadow-purple-500/30 w-full max-w-md p-6 space-y-6 animate-scaleIn">
        <div class="flex justify-between items-center">
          <h2 class="text-xl font-semibold text-pink-400 drop-shadow-lg">Remove Friend</h2>
          <button type="button" id="close-remove-modal" class="text-pink-400 hover:text-purple-300 text-2xl transition-colors">&times;</button>
        </div>
        
        <div class="text-center space-y-4">
          <div class="flex justify-center">
            <div class="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center">
              <i class="bx bx-user-x text-3xl text-red-400"></i>
            </div>
          </div>
          <p class="text-cyan-300 text-lg">Are you sure you want to remove</p>
          <p id="friend-name-to-remove" class="text-white font-bold text-xl"></p>
          <p class="text-purple-300 text-sm">from your friends list?</p>
        </div>
        
        <div class="flex gap-3">
          <button type="button" id="cancel-remove-friend" class="threeD-button-cancel">
            Cancel
          </button>
          <button type="button" id="confirm-remove-friend" class="threeD-button-remove">
            Remove
          </button>
        </div>
      </div>
    </div>
  </div>
</div>
`;
// Template function for friend card
export function createFriendCard(friend) {
    const statusColor = friend.status === 'online' ? 'bg-green-500' :
        friend.status === 'in-game' ? 'bg-yellow-500' : 'bg-gray-500';
    const statusText = friend.status === 'online' ? 'Online' :
        friend.status === 'in-game' ? 'In Game' :
            friend.lastSeen ? `Last seen ${friend.lastSeen}` : 'Offline';
    return `
    <div class="bg-gradient-to-br from-purple-900/40 via-pink-900/30 to-black/50 backdrop-blur-sm border border-purple-400/50 rounded-2xl p-4 shadow-lg shadow-purple-500/30 hover:shadow-pink-500/30 transition-all duration-300 group">
      <!-- Friend Avatar -->
      <div class="flex flex-col items-center mb-3">
        <div class="relative mb-2">
          <img 
            src="${friend.avatarURL || 'assets/icone/Lucian.webp'}" 
            alt="${friend.userName}" 
            class="w-12 h-12 rounded-full border-2 border-pink-400 shadow-lg shadow-pink-400/60 group-hover:border-cyan-400 transition-all duration-300"
            onerror="this.src='assets/icone/Lucian.webp'"
          />
          <!-- Status indicator -->
          <div class="absolute -bottom-1 -right-1 w-4 h-4 ${statusColor} rounded-full border-2 border-black shadow-lg"></div>
        </div>
        
        <!-- Username -->
        <h3 class="text-sm font-bold text-white mb-1 text-center group-hover:text-cyan-300 transition-colors">
          ${friend.userName}
        </h3>
        
        <!-- Status -->
        <p class="text-xs text-purple-300 text-center mb-3">
          ${statusText}
        </p>
      </div>

      <!-- Action Buttons -->
      <div class="flex flex-col gap-1">
        <button 
          class="threeD-button-remove text-xs text-center friend-action-btn"
          data-action="remove" 
          data-user-id="${friend.userId}"
        >
          remove
        </button>
      </div>
    </div>
  `;
}
// Template function for pending friend request
export function createPendingRequestCard(request) {
    const timeAgo = getTimeAgo(new Date(request.requestedAt));
    return `
    <div class="bg-gradient-to-br from-yellow-900/40 via-orange-900/30 to-black/50 backdrop-blur-sm border border-yellow-400/50 rounded-2xl p-4 shadow-lg shadow-yellow-500/30 transition-all duration-300">
      <!-- Request Avatar -->
      <div class="flex flex-col items-center mb-3">
        <div class="relative mb-2">
          <img 
            src="${request.avatarURL || 'assets/icone/Lucian.webp'}" 
            alt="${request.userName}" 
            class="w-12 h-12 rounded-full border-2 border-yellow-400 shadow-lg shadow-yellow-400/60"
            onerror="this.src='assets/icone/Lucian.webp'"
          />
          <!-- Pending indicator -->
          <div class="absolute -bottom-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full border-2 border-black shadow-lg flex items-center justify-center">
            <i class="bx bx-time text-xs text-black"></i>
          </div>
        </div>
        
        <!-- Username -->
        <h3 class="text-sm font-bold text-white mb-1 text-center">
          ${request.userName}
        </h3>
        
        <!-- Request info -->
        <p class="text-xs text-yellow-300 text-center mb-3">
          ${request.type === 'sent' ? 'Request sent' : 'Request received'} ${timeAgo}
        </p>
      </div>

      <!-- Action Buttons -->
      <div class="flex flex-col gap-1">
        ${request.type === 'received' ? `
          <button 
            class="request-action-btn w-full py-1.5 px-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg transition-all text-xs font-medium"
            data-action="accept" 
            data-user-id="${request.userId}"
          >
            <i class="bx bx-check mr-1"></i>Accept
          </button>
          <button 
            class="request-action-btn w-full py-1.5 px-3 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white rounded-lg transition-all text-xs font-medium"
            data-action="decline" 
            data-user-id="${request.userId}"
          >
            <i class="bx bx-x mr-1"></i>Decline
          </button>
        ` : `
          <button 
            class="request-action-btn w-full py-1.5 px-3 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white rounded-lg transition-all text-xs font-medium"
            data-action="cancel" 
            data-user-id="${request.userId}"
          >
            <i class="bx bx-x mr-1"></i>Cancel
          </button>
        `}
      </div>
    </div>
  `;
}
// Helper function for time formatting
function getTimeAgo(date) {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffMins < 60) {
        return diffMins <= 1 ? 'just now' : `${diffMins} minutes ago`;
    }
    else if (diffHours < 24) {
        return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
    }
    else if (diffDays < 7) {
        return diffDays === 1 ? 'yesterday' : `${diffDays} days ago`;
    }
    else {
        return date.toLocaleDateString('en-US');
    }
}
//# sourceMappingURL=friendsTemplate.js.map