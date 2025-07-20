import { FastifyInstance } from "fastify";
import { authenticator } from "otplib";
import QRCode from "qrcode";
import bcrypt from "bcrypt";
import { getAsync } from "../db";
import { db } from "../db/db";

export default async function twofaRoutes(app: FastifyInstance) {
  /**
   * POST /api/2fa
   *
   * - Verifies the user’s current password.
   * - Enables or disables TOTP-based 2FA.
   * - On disable: clears secret and redirects back to /settings.
   * - On enable: generates new secret, saves it (not yet activated),
   *   then redirects back to /settings with otpauthUrl query.
   */
  app.post("/2fa", { preHandler: [app.authenticate] }, async (req, reply) => {
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
      app.log.error("2FA disabled");
      return reply
        .clearCookie("token", {
          httpOnly: true,
          path: "/",
          sameSite: "strict",
        })
        .status(401)
        .send({
          error: "2FA has been disabled. Please log in again.",
        });
    }

    // 3) Enable 2FA: generate new secret (but not activated yet)
    const secret = authenticator.generateSecret();
    await db.run(
      "UPDATE User SET totpSecret = ?, isTotpEnabled = 0 WHERE idUser = ?",
      [secret, userId]
    );
    const userName = (req.user as any).userName;
    const serviceName = process.env.SERVICE_NAME || "Transcendence";
    const otpauthUrl = authenticator.keyuri(userName, serviceName, secret);
    /**
     * Generate the otpauth URL for provisioning the TOTP secret.
     * Developers can use this URL to generate a QR code in the frontend,
     * or to manually configure Google Authenticator if needed.
     */
    const qrDataUrl = await QRCode.toDataURL(otpauthUrl);
    return reply.send({ ok: true, qrDataUrl });
  });

  /**
   * POST /api/2fa/verify-setup
   *
   * - Verifies the TOTP token against the stored secret.
   * - On success: sets isTotpEnabled = 1 to activate 2FA.
   * - On failure: returns 401 error.
   */
  app.post(
    "/2fa/verify",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const userId = (req.user as any).sub;
      const { token } = req.body as { token: string };

      const row = await getAsync<{ totpSecret: string }>(
        "SELECT totpSecret FROM User WHERE idUser = ?",
        [userId]
      );
      if (!row) {
        return reply.status(400).send({ error: "2FA not initialized" });
      }
      if (!authenticator.check(token, row.totpSecret)) {
        return reply.status(401).send({ error: "Invalid 2FA code" });
      }

      // Activate 2FA
      await db.run("UPDATE User SET isTotpEnabled = 1 WHERE idUser = ?", [
        userId,
      ]);
      return reply
        .clearCookie("token", {
          httpOnly: true,
          path: "/",
          sameSite: "strict",
        })
        .status(200)
        .send({ ok: true });
    }
  );

  app.post("/2fa/authenticate", async (req, reply) => {
    const { userId, twoFactorCode } = req.body as {
      userId: string;
      twoFactorCode: string;
    };

    const row = await getAsync<{
      totpSecret: string;
      isTotpEnabled: number;
    }>("SELECT totpSecret, isTotpEnabled FROM User WHERE idUser = ?", [userId]);
    if (!row || row.isTotpEnabled === 0) {
      return reply.status(400).send({ error: "2FA not configured" });
    }
    if (!authenticator.check(twoFactorCode, row.totpSecret)) {
      return reply.status(401).send({ error: "Invalid 2FA code" });
    }
    const userRow = await getAsync<{
      userName: string;
      email: string;
    }>("SELECT userName, email FROM User WHERE idUser = ?", [userId]);

    if (!userRow) {
      return reply.status(500).send({ error: "User lookup failed" });
    }
    reply.clearCookie("pre2faToken", {
      httpOnly: true,
      path: "/",
      sameSite: "strict",
    });
    const jwt = app.jwt.sign({ sub: userId, userName: userRow.userName });
    app.onUserLogin();
    return reply
      .setCookie("token", jwt, {
        httpOnly: true,
        path: "/",
        sameSite: "strict",
      })
      .status(200)
      .send({
        userName: userRow.userName,
        email: userRow.email,
        idUser: userId,
      });
  });
}
