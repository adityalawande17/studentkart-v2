"use client";

import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";

type Message = {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
  readAt: string | null;
};

type ConnectionState = "connecting" | "connected" | "disconnected";

export function ChatThread({
  conversationId,
  currentUserId,
  otherUserId,
  otherUserName,
  initialMessages,
}: {
  conversationId: string;
  currentUserId: string;
  otherUserId: string;
  otherUserName: string;
  initialMessages: Message[];
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [otherOnline, setOtherOnline] = useState(false);
  const [connectionState, setConnectionState] = useState<ConnectionState>("connecting");
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket: Socket = io(process.env.NEXT_PUBLIC_CHAT_SERVER_URL!, {
      auth: (cb) => {
        fetch("/api/chat/token", { method: "POST" })
          .then((res) => res.json())
          .then((data) => cb({ token: data.token }))
          .catch(() => cb({ token: null }));
      },
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnectionState("connected");
      socket.emit("conversation:join", { conversationId });
    });

    socket.on("disconnect", () => setConnectionState("disconnected"));
    socket.io.on("reconnect_attempt", () => setConnectionState("connecting"));

    socket.on("conversation:joined", (data: { otherUserOnline: boolean }) => {
      setOtherOnline(data.otherUserOnline);
    });

    socket.on("presence:update", (data: { userId: string; online: boolean }) => {
      if (data.userId === otherUserId) setOtherOnline(data.online);
    });

    socket.on("message:new", (data: { message: Message }) => {
      setMessages((prev) => (prev.some((m) => m.id === data.message.id) ? prev : [...prev, data.message]));
    });

    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, [conversationId, otherUserId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const body = input.trim();
    if (!body) return;

    socketRef.current?.emit("message:send", { conversationId, body });
    setInput("");
  }

  return (
    <div className="flex flex-1 flex-col gap-3 overflow-hidden rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 pb-3 text-sm">
        <span className="font-medium text-neutral-900">
          Chatting with <strong className="text-brand-700">{otherUserName}</strong>
        </span>
        <span className="flex items-center gap-1.5 text-neutral-500">
          <span
            className={`h-2 w-2 rounded-full ${otherOnline ? "bg-green-500" : "bg-neutral-300"}`}
          />
          {otherOnline ? "Online" : "Offline"}
          {connectionState !== "connected" && (
            <span className="ml-1 text-amber-600">
              ({connectionState === "connecting" ? "connecting..." : "disconnected"})
            </span>
          )}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 overflow-y-auto py-1">
        {messages.map((m) => {
          const isMine = m.senderId === currentUserId;
          return (
            <div
              key={m.id}
              className={`max-w-[75%] px-3.5 py-2 text-sm shadow-sm ${
                isMine
                  ? "self-end rounded-2xl rounded-br-sm bg-brand-600 text-white"
                  : "self-start rounded-2xl rounded-bl-sm bg-neutral-100 text-neutral-800"
              }`}
            >
              {m.body}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2 border-t border-neutral-100 pt-3">
        <input
          className="flex-1 rounded-full border border-neutral-200 px-4 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
        />
        <button
          type="submit"
          className="rounded-full bg-brand-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-brand-700"
        >
          Send
        </button>
      </form>
    </div>
  );
}
