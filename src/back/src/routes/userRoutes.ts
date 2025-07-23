import { FastifyInstance } from "fastify";
import bcrypt from "bcrypt";
import { Wallet } from "ethers";

import { runAsync, getAsync, getAllAsync } from "../db";
import { getRandomDefaultAvatar } from "../utils/avatar";

export default async function userRoutes(app: FastifyInstance) {
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
      const defaultAvatar = getRandomDefaultAvatar();

      const idUser = await runAsync(
        `INSERT INTO User(userName, email, password, registrationDate, address, privkey, connectionStatus, avatarURL)
                VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
        [userName, email, hashPass, now, address, privKey, defaultAvatar]
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
      try {
        // Get basic user information
        const userRes = await getAsync<{
          userName: string;
          email: string;
          isTotpEnabled: number;
          avatarURL?: string;
        }>(
          `SELECT userName, email, isTotpEnabled, avatarURL FROM User WHERE idUser = ?`,
          [idUser]
        );

        if (!userRes) return reply.status(401).send({ error: "User not found" });

        // Get user ranking statistics (same query as leaderboard)
        const rankingRes = await getAsync<{
          elo: number;
          wins: number;
          losses: number;
          gamesPlayed: number;
          lastMatchDate?: string;
        }>(
          `SELECT pr.elo, pr.wins, pr.losses, pr.gamesPlayed, pr.lastMatchDate 
           FROM PlayerRanking pr 
           WHERE pr.userId = ?`,
          [idUser]
        );

        // If no ranking data exists, create default entry (for ranked matches only)
        if (!rankingRes) {
          console.log(`>> Creating default PlayerRanking entry for user ${idUser}`);
          await runAsync(
            `INSERT INTO PlayerRanking (userId, elo, wins, losses, gamesPlayed) 
             VALUES (?, 1200, 0, 0, 0)`,
            [idUser]
          );
        }

        // Get total match statistics (including normal games from Match table)
        const totalMatchesRes = await getAsync<{
          totalWins: number;
          totalLosses: number;
          totalGamesPlayed: number;
        }>(
          `SELECT 
            COUNT(CASE WHEN winnerId = ? THEN 1 END) as totalWins,
            COUNT(CASE WHEN winnerId != ? THEN 1 END) as totalLosses,
            COUNT(*) as totalGamesPlayed
           FROM User_Match um
           JOIN Match m ON um.matchId = m.idMatch
           WHERE um.userId = ?`,
          [idUser, idUser, idUser]
        );

        // Get ranking data (either existing or newly created default)
        const finalRankingRes = rankingRes || {
          elo: 1200,
          wins: 0,
          losses: 0,
          gamesPlayed: 0,
          lastMatchDate: null
        };

        // Combine ranked and total statistics
        const totalStats = totalMatchesRes || { totalWins: 0, totalLosses: 0, totalGamesPlayed: 0 };

        return reply.status(200).send({
          idUser,
          userName: userRes.userName,
          email: userRes.email,
          isTotpEnabled: userRes.isTotpEnabled === 1,
          avatarURL: userRes.avatarURL,
          // ELO is only from ranked matches
          elo: finalRankingRes.elo,
          // Wins/losses from ranked matches only
          rankedWins: finalRankingRes.wins,
          rankedLosses: finalRankingRes.losses,
          rankedGamesPlayed: finalRankingRes.gamesPlayed,
          // Total wins/losses including normal games
          totalWins: totalStats.totalWins,
          totalLosses: totalStats.totalLosses,
          totalGamesPlayed: totalStats.totalGamesPlayed,
          lastMatchDate: finalRankingRes.lastMatchDate
        });
      } catch (err) {
        console.error(">> Error in /me route:", err);
        return reply.status(500).send({ error: "Internal server error" });
      }
    }
  );

  app.get(
    "/checkAuth",
    { preHandler: [(app as any).authenticate] },
    async (request, reply) => {
      try {
        const idUser = (request.user as any).sub as number;
        const userName = (request.user as any).userName as string;

        console.log(">> checkAuth successful for user:", userName, "ID:", idUser);

        return reply.status(200).send({
          authenticated: true,
          userId: idUser,
          userName: userName,
        });
      } catch (err) {
        console.error(">> checkAuth error:", err);
        return reply.status(401).send({
          authenticated: false,
          error: "Authentication failed",
        });
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
        isTotpEnabled: number;
        avatarURL?: string;
      }>(
        `SELECT 
         idUser, 
         email, 
         password, 
         connectionStatus, 
         isTotpEnabled, 
         avatarURL
       FROM User
       WHERE userName = ?`,
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
      if (user.isTotpEnabled === 1) {
        const pre2faToken = app.jwt.sign(
          { sub: user.idUser, pre2fa: true },
          { expiresIn: "5m" } // Short-lived token for pre-2FA login
        );
        return reply
          .setCookie("pre2faToken", pre2faToken, {
            // signed: true,
            httpOnly: true,
            path: "/",
            sameSite: "strict",
            // secure:   true
          })
          .status(200)
          .send({
            userId: user.idUser,
            require2fa: true,
          });
      }
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
          avatarURL: user.avatarURL,
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
  app.put(
    "/account",
    { preHandler: [(app as any).authenticate] },
    async (request, reply): Promise<void> => {
      // Get user ID from JWT payload
      const idUser = (request.user as any).sub as number;

      // Get and validate body
      const { userName, email, avatarURL } = request.body as {
        userName?: string;
        email?: string;
        avatarURL?: string;
      };

      // Validate that at least one field is provided
      if (!userName && email === undefined && !avatarURL) {
        return reply.status(400).send({
          error: "At least one field (userName, email, avatarURL) is required",
        });
      }

      // Validate username if provided
      if (
        userName !== undefined &&
        (!userName || userName.trim().length === 0)
      ) {
        return reply.status(400).send({ error: "Username cannot be empty" });
      }

      // Validate email format if provided and not empty
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return reply.status(400).send({ error: "Invalid email format" });
      }

      try {
        // Update each field individually if present
        if (userName !== undefined) {
          await runAsync("UPDATE User SET userName = ? WHERE idUser = ?", [
            userName.trim(),
            idUser,
          ]);
        }
        if (email !== undefined) {
          await runAsync("UPDATE User SET email = ? WHERE idUser = ?", [
            email,
            idUser,
          ]);
        }
        if (avatarURL !== undefined) {
          await runAsync("UPDATE User SET avatarURL = ? WHERE idUser = ?", [
            avatarURL,
            idUser,
          ]);
        }

        // Get updated profile from database
        const updated = await getAsync<{
          userName: string;
          email: string;
          avatarURL?: string;
        }>("SELECT userName, email, avatarURL FROM User WHERE idUser = ?", [
          idUser,
        ]);

        if (!updated) {
          return reply.status(404).send({ error: "User not found" });
        }

        return reply.status(200).send(updated);
      } catch (err: any) {
        if (err.code === "SQLITE_CONSTRAINT") {
          return reply
            .status(409)
            .send({ error: "Username or email already in use" });
        }
        return reply.status(500).send({ error: "Internal server error" });
      }
    }
  );
  app.put(
    "/security",
    { preHandler: [(app as any).authenticate] },
    async (request, reply): Promise<void> => {
      // Get user ID from JWT payload
      const idUser = (request.user as any).sub as number;

      // Get and validate body
      const { currentPassword, newPassword } = request.body as {
        currentPassword?: string;
        newPassword?: string;
      };

      // Validate required fields
      if (!currentPassword || !newPassword) {
        return reply
          .status(400)
          .send({ error: "Current password and new password are required" });
      }

      // Validate new password length
      if (newPassword.length < 8) {
        return reply
          .status(400)
          .send({ error: "New password must be at least 8 characters long" });
      }

      try {
        // Get current user password hash
        const user = await getAsync<{ password: string }>(
          "SELECT password FROM User WHERE idUser = ?",
          [idUser]
        );

        if (!user) {
          return reply.status(404).send({ error: "User not found" });
        }

        // Verify current password
        const isCurrentPasswordValid = await bcrypt.compare(
          currentPassword,
          user.password
        );
        if (!isCurrentPasswordValid) {
          return reply
            .status(400)
            .send({ error: "Current password is incorrect" });
        }

        // Hash new password
        const newHashedPassword = await bcrypt.hash(newPassword, 10);

        // Update password in database
        await runAsync("UPDATE User SET password = ? WHERE idUser = ?", [
          newHashedPassword,
          idUser,
        ]);

        return reply
          .status(200)
          .send({ message: "Password updated successfully" });
      } catch (err: any) {
        console.error("Error updating password:", err);
        return reply.status(500).send({ error: "Internal server error" });
      }
    }
  );

  // Route pour récupérer l'historique des matchs de l'utilisateur
  app.get(
    "/match-history",
    { preHandler: [(app as any).authenticate] },
    async (request, reply) => {
      const idUser = (request.user as any).sub as number;

      try {
        console.log(">> Fetching match history for user ID:", idUser);

        // Récupérer les matchs classés (RankedMatch avec ELO)
        const rankedMatches = await getAllAsync<{
          matchId: string;
          player1Id: number;
          player2Id: number;
          player1Score: number;
          player2Score: number;
          winnerId: number;
          player1EloChange: number;
          player2EloChange: number;
          matchDate: string;
          matchDuration: number;
          opponent_name: string;
        }>(
          `SELECT 
            rm.matchId,
            rm.player1Id,
            rm.player2Id,
            rm.player1Score,
            rm.player2Score,
            rm.winnerId,
            rm.player1EloChange,
            rm.player2EloChange,
            rm.matchDate,
            rm.matchDuration,
            CASE 
              WHEN rm.player1Id = ? THEN u2.userName 
              ELSE u1.userName 
            END as opponent_name
          FROM RankedMatch rm
          LEFT JOIN User u1 ON rm.player1Id = u1.idUser
          LEFT JOIN User u2 ON rm.player2Id = u2.idUser
          WHERE rm.player1Id = ? OR rm.player2Id = ?
          ORDER BY rm.matchDate DESC`,
          [idUser, idUser, idUser]
        );

        // Récupérer les matchs normaux (Match sans ELO)
        const normalMatches = await getAllAsync<{
          matchId: number;
          matchDate: string;
          player1Score: number;
          player2Score: number;
          winnerId: number;
          player1Name: string;
          player2Name: string;
        }>(
          `SELECT 
            m.idMatch as matchId,
            m.matchDate,
            m.player1Score,
            m.player2Score,
            m.winnerId,
            u1.userName as player1Name,
            u2.userName as player2Name
          FROM User_Match um
          JOIN Match m ON um.matchId = m.idMatch
          LEFT JOIN User_Match um2 ON um2.matchId = m.idMatch AND um2.userId != ?
          LEFT JOIN User u1 ON um.userId = u1.idUser
          LEFT JOIN User u2 ON um2.userId = u2.idUser
          WHERE um.userId = ?
          ORDER BY m.matchDate DESC`,
          [idUser, idUser]
        );

        // Combiner et transformer les données
        const allMatches = [
          ...rankedMatches.map(match => {
            const isPlayer1 = match.player1Id === idUser;
            const playerScore = isPlayer1 ? match.player1Score : match.player2Score;
            const opponentScore = isPlayer1 ? match.player2Score : match.player1Score;
            const eloChange = isPlayer1 ? match.player1EloChange : match.player2EloChange;
            const won = match.winnerId === idUser;

            return {
              matchId: match.matchId,
              date: match.matchDate,
              opponent: match.opponent_name,
              playerScore: playerScore,
              opponentScore: opponentScore,
              won: won,
              eloChange: eloChange,
              duration: match.matchDuration || 0,
              type: 'ranked' as const
            };
          }),
          ...normalMatches.map(match => {
            // Determine opponent name - it's the other player
            const opponentName = match.player1Name === (request.user as any).userName ?
              match.player2Name : match.player1Name;

            return {
              matchId: match.matchId.toString(),
              date: match.matchDate,
              opponent: opponentName || 'Unknown',
              playerScore: match.player1Score, // Simplified for normal matches
              opponentScore: match.player2Score,
              won: match.winnerId === idUser,
              eloChange: 0, // No ELO change for normal matches
              duration: 0,
              type: 'normal' as const
            };
          })
        ];

        // Trier par date et limiter à 50
        const sortedMatches = allMatches
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 50);

        console.log(`>> Found ${sortedMatches.length} matches for user ${idUser} (${rankedMatches.length} ranked, ${normalMatches.length} normal)`);

        return reply.status(200).send({
          matches: sortedMatches,
          total: sortedMatches.length,
        });
      } catch (err) {
        console.error(">> Error fetching match history:", err);
        return reply.status(500).send({
          error: "Internal server error",
          matches: [],
          total: 0,
        });
      }
    }
  );
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
