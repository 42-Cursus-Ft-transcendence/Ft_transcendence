// src/back/src/fastify-static.d.ts
declare module "@";
import type { FastifyReply } from "fastify";
import type { FastifyCookieOptions } from "@fastify/cookie";

import "fastify";
declare module "fastify" {
  interface FastifyReply {
    setCookie(
      name: string,
      value: string,
      options?: FastifyCookieOptions
    ): this;
    /**
     * Envoie un fichier depuis le dossier static configuré
     * @param filename Chemin relatif au root défini dans fastify-static
     */
    sendFile(filename: string): void;
  }
}
