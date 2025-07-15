import { FastifyInstance } from "fastify";
import { authenticator } from "otplib";
import QRCode from "qrcode";
import bcrypt from "bcrypt";
import { getAsync } from "../db";
import { db } from "../db/db";

export default async function twofaRoutes(app: FastifyInstance) {
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
    "/settings/2fa",
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
        app.log.error("2FA disabled");
        return reply.redirect("/?screen=settings");
      }

      // 3) Enable 2FA: generate new secret (but not activated yet)
      const secret = authenticator.generateSecret();
      await db.run(
        "UPDATE User SET totpSecret = ?, isTotpEnabled = 0 WHERE idUser = ?",
        [secret, userId]
      );
      const userName = (req.user as any).userName;
      const serviceName = "pro";
      const otpauthUrl = authenticator.keyuri(userName, serviceName, secret);
      const qrDataUrl = await QRCode.toDataURL(otpauthUrl);
      return reply.send({ ok: true, otpauthUrl, qrDataUrl });
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
    "/2fa/verify-setup",
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
      return reply.send({ ok: true });
    }
  );

  app.post("/login/2fa", async (req, reply) => {
    const { userId, token } = req.body as { userId: number; token: string };

    const row = await getAsync<{
      totpSecret: string;
      isTotpEnabled: number;
    }>("SELECT totpSecret, isTotpEnabled FROM User WHERE idUser = ?", [userId]);
    if (!row || row.isTotpEnabled === 0) {
      return reply.status(400).send({ error: "2FA not configured" });
    }
    if (!authenticator.check(token, row.totpSecret)) {
      return reply.status(401).send({ error: "Invalid 2FA code" });
    }

    // 2FA 통과 시 JWT 발급
    const jwt = app.jwt.sign({ sub: userId });
    return reply
      .setCookie("token", jwt, {
        httpOnly: true,
        path: "/",
        sameSite: "strict",
      })
      .send({ ok: true });
  });
}
