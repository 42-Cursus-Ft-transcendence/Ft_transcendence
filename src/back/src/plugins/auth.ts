import fp from "fastify-plugin";
import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import jwtLib from "jsonwebtoken";

export default fp(async function (app: FastifyInstance) {
  app.decorate(
    "authenticate",
    async function (
      request: FastifyRequest,
      reply: FastifyReply
    ): Promise<void> {
      app.log.debug("Cookies reçus:", request.cookies);
      app.log.debug("Authorization header:", request.headers.authorization);
      try {
        await request.jwtVerify();
        // request.user 에 payload(sub, iat, etc)가 담깁니다.
      } catch (err) {
        reply.code(401).send({
          statusCode: 401,
          error: "Unauthorized",
          message: (err as Error).message,
        });
      }
    }
  );

  app.decorate(
    "pre2faAuthenticate",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const token =
        request.headers["x-pre2fa-token"] ||
        (request.cookies as any).pre2faToken;

      if (!token) {
        return reply.code(401).send({
          statusCode: 401,
          error: "Unauthorized",
          message: "Missing pre-2FA token",
        });
      }

      let raw: unknown;
      try {
        raw = jwtLib.verify(
          token,
          process.env.PRE2FA_SECRET || "une_chaine_tres_complexe"
        );
      } catch (err) {
        return reply.code(401).send({
          statusCode: 401,
          error: "Unauthorized",
          message: `Invalid pre-2FA token: ${(err as Error).message}`,
        });
      }

      // payload 구조에 userId만 담겼다고 가정
      const payload = raw as {
        userId: number;
        iat: number;
        exp: number;
      };

      // downstream에서 userId를 꺼내 쓰도록 설정
      (request as any).user = { id: payload.userId };
    }
  );
});
