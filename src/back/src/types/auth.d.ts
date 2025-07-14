declare module "@fastify/oauth2";
declare module "@fastify/cookie";
declare module "@fastify/jwt";

import "fastify";
import type { FastifyRequest, FastifyReply, FastifyInstance } from "fastify";
import type { FastifyJWT } from "@fastify/jwt";

declare module "qrcode" {
  function toDataURL(data: string, options?: any): Promise<string>;
  const qrcode: {
    toDataURL: typeof toDataURL;
  };
  export default qrcode;
}

declare module "fastify" {
  interface FastifyInstance {
    /** Décorateur ajouté via app.decorate('authenticate', ...) */
    authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    jwt: FastifyJWT;
  }

  interface FastifyRequest {
    user: any;
  }
  interface FastifyReply {
    setCookie(name: string, value: string, opts?: FastifyCookieOptions): this;
  }
}

export {};
