'use client';

import type { ReactNode } from 'react';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './AuthProvider';

/**
 * Trimmed-down replacement for mediaJira's AppProviders.
 *
 * The original also wrapped the app in an onboarding tour provider/gate,
 * an analytics TrackingProvider, and a billing UpgradeModal - none of
 * which are part of this extracted project (auth + dashboard + ticket
 * form builder only). See README "Known simplifications".
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      {children}
      <Toaster
        position="top-right"
        containerStyle={{
          zIndex: 999999,
        }}
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#10B981',
              secondary: '#fff',
            },
          },
          error: {
            duration: 5000,
            iconTheme: {
              primary: '#EF4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </AuthProvider>
  );
}
