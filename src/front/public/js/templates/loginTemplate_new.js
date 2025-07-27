export const loginTemplate = `
  <div id="form" class="w-full max-w-md space-y-6 bg-black/70 rounded-3xl p-8 text-green-400">
    <div class="text-center space-y-4">
      <!-- Title -->
      <h3 class="text-2xl font-semibold text-green-400">
        Welcome Back
      </h3>
      <!-- Subtitle -->
      <p class="text-sm text-blue-300">
        Sign in to continue to StyleMe
      </p>
    </div>
    
    <form id="loginForm" class="space-y-5">
      <!-- Email -->
      <div class="relative">
        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg class="w-5 h-5 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"></path>
          </svg>
        </div>
        <input id="name" type="text" required placeholder="Email address" class="w-full pl-10 pr-4 py-3
               bg-black/30 placeholder-blue-300
               text-green-400 outline-none
               border border-pink-500/30
               rounded-lg
               focus:border-pink-500
               transition" />
        <p id="error-name" class="text-red-500 text-sm mt-1 hidden"></p>
      </div>
      
      <!-- Password -->
      <div class="relative">
        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg class="w-5 h-5 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
          </svg>
        </div>
        <input id="password" type="password" required placeholder="Password" class="w-full pl-10 pr-12 py-3
               bg-black/30 placeholder-blue-300
               text-green-400 outline-none
               border border-pink-500/30
               rounded-lg
               focus:border-pink-500
               transition" />
        <div class="absolute inset-y-0 right-0 pr-3 flex items-center">
          <svg class="w-5 h-5 text-blue-300 cursor-pointer hover:text-pink-400 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
          </svg>
        </div>
        <p id="error-password" class="text-red-500 text-sm mt-1 hidden"></p>
      </div>
      
      <!-- Remember me & Forgot password -->
      <div class="flex items-center justify-between text-sm">
        <label class="flex items-center space-x-2">
          <input type="checkbox" class="w-4 h-4 text-pink-500 bg-black/30 border-pink-500/30 rounded focus:ring-pink-500 focus:ring-2">
          <span class="text-blue-300">Remember me</span>
        </label>
        <a href="#forgot-password" class="text-pink-400 hover:text-pink-300 transition">
          Forgot password?
        </a>
      </div>
      
      <!-- Submit Button -->
      <button id="submitBtn" type="submit" class="w-full bg-green-400 hover:bg-green-300 text-black font-semibold py-3 px-4 rounded-lg transition duration-200 transform hover:scale-105">
        <span id="submitText">Sign In →</span>
      </button>
    </form>
    
    <!-- Divider -->
    <div class="relative">
      <div class="absolute inset-0 flex items-center">
        <div class="w-full border-t border-pink-500/30"></div>
      </div>
      <div class="relative flex justify-center text-sm">
        <span class="px-2 bg-black/70 text-blue-300">or</span>
      </div>
    </div>
    
    <!-- Google Button -->
    <div>
      <button id="googleBtn" class="w-full flex items-center justify-center gap-x-3
             py-3 border border-pink-500/30
             text-green-400 font-medium
             rounded-lg
             hover:bg-pink-500/20 hover:border-pink-500
             transition">
        <svg class="w-5 h-5" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Sign in with Google
      </button>
    </div>
    
    <!-- Sign up link -->
    <div class="text-center text-sm">
      <span class="text-blue-300">Don't have an account? </span>
      <a href="#signup" class="font-medium text-pink-400 hover:text-pink-300 transition">
        Sign up
      </a>
    </div>
  </div>
`;
//# sourceMappingURL=loginTemplate_new.js.map