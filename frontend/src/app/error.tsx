'use client';

import { ErrorState } from '@/components/common/error-state';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-8">
      <ErrorState
        title="Something went wrong"
        message={error.message}
        onRetry={reset}
      />
    </div>
  );
}
