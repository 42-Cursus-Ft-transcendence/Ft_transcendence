import { FastifyInstance } from "fastify";
import { db } from "../db/db";
import bcrypt from "bcrypt";
import { error } from "console";
import { resolve } from "path";
import { rejects } from "assert";
import { get } from "http";
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
  app.post("/signup", async (request, reply): Promise<void> => {
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

  app.post("/login", async (request, reply): Promise<void> => {
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
    "/logout",
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
        interface InsertResult {
          insertId: number;
        }
        const lastID = (await runAsync(
          `INSERT INTO User
           (oauthSub, userName, email, registrationDate, address, privkey, connectionStatus)
         VALUES (?, ?, ?, ?, ?, ?, 0)`,
          [sub, userName, email, now, address, privKey]
        )) as number;

        userId = lastID;
      }
      const salt = await bcrypt.genSalt(10);
      const [hashedSub, hashedEmail] = await Promise.all([
        bcrypt.hash(String(sub), salt),
        bcrypt.hash(email, salt),
      ]);
      const token = app.jwt.sign({
        sub: hashedSub,
        email: hashedEmail,
        userName,
        userId,
      });
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
      app.log.error("Google OAuth error: " + err.message);
      return reply.status(303).redirect("/?screen=login");
    }
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
