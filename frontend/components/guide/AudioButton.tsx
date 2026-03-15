"use client";

import { useRef, useState } from "react";
import { guideApi } from "@/lib/api";
import { Loader2, Pause, Volume2 } from "lucide-react";

interface AudioButtonProps {
  text: string;
}

export function AudioButton({ text }: AudioButtonProps) {
  const [state, setState] = useState<"idle" | "loading" | "playing" | "paused">("idle");
  const blobRef = useRef<Blob | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  async function handleClick() {
    if (state === "playing" && audioRef.current) {
      audioRef.current.pause();
      setState("paused");
      return;
    }

    if (state === "paused" && audioRef.current) {
      audioRef.current.play();
      setState("playing");
      return;
    }

    if (!blobRef.current) {
      setState("loading");
      try {
        blobRef.current = await guideApi.tts(text);
      } catch {
        setState("idle");
        return;
      }
    }

    const url = URL.createObjectURL(blobRef.current);
    const audio = new Audio(url);
    audioRef.current = audio;

    audio.onended = () => {
      setState("idle");
      URL.revokeObjectURL(url);
    };

    setState("playing");
    audio.play();
  }

  if (!text) return null;

  return (
    <button
      onClick={handleClick}
      disabled={state === "loading"}
      className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-accent hover:bg-accent/10 transition disabled:opacity-50"
      title={state === "playing" ? "Pause" : "Listen"}
    >
      {state === "loading" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      {state === "playing" && <Pause className="h-3.5 w-3.5" />}
      {(state === "idle" || state === "paused") && <Volume2 className="h-3.5 w-3.5" />}
      <span>{state === "loading" ? "Loading..." : state === "playing" ? "Pause" : "Listen"}</span>
    </button>
  );
}
