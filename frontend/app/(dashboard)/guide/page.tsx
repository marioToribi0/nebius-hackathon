"use client";

import { useState } from "react";
import { TopNav } from "@/components/dashboard/TopNav";
import { PlaceSelector } from "@/components/guide/PlaceSelector";
import { ChatMessages } from "@/components/guide/ChatMessages";
import { ChatInput } from "@/components/guide/ChatInput";
import { useGuideSocket } from "@/hooks/useGuideSocket";
import type { ResearchedPlace } from "@/lib/types";
import { Bot, Compass, MessageCircle, Sparkles } from "lucide-react";
import Link from "next/link";

export default function GuidePage() {
  const [selectedPlace, setSelectedPlace] = useState<ResearchedPlace | null>(null);
  const { messages, isConnected, isStreaming, sendMessage, error } = useGuideSocket(
    selectedPlace?.place_key ?? null,
  );

  return (
    <div className="flex flex-col h-full">
      <TopNav title="Guide" />

      <div className="flex-1 flex flex-col p-6 gap-5 overflow-hidden">
        {/* Header + place selector */}
        <div className="animate-fade-in-up">
          <h2 className="text-xl font-bold text-foreground font-[family-name:var(--font-playfair)] mb-1">
            AI Tour Guide
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Chat with an expert guide about your researched destinations
          </p>
          <PlaceSelector selected={selectedPlace} onSelect={setSelectedPlace} />
        </div>

        {/* Chat area */}
        {!selectedPlace ? (
          /* Empty state */
          <div className="flex-1 flex items-center justify-center animate-fade-in-up">
            <div className="text-center max-w-sm">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10 border border-accent/15">
                <Bot className="h-8 w-8 text-accent" />
              </div>
              <h3 className="text-lg font-bold text-foreground font-[family-name:var(--font-playfair)] mb-2">
                Select a place to get started
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-5">
                Choose a researched destination above and start chatting about its history,
                attractions, local tips, or current events.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {[
                  { icon: MessageCircle, text: "Ask questions" },
                  { icon: Sparkles, text: "Get recommendations" },
                  { icon: Compass, text: "Explore history" },
                ].map(({ icon: Icon, text }) => (
                  <span
                    key={text}
                    className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground"
                  >
                    <Icon className="h-3 w-3" />
                    {text}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Chat container */
          <div className="flex-1 flex flex-col rounded-2xl border border-border bg-card overflow-hidden animate-fade-in-up shadow-sm">
            {/* Chat header bar */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10">
                <Bot className="h-4 w-4 text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">
                  Guide for {selectedPlace.place_name}
                </p>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      isConnected ? "bg-emerald-500" : error ? "bg-destructive" : "bg-amber-400 animate-pulse"
                    }`}
                  />
                  <span className="text-[11px] text-muted-foreground">
                    {isConnected ? "Connected" : error ? "Disconnected" : "Connecting..."}
                  </span>
                </div>
              </div>
              <Link
                href="/discover"
                className="text-xs text-muted-foreground hover:text-primary transition"
              >
                Change place
              </Link>
            </div>

            {/* Error banner */}
            {error && (
              <div className="px-4 py-2.5 bg-destructive/5 border-b border-destructive/10 text-destructive text-xs font-medium">
                {error}
              </div>
            )}

            {/* Messages */}
            <ChatMessages messages={messages} isStreaming={isStreaming} />

            {/* Input */}
            <ChatInput
              onSend={sendMessage}
              disabled={!isConnected || isStreaming}
              isStreaming={isStreaming}
            />
          </div>
        )}
      </div>
    </div>
  );
}
