/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect, useState } from 'react';
import { List, X } from 'lucide-react';
import type { Headfi } from '../types';

type HeadfiListProps = {
  paginatedLibrary: Headfi[];
  listSearchQuery: string;
  setListSearchQuery: (v: string) => void;
  listCategoryFilter: string;
  setListCategoryFilter: (v: string) => void;
  listType1Filter: string;
  setListType1Filter: (v: string) => void;
  listType2Filter: string;
  setListType2Filter: (v: string) => void;
  listStatusFilter: string;
  setListStatusFilter: (v: string) => void;
  listSortOption: string;
  setListSortOption: (v: string) => void;
  listCurrentPage: number;
  setListCurrentPage: (v: number) => void;
  totalFilteredCount: number;
  listTotalPages: number;
  isLibraryEmpty?: boolean;
  onItemClick: (item: Headfi) => void;
};

export function HeadfiList({
  paginatedLibrary,
  listSearchQuery,
  setListSearchQuery,
  listCategoryFilter,
  setListCategoryFilter,
  listType1Filter,
  setListType1Filter,
  listType2Filter,
  setListType2Filter,
  listStatusFilter,
  setListStatusFilter,
  listSortOption,
  setListSortOption,
  listCurrentPage,
  setListCurrentPage,
  totalFilteredCount,
  listTotalPages,
  isLibraryEmpty = false,
  onItemClick,
}: HeadfiListProps) {
  const [filtersOpen, setFiltersOpen] = useState(false);

  const activeFilters = [
    listCategoryFilter !== '전체' && {
      key: 'category',
      label: `카테고리: ${listCategoryFilter}`,
      reset: () => setListCategoryFilter('전체'),
    },
    listStatusFilter !== '전체' && {
      key: 'status',
      label: `상태: ${listStatusFilter}`,
      reset: () => setListStatusFilter('전체'),
    },
    listCategoryFilter === '헤드폰' && listType1Filter !== '전체' && {
      key: 'type1',
      label: `타입1: ${listType1Filter}`,
      reset: () => setListType1Filter('전체'),
    },
    listCategoryFilter === '헤드폰' && listType2Filter !== '전체' && {
      key: 'type2',
      label: `타입2: ${listType2Filter}`,
      reset: () => setListType2Filter('전체'),
    },
  ].filter(Boolean) as { key: string; label: string; reset: () => void }[];

  const hasActiveFilters = activeFilters.length > 0;

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [listCurrentPage]);

  return (
    <div className="mt-8 pt-8 border-t-2" style={{ borderColor: 'var(--border)' }}>
      <div className="flex flex-col lg:flex-row items-start lg:items-center mb-2 gap-4 lg:gap-6">
        <div className="flex-shrink-0">
          <h2 className="list-section-title flex items-center gap-2">
            <List className="size-5 opacity-80 shrink-0" strokeWidth={1.5} /> Gear Registry
          </h2>
        </div>
        <div className="w-full flex flex-col gap-2 lg:w-auto lg:ml-auto">
          <div className="flex items-center gap-2 justify-between">
            <div className="relative flex-1 min-w-[140px] md:min-w-[170px] lg:flex-none lg:w-[320px]">
              <input
                className="input-apple px-3 py-2 text-sm w-full h-[38px] pr-8"
                placeholder="브랜드, 모델명 검색..."
                value={listSearchQuery}
                onChange={(e) => setListSearchQuery(e.target.value)}
              />
              {listSearchQuery ? (
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100 transition-opacity p-0.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5"
                  onClick={() => setListSearchQuery('')}
                  title="검색어 지우기"
                >
                  <X className="size-4" strokeWidth={2} />
                </button>
              ) : null}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                type="button"
                className="h-[34px] px-4 text-[13px] font-medium inline-flex items-center gap-2 rounded-lg hover:opacity-90 transition-opacity"
                style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}
                onClick={() => setFiltersOpen((o) => !o)}
              >
                <span>필터</span>
                {hasActiveFilters ? (
                  <span
                    className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[11px] font-semibold leading-none text-white rounded-full tabular-nums"
                    style={{ background: '#0a84ff' }}
                    aria-label={`활성 필터 ${activeFilters.length}개`}
                  >
                    {activeFilters.length}
                  </span>
                ) : null}
              </button>
            </div>
            {hasActiveFilters ? (
              <div className="hidden lg:flex flex-wrap gap-1 justify-end">
                {activeFilters.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      f.reset();
                    }}
                    className="group inline-flex items-center gap-1.5 h-[34px] px-3 text-[13px] font-medium rounded-lg hover:opacity-90 transition-opacity"
                    style={{ background: 'var(--badge-bg)', border: '1px solid var(--border)' }}
                  >
                    <span className="truncate max-w-[120px]">{f.label}</span>
                    <X className="size-3 opacity-45 group-hover:opacity-80 transition-opacity" strokeWidth={2} />
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
      {filtersOpen ? (
        <div className="flex flex-wrap gap-2 w-full lg:flex-1 lg:justify-end items-center mb-4">
          <select
            className="select-apple px-3 py-2 text-sm h-[38px]"
            value={listCategoryFilter}
            onChange={(e) => setListCategoryFilter(e.target.value)}
          >
            <option value="전체">카테고리: 전체</option>
            {['헤드폰', '이어폰', '무선 헤드폰', '무선 이어폰', '스피커', 'DAC/AMP', 'DAP', 'Source', '기타'].map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          {listCategoryFilter === '헤드폰' ? (
            <>
              <select
                className="select-apple px-3 py-2 text-sm h-[38px]"
                value={listType1Filter}
                onChange={(e) => setListType1Filter(e.target.value)}
              >
                <option value="전체">타입1: 전체</option>
                <option value="오픈형">오픈형</option>
                <option value="밀폐형">밀폐형</option>
              </select>
              <select
                className="select-apple px-3 py-2 text-sm h-[38px]"
                value={listType2Filter}
                onChange={(e) => setListType2Filter(e.target.value)}
              >
                <option value="전체">타입2: 전체</option>
                <option value="다이내믹">다이내믹</option>
                <option value="평판형">평판형</option>
                <option value="정전형">정전형</option>
                <option value="기타">기타</option>
              </select>
            </>
          ) : null}
          <select
            className="select-apple px-3 py-2 text-sm h-[38px]"
            value={listStatusFilter}
            onChange={(e) => setListStatusFilter(e.target.value)}
          >
            <option value="전체">상태: 전체</option>
            <option value="보유중">보유중</option>
            <option value="방출">방출</option>
          </select>
          <select
            className="select-apple px-3 py-2 text-sm h-[38px]"
            value={listSortOption}
            onChange={(e) => setListSortOption(e.target.value)}
          >
            <option value="created_desc">등록일 최신순</option>
            <option value="created_asc">등록일 오래된순</option>
            <option value="purchase_desc">구입일 최신순</option>
            <option value="purchase_asc">구입일 오래된순</option>
          </select>
        </div>
      ) : null}

      <p className="text-sm font-semibold opacity-80 mb-3">
        총 <span className="link-apple font-semibold">{totalFilteredCount}</span>건
      </p>
      {totalFilteredCount === 0 ? (
        <div className="empty-state-apple text-center py-12">
          <p>{isLibraryEmpty ? '등록된 기기가 없습니다.' : '조건에 맞는 기기가 없습니다.'}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {paginatedLibrary.map((item) => (
              <div
                key={item.id}
                className="group cursor-pointer rounded-xl p-4 flex flex-col transition-all duration-300"
                style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}
                onClick={() => onItemClick(item)}
              >
                <div
                  className="relative aspect-square rounded-lg mb-4 overflow-hidden"
                  style={{ background: 'var(--badge-bg)' }}
                >
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt="기기 이미지"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs opacity-50">
                      No Image
                    </div>
                  )}
                </div>

                <div className="flex-1 flex flex-col" onClick={(e) => e.stopPropagation()}>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    <button
                      type="button"
                      className="badge-apple text-[11px] font-semibold px-2 py-0.5 hover:opacity-90 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        setListCategoryFilter(item.category);
                      }}
                    >
                      {item.category}
                    </button>
                    {item.category === '헤드폰' && item.type1 ? (
                      <span className="badge-apple text-[11px] font-semibold px-2 py-0.5">{item.type1}</span>
                    ) : null}
                    {item.category === '헤드폰' && item.type2 ? (
                      <span className="badge-apple text-[11px] font-semibold px-2 py-0.5">{item.type2}</span>
                    ) : null}
                  </div>

                  <h3 className="font-bold text-sm leading-tight mb-0.5 truncate">{item.model}</h3>
                  <p className="text-xs truncate mb-3" style={{ color: 'var(--muted)' }}>
                    {item.brand}
                  </p>

                  <div
                    className="mt-auto pt-3 flex items-center justify-between"
                    style={{ borderTop: '1px solid var(--border)' }}
                  >
                    <button
                      type="button"
                      className="text-xs font-bold flex items-center gap-1 hover:opacity-80 transition-opacity"
                      style={{
                        color: item.status2 === '방출' ? 'var(--muted)' : '#005bc1',
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (item.status2) setListStatusFilter(item.status2);
                      }}
                    >
                      {item.status2 === '방출' ? 'Archived' : 'In Collection'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {listTotalPages > 1 ? (
            <div className="flex justify-center items-center gap-4 mt-8">
              <button
                type="button"
                disabled={listCurrentPage === 1}
                onClick={() => setListCurrentPage(listCurrentPage - 1)}
                className="btn-apple btn-apple-secondary px-4 py-2 text-sm disabled:opacity-50"
              >
                &larr; 이전
              </button>
              <span className="text-sm font-semibold opacity-80">
                {listCurrentPage} / {listTotalPages} 페이지
              </span>
              <button
                type="button"
                disabled={listCurrentPage === listTotalPages}
                onClick={() => setListCurrentPage(listCurrentPage + 1)}
                className="btn-apple btn-apple-secondary px-4 py-2 text-sm disabled:opacity-50"
              >
                다음 &rarr;
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
