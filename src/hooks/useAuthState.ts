'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export function useAuthState(): boolean | null {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const client = createClient();
    client.auth.getSession().then(({ data: { session } }) =>
      setIsAuthenticated(!!session?.user),
    );
    const { data: { subscription } } = client.auth.onAuthStateChange((_e, session) =>
      setIsAuthenticated(!!session?.user),
    );
    return () => subscription.unsubscribe();
  }, []);

  return isAuthenticated;
}
