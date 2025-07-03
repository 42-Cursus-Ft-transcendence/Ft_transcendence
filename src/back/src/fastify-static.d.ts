// src/back/src/fastify-static.d.ts
declare module '@fastify/static';

// src/back/src/fastify-static.d.ts
import 'fastify';
import type { FastifyRequest, FastifyReply } from 'fastify';

declare module 'fastify' {
  interface FastifyReply {
    /**
     * Envoie un fichier depuis le dossier static configuré
     * @param filename Chemin relatif au root défini dans fastify-static
     */
    sendFile(filename: string): void;
  }
  interface FastifyInstance {
      /** Décorateur ajouté via app.decorate('authenticate', ...) */
      authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    }
}
