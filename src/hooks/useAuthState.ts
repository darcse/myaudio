'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { clearCatalogLibraryCache } from '@/lib/catalogLibraryCache';

export function useAuthState(): boolean | null {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const client = createClient();
    let previousUserId: string | null | undefined;

    const syncAuth = (userId: string | null) => {
      if (previousUserId !== undefined && previousUserId !== userId) {
        clearCatalogLibraryCache();
      }
      previousUserId = userId;
      setIsAuthenticated(!!userId);
    };

    client.auth.getSession().then(({ data: { session } }) => {
      syncAuth(session?.user?.id ?? null);
    });
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_e, session) => {
      syncAuth(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  return isAuthenticated;
}
