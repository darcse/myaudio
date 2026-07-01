'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, Map } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthState } from '@/hooks/useAuthState';
import type { Headfi } from '../../types';
import { MatchMapTab } from './MatchMapTab';
import { PositionMapTab } from './PositionMapTab';

type MapTab = 'position' | 'match';

function tabButtonClass(active: boolean): string {
  return `border-b-2 px-1 pb-3 text-sm transition-colors ${
    active
      ? 'border-[var(--foreground)] font-semibold opacity-100'
      : 'border-transparent opacity-60 hover:opacity-90'
  }`;
}

export function HeadfiMapContent() {
  const isAuthenticated = useAuthState();
  const [activeTab, setActiveTab] = useState<MapTab>('position');
  const [library, setLibrary] = useState<Headfi[]>([]);
  const [matchCache, setMatchCache] = useState<
    {
      base_gear_id: number;
      target_gear_id: number;
      drive: number;
      synergy: number;
      genre: number;
      comment: string;
    }[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const client = createClient();
      const [{ data: headfiData }, { data: cacheData }] = await Promise.all([
        client.from('headfi').select('*').order('brand').order('model'),
        client.from('headfi_match_cache').select('base_gear_id, target_gear_id, drive, synergy, genre, comment'),
      ]);
      setLibrary((headfiData as Headfi[]) || []);
      setMatchCache(
        (cacheData ?? []).map((row) => ({
          base_gear_id: row.base_gear_id,
          target_gear_id: row.target_gear_id,
          drive: row.drive,
          synergy: row.synergy,
          genre: row.genre,
          comment: row.comment || '',
        })),
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return (
    <div className="relative mx-auto min-h-screen max-w-6xl px-4 py-8 sm:px-6" style={{ color: 'var(--foreground)' }}>
      <div className="mb-6">
        <Link
          href="/headfi"
          className="mb-4 inline-flex items-center gap-1 text-sm opacity-70 transition-opacity hover:opacity-100"
        >
          <ChevronLeft className="size-5" strokeWidth={1.75} />
          Head-fi
        </Link>
        <h1 className="page-title flex items-center gap-2">
          <Map className="size-7 shrink-0 opacity-80" strokeWidth={1.5} />
          포지션 맵
        </h1>
      </div>

      <div className="mb-6 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="-mb-px flex gap-4">
          <button
            type="button"
            onClick={() => setActiveTab('position')}
            className={tabButtonClass(activeTab === 'position')}
            aria-pressed={activeTab === 'position'}
          >
            포지션맵
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('match')}
            className={tabButtonClass(activeTab === 'match')}
            aria-pressed={activeTab === 'match'}
          >
            매칭맵
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div
            className="h-8 w-8 animate-spin rounded-full border-2"
            style={{ borderColor: 'var(--border)', borderTopColor: 'var(--foreground)' }}
          />
        </div>
      ) : activeTab === 'position' ? (
        <PositionMapTab
          library={library}
          isAuthenticated={isAuthenticated}
          onRefresh={fetchData}
        />
      ) : (
        <MatchMapTab library={library} matchCache={matchCache} isAuthenticated={isAuthenticated} />
      )}
    </div>
  );
}
