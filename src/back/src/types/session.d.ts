export interface WaitingItem {
  socket: WebSocket;
  payload: { sub: number; userName: string };
}

export interface Session {
  id: string;
  game: import("../websocket/handlers/game").default;
  sockets: {
    p1: WebSocket;
    p2: WebSocket;
  };
  players: {
    p1: { sub: number; userName: string };
    p2: { sub: number; userName: string };
  };
  loopTimer: NodeJS.Timeout;
}
