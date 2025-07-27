export const notificationTemplate = `
<div id="notification-modal" class="hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-md">
  <div class="flex items-center justify-center w-full h-full">
    <div class="bg-gradient-to-br from-purple-900/80 via-pink-900/60 to-black/90 backdrop-blur-sm border border-purple-400/50 rounded-lg shadow-lg shadow-purple-500/30 w-full max-w-sm p-4 space-y-3">
      <div class="flex justify-between items-center">
        <h2 class="text-sm font-semibold text-pink-400 drop-shadow-lg">Notification</h2>
        <button type="button" id="notification-close" class="absolute top-2 right-2 text-pink-400 hover:text-purple-300 text-2xl transition-colors">&times;</button>
      </div>
      
      <div class="flex justify-center items-center py-4">
        <p id="notification-content" class="text-cyan-300 text-sm text-center"></p>
      </div>
      
      <div class="flex justify-center">
        <button type="button" id="notification-ok" class="threeD-button-set">
          OK
        </button>
      </div>
      

    </div>
  </div>
</div>
`;
