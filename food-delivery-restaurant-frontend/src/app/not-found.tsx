'use client';

import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
      <div className="max-w-md w-full text-center">
        <h1 className="text-6xl font-bold text-gray-900 dark:text-white mb-2">404</h1>
        <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-4">Page Not Found</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">
          The page or resource you are looking for does not exist.
        </p>
        <Link
          href="/"
          className="inline-flex items-center px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-medium text-sm transition-colors"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}

