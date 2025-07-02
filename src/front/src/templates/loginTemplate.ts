export const loginTemplate =`
  <div id="form" class="w-full max-w-md space-y-6 bg-black/70 rounded-3xl p-8 text-green-400">
    <div class="text-center space-y-2">
      <h3 class="text-3xl font-bold text-pink-500 ">
        Welcome back
      </h3>
      <p class="text-sm text-blue-300">
        Don’t have an account?
        <a href="#signup" class="font-medium text-pink-400 hover:text-pink-300 transition">
          Sign up
        </a>
      </p>
    </div>
    <form id="loginForm" class="space-y-5">
      <!-- Username -->
      <div>
        <label for="name" class="block mb-1">Username</label>
        <input id="name" type="text" required placeholder="Your username" class="w-full px-4 py-2
               bg-black/30 placeholder-green-600
               text-green-400 outline-none
               border border-pink-500
               rounded-lg
               focus:border-blue-400
               transition" />
        <p id="error-name" class="text-red-500 text-sm mt-1 hidden"></p>
      </div>
      <!-- Password -->
      <div>
        <label for="password" class="block mb-1">Password</label>
        <input id="password" type="password" required placeholder="••••••••" class="w-full px-4 py-2
               bg-black/30 placeholder-green-600
               text-green-400 outline-none
               border border-pink-500
               rounded-lg
               focus:border-blue-400
               transition" />
        <p id="error-password" class="text-red-500 text-sm mt-1 hidden"></p>
      </div>
      <!-- Submit -->
      <button id="submitBtn" type="submit" class="threeD-button-set">
        <span id="submitText">LOG IN</span>
      </button>
    </form>
    <!-- Social login -->
    <div>
      <button class="w-full flex items-center justify-center gap-x-3
             mt-4 py-2 border border-pink-500
             text-green-400 uppercase tracking-wide
             rounded-lg
             hover:bg-pink-500/30 hover:border-pink-400
             transition">
        <img src="./assets/google-icon.svg" alt="Google" class="w-5 h-5" />
        Continue with Google
      </button>
    </div>
  </div>
`