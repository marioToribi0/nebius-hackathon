"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getToken } from "@/lib/api";
import type { ChatMessage } from "@/lib/types";

interface UseGuideSocketReturn {
  messages: ChatMessage[];
  isConnected: boolean;
  isStreaming: boolean;
  sendMessage: (text: string) => void;
  error: string | null;
}

export function useGuideSocket(placeKey: string | null): UseGuideSocketReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const streamBufferRef = useRef("");
  const assistantIdRef = useRef("");

  // Reset state when place changes
  useEffect(() => {
    setMessages([]);
    setError(null);
    setIsStreaming(false);
    setIsConnected(false);
    streamBufferRef.current = "";

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    if (!placeKey) return;

    const token = getToken();
    if (!token) {
      setError("Not authenticated");
      return;
    }

    // Build WebSocket URL
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    // Try direct backend connection since Next.js rewrites may not proxy WebSocket upgrades
    const host = window.location.hostname;
    const wsUrl = `${proto}//${host}:8000/api/guide/ws/${placeKey}?token=${token}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      setError(null);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "token") {
          // If no assistant placeholder exists yet (e.g. server-initiated greeting),
          // create one automatically
          if (!assistantIdRef.current) {
            const id = `assistant-${Date.now()}`;
            assistantIdRef.current = id;
            streamBufferRef.current = "";
            setMessages((prev) => [
              ...prev,
              { id, role: "assistant", text: "", timestamp: Date.now() },
            ]);
            setIsStreaming(true);
          }

          streamBufferRef.current += data.text;
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last && last.id === assistantIdRef.current) {
              updated[updated.length - 1] = { ...last, text: streamBufferRef.current };
            }
            return updated;
          });
        } else if (data.type === "done") {
          setIsStreaming(false);
          assistantIdRef.current = "";
        } else if (data.type === "error") {
          setError(data.text);
          setIsStreaming(false);
          assistantIdRef.current = "";
        }
      } catch {
        // ignore parse errors
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      setIsStreaming(false);
    };

    ws.onerror = () => {
      setError("WebSocket connection failed");
      setIsConnected(false);
      setIsStreaming(false);
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [placeKey]);

  const sendMessage = useCallback(
    (text: string) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN || isStreaming) return;

      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        text,
        timestamp: Date.now(),
      };

      const assistantId = `assistant-${Date.now()}`;
      assistantIdRef.current = assistantId;
      streamBufferRef.current = "";

      const assistantMsg: ChatMessage = {
        id: assistantId,
        role: "assistant",
        text: "",
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setIsStreaming(true);
      setError(null);

      wsRef.current.send(JSON.stringify({ type: "message", text }));
    },
    [isStreaming],
  );

  return { messages, isConnected, isStreaming, sendMessage, error };
}
