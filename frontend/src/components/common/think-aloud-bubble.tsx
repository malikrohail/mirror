'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { EMOTION_ICONS } from '@/lib/constants';
import type { EmotionalState } from '@/types';

interface ThinkAloudBubbleProps {
  text: string;
  emotionalState?: EmotionalState | null;
  className?: string;
}

export function ThinkAloudBubble({ text, emotionalState, className }: ThinkAloudBubbleProps) {
  const [displayedText, setDisplayedText] = useState('');
  const prevTextRef = useRef('');

  useEffect(() => {
    // If the text changed, typewrite the new text
    if (text === prevTextRef.current) return;
    prevTextRef.current = text;

    setDisplayedText('');
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayedText(text.slice(0, i));
      if (i >= text.length) clearInterval(interval);
    }, 20);

    return () => clearInterval(interval);
  }, [text]);

  return (
    <div
      className={cn(
        'relative px-3 py-2 text-sm',
        className,
      )}
    >
      {emotionalState && (
        <span className="mb-1 mr-2 inline-block text-base" aria-label={emotionalState}>
          {EMOTION_ICONS[emotionalState]}
        </span>
      )}
      <span className="italic">{displayedText}</span>
    </div>
  );
}
