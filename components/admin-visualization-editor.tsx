"use client";

import { useMemo, useState } from "react";

import { deleteVisualizationAction, saveVisualizationAction } from "@/app/actions";
import { AdminSubmitButton } from "@/components/admin-submit-button";
import { getVisualizationCategory, visualizationCategoryLabels } from "@/lib/visualization-categories";
import type { Visualization, VisualizationCategory } from "@/types";

const categoryOptions: VisualizationCategory[] = ["utility", "game"];

type AdminVisualizationEditorProps = {
  items: Visualization[];
  showCategoryStorageNotice: boolean;
};

function scrollToEditor(id: string) {
  window.requestAnimationFrame(() => {
    document.getElementById(`visualization-${id}`)?.scrollIntoView({ block: "start", behavior: "smooth" });
  });
}

function getFieldIds(id: string) {
  return {
    title: `visualization-title-${id}`,
    url: `visualization-url-${id}`,
    image: `visualization-image-${id}`,
    category: `visualization-category-${id}`,
    description: `visualization-description-${id}`,
    sortOrder: `visualization-sort-${id}`,
  };
}

function VisualizationFields({ item }: { item?: Visualization }) {
  const fieldIds = getFieldIds(item?.id ?? "new");

  return (
    <div className="admin-visualization-form-grid">
      <div className="field">
        <label className="label" htmlFor={fieldIds.title}>
          제목
        </label>
        <input className="input" id={fieldIds.title} name="title" defaultValue={item?.title ?? ""} />
      </div>

      <div className="field">
        <label className="label" htmlFor={fieldIds.url}>
          URL
        </label>
        <input className="input" id={fieldIds.url} name="url" defaultValue={item?.url ?? ""} placeholder="/diff" />
      </div>

      <div className="field">
        <label className="label" htmlFor={fieldIds.category}>
          카테고리
        </label>
        <select
          className="input"
          id={fieldIds.category}
          name="category"
          defaultValue={item ? getVisualizationCategory(item) : "utility"}
        >
          {categoryOptions.map((category) => (
            <option key={category} value={category}>
              {visualizationCategoryLabels[category]}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label className="label" htmlFor={fieldIds.sortOrder}>
          정렬
        </label>
        <input className="input" id={fieldIds.sortOrder} name="sort_order" type="number" defaultValue={item?.sort_order ?? 0} />
      </div>

      <label className="admin-check-field">
        <input type="checkbox" name="visible" defaultChecked={item?.visible ?? true} />
        <span>홈에 공개</span>
      </label>

      <div className="field admin-grid-span-3">
        <label className="label" htmlFor={fieldIds.image}>
          Image URL
        </label>
        <input
          className="input"
          id={fieldIds.image}
          name="image_url"
          defaultValue={item?.image_url ?? ""}
          placeholder="https://.../preview.png"
        />
      </div>

      <div className="field admin-grid-span-full">
        <label className="label" htmlFor={fieldIds.description}>
          설명
        </label>
        <textarea
          className="textarea admin-visualization-textarea"
          id={fieldIds.description}
          name="description"
          defaultValue={item?.description ?? ""}
        />
      </div>
    </div>
  );
}

export function AdminVisualizationEditor({ items, showCategoryStorageNotice }: AdminVisualizationEditorProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const counts = useMemo(
    () =>
      items.reduce(
        (acc, item) => {
          acc[getVisualizationCategory(item)] += 1;
          return acc;
        },
        { utility: 0, game: 0 } satisfies Record<VisualizationCategory, number>,
      ),
    [items],
  );

  function toggleItem(id: string) {
    setActiveId((current) => (current === id ? null : id));
  }

  function jumpToItem(id: string) {
    setActiveId(id);
    scrollToEditor(id);
  }

  return (
    <div className="admin-visualization-manager">
      <section className="admin-visualization-create" aria-labelledby="new-visualization-title">
        <div className="admin-compact-heading">
          <div>
            <h3 id="new-visualization-title">새 유틸 추가</h3>
            <p className="muted">필수 정보만 빠르게 채우고, 자세한 문구는 아래 설명란에서 다듬습니다.</p>
          </div>
        </div>

        <form action={saveVisualizationAction} className="compact-form">
          <VisualizationFields />
          <div className="actions admin-form-actions">
            <AdminSubmitButton idleText="추가" pendingText="추가 중..." />
          </div>
        </form>
      </section>

      {showCategoryStorageNotice ? (
        <div className="notice notice-error">
          visualizations.category 컬럼이 아직 적용되지 않은 것 같습니다. 게임 카테고리를 저장하려면
          supabase/visualization_categories.sql 마이그레이션을 먼저 적용해주세요.
        </div>
      ) : null}

      <div className="admin-visualization-workspace">
        <aside className="admin-visualization-minimap" aria-label="유틸 편집 빠른 이동">
          <div className="admin-minimap-header">
            <strong>유틸 목록</strong>
            <span>{items.length}</span>
          </div>

          <div className="admin-minimap-counts" aria-label="카테고리별 개수">
            <span>Games {counts.game}</span>
            <span>Utilities {counts.utility}</span>
          </div>

          <button className="ghost-button admin-collapse-button" type="button" onClick={() => setActiveId(null)}>
            모두 접기
          </button>

          <nav className="admin-minimap-nav">
            {items.map((item) => {
              const category = getVisualizationCategory(item);
              const isActive = activeId === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  className={isActive ? "admin-minimap-link is-active" : "admin-minimap-link"}
                  onClick={() => jumpToItem(item.id)}
                >
                  <span className="admin-minimap-title">{item.title || "Untitled"}</span>
                  <span className="admin-minimap-url">{item.url}</span>
                  <span className={`admin-category-pill is-${category}`}>{visualizationCategoryLabels[category]}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        <div className="admin-visualization-list">
          {items.length === 0 ? (
            <div className="empty-card">
              <h3>등록된 유틸이 없습니다</h3>
              <p className="muted" style={{ marginBottom: 0 }}>
                위 입력 폼에서 첫 유틸을 추가해보세요.
              </p>
            </div>
          ) : (
            items.map((item) => {
              const category = getVisualizationCategory(item);
              const isOpen = activeId === item.id;
              const editorId = `visualization-editor-${item.id}`;

              return (
                <section
                  key={item.id}
                  id={`visualization-${item.id}`}
                  className={isOpen ? "admin-visualization-item is-open" : "admin-visualization-item"}
                >
                  <button
                    type="button"
                    className="admin-visualization-summary"
                    aria-expanded={isOpen}
                    aria-controls={editorId}
                    onClick={() => toggleItem(item.id)}
                  >
                    <span className="admin-visualization-summary-main">
                      <span className="admin-visualization-title-row">
                        <strong>{item.title}</strong>
                        <span className={`admin-category-pill is-${category}`}>{visualizationCategoryLabels[category]}</span>
                        {!item.visible ? <span className="admin-muted-pill">비공개</span> : null}
                      </span>
                      <span className="admin-visualization-meta">
                        {item.url} · 정렬 {item.sort_order}
                      </span>
                    </span>
                    <span className="admin-summary-action">{isOpen ? "접기" : "편집"}</span>
                  </button>

                  {isOpen ? (
                    <div className="admin-visualization-editor" id={editorId}>
                      <form action={deleteVisualizationAction} className="admin-delete-form">
                        <input type="hidden" name="id" value={item.id} />
                        <AdminSubmitButton className="danger-button" idleText="삭제" pendingText="삭제 중..." />
                      </form>

                      <form action={saveVisualizationAction} className="compact-form">
                        <input type="hidden" name="id" value={item.id} />
                        <VisualizationFields item={item} />
                        <div className="actions admin-form-actions">
                          <AdminSubmitButton idleText="수정 저장" pendingText="저장 중..." />
                        </div>
                      </form>
                    </div>
                  ) : null}
                </section>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
