"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

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
          Title
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
          Category
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
          Sort
        </label>
        <input className="input" id={fieldIds.sortOrder} name="sort_order" type="number" defaultValue={item?.sort_order ?? 0} />
      </div>

      <label className="admin-check-field">
        <input type="checkbox" name="visible" defaultChecked={item?.visible ?? true} />
        <span>Visible on home</span>
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
          Description
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
  const [sidebarTarget, setSidebarTarget] = useState<HTMLElement | null>(null);
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

  useEffect(() => {
    setSidebarTarget(document.getElementById("admin-sidebar-extension"));
  }, []);

  const minimap = (
    <aside className="admin-visualization-minimap" aria-label="Visualization quick navigation">
      <div className="admin-minimap-header">
        <strong>Content List</strong>
        <span>{items.length}</span>
      </div>

      <div className="admin-minimap-counts" aria-label="Category counts">
        <span>Games {counts.game}</span>
        <span>Utilities {counts.utility}</span>
      </div>

      <button className="ghost-button admin-collapse-button" type="button" onClick={() => setActiveId(null)}>
        Close All
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
  );

  return (
    <div className="admin-visualization-manager">
      <section className="admin-visualization-create" aria-labelledby="new-visualization-title">
        <div className="admin-compact-heading">
          <div>
            <h3 id="new-visualization-title">Add Home Item</h3>
            <p className="muted">Fill in the required fields quickly, then refine the copy in the description field.</p>
          </div>
        </div>

        <form action={saveVisualizationAction} className="compact-form">
          <VisualizationFields />
          <div className="actions admin-form-actions">
            <AdminSubmitButton idleText="Add" pendingText="Adding..." />
          </div>
        </form>
      </section>

      {showCategoryStorageNotice ? (
        <div className="notice notice-error">
          The visualizations.category column does not appear to be applied yet. Run
          supabase/visualization_categories.sql before saving game categories.
        </div>
      ) : null}

      <div className="admin-visualization-workspace">
        {sidebarTarget ? createPortal(minimap, sidebarTarget) : minimap}

        <div className="admin-visualization-list">
          {items.length === 0 ? (
            <div className="empty-card">
              <h3>No home items registered</h3>
              <p className="muted" style={{ marginBottom: 0 }}>
                Add the first item from the form above.
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
                        {!item.visible ? <span className="admin-muted-pill">Hidden</span> : null}
                      </span>
                      <span className="admin-visualization-meta">
                        {item.url} · Sort {item.sort_order}
                      </span>
                    </span>
                    <span className="admin-summary-action">{isOpen ? "Close" : "Edit"}</span>
                  </button>

                  {isOpen ? (
                    <div className="admin-visualization-editor" id={editorId}>
                      <form action={deleteVisualizationAction} className="admin-delete-form">
                        <input type="hidden" name="id" value={item.id} />
                        <AdminSubmitButton className="danger-button" idleText="Delete" pendingText="Deleting..." />
                      </form>

                      <form action={saveVisualizationAction} className="compact-form">
                        <input type="hidden" name="id" value={item.id} />
                        <VisualizationFields item={item} />
                        <div className="actions admin-form-actions">
                          <AdminSubmitButton idleText="Save Changes" pendingText="Saving..." />
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
