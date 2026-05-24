// src/app/components/Countdown.tsx
"use client";

import { useEffect, useState } from "react";

interface CountdownProps {
  expiresAt: string;
  onExpired?: () => void;
}

export function Countdown({ expiresAt, onExpired }: CountdownProps) {
  const [remaining, setRemaining] = useState<number>(0);

  useEffect(() => {
    const tick = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      setRemaining(Math.max(0, diff));
      if (diff <= 0) onExpired?.();
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt, onExpired]);

  const totalSeconds = Math.floor(remaining / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const isUrgent = remaining < 60_000 && remaining > 0;
  const isExpired = remaining === 0;

  return (
    <div
      className={`inline-flex items-center gap-2 font-mono text-lg font-bold tabular-nums ${
        isExpired
          ? "text-red-600"
          : isUrgent
          ? "text-orange-500"
          : "text-emerald-600"
      }`}
    >
      <svg
        className={`w-5 h-5 flex-shrink-0 ${isExpired ? "text-red-500" : isUrgent ? "text-orange-400 animate-pulse" : "text-emerald-500"}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      {isExpired ? (
        "Expired"
      ) : (
        `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
      )}
    </div>
  );
}
