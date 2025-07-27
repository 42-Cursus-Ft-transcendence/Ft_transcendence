
export const signupTemplate = `
  <div id="form" class="w-full max-w-md space-y-6 bg-black/70 rounded-3xl p-8 text-green-400">
    <div class="text-center space-y-4">
      <!-- Title -->
      <h3 class="text-3xl font-semibold text-pink-500">
        Create an Account
      </h3>
      <!-- Subtitle -->
      <p class="text-sm text-blue-300">
        Sign up to get started
      </p>
    </div>
    
    <form id="signupForm" class="space-y-5">
      <!-- Name -->
      <div>
        <div class="relative">
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <i class='bx bx-user text-pink-500'></i> 
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

      <!-- Email -->
      <div>
        <div class="relative">
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <i class='bx bx-envelope text-pink-500'></i> 
          </div>
          <input id="email" type="email" required placeholder="Email Address" class="w-full pl-10 pr-4 py-3
                 bg-black/30 placeholder-blue-300
                 text-green-400 outline-none
                 border border-pink-500/30
                 rounded-lg
                 focus:border-pink-500
                 transition" />
        </div>
        <p id="error-email" class="text-red-500 text-sm mt-1 hidden"></p>
      </div>

      <!-- Password -->
      <div>
        <div class="relative">
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <i class='bx bx-lock text-pink-500'></i> 
          </div>
          <input id="password" type="password" required placeholder="Password" class="w-full pl-10 pr-12 py-3
                 bg-black/30 placeholder-blue-300
                 text-green-400 outline-none
                 border border-pink-500/30
                 rounded-lg
                 focus:border-pink-500
                 transition" />
          <div class="absolute inset-y-0 right-0 pr-3 flex items-center">
            <i id="togglePassword" class="bx bx-eye-slash text-blue-300 cursor-pointer hover:text-pink-400 transition"></i>
          </div>
        </div>
        <p id="error-password" class="text-red-500 text-sm mt-1 hidden"></p>
      </div>

      <!-- Confirm Password -->
      <div>
        <div class="relative">
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <i class='bx bx-lock text-pink-500'></i> 
          </div>
          <input id="confirmPassword" type="password" required placeholder="Confirm Password" class="w-full pl-10 pr-12 py-3
                 bg-black/30 placeholder-blue-300
                 text-green-400 outline-none
                 border border-pink-500/30
                 rounded-lg
                 focus:border-pink-500
                 transition" />
          <div class="absolute inset-y-0 right-0 pr-3 flex items-center">
            <i id="toggleConfirmPassword" class="bx bx-eye-slash text-blue-300 cursor-pointer hover:text-pink-400 transition"></i>
          </div>
        </div>
        <p id="error-confirmPassword" class="text-red-500 text-sm mt-1 hidden"></p>
      </div>

      <!-- Submit Button -->
      <button id="submitBtn" type="submit" class="threeD-button-set">
        <span id="submitText">Create Account</span>
      </button>
    </form>
    
    <!-- Sign in link -->
    <div class="text-center text-sm">
      <span class="text-blue-300">Already have an account? </span> 
      <br />
      <a href="#login" class="font-medium text-pink-400 hover:text-pink-300 transition">
        Sign in
      </a>
    </div>
  </div>
`;