export const loginTemplate = `
  <div id="form" class="w-full max-w-md space-y-6 bg-black/70 rounded-3xl p-8 text-green-400">
    <div class="text-center space-y-4">
      <!-- Title -->
      <h3 class="text-3xl font-semibold text-pink-500">
        Welcome Back
      </h3>
      <!-- Subtitle -->
      <p class="text-sm text-blue-300">
        Log in to continue 
      </p>
    </div>
    
    <form id="loginForm" class="space-y-5">
      <!-- Email -->
      <div>
        <div class="relative">
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <i class='bx bx-user   text-pink-500'></i> 
          </div>
          <input id="name" type="text" required placeholder="UserName" class="w-full pl-10 pr-4 py-3
                 bg-black/30 placeholder-blue-300
                 text-green-400 outline-none
                 border border-pink-500/30
                 rounded-lg
                 focus:border-pink-500
                 transition" />
        </div>
        <p id="error-name" class="text-red-500 text-sm mt-1 hidden"></p>
      </div>
      
      <!-- Password -->
      <div>
        <div class="relative">
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <i class='bx bx-lock   text-pink-500'></i> 
          </div>
          <input id="password" type="password" required placeholder="Password" class="w-full pl-10 pr-12 py-3
                 bg-black/30 placeholder-blue-300
                 text-green-400 outline-none
                 border border-pink-500/30
                 rounded-lg
                 focus:border-pink-500
                 transition" />
          <div class="absolute inset-y-0 right-0 pr-3 flex items-center">
            <i id="togglePassword" class="bx bx-eye-slash text-blue-300 cursor-pointer hover:text-pink-400 transition" ></i>
          </div>
        </div>
        <p id="error-password" class="text-red-500 text-sm mt-1 hidden"></p>
      </div>
      
      <!-- Submit Button -->
      <button id="submitBtn" type="submit" class="threeD-button-set">
        <span id="submitText">LogIn</span>
      </button>
    </form>
    
    <!-- Divider -->
    <div class="flex items-center space-x-4 my-6">
      <div class="flex-1 h-1 bg-gradient-to-r from-transparent via-pink-500/50 to-pink-500/30"></div>
      <span class="text-blue-300 text-sm font-medium px-2">or</span>
      <div class="flex-1 h-1 bg-gradient-to-l from-transparent via-pink-500/50 to-pink-500/30"></div>
    </div>
    
    <!-- Google Button -->
    <div>
      <button id="googleBtn" class="w-full flex items-center justify-center gap-x-3
             py-3 border border-pink-500/30
             text-green-400 font-medium
             rounded-lg
             hover:bg-pink-500/20 hover:border-pink-500
             transition">
        <img src="./assets/google-icon.svg" alt="Google" class="w-5 h-5" />
        Continue with Google
      </button>
    </div>
    
    <!-- Sign up link -->
    <div class="text-center text-sm">
      <span class="text-blue-300">Don't have an account? </span> 
      <br />
      <a href="#signup" class="font-medium text-pink-400 hover:text-pink-300 transition">
        Sign up
      </a>
    </div>
  </div>
`;
//# sourceMappingURL=loginTemplate.js.map