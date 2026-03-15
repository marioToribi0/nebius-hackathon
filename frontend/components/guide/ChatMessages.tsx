"use client";

import { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import type { ChatMessage } from "@/lib/types";
import { AudioButton } from "./AudioButton";
import { Bot, User } from "lucide-react";

interface ChatMessagesProps {
  messages: ChatMessage[];
  isStreaming: boolean;
}

export function ChatMessages({ messages, isStreaming }: ChatMessagesProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (messages.length === 0) {
    return null;
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5">
      {messages.map((msg, idx) => {
        const isUser = msg.role === "user";
        const isLast = idx === messages.length - 1;
        const isAssistantStreaming = !isUser && isLast && isStreaming;

        return (
          <div key={msg.id} className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
            {/* Avatar */}
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                isUser
                  ? "bg-primary/10 text-primary"
                  : "bg-accent/10 text-accent"
              }`}
            >
              {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
            </div>

            {/* Bubble */}
            <div className={`max-w-[75%] min-w-0 ${isUser ? "text-right" : ""}`}>
              <div
                className={`inline-block rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  isUser
                    ? "bg-primary text-primary-foreground rounded-tr-sm"
                    : "bg-card border border-border text-foreground rounded-tl-sm shadow-sm"
                }`}
              >
                {isUser ? (
                  <span>{msg.text}</span>
                ) : msg.text ? (
                  <div className="prose-chat">
                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                    {isAssistantStreaming && (
                      <span className="inline-block w-1.5 h-4 bg-accent/70 rounded-sm animate-pulse ml-0.5 align-text-bottom" />
                    )}
                  </div>
                ) : isAssistantStreaming ? (
                  <div className="flex items-center gap-1.5 py-0.5">
                    <span className="h-2 w-2 rounded-full bg-accent/50 animate-bounce [animation-delay:0ms]" />
                    <span className="h-2 w-2 rounded-full bg-accent/50 animate-bounce [animation-delay:150ms]" />
                    <span className="h-2 w-2 rounded-full bg-accent/50 animate-bounce [animation-delay:300ms]" />
                  </div>
                ) : null}
              </div>

              {/* Audio button — shown for completed assistant messages */}
              {!isUser && msg.text && !isAssistantStreaming && (
                <div className="mt-1">
                  <AudioButton text={msg.text} />
                </div>
              )}
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
