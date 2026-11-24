'use client';

import { useEffect, useState } from 'react';
import { Layers } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthState } from '@/hooks/useAuthState';
import { HeadfiComboManageSection } from '../../_components/HeadfiComboManageSection';
import { HeadfiPageHeader, HeadfiSubHeader } from '../../_components/HeadfiPageHeader';
import type { Headfi } from '../../types';

export function HeadfiCombosContent() {
  const isAuthenticated = useAuthState();
  const [library, setLibrary] = useState<Headfi[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    void (async () => {
      try {
        const { data } = await createClient()
          .from('headfi')
          .select('*')
          .order('brand')
          .order('model');
        if (!cancelled) setLibrary((data as Headfi[]) || []);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div
      className="relative mx-auto min-h-screen max-w-6xl px-4 py-8 sm:px-6"
      style={{ color: 'var(--foreground)' }}
    >
      <HeadfiPageHeader activeNav="combos" isAuthenticated={isAuthenticated} showDivider />
      <HeadfiSubHeader icon={Layers} title="조합" />

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div
            className="h-8 w-8 animate-spin rounded-full border-2"
            style={{ borderColor: 'var(--border)', borderTopColor: 'var(--foreground)' }}
          />
        </div>
      ) : (
        <HeadfiComboManageSection library={library} isAuthenticated={isAuthenticated} hideHeading />
      )}
    </div>
  );
}
