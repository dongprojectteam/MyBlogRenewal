"use client";

import { useMemo, useState } from "react";

import { UtilityCard } from "@/components/utility-card";
import type { Visualization } from "@/types";

function normalize(value: string) {
  return value.trim().toLocaleLowerCase("ko-KR");
}

export function UtilitySearchSection({ items }: { items: Visualization[] }) {
  const [query, setQuery] = useState("");
  const normalizedQuery = normalize(query);

  const filteredItems = useMemo(() => {
    if (!normalizedQuery) return items;

    return items.filter((item) => {
      const searchable = normalize(`${item.title} ${item.description}`);
      return searchable.includes(normalizedQuery);
    });
  }, [items, normalizedQuery]);

  return (
    <section className="section">
      <div className="utility-section-head">
        <div>
          <h2 className="section-title">Utilities</h2>
          <p className="utility-section-subtitle">
            {items.length === 0 ? "아직 등록된 유틸리티가 없습니다." : `${filteredItems.length} / ${items.length} items`}
          </p>
        </div>

        <div className="utility-search-wrap">
          <label className="visually-hidden" htmlFor="utility-search">
            유틸리티 검색
          </label>
          <input
            id="utility-search"
            className="utility-search-input"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="제목이나 내용으로 검색"
            autoComplete="off"
          />
          {query ? (
            <button
              className="utility-search-clear"
              type="button"
              onClick={() => setQuery("")}
              aria-label="검색어 지우기"
              title="검색어 지우기"
            >
              ×
            </button>
          ) : null}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="empty-card">
          <div className="tag neutral">Empty state</div>
          <h3>아직 등록된 유틸리티가 없습니다</h3>
          <p className="muted" style={{ marginBottom: 0 }}>
            관리자 페이지에서 유틸리티를 등록하면 이곳에 카드 형태로 표시됩니다.
          </p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="empty-card">
          <div className="tag neutral">No results</div>
          <h3>검색 결과가 없습니다</h3>
          <p className="muted" style={{ marginBottom: 0 }}>
            다른 제목이나 설명으로 다시 검색해보세요.
          </p>
        </div>
      ) : (
        <div className="utility-grid">
          {filteredItems.map((item) => (
            <UtilityCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </section>
  );
}
