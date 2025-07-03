  
  export const signupTemplate = `
  <div id="form" class="w-full max-w-md space-y-6 bg-black/70 rounded-3xl p-8 text-green-400">
    <div class="text-center space-y-2">
      <h3 class="text-3xl font-bold text-pink-500 ">
        Create an account
      </h3>
      <p class="text-sm text-blue-300">
        Already have an account?<br />
        <a href="#login" class="font-medium text-pink-400 hover:text-pink-300 transition">
          Log in
        </a>
      </p>
    </div>
    <form id="signupForm" class="space-y-5">
      <div>
        <label for="name" class="block mb-1">Name</label>
        <input id="name" type="text" required placeholder="Your name" class="w-full px-4 py-2
               bg-black/30 placeholder-green-600
               text-green-400 outline-none
               border border-pink-500
               rounded-lg
               focus:border-blue-400
               transition" />
        <p id="error-name" class="text-red-500 text-sm mt-1 hidden"></p>
      </div>

      <div>
        <label for="email" class="block mb-1">Email</label>
        <input id="email" type="email" required placeholder="you@example.com" class="w-full px-4 py-2
               bg-black/30 placeholder-green-600
               text-green-400 outline-none
               border border-pink-500
               rounded-lg
               focus:border-blue-400
               transition" />
        <p id="error-email" class="text-red-500 text-sm mt-1 hidden"></p>
      </div>

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

      <button id="submitBtn" type="submit" class="threeD-button-set">
        <span id="submitText">Create account</span>
      </button>
    </form>

    <!-- Social -->
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
  `;