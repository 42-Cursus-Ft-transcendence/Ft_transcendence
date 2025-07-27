import type { WebSocket } from "@fastify/websocket";
import { runAsync } from "../../db";

// Map to track user connections for real-time notifications
export const userSockets = new Map<number, WebSocket>();

// Register user socket when they connect
export async function registerUserSocket(userId: number, socket: WebSocket) {
    userSockets.set(userId, socket);
    console.log(`User ${userId} registered for friend notifications`);

    // Update connection status in database to online (1)
    try {
        await runAsync(
            `UPDATE User SET connectionStatus = 1 WHERE idUser = ?`,
            [userId]
        );
        console.log(`Updated connectionStatus to online for user ${userId}`);
    } catch (error) {
        console.error(`Error updating connectionStatus for user ${userId}:`, error);
    }

    // Send initial connection confirmation
    socket.send(JSON.stringify({
        type: "friend_system_ready",
        message: "Connected to friend notification system"
    }));
}

// Send real-time notification to a specific user
export function sendFriendNotification(userId: number, notification: {
    type: 'friend_request_received' | 'friend_request_accepted' | 'friend_request_declined' | 'friend_removed' | 'friend_online' | 'friend_offline';
    data: any;
}) {
    const socket = userSockets.get(userId);
    if (socket && socket.readyState === socket.OPEN) {
        socket.send(JSON.stringify({
            type: "friend_notification",
            notification
        }));
    }
}

// Send notification to multiple users (e.g., when someone goes online/offline)
export function broadcastToFriends(userIds: number[], notification: {
    type: 'friend_online' | 'friend_offline';
    data: any;
}) {
    userIds.forEach(userId => {
        sendFriendNotification(userId, notification);
    });
}

// Clean up user socket when disconnected
export async function unregisterUserSocket(userId: number) {
    if (userSockets.has(userId)) {
        userSockets.delete(userId);
        console.log(`Cleaned up friend notifications for user ${userId}`);

        // Update connection status in database to offline (0)
        try {
            await runAsync(
                `UPDATE User SET connectionStatus = 0 WHERE idUser = ?`,
                [userId]
            );
            console.log(`Updated connectionStatus to offline for user ${userId}`);
        } catch (error) {
            console.error(`Error updating connectionStatus for user ${userId}:`, error);
        }
    }
}
