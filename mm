app.register(async fastify => {
  fastify.get(
    '/ws',
    {
      websocket: true,
      // 1) Vérifie le JWT (cookie ou header) AVANT l’upgrade
      preHandler: [(app as any).authenticate]
    },
    (connection, request) => {
      const { socket } = connection;
      // 2) Récupère les infos du token validé
      const payload = request.user as { sub: number; userName: string };
      console.log(`✅ WS client connecté pour user #${payload.sub} (${payload.userName})`);

    // Note: directly using socket instead of connection.socket

    let game = new Game();
    let loopTimer: ReturnType<typeof setInterval> | undefined;
    let aiTimer: ReturnType<typeof setInterval> | undefined;
    
    socket.on("message", async (raw: Buffer) => {
      let msg: any;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        console.log("erreur au parse")
        socket.send(JSON.stringify({ type: "error", message: "Invalid JSON"}));
        return;
      }

      switch (msg.type) {
        case "start":
          if (loopTimer) return;
          game = new Game();
          if (msg.vs === "bot") game.mode = "bot";
          loopTimer = setInterval(() => {
            game.update();
            socket.send(JSON.stringify(game.getState()));
          }, 1000 / 60);
          if (msg.vs === "bot") {
            const diff = parseFloat(msg.difficulty) || 0;
            aiTimer = startAI(game, diff);
          }
          break;

        case "input":
          {
            const ply = msg.player === "p2" ? "p2" : "p1";
            if (ply === "p2" && game.mode !== "player") return;
            game.applyInput(ply, msg.dir);
          }
          break;

        case "stop":
          console.log("Game over, saving scores");
          if (loopTimer) {
            clearInterval(loopTimer);
            loopTimer = undefined;
          }
          if (aiTimer) {
            clearInterval(aiTimer);
            aiTimer = undefined;
          }
          // extract and post both players' scores
          {
            let gameId:string = '99';
            let player:string = payload.userName;
            let p1Address = await  getAsync<{
                address: string
            }>(`SELECT address FROM User WHERE userName = ?`,
                [player]
            )
            let addy:string = 'aaaaaa';
            if (p1Address)
                addy = p1Address.address;
            postScore(gameId, addy,game.score[0] ).catch((e: any) =>
              console.error("postScore p1 failed:", e)
            );
            // postScore(gameId, p2Address, s2).catch((e: any) =>
            //   console.error("postScore p2 failed:", e)
            // );
          }
          break;

        default:
          console.log("error\n\n\n\n ___________ /n");
          socket.send(
            JSON.stringify({ type: "error", message: "Unknown message type" })
          );
      }
    });

    socket.on("close", () => {
      if (loopTimer) clearInterval(loopTimer);
      if (aiTimer) clearInterval(aiTimer);
      console.log("WS client disconnected");
    });
  });
});