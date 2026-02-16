'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface TypewriterStatusProps {
  messages: string[];
  intervalMs?: number;
  typingSpeed?: number;
}

function RotatingDots() {
  return (
    <span className="relative ml-1 w-3 h-3 inline-flex items-center justify-center">
      <motion.span
        className="absolute inset-0"
        animate={{ rotate: 360 }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
      >
        {[0, 1, 2, 3].map((i) => {
          const angle = (i * 90 * Math.PI) / 180;
          const x = 6 + 4.5 * Math.cos(angle);
          const y = 6 + 4.5 * Math.sin(angle);
          return (
            <span
              key={i}
              className="absolute h-1 w-1 rounded-full bg-foreground"
              style={{ left: x - 2, top: y - 2, opacity: 0.15 + (i / 4) * 0.55 }}
            />
          );
        })}
      </motion.span>
    </span>
  );
}

export function TypewriterStatus({
  messages,
  intervalMs = 2800,
  typingSpeed = 35,
}: TypewriterStatusProps) {
  const [msgIndex, setMsgIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [phase, setPhase] = useState<'typing' | 'hold' | 'exit'>('typing');

  useEffect(() => {
    const msg = messages[msgIndex] ?? '';
    let t: ReturnType<typeof setTimeout>;

    if (phase === 'typing' && charIndex < msg.length) {
      t = setTimeout(() => setCharIndex((c) => c + 1), typingSpeed);
    } else if (phase === 'typing' && charIndex === msg.length) {
      t = setTimeout(() => setPhase('hold'), 0);
    } else if (phase === 'hold') {
      t = setTimeout(() => setPhase('exit'), intervalMs);
    } else if (phase === 'exit') {
      t = setTimeout(() => {
        setMsgIndex((i) => (i + 1) % messages.length);
        setCharIndex(0);
        setPhase('typing');
      }, 350);
    }

    return () => clearTimeout(t);
  }, [charIndex, phase, msgIndex, messages, intervalMs, typingSpeed]);

  const text = (messages[msgIndex] ?? '').slice(0, charIndex);

  return (
    <div className="text-center h-6">
      <AnimatePresence mode="wait">
        <motion.span
          key={msgIndex}
          className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-[11px] text-muted-foreground"
          initial={{ opacity: 0, filter: 'blur(4px)' }}
          animate={
            phase === 'exit'
              ? { opacity: 0, filter: 'blur(4px)' }
              : { opacity: 1, filter: 'blur(0px)' }
          }
          transition={{ duration: 0.3 }}
        >
          {text}
          {phase === 'hold' && <RotatingDots />}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}
