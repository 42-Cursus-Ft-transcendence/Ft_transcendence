import type { WebSocket } from "@fastify/websocket";
import type { FastifyRequest } from "fastify";
import { handleRankedStart, cleanupRankedSocket, socketToRankedSession } from "./tournament";
import { handleOnlineStart, cleanupOnlineSocket } from "./online";
import { handleAIStart, handleLocalStart, cleanupLocalGame } from "./ai";
import { handleInput } from "./input";
import { handleStop } from "./stop";
import { handleStopLobby } from "./stoplobby";
import { handleForfeit } from "./forfeit";
import { socketToSession } from "./online";
import { RankedSession } from "./tournament";
import { getAsync, getAllAsync } from "../../db";
import { postScore } from "../../blockchain";
import { db } from "../../db/db";
import {
  registerUserSocket,
  unregisterUserSocket,
  broadcastToFriends
} from "./friends";

export default async function wsHandler(socket: WebSocket, request: FastifyRequest) {
  const user = request.user as { sub: number; userName: string };
  console.log(`✅ WS connected: user #${user.userName}`);

  // Register user for friend notifications
  await registerUserSocket(user.sub, socket);

  // Notify friends that this user is now online
  await notifyFriendsUserOnline(user.sub);

  socket.on("message", async (raw: Buffer) => {
    let msg: any;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      socket.send(JSON.stringify({ type: "error", message: "Invalid JSON" }));
      return;
    }

    switch (msg.type) {
      case "start":
        if (msg.vs === "ranked") {
          await handleRankedStart(socket, user);
        } else if (msg.vs === "online") {
          handleOnlineStart(socket, user);
        } else if (msg.vs === "bot") {
          handleAIStart(socket, msg.difficulty);
        } else {
          handleLocalStart(socket);
        }
        break;

      case "input":
        handleInput(socket, msg);
        break;

      case "stop":
        await handleStop(socket);
        break;

      case "stoplobby":
        handleStopLobby(socket, msg);
        break;

      case "forfeit":
        await handleForfeit(socket);
        break;

      case "ping":
        socket.send(JSON.stringify({ type: "pong" }));
        break;

      default:
        socket.send(JSON.stringify({ type: "error", message: "Unknown type" }));
    }
  });

  socket.on("close", async () => {
    console.log(`⚠️ WS disconnected: user #${user.userName}`);

    // Notify friends that this user is now offline
    await notifyFriendsUserOffline(user.sub);

    // Clean up all session types - let each handler manage its own disconnection logic
    cleanupOnlineSocket(socket);
    cleanupLocalGame(socket);
    await cleanupRankedSocket(socket);
    await unregisterUserSocket(user.sub);
  });
}

// Helper function to notify friends when user goes online
async function notifyFriendsUserOnline(userId: number) {
  try {
    // Get user's friends from database
    const friends = await getAllAsync<{ userId: number; userName: string }>(
      `SELECT 
        CASE 
          WHEN f.requesterId = ? THEN u2.idUser 
          ELSE u1.idUser 
        END as userId,
        CASE 
          WHEN f.requesterId = ? THEN u2.userName 
          ELSE u1.userName 
        END as userName
      FROM Friends f
      JOIN User u1 ON f.requesterId = u1.idUser
      JOIN User u2 ON f.receiverId = u2.idUser
      WHERE (f.requesterId = ? OR f.receiverId = ?) AND f.status = 'accepted'`,
      [userId, userId, userId, userId]
    );

    // Get user info for notification
    const user = await getAsync<{ userName: string; avatarURL?: string }>(
      `SELECT userName, avatarURL FROM User WHERE idUser = ?`,
      [userId]
    );

    if (user && friends.length > 0) {
      const friendIds = friends.map(f => f.userId);
      broadcastToFriends(friendIds, {
        type: 'friend_online',
        data: {
          userId,
          userName: user.userName,
          avatarURL: user.avatarURL,
          status: 'online'
        }
      });
    }
  } catch (error) {
    console.error('Error notifying friends of user online:', error);
  }
}

// Helper function to notify friends when user goes offline
async function notifyFriendsUserOffline(userId: number) {
  try {
    // Get user's friends from database
    const friends = await getAllAsync<{ userId: number; userName: string }>(
      `SELECT 
        CASE 
          WHEN f.requesterId = ? THEN u2.idUser 
          ELSE u1.idUser 
        END as userId,
        CASE 
          WHEN f.requesterId = ? THEN u2.userName 
          ELSE u1.userName 
        END as userName
      FROM Friends f
      JOIN User u1 ON f.requesterId = u1.idUser
      JOIN User u2 ON f.receiverId = u2.idUser
      WHERE (f.requesterId = ? OR f.receiverId = ?) AND f.status = 'accepted'`,
      [userId, userId, userId, userId]
    );

    // Get user info for notification
    const user = await getAsync<{ userName: string; avatarURL?: string }>(
      `SELECT userName, avatarURL FROM User WHERE idUser = ?`,
      [userId]
    );

    if (user && friends.length > 0) {
      const friendIds = friends.map(f => f.userId);
      broadcastToFriends(friendIds, {
        type: 'friend_offline',
        data: {
          userId,
          userName: user.userName,
          avatarURL: user.avatarURL,
          status: 'offline'
        }
      });
    }
  } catch (error) {
    console.error('Error notifying friends of user offline:', error);
  }
}
