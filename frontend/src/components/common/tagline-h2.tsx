'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Code2, Mouse, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

export function TaglineH2() {
  const [isAI, setIsAI] = useState(true);
  const autoStep = useRef(0);
  const userActed = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (userActed.current || autoStep.current >= 2) return;
    timeoutRef.current = setTimeout(() => {
      if (userActed.current) return;
      if (autoStep.current === 0) {
        autoStep.current = 1;
        setIsAI(false);
      } else if (autoStep.current === 1) {
        autoStep.current = 2;
        setIsAI(true);
      }
    }, 8000);
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, [isAI]);

  const interact = useCallback(() => {
    userActed.current = true;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsAI((v) => !v);
  }, []);

  return (
    <h2
      className="group/h2 mt-1 inline cursor-pointer text-lg text-foreground/70"
      onClick={interact}
    >
      <AnimatePresence mode="wait">
        <motion.span
          key={isAI ? 'ai' : 'qa'}
          className="font-medium text-foreground"
          initial={{ opacity: 0, filter: 'blur(8px)' }}
          animate={{ opacity: 1, filter: 'blur(0px)' }}
          exit={{ opacity: 0, filter: 'blur(8px)' }}
          transition={{ duration: 0.35 }}
        >
          {isAI ? <><Code2 className="inline h-4 w-4 mr-1 -translate-y-[1px]" />AI testers</> : <><Mouse className="inline h-4 w-4 mr-1 -translate-y-[1px]" />QA</>}
        </motion.span>
      </AnimatePresence>
      {' '}find{' '}
      <AnimatePresence mode="wait">
        <motion.span
          key={isAI ? 'every' : 'most'}
          className={cn(
            'border-b-2 pb-0.5 font-medium text-foreground',
            isAI ? 'border-red-400/25' : 'border-orange-400/25',
          )}
          initial={{ opacity: 0, filter: 'blur(6px)' }}
          animate={{ opacity: 1, filter: 'blur(0px)' }}
          exit={{ opacity: 0, filter: 'blur(6px)' }}
          transition={{ duration: 0.3, delay: 0.05 }}
        >
          {isAI ? 'every issue' : 'most issues'}
        </motion.span>
      </AnimatePresence>
      {' '}in{' '}
      <AnimatePresence mode="wait">
        <motion.span
          key={isAI ? 'min' : 'hr'}
          className={cn(
            'border-b-2 pb-0.5 font-medium text-foreground',
            isAI ? 'border-emerald-500/30' : 'border-amber-500/25',
          )}
          initial={{ opacity: 0, filter: 'blur(6px)' }}
          animate={{ opacity: 1, filter: 'blur(0px)' }}
          exit={{ opacity: 0, filter: 'blur(6px)' }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          {isAI ? 'minutes' : 'hours'}
        </motion.span>
      </AnimatePresence>
      {', '}
      <AnimatePresence mode="wait">
        <motion.span
          key={isAI ? 'before' : 'along'}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, delay: 0.15 }}
        >
          {isAI ? 'before your users do' : 'along with your users'}
        </motion.span>
      </AnimatePresence>
      {'  '}<RefreshCw className="inline h-3.5 w-3.5 text-foreground/30 transition-all group-hover/h2:text-foreground/70 group-hover/h2:scale-110 ml-1" />
    </h2>
  );
}
