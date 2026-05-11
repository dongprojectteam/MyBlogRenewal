"use client";

import { useMemo, useState } from "react";

import { UtilityCard } from "@/components/utility-card";
import { getVisualizationCategory, visualizationCategoryLabels } from "@/lib/visualization-categories";
import type { Visualization, VisualizationCategory } from "@/types";

const categoryOrder: VisualizationCategory[] = ["game", "utility"];
const categoryKickers: Record<VisualizationCategory, string> = {
  utility: "Work tools",
  game: "Play",
};

function normalize(value: string) {
  return value.trim().toLocaleLowerCase("ko-KR");
}

export function UtilitySearchSection({ items }: { items: Visualization[] }) {
  const [query, setQuery] = useState("");
  const normalizedQuery = normalize(query);

  const filteredItems = useMemo(() => {
    if (!normalizedQuery) return items;

    return items.filter((item) => {
      const searchable = normalize(`${item.title} ${item.description} ${item.url}`);
      return searchable.includes(normalizedQuery);
    });
  }, [items, normalizedQuery]);

  const categoryGroups = useMemo(
    () =>
      categoryOrder.map((category) => ({
        category,
        items: filteredItems.filter((item) => getVisualizationCategory(item) === category),
      })),
    [filteredItems],
  );

  const visibleGroups = categoryGroups.filter((group) => group.items.length > 0);

  return (
    <section className="section">
      <div className="utility-section-head">
        <div>
          <h2 className="section-title">Explore</h2>
          <p className="utility-section-subtitle">
            {items.length === 0 ? "No items yet." : `${filteredItems.length} / ${items.length} items`}
          </p>
        </div>

        <div className="utility-search-wrap">
          <label className="visually-hidden" htmlFor="utility-search">
            Search utilities and games
          </label>
          <input
            id="utility-search"
            className="utility-search-input"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search title, description, or path"
            autoComplete="off"
          />
          {query ? (
            <button
              className="utility-search-clear"
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              title="Clear search"
            >
              x
            </button>
          ) : null}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="empty-card">
          <div className="tag neutral">Empty state</div>
          <h3>No public items yet</h3>
          <p className="muted" style={{ marginBottom: 0 }}>
            Add home items from the admin screen to show them here.
          </p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="empty-card">
          <div className="tag neutral">No results</div>
          <h3>No matching items</h3>
          <p className="muted" style={{ marginBottom: 0 }}>
            Try another title, description, or path.
          </p>
        </div>
      ) : (
        <div className="utility-category-stack">
          {visibleGroups.map((group) => (
            <section key={group.category} className={`utility-category-block is-${group.category}`}>
              <div className="utility-category-header">
                <div>
                  <div className="utility-category-kicker">{categoryKickers[group.category]}</div>
                  <h3>{visualizationCategoryLabels[group.category]}</h3>
                </div>
                <span>{group.items.length} items</span>
              </div>

              <div className="utility-grid">
                {group.items.map((item) => (
                  <UtilityCard key={item.id} item={item} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </section>
  );
}
