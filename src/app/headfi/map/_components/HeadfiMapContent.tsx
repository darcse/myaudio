'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Map } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { fetchAllRows, fetchSmallTableRows, selectCountOptions } from '@/lib/supabase/fetchAllRows';
import { useAuthState } from '@/hooks/useAuthState';
import { HeadfiPageHeader, HeadfiSubHeader } from '../../_components/HeadfiPageHeader';
import {
  buildGearByIdMap,
  HEADFI_COMBO_SELECT,
  HEADFI_COMBOS_CHANGED_EVENT,
  isSpeakerCombo,
} from '../../headfiComboUtils';
import type { Headfi, HeadfiCombo } from '../../types';
import { MatchMapTab } from './MatchMapTab';
import { PositionMapTab } from './PositionMapTab';
import { filterToggleStyle } from './positionMapUtils';

type MapTab = 'position' | 'match';

function parseMapTab(raw: string | null): MapTab {
  if (raw === 'match') return 'match';
  return 'position';
}

export function HeadfiMapContent() {
  const isAuthenticated = useAuthState();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = parseMapTab(searchParams.get('tab'));
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

  const setActiveTab = useCallback(
    (tab: MapTab) => {
      const sp = new URLSearchParams(searchParams.toString());
      if (tab === 'position') sp.delete('tab');
      else sp.set('tab', tab);
      const qs = sp.toString();
      router.replace(qs ? `/headfi/map?${qs}` : '/headfi/map', { scroll: false });
    },
    [router, searchParams],
  );

  const fetchData = useCallback(async (options?: { background?: boolean }) => {
    if (!options?.background) setIsLoading(true);
    try {
      const client = createClient();
      const [{ data: headfiData }, { data: cacheData }, { data: activeCombosData }] =
        await Promise.all([
          fetchSmallTableRows<Headfi>(({ countExact }) =>
            client
              .from('headfi')
              .select('*', selectCountOptions(countExact))
              .order('brand')
              .order('model'),
          ),
          fetchAllRows<{
            combo_id: string | null;
            target_gear_id: number | null;
            drive: number | null;
            synergy: number | null;
            genre: number | null;
            comment: string | null;
          }>(({ countExact }) =>
            client
              .from('headfi_match_cache')
              .select(
                'combo_id, target_gear_id, drive, synergy, genre, comment',
                selectCountOptions(countExact),
              )
              .not('combo_id', 'is', null),
          ),
          fetchSmallTableRows<HeadfiCombo>(({ countExact }) =>
            client
              .from('headfi_combos')
              .select(HEADFI_COMBO_SELECT, selectCountOptions(countExact))
              .is('deleted_at', null)
              .eq('is_matching', true)
              .order('created_at', { ascending: true }),
          ),
        ]);

      const libraryRows = headfiData;
      const gearById = buildGearByIdMap(libraryRows);
      const activeCombos = activeCombosData.filter(
        (combo) => !isSpeakerCombo(combo, gearById),
      );
      const activeComboIds = new Set(activeCombos.map((combo) => combo.id));
      const matchCacheRows = cacheData
        .filter((row) => typeof row.combo_id === 'string' && row.combo_id && activeComboIds.has(row.combo_id))
        .map((row) => ({
          combo_id: row.combo_id as string,
          target_gear_id: row.target_gear_id as number,
          drive: row.drive as number,
          synergy: row.synergy as number,
          genre: row.genre as number,
          comment: row.comment || '',
        }));

      setLibrary(libraryRows);
      setCombos(activeCombos);
      setMatchCache(matchCacheRows);
    } finally {
      if (!options?.background) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  useEffect(() => {
    const onCombosChanged = () => void fetchData({ background: true });
    window.addEventListener(HEADFI_COMBOS_CHANGED_EVENT, onCombosChanged);
    return () => window.removeEventListener(HEADFI_COMBOS_CHANGED_EVENT, onCombosChanged);
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
