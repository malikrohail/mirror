'use client';

import { useEffect, useState } from 'react';

interface TypewriterStatusProps {
  messages: string[];
  intervalMs?: number;
}

export function TypewriterStatus({
  messages,
  intervalMs = 2200,
}: TypewriterStatusProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (messages.length <= 1) return;
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % messages.length);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [messages.length, intervalMs]);

  const text = messages[index] ?? '';

  return (
    <p className="text-xs text-muted-foreground animate-pulse">
      {text}
      <span className="inline-block w-[2px] h-3 ml-0.5 bg-current animate-pulse" />
    </p>
  );
}
