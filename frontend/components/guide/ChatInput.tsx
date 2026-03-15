"use client";

import { useState } from "react";
import { Send, Loader2 } from "lucide-react";

interface ChatInputProps {
  onSend: (text: string) => void;
  disabled: boolean;
  isStreaming: boolean;
}

export function ChatInput({ onSend, disabled, isStreaming }: ChatInputProps) {
  const [text, setText] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border-t border-border bg-card/50 p-3"
    >
      <div className="relative">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            disabled && !isStreaming
              ? "Connecting to guide..."
              : isStreaming
                ? "Waiting for response..."
                : "Ask about this place..."
          }
          disabled={disabled}
          rows={1}
          className="w-full resize-none rounded-xl border border-border bg-background py-3 pl-4 pr-14 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={disabled || !text.trim()}
          className="absolute right-2 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground transition hover:bg-primary/90 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {isStreaming ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </button>
      </div>
    </form>
  );
}
