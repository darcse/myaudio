'use client';

import { useCallback, useEffect, useState } from 'react';
import { Map } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthState } from '@/hooks/useAuthState';
import { HeadfiPageHeader, HeadfiSubHeader } from '../../_components/HeadfiPageHeader';
import type { Headfi, HeadfiCombo } from '../../types';
import { MatchMapTab } from './MatchMapTab';
import { PositionMapTab } from './PositionMapTab';
import { filterToggleStyle } from './positionMapUtils';

type MapTab = 'position' | 'match';

export function HeadfiMapContent() {
  const isAuthenticated = useAuthState();
  const [activeTab, setActiveTab] = useState<MapTab>('position');
  const [library, setLibrary] = useState<Headfi[]>([]);
  const [combos, setCombos] = useState<HeadfiCombo[]>([]);
  const [matchCache, setMatchCache] = useState<
    {
      combo_id: string;
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
      const [{ data: headfiData }, { data: combosData }, { data: cacheData }] = await Promise.all([
        client.from('headfi').select('*').order('brand').order('model'),
        client
          .from('headfi_combos')
          .select('id, select1_id, select2_id, created_at')
          .order('created_at', { ascending: true }),
        client
          .from('headfi_match_cache')
          .select('combo_id, target_gear_id, drive, synergy, genre, comment')
          .not('combo_id', 'is', null),
      ]);
      setLibrary((headfiData as Headfi[]) || []);
      setCombos((combosData as HeadfiCombo[]) || []);
      setMatchCache(
        (cacheData ?? [])
          .filter((row) => typeof row.combo_id === 'string' && row.combo_id)
          .map((row) => ({
            combo_id: row.combo_id as string,
            target_gear_id: row.target_gear_id as number,
            drive: row.drive as number,
            synergy: row.synergy as number,
            genre: row.genre as number,
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
      <HeadfiPageHeader activeNav="position" isAuthenticated={isAuthenticated} showDivider />
      <HeadfiSubHeader
        icon={Map}
        title="포지션맵"
        trailing={
          <>
            <button
              type="button"
              onClick={() => setActiveTab('position')}
              className="shrink-0 rounded-full px-2.5 py-1 font-medium transition-colors"
              style={filterToggleStyle(activeTab === 'position')}
              aria-pressed={activeTab === 'position'}
            >
              포지션맵
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('match')}
              className="shrink-0 rounded-full px-2.5 py-1 font-medium transition-colors"
              style={filterToggleStyle(activeTab === 'match')}
              aria-pressed={activeTab === 'match'}
            >
              매칭맵
            </button>
          </>
        }
      />

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
        <MatchMapTab
          library={library}
          combos={combos}
          matchCache={matchCache}
          isAuthenticated={isAuthenticated}
        />
      )}
    </div>
  );
}
