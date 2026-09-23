import "dotenv/config";
import http from "node:http";
import express from "express";
import cors from "cors";
import { Server, type Socket } from "socket.io";
import { prisma } from "./db.js";
import { verifyChatToken } from "./auth.js";

const PORT = Number(process.env.PORT ?? 4000);
const ALLOWED_ORIGINS = (process.env.CORS_ORIGIN ?? "http://localhost:3000")
  .split(",")
  .map((o) => o.trim());

const MAX_MESSAGE_LENGTH = 4000;

const app = express();
app.use(cors({ origin: ALLOWED_ORIGINS }));
app.get("/health", (_req, res) => res.status(200).json({ ok: true }));

const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: { origin: ALLOWED_ORIGINS },
});

// userId -> set of socket ids, so multiple tabs from the same user don't
// flicker presence on/off as individual sockets connect/disconnect.
const onlineSockets = new Map<string, Set<string>>();

function markOnline(userId: string, socketId: string) {
  const wasOnline = onlineSockets.has(userId);
  if (!onlineSockets.has(userId)) onlineSockets.set(userId, new Set());
  onlineSockets.get(userId)!.add(socketId);
  return !wasOnline;
}

function markOffline(userId: string, socketId: string) {
  const sockets = onlineSockets.get(userId);
  if (!sockets) return false;
  sockets.delete(socketId);
  if (sockets.size === 0) {
    onlineSockets.delete(userId);
    return true;
  }
  return false;
}

function isOnline(userId: string) {
  return onlineSockets.has(userId);
}

async function getParticipant(conversationId: string, userId: string) {
  const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
  if (!conversation) return null;
  if (conversation.buyerId !== userId && conversation.sellerId !== userId) return null;
  const otherUserId = conversation.buyerId === userId ? conversation.sellerId : conversation.buyerId;
  return { conversation, otherUserId };
}

function roomName(conversationId: string) {
  return `conversation:${conversationId}`;
}

io.use(async (socket, next) => {
  const userId = await verifyChatToken(socket.handshake.auth?.token);
  if (!userId) {
    next(new Error("Unauthorized"));
    return;
  }
  socket.data.userId = userId;
  next();
});

io.on("connection", (socket: Socket) => {
  const userId = socket.data.userId as string;
  markOnline(userId, socket.id);

  socket.on("conversation:join", async (payload: { conversationId?: string }) => {
    const conversationId = payload?.conversationId;
    if (!conversationId) return;

    const participant = await getParticipant(conversationId, userId);
    if (!participant) {
      socket.emit("conversation:error", { conversationId, error: "Not found or forbidden" });
      return;
    }

    const room = roomName(conversationId);
    socket.join(room);
    socket.emit("conversation:joined", {
      conversationId,
      otherUserOnline: isOnline(participant.otherUserId),
    });
    // Announce this user's presence to whoever else is already in the room.
    socket.to(room).emit("presence:update", { userId, online: true });
  });

  socket.on("conversation:leave", (payload: { conversationId?: string }) => {
    if (payload?.conversationId) socket.leave(roomName(payload.conversationId));
  });

  socket.on("message:send", async (payload: { conversationId?: string; body?: string }) => {
    const conversationId = payload?.conversationId;
    const body = payload?.body?.trim();
    if (!conversationId || !body || body.length > MAX_MESSAGE_LENGTH) return;

    const participant = await getParticipant(conversationId, userId);
    if (!participant) {
      socket.emit("conversation:error", { conversationId, error: "Not found or forbidden" });
      return;
    }

    const message = await prisma.message.create({
      data: { conversationId, senderId: userId, body },
    });

    io.to(roomName(conversationId)).emit("message:new", { message });
  });

  // "disconnecting" fires before Socket.IO removes the socket from its
  // rooms, so this is the last point socket.rooms is still accurate —
  // by the time "disconnect" fires, room membership is already cleared.
  socket.on("disconnecting", () => {
    const roomsAtDisconnect = new Set(socket.rooms);
    const becameOffline = markOffline(userId, socket.id);
    if (becameOffline) {
      for (const room of roomsAtDisconnect) {
        if (room !== socket.id) io.to(room).emit("presence:update", { userId, online: false });
      }
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`Chat server listening on :${PORT}`);
});
