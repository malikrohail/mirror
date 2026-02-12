export const API_BASE = '/api/v1';
export const WS_URL =
  process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:8000';

export const STUDY_STATUSES = ['setup', 'running', 'analyzing', 'complete', 'failed'] as const;
export const SEVERITIES = ['critical', 'major', 'minor', 'enhancement'] as const;
export const EMOTIONAL_STATES = ['curious', 'confused', 'frustrated', 'satisfied', 'stuck'] as const;

export const SEVERITY_COLORS: Record<string, string> = {
  critical: 'text-red-600 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-950 dark:border-red-900',
  major: 'text-orange-600 bg-orange-50 border-orange-200 dark:text-orange-400 dark:bg-orange-950 dark:border-orange-900',
  minor: 'text-yellow-600 bg-yellow-50 border-yellow-200 dark:text-yellow-400 dark:bg-yellow-950 dark:border-yellow-900',
  enhancement: 'text-blue-600 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-950 dark:border-blue-900',
};

export const STATUS_COLORS: Record<string, string> = {
  setup: 'text-gray-600 bg-gray-50 border-gray-200 dark:text-gray-400 dark:bg-gray-950 dark:border-gray-800',
  running: 'text-blue-600 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-950 dark:border-blue-900',
  analyzing: 'text-purple-600 bg-purple-50 border-purple-200 dark:text-purple-400 dark:bg-purple-950 dark:border-purple-900',
  complete: 'text-green-600 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-950 dark:border-green-900',
  failed: 'text-red-600 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-950 dark:border-red-900',
};

export const EMOTION_ICONS: Record<string, string> = {
  curious: '🤔',
  confused: '😕',
  frustrated: '😤',
  satisfied: '😊',
  stuck: '😩',
};

export const AUTOPLAY_INTERVAL = 2000;
export const WS_RECONNECT_INTERVAL = 3000;
export const MAX_RECONNECT_ATTEMPTS = 10;
