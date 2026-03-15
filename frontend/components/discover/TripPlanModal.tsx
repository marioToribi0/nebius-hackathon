"use client";

import { useEffect, useRef, useState } from "react";
import { X, Loader2, Copy, Check, QrCode } from "lucide-react";
import { placesApi, researchApi } from "@/lib/api";
import { researchStore, generatePlaceKey } from "@/lib/researchStore";
import type { Place, TripQuestion } from "@/lib/types";

interface TripPlanModalProps {
  place: Place;
  /** If provided, skip straight to the QR display */
  existingPlaceKey?: string;
  onClose: () => void;
  onResearchStart?: (placeId: string) => void;
  onResearchComplete: (placeId: string, placeKey: string) => void;
}

type Step = "questions" | "review" | "processing" | "qr";

export function TripPlanModal({ place, existingPlaceKey, onClose, onResearchStart, onResearchComplete }: TripPlanModalProps) {
  const [step, setStep] = useState<Step>(existingPlaceKey ? "qr" : "questions");
  const [questions, setQuestions] = useState<TripQuestion[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(!existingPlaceKey);
  const [placeKey] = useState<string>(existingPlaceKey ?? generatePlaceKey());
  const [qrCode, setQrCode] = useState<string>("");
  const [loadingQR, setLoadingQR] = useState(!!existingPlaceKey);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string>("");
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load questions (new flow)
  useEffect(() => {
    if (existingPlaceKey) return;
    placesApi
      .getQuestions(place.id)
      .then((qs) => {
        setQuestions(qs);
        setAnswers(qs.map(() => ""));
        setLoadingQuestions(false);
      })
      .catch(() => {
        setError("Failed to load questions. Please try again.");
        setLoadingQuestions(false);
      });
  }, [place.id, existingPlaceKey]);

  // Fetch QR if showing existing research
  useEffect(() => {
    if (!existingPlaceKey) return;
    researchApi
      .getQR(existingPlaceKey)
      .then((qr) => {
        setQrCode(qr);
        setLoadingQR(false);
      })
      .catch(() => {
        setError("Could not load QR code.");
        setLoadingQR(false);
      });
  }, [existingPlaceKey]);

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  async function handleSendToAI() {
    setStep("processing");
    const tripContext: Record<string, string> = {};
    questions.forEach((q, i) => {
      if (answers[i]) tripContext[q.question] = answers[i];
    });

    researchStore.set(place.id, { place_key: placeKey, status: "processing" });
    onResearchStart?.(place.id);

    try {
      await researchApi.trigger(place.name, placeKey, tripContext);
    } catch (e: unknown) {
      const httpStatus = (e as { response?: { status?: number } })?.response?.status;
      if (httpStatus !== 409) {
        setError("Failed to start research.");
        setStep("review");
        return;
      }
    }

    pollingRef.current = setInterval(async () => {
      try {
        const res = await researchApi.getStatus(placeKey);
        if (res.status === "completed") {
          clearInterval(pollingRef.current!);
          const qr = await researchApi.getQR(placeKey);
          setQrCode(qr);
          researchStore.set(place.id, { place_key: placeKey, status: "completed" });
          onResearchComplete(place.id, placeKey);
          setStep("qr");
        } else if (res.status === "failed") {
          clearInterval(pollingRef.current!);
          researchStore.remove(place.id);
          setError("Research failed: " + (res.error ?? "unknown error"));
          setStep("review");
        }
      } catch {
        // keep polling on transient errors
      }
    }, 3000);
  }

  function handleCopy() {
    navigator.clipboard.writeText(placeKey).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-lg font-bold font-[family-name:var(--font-playfair)] text-foreground">
            {step === "qr" ? "Your Trip is Ready!" : `Prepare Your Trip to ${place.name}`}
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Step: questions */}
          {step === "questions" && (
            <div className="space-y-5">
              {loadingQuestions ? (
                <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Generating personalised questions…</span>
                </div>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Pick an option for each question so our AI can tailor your tour.
                  </p>
                  {questions.map((q, i) => (
                    <div key={i}>
                      <p className="text-sm font-semibold text-foreground mb-2">{q.question}</p>
                      <div className="space-y-2">
                        {q.options.map((opt) => (
                          <label
                            key={opt}
                            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                              answers[i] === opt
                                ? "border-[#B45309] bg-[#B45309]/5"
                                : "border-border hover:border-[#B45309]/50"
                            }`}
                          >
                            <input
                              type="radio"
                              name={`question-${i}`}
                              value={opt}
                              checked={answers[i] === opt}
                              onChange={() => {
                                const next = [...answers];
                                next[i] = opt;
                                setAnswers(next);
                              }}
                              className="accent-[#B45309]"
                            />
                            <span className="text-sm text-foreground">{opt}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          {/* Step: review */}
          {step === "review" && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground mb-4">
                Review your choices before sending to the AI Guide.
              </p>
              {questions.map((q, i) => (
                <div key={i} className="p-3 bg-secondary rounded-lg">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                    {q.question}
                  </p>
                  <p className="text-sm text-foreground">
                    {answers[i] || <span className="italic text-muted-foreground">No selection</span>}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Step: processing */}
          {step === "processing" && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-[#B45309]" />
              <p className="text-base font-semibold text-foreground">AI Guide is researching your trip…</p>
              <p className="text-sm text-muted-foreground text-center">
                This may take a minute. We&apos;re crafting a personalised 30-minute route for you.
              </p>
            </div>
          )}

          {/* Step: QR */}
          {step === "qr" && (
            <div className="flex flex-col items-center gap-5">
              {loadingQR ? (
                <div className="flex items-center gap-2 py-8 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Loading QR code…</span>
                </div>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground text-center">
                    Show this QR code to the robot guide to start your personalised tour of{" "}
                    <strong>{place.name}</strong>.
                  </p>

                  {qrCode && (
                    <img
                      src={qrCode}
                      alt="Trip QR code"
                      className="w-52 h-52 rounded-xl border-4 border-[#B45309] shadow-lg"
                    />
                  )}

                  {/* Trip code + copy */}
                  <div className="flex items-center gap-2 bg-secondary px-4 py-2 rounded-lg">
                    <QrCode className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="font-mono text-lg font-bold tracking-widest text-foreground">
                      {placeKey.toUpperCase()}
                    </span>
                    <button
                      onClick={handleCopy}
                      className="ml-1 p-1 rounded hover:bg-border transition-colors text-muted-foreground hover:text-foreground"
                      aria-label="Copy code"
                    >
                      {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Point the robot&apos;s camera at the QR code or type the code above
                  </p>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border flex justify-end gap-3">
          {step === "questions" && !loadingQuestions && (
            <>
              <button onClick={onClose} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                Cancel
              </button>
              <button
                onClick={() => setStep("review")}
                className="px-5 py-2 text-sm font-semibold bg-[#B45309] hover:bg-[#92400E] text-white rounded-lg transition-colors"
              >
                Review Answers
              </button>
            </>
          )}
          {step === "review" && (
            <>
              <button onClick={() => setStep("questions")} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                Back
              </button>
              <button
                onClick={handleSendToAI}
                className="px-5 py-2 text-sm font-semibold bg-[#B45309] hover:bg-[#92400E] text-white rounded-lg transition-colors"
              >
                Send to AI Guide
              </button>
            </>
          )}
          {step === "qr" && (
            <button
              onClick={onClose}
              className="px-5 py-2 text-sm font-semibold bg-[#B45309] hover:bg-[#92400E] text-white rounded-lg transition-colors"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
