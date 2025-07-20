import { FastifyInstance } from "fastify";
import { Wallet } from "ethers";
import { runAsync, getAsync } from "../db";

import { getRandomDefaultAvatar } from "../utils/avatar";

export default async function oauthRoutes(app: FastifyInstance) {
  app.get("/login/google/callback", async (request, reply) => {
    try {
      const tokenResult =
        await app.googleOAuth2.getAccessTokenFromAuthorizationCodeFlow(request);
      const accessToken = tokenResult.token.access_token;
      if (!accessToken) {
        throw new Error("No access token received");
      }
      const resp = await fetch(
        `https://www.googleapis.com/oauth2/v3/userinfo?access_token=${accessToken}`
      );
      if (!resp.ok) throw new Error("Failed to fetch user info from Google");
      const profile = (await resp.json()) as {
        sub: number;
        email: string;
        name: string;
      };
      const { sub, email, name: userName } = profile;
      const existing = (await getAsync(
        `SELECT idUser FROM User WHERE oauthSub = ?`,
        [sub]
      )) as { idUser: number } | undefined;

      let userId: number;

      if (existing) {
        userId = existing.idUser;
      } else {
        const now = new Date().toISOString();
        const userWallet = Wallet.createRandom();
        const address = userWallet.address;
        const privKey = userWallet.privateKey;
        const defaultAvatar = getRandomDefaultAvatar();
        const lastID = (await runAsync(
          `INSERT INTO User (
           oauthSub,
           userName,
           email,
           registrationDate,
           address,
           privkey,
           connectionStatus,
           avatarURL,
           totpSecret,
           isTotpEnabled
         ) VALUES (?, ?, ?, ?, ?, ?, 0, ?, NULL, 0)`,
          [sub, userName, email, now, address, privKey, defaultAvatar]
        )) as number;

        userId = lastID;
      }
      const token = app.jwt.sign(
        { sub: userId, userName, email },
        { expiresIn: "2h" }
      );
      app.onUserLogin();
      return reply
        .setCookie("token", token, {
          // signed: true,
          httpOnly: true,
          path: "/",
          sameSite: "strict",
          // secure:   true
        })
        .status(303)
        .redirect("/?screen=menu");
    } catch (err: any) {
      app.log.error("Google OAuth error: ", err);
      return reply.status(303).redirect("/?screen=login");
    }
  });
}
