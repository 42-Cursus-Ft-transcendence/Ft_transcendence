import { FastifyInstance } from "fastify";
import { db } from "../db/db";
import { authenticator } from "otplib";
import QRCode from "qrcode";
import bcrypt from "bcrypt";
import { Wallet } from "ethers";

function runAsync(sql: string, values: any[]): Promise<number> {
  return new Promise((resolve, reject) => {
    db.run(
      sql,
      values,
      function (this: { lastID: number; changes: number }, error) {
        if (error) {
          reject(error);
        } else {
          resolve(this.lastID);
        }
      }
    );
  });
}

export function getAsync<T = any>(
  sql: string,
  params: any[]
): Promise<T | null> {
  return new Promise((resolve, rejects) => {
    db.get(sql, params, (err, row) => {
      if (err) rejects(err);
      else resolve((row as T) ?? null);
    });
  });
}

export default async function userRoutes(app: FastifyInstance) {
  console.log("🛠️  userRoutes mounted");
  app.post("/api/signup", async (request, reply): Promise<void> => {
    console.log(">> Reçu POST /user");
    // Récupère et valide le body
    const { userName, email, password } = request.body as {
      userName?: string;
      email?: string;
      password?: string;
    };
    if (!userName || !email || !password)
      return reply
        .status(400)
        .send({ error: "userName, email and password required" });

    try {
      const hashPass = await bcrypt.hash(password, 10);
      const now = new Date().toString();
      const userWallet = Wallet.createRandom();
      const address = userWallet.address;
      const privKey = userWallet.privateKey;
      const idUser = await runAsync(
        `INSERT INTO User(userName, email, password, registrationDate, address, privkey, connectionStatus)
                VALUES (?, ?, ?, ?, ?, ?, 0)`,
        [userName, email, hashPass, now, address, privKey]
      );
      return reply.status(201).send({ idUser });
    } catch (err: any) {
      if (err.code === "SQLITE_CONSTRAINT") {
        return reply.status(409).send({ error: "Username already taken" });
      }
      return reply.status(500).send({ error: "Internal server error" });
    }
  });

  app.get(
    "/me",
    { preHandler: [(app as any).authenticate] },
    async (request, reply) => {
      const idUser = (request.user as any).sub as number;
      const userName = (request.user as any).userName as string;

      try {
        const res = await getAsync<{ email: string }>(
          `SELECT email FROM User WHERE idUser = ?`,
          [idUser]
        );
        if (!res) return reply.status(401).send({ error: "User not found" });
        reply.status(200).send({
          idUser,
          userName,
          email: res.email,
        });
      } catch (err) {
        return reply.status(500).send({ error: "Internal server error" });
      }
    }
  );

  app.post("/api/login", async (request, reply): Promise<void> => {
    console.log(">> Recu POST /login");
    const { userName, password } = request.body as {
      userName?: string;
      password?: string;
    };
    if (!userName || !password)
      return reply
        .status(400)
        .send({ error: "userName and password required" });

    try {
      const user = await getAsync<{
        idUser: number;
        email: string;
        password: string;
        connectionStatus: number;
      }>(
        `SELECT idUser, email, password, connectionStatus FROM User WHERE userName = ?`,
        [userName]
      );

      if (!user)
        return reply
          .status(401)
          .send({ error: "Invalid username or password" });
      const match = await bcrypt.compare(password, user.password);
      if (!match)
        return reply
          .status(401)
          .send({ error: "Invalid username or password" });
      await runAsync(`UPDATE User SET connectionStatus = 1 WHERE idUser = ?`, [
        user.idUser,
      ]);
      const token = app.jwt.sign(
        { sub: user.idUser, userName },
        { expiresIn: "2h" }
      );
      return reply
        .setCookie("token", token, {
          // signed: true,
          httpOnly: true,
          path: "/",
          sameSite: "strict",
          // secure:   true
        })
        .status(200)
        .send({
          userName,
          email: user.email,
          idUser: user.idUser,
        });
    } catch (err) {
      return reply.status(500).send({ error: "Internal server error" });
    }
  });

  app.post(
    "/api/logout",
    { preHandler: [(app as any).authenticate] },
    async (request, reply) => {
      // Récupère directement l’ID depuis le payload du JWT
      const idUser = (request.user as any).sub as number;
      const cookieOpt = {
        httpOnly: true,
        path: "/",
        maxAge: -1,
        sameSite: "strict",
        // secure:   true
      };
      try {
        await runAsync(
          `UPDATE User SET connectionStatus = 0 WHERE idUser = ?`,
          [idUser]
        );
        return reply
          .setCookie("token", "", cookieOpt)
          .status(200)
          .send({ ok: true });
      } catch (err) {
        return reply
          .setCookie("token", "", cookieOpt)
          .status(200)
          .send({ ok: true });
      }
    }
  );

  app.get("/api/login/google/callback", async (request, reply) => {
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
        // 이미 가입된 Google 유저
        userId = existing.idUser;
      } else {
        const now = new Date().toISOString();
        const userWallet = Wallet.createRandom();
        const address = userWallet.address;
        const privKey = userWallet.privateKey;
        const lastID = (await runAsync(
          `INSERT INTO User
           (oauthSub, userName, email, registrationDate, address, privkey, connectionStatus)
         VALUES (?, ?, ?, ?, ?, ?, 0)`,
          [sub, userName, email, now, address, privKey]
        )) as number;

        userId = lastID;
      }
      const token = app.jwt.sign(
        { sub: userId, userName, email },
        { expiresIn: "2h" }
      );
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
  /**
   * POST /api/settings/2fa
   *
   * - Verifies the user’s current password.
   * - Enables or disables TOTP-based 2FA.
   * - On disable: clears secret and redirects back to /settings.
   * - On enable: generates new secret, saves it (not yet activated),
   *   then redirects back to /settings with otpauthUrl query.
   */
  app.post(
    "/api/settings/2fa",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const userId = (req.user as any).sub;
      const { password, enable2fa } = req.body as {
        password: string;
        enable2fa: boolean;
      };

      // 1) Verify password
      const row = await getAsync<{ password: string }>(
        "SELECT password FROM User WHERE idUser = ?",
        [userId]
      );
      if (!row || !(await bcrypt.compare(password, row.password))) {
        return reply.status(401).send({
          error: "Password is incorrect. Please try again.",
        });
      }

      if (!enable2fa) {
        // 2) Disable 2FA
        await db.run(
          "UPDATE User SET totpSecret = NULL, isTotpEnabled = 0 WHERE idUser = ?",
          [userId]
        );
        return reply.redirect("/?screen=settings");
      }

      // 3) Enable 2FA: generate new secret (but not activated yet)
      const secret = authenticator.generateSecret();
      await db.run(
        "UPDATE User SET totpSecret = ?, isTotpEnabled = 0 WHERE idUser = ?",
        [secret, userId]
      );
      const userName = (req.user as any).userName;
      const otpauthUrl = authenticator.keyuri(userName, "YourAppName", secret);
      return reply.redirect("/?screen=settings");
    }
  );

  /**
   * GET /api/2fa/qrcode
   *
   * - Expects otpauthUrl as a query parameter.
   * - Generates a PNG QR code from the otpauthUrl.
   * - Returns the image/png directly.
   */
  app.get(
    "/api/2fa/qrcode",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const { otpauthUrl } = req.query as { otpauthUrl: string };
      if (!otpauthUrl) {
        return reply
          .status(400)
          .send({ error: "Missing otpauthUrl query parameter" });
      }
      try {
        // Convert otpauthUrl into a Data URL containing PNG image
        const dataUrl = await QRCode.toDataURL(otpauthUrl);
        const img = Buffer.from(dataUrl.split(",")[1], "base64");
        reply.header("Content-Type", "image/png").send(img);
      } catch (err) {
        app.log.error(err);
        reply.status(500).send({ error: "Failed to generate QR code" });
      }
    }
  );

  /**
   * POST /api/2fa/verify-setup
   *
   * - Verifies the TOTP token against the stored secret.
   * - On success: sets isTotpEnabled = 1 to activate 2FA.
   * - On failure: returns 401 error.
   */
  app.post(
    "/api/2fa/verify-setup",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const userId = (req.user as any).sub;
      const { token } = req.body as { token: string };

      // Retrieve the secret from database
      const row = await getAsync<{ totpSecret: string }>(
        "SELECT totpSecret FROM User WHERE idUser = ?",
        [userId]
      );
      // Check token validity
      if (!row || !authenticator.check(token, row.totpSecret)) {
        return reply.status(401).send({ error: "Invalid 2FA code" });
      }

      // Activate 2FA
      await db.run("UPDATE User SET isTotpEnabled = 1 WHERE idUser = ?", [
        userId,
      ]);
      reply.send({ ok: true });
    }
  );

  app.post("/2fa/verify-login", async (req, reply) => {
    const { userId, token } = req.body as { userId: number; token: string };
    const row = await getAsync<{
      totpSecret: string;
      isTotpEnabled: number;
    }>(`SELECT totpSecret, isTotpEnabled FROM User WHERE idUser = ?`, [userId]);
    if (!row || row.isTotpEnabled === 0) {
      return reply.code(400).send({ error: "2FA not configured" });
    }
    if (!authenticator.check(token, row.totpSecret)) {
      return reply.code(401).send({ error: "Invalid 2FA code" });
    }
    const jwt = app.jwt.sign({ sub: userId });
    reply.send({ token: jwt });
  });
}

export async function createGame(
  idp1: number,
  idp2: number,
  p1score: number,
  p2score: number
): Promise<number> {
  // 1) On génère la date au format ISO (meilleur pour SQLite)
  const date = new Date().toISOString();

  // 2) On détermine le gagnant
  const winner = p1score > p2score ? idp1 : idp2;

  // 3) On crée la partie et on récupère son ID
  const gameId = await runAsync(
    `INSERT INTO Match(matchDate, player1Score, player2Score, winnerId)
     VALUES (?, ?, ?, ?)`,
    [date, p1score, p2score, winner]
  );

  // 4) On lie chaque joueur à cette partie
  //    ⚠️ Si tu veux stocker la date dans User_Match, tu peux,
  //    mais ce champ est redondant (tu l’as déjà dans Match.matchDate).
  await runAsync(
    `INSERT INTO User_Match(userId, matchDate, matchId)
     VALUES (?, ?, ?)`,
    [idp1, date, gameId]
  );
  await runAsync(
    `INSERT INTO User_Match(userId, matchDate, matchId)
     VALUES (?, ?, ?)`,
    [idp2, date, gameId]
  );

  return gameId;
}
