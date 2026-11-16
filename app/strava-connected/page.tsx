'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function StravaConnectedInner() {
  const params = useSearchParams();
  const status = params.get('status');
  const success = status === 'success';

  return (
    <div className="min-h-screen bg-jj-neutral dark:bg-gray-950 flex items-center justify-center p-6">
      <div className="max-w-sm w-full text-center">
        <div className="text-5xl mb-4">{success ? '✓' : '✗'}</div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          {success ? 'Strava connected!' : 'Connection failed'}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {success
            ? 'Return to the app and tap Sync to import your runs.'
            : 'Something went wrong. Close this and try again from the app.'}
        </p>
      </div>
    </div>
  );
}

export default function StravaConnectedPage() {
  return (
    <Suspense>
      <StravaConnectedInner />
    </Suspense>
  );
}
