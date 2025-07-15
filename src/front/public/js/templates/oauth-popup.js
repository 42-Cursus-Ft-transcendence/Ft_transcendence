export const oauthPopupFullHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>OAuth Login</title>
  </head>
  <body>
    <script>
      // Parse fragment parameters from URL (after #)
      const fragment = new URLSearchParams(location.hash.slice(1));
      const ok = fragment.get("ok") === "true";
      const token = fragment.get("token");
      const userName = fragment.get("userName");
      const email = fragment.get("email");
      const errorMsg = fragment.get("error");

      const payload = ok
        ? { ok: true, token, userInfo: { userName, email } }
        : { ok: false, error: errorMsg };

      if (window.opener && window.opener.origin === window.location.origin) {
        window.opener.postMessage(payload, window.location.origin);
        window.close();
      } else {
        document.body.style.fontFamily = "sans-serif";
        document.body.style.padding = "2rem";
        if (ok) {
          document.body.textContent = "Login successful. You can close this window.";
        } else {
          document.body.textContent = "OAuth Error: " + errorMsg;
        }
      }
    </script>
  </body>
</html>`;
//# sourceMappingURL=oauth-popup.js.map