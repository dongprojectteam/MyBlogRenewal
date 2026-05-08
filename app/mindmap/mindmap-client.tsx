"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, DragEvent as ReactDragEvent, PointerEvent as ReactPointerEvent, RefObject } from "react";

type LayoutMode = "balanced" | "right" | "left";
type DensityMode = "compact" | "comfortable" | "spacious";
type ExportFormat = "json" | "markdown" | "opml" | "freemind" | "mermaid" | "csv";
type ImportFormat = "auto" | ExportFormat;

type MindNode = {
  id: string;
  title: string;
  note: string;
  tags: string[];
  priority: number;
  progress: number;
  color: string;
  collapsed: boolean;
  offsetX?: number;
  offsetY?: number;
  children: MindNode[];
};

type MindMapDocument = {
  version: 1;
  title: string;
  createdAt: string;
  updatedAt: string;
  layout: LayoutMode;
  root: MindNode;
};

type SavedMindMap = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  nodeCount: number;
  document: MindMapDocument;
};

type HistoryState = {
  past: MindMapDocument[];
  present: MindMapDocument;
  future: MindMapDocument[];
};

type LayoutMetrics = {
  columnGap: number;
  siblingGap: number;
};

type DensityVisuals = {
  titleSize: number;
  metaSize: number;
  lineHeight: number;
  titleTop: number;
  metaBottom: number;
  progressInset: number;
  progressBottom: number;
  cornerRadius: number;
  connectorWidth: number;
  charWidth: number;
};

type LayoutTree = {
  node: MindNode;
  side: -1 | 0 | 1;
  depth: number;
  width: number;
  height: number;
  span: number;
  x: number;
  y: number;
  children: LayoutTree[];
};

type ViewNode = {
  node: MindNode;
  side: -1 | 0 | 1;
  depth: number;
  width: number;
  height: number;
  x: number;
  y: number;
};

type Connector = {
  id: string;
  from: ViewNode;
  to: ViewNode;
  path: string;
};

type ViewModel = {
  nodes: ViewNode[];
  connectors: Connector[];
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
};

type DragState = {
  nodeId: string;
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startOffsetX: number;
  startOffsetY: number;
};

type DragPreview = {
  nodeId: string;
  dx: number;
  dy: number;
  targetId: string | null;
  isDragging: boolean;
};

type InlineEditorState = {
  nodeId: string;
  value: string;
  rect: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
};

type HoverCardState = {
  nodeId: string;
  rect: {
    left: number;
    top: number;
    width: number;
    placement: "left" | "right" | "top" | "bottom";
  };
};

type OutlineEditorState = {
  nodeId: string;
  value: string;
};

type OutlineRenderOptions = {
  selectedId: string;
  rootId: string;
  editor: OutlineEditorState | null;
  inputRef: RefObject<HTMLInputElement | null>;
  onSelect: (node: MindNode) => void;
  onStartEdit: (node: MindNode) => void;
  onChangeEdit: (value: string) => void;
  onCommitEdit: () => void;
  onCancelEdit: () => void;
  onDelete: (id: string) => void;
};

const STORAGE_KEY = "dopt-mindmap-studio-v1";
const SAVED_MAPS_KEY = "dopt-mindmap-studio-saved-v1";
const HISTORY_LIMIT = 60;
const SAVED_MAP_LIMIT = 80;
const IMPORT_LIMIT_BYTES = 2 * 1024 * 1024;
const NODE_COLORS = ["#38bdf8", "#34d399", "#f59e0b", "#f472b6", "#a78bfa", "#fb7185", "#2dd4bf", "#facc15"];
const ZOOM_MIN = 55;
const ZOOM_MAX = 180;

const DEFAULT_DOCUMENT: MindMapDocument = {
  version: 1,
  title: "Mind Map",
  createdAt: "2026-05-08T00:00:00.000Z",
  updatedAt: "2026-05-08T00:00:00.000Z",
  layout: "balanced",
  root: {
    id: "mindmap-root",
    title: "Mind Map",
    note: "",
    tags: ["brainstorm"],
    priority: 2,
    progress: 35,
    color: "#38bdf8",
    collapsed: false,
    children: [
      {
        id: "mindmap-discovery",
        title: "Discovery",
        note: "Collect raw ideas before judging them.",
        tags: ["ideas"],
        priority: 2,
        progress: 45,
        color: "#34d399",
        collapsed: false,
        children: [
          {
            id: "mindmap-audience",
            title: "Audience",
            note: "",
            tags: ["context"],
            priority: 1,
            progress: 30,
            color: "#2dd4bf",
            collapsed: false,
            children: [],
          },
          {
            id: "mindmap-questions",
            title: "Open questions",
            note: "",
            tags: ["research"],
            priority: 2,
            progress: 15,
            color: "#facc15",
            collapsed: false,
            children: [],
          },
        ],
      },
      {
        id: "mindmap-structure",
        title: "Structure",
        note: "Turn clusters into branches.",
        tags: ["outline"],
        priority: 3,
        progress: 55,
        color: "#a78bfa",
        collapsed: false,
        children: [
          {
            id: "mindmap-themes",
            title: "Themes",
            note: "",
            tags: ["cluster"],
            priority: 2,
            progress: 45,
            color: "#f472b6",
            collapsed: false,
            children: [],
          },
          {
            id: "mindmap-actions",
            title: "Next actions",
            note: "",
            tags: ["plan"],
            priority: 2,
            progress: 60,
            color: "#fb7185",
            collapsed: false,
            children: [],
          },
        ],
      },
    ],
  },
};

const EXPORT_OPTIONS: Array<{ value: ExportFormat; label: string }> = [
  { value: "json", label: "JSON" },
  { value: "markdown", label: "Markdown" },
  { value: "opml", label: "OPML" },
  { value: "freemind", label: "FreeMind" },
  { value: "mermaid", label: "Mermaid" },
  { value: "csv", label: "CSV" },
];

const IMPORT_OPTIONS: Array<{ value: ImportFormat; label: string }> = [
  { value: "auto", label: "Auto" },
  ...EXPORT_OPTIONS,
];

const TEMPLATE_BUILDERS: Array<{ id: string; label: string; description: string; build: () => MindMapDocument }> = [
  {
    id: "blank",
    label: "Blank",
    description: "Start with one root node",
    build: () => makeDocument("Mind Map"),
  },
  {
    id: "brainstorm",
    label: "Brainstorm",
    description: "Explore ideas and signals",
    build: () =>
      makeDocument("Brainstorming Topic", [
        makeNode("Problem", { color: "#34d399", tags: ["why"] }, [
          makeNode("Signals", { color: "#2dd4bf" }),
          makeNode("Constraints", { color: "#facc15" }),
        ]),
        makeNode("Ideas", { color: "#a78bfa", tags: ["diverge"] }, [
          makeNode("Wild options", { color: "#f472b6" }),
          makeNode("Practical options", { color: "#38bdf8" }),
        ]),
        makeNode("Decision", { color: "#fb7185", tags: ["converge"] }, [
          makeNode("Criteria", { color: "#f59e0b" }),
          makeNode("Next action", { color: "#34d399" }),
        ]),
      ]),
  },
  {
    id: "project",
    label: "Project",
    description: "Plan scope, goals, and risks",
    build: () =>
      makeDocument("Project Plan", [
        makeNode("Goal", { color: "#38bdf8", priority: 3 }),
        makeNode("Scope", { color: "#34d399" }, [
          makeNode("In", { color: "#2dd4bf" }),
          makeNode("Out", { color: "#facc15" }),
        ]),
        makeNode("Risks", { color: "#fb7185", priority: 3 }),
        makeNode("Milestones", { color: "#a78bfa" }, [
          makeNode("Now", { color: "#f472b6" }),
          makeNode("Next", { color: "#f59e0b" }),
        ]),
      ]),
  },
  {
    id: "meeting",
    label: "Meeting",
    description: "Agenda, discussion, actions",
    build: () =>
      makeDocument("Meeting Map", [
        makeNode("Agenda", { color: "#38bdf8" }),
        makeNode("Discussion", { color: "#a78bfa" }, [
          makeNode("Decisions", { color: "#34d399", priority: 3 }),
          makeNode("Open items", { color: "#facc15" }),
        ]),
        makeNode("Owners", { color: "#f472b6" }),
        makeNode("Follow-up", { color: "#fb7185", priority: 2 }),
      ]),
  },
  {
    id: "study",
    label: "Study",
    description: "Concepts, examples, review",
    build: () =>
      makeDocument("Study Map", [
        makeNode("Concepts", { color: "#38bdf8" }, [
          makeNode("Definitions", { color: "#34d399" }),
          makeNode("Examples", { color: "#facc15" }),
        ]),
        makeNode("Connections", { color: "#a78bfa" }),
        makeNode("Practice", { color: "#fb7185" }),
        makeNode("Review", { color: "#2dd4bf" }),
      ]),
  },
];

function createId() {
  return `node-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function makeNode(title: string, partial: Partial<Omit<MindNode, "id" | "title" | "children">> = {}, children: MindNode[] = []): MindNode {
  return {
    id: createId(),
    title,
    note: "",
    tags: [],
    priority: 1,
    progress: 0,
    color: NODE_COLORS[0],
    collapsed: false,
    offsetX: 0,
    offsetY: 0,
    ...partial,
    children,
  };
}

function makeDocument(title: string, children: MindNode[] = []): MindMapDocument {
  const now = new Date().toISOString();
  return {
    version: 1,
    title,
    createdAt: now,
    updatedAt: now,
    layout: "balanced",
    root: makeNode(title, { color: "#38bdf8", tags: ["mindmap"] }, children),
  };
}

function cloneNode(node: MindNode): MindNode {
  return {
    ...node,
    tags: [...node.tags],
    children: node.children.map(cloneNode),
  };
}

function cloneDocument(document: MindMapDocument): MindMapDocument {
  return {
    ...document,
    root: cloneNode(document.root),
  };
}

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function normalizeTags(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean).slice(0, 12);
  }

  if (typeof value === "string") {
    return value
      .split(/[,\n]/)
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 12);
  }

  return [];
}

function normalizeColor(value: unknown, fallback = NODE_COLORS[0]) {
  if (typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value)) return value;
  return fallback;
}

function normalizeNode(value: unknown, usedIds: Set<string>, fallbackTitle = "Untitled"): MindNode {
  const raw = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const candidateId = typeof raw.id === "string" && raw.id.trim() ? raw.id.trim() : createId();
  const id = usedIds.has(candidateId) ? createId() : candidateId;
  usedIds.add(id);

  const children = Array.isArray(raw.children) ? raw.children : [];

  return {
    id,
    title: String(raw.title ?? raw.text ?? raw.name ?? fallbackTitle).trim() || fallbackTitle,
    note: String(raw.note ?? raw.notes ?? raw.description ?? "").trim(),
    tags: normalizeTags(raw.tags),
    priority: Math.round(clamp(Number(raw.priority ?? 1), 0, 3)),
    progress: Math.round(clamp(Number(raw.progress ?? 0), 0, 100)),
    color: normalizeColor(raw.color, NODE_COLORS[usedIds.size % NODE_COLORS.length]),
    collapsed: Boolean(raw.collapsed),
    offsetX: Math.round(clamp(Number(raw.offsetX ?? raw.x ?? 0), -4000, 4000)),
    offsetY: Math.round(clamp(Number(raw.offsetY ?? raw.y ?? 0), -4000, 4000)),
    children: children.map((child, index) => normalizeNode(child, usedIds, `Idea ${index + 1}`)),
  };
}

function normalizeDocument(value: unknown): MindMapDocument {
  const raw = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const usedIds = new Set<string>();
  const root = normalizeNode(raw.root ?? raw, usedIds, String(raw.title ?? "Mind Map"));
  const layout = raw.layout === "right" || raw.layout === "left" || raw.layout === "balanced" ? raw.layout : "balanced";
  const now = new Date().toISOString();

  return withComputedProgressDocument({
    version: 1,
    title: String(raw.title ?? root.title ?? "Mind Map").trim() || "Mind Map",
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : now,
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : now,
    layout,
    root,
  });
}

function touchDocument(document: MindMapDocument): MindMapDocument {
  return {
    ...document,
    title: document.root.title || document.title || "Mind Map",
    updatedAt: new Date().toISOString(),
  };
}

function findNode(node: MindNode, id: string): MindNode | null {
  if (node.id === id) return node;

  for (const child of node.children) {
    const found = findNode(child, id);
    if (found) return found;
  }

  return null;
}

function findEntry(node: MindNode, id: string, parent: MindNode | null = null): { node: MindNode; parent: MindNode | null; index: number } | null {
  if (node.id === id) return { node, parent, index: -1 };

  for (let index = 0; index < node.children.length; index += 1) {
    const child = node.children[index];
    if (child.id === id) return { node: child, parent: node, index };
    const nested = findEntry(child, id, child);
    if (nested) return nested;
  }

  return null;
}

function flattenNodes(root: MindNode) {
  const nodes: MindNode[] = [];
  const visit = (node: MindNode) => {
    nodes.push(node);
    node.children.forEach(visit);
  };
  visit(root);
  return nodes;
}

function updateNodeById(node: MindNode, id: string, updater: (node: MindNode) => MindNode): MindNode {
  if (node.id === id) return updater(node);
  return {
    ...node,
    children: node.children.map((child) => updateNodeById(child, id, updater)),
  };
}

function insertChild(node: MindNode, parentId: string, child: MindNode): MindNode {
  if (node.id === parentId) {
    return {
      ...node,
      collapsed: false,
      children: [...node.children, child],
    };
  }

  return {
    ...node,
    children: node.children.map((item) => insertChild(item, parentId, child)),
  };
}

function insertSibling(root: MindNode, targetId: string, sibling: MindNode): MindNode {
  if (root.id === targetId) return insertChild(root, root.id, sibling);

  return {
    ...root,
    children: root.children.flatMap((child) => {
      if (child.id === targetId) return [child, sibling];
      return [insertSibling(child, targetId, sibling)];
    }),
  };
}

function removeNode(root: MindNode, targetId: string): MindNode {
  if (root.id === targetId) return root;

  return {
    ...root,
    children: root.children
      .filter((child) => child.id !== targetId)
      .map((child) => removeNode(child, targetId)),
  };
}

function containsNode(root: MindNode, targetId: string): boolean {
  if (root.id === targetId) return true;
  return root.children.some((child) => containsNode(child, targetId));
}

function extractNode(root: MindNode, targetId: string): { root: MindNode; extracted: MindNode | null } {
  let extracted: MindNode | null = null;
  const children: MindNode[] = [];

  for (const child of root.children) {
    if (child.id === targetId) {
      extracted = child;
      continue;
    }

    const result = extractNode(child, targetId);
    if (result.extracted) extracted = result.extracted;
    children.push(result.root);
  }

  return {
    root: {
      ...root,
      children,
    },
    extracted,
  };
}

function relocateNode(root: MindNode, nodeId: string, newParentId: string): MindNode {
  if (root.id === nodeId || nodeId === newParentId) return root;

  const movingNode = findNode(root, nodeId);
  if (!movingNode || containsNode(movingNode, newParentId)) return root;

  const result = extractNode(root, nodeId);
  if (!result.extracted) return root;

  const movedNode: MindNode = {
    ...result.extracted,
    offsetX: 0,
    offsetY: 0,
  };

  return insertChild(result.root, newParentId, movedNode);
}

function moveNode(root: MindNode, targetId: string, direction: -1 | 1): MindNode {
  return {
    ...root,
    children: (() => {
      const index = root.children.findIndex((child) => child.id === targetId);
      if (index >= 0) {
        const nextIndex = index + direction;
        if (nextIndex < 0 || nextIndex >= root.children.length) return root.children;
        const nextChildren = [...root.children];
        const [item] = nextChildren.splice(index, 1);
        nextChildren.splice(nextIndex, 0, item);
        return nextChildren;
      }

      return root.children.map((child) => moveNode(child, targetId, direction));
    })(),
  };
}

function cloneWithNewIds(node: MindNode): MindNode {
  return {
    ...node,
    id: createId(),
    title: `${node.title} copy`,
    children: node.children.map(cloneWithNewIds),
  };
}

function setCollapsedForAll(node: MindNode, collapsed: boolean, isRoot = true): MindNode {
  return {
    ...node,
    collapsed: isRoot ? false : collapsed,
    children: node.children.map((child) => setCollapsedForAll(child, collapsed, false)),
  };
}

function computeNodeProgress(node: MindNode): { node: MindNode; total: number; count: number } {
  const children = node.children.map(computeNodeProgress);

  if (children.length === 0) {
    const progress = Math.round(clamp(node.progress, 0, 100));
    return {
      node: { ...node, progress, children: [] },
      total: progress,
      count: 1,
    };
  }

  const total = children.reduce((sum, child) => sum + child.total, 0);
  const count = children.reduce((sum, child) => sum + child.count, 0);
  const progress = count > 0 ? Math.round(total / count) : 0;

  return {
    node: {
      ...node,
      progress,
      children: children.map((child) => child.node),
    },
    total,
    count,
  };
}

function withComputedProgressDocument(document: MindMapDocument): MindMapDocument {
  return {
    ...document,
    root: computeNodeProgress(document.root).node,
  };
}

function getLeafProgressSummary(node: MindNode) {
  const result = computeNodeProgress(node);
  return { total: result.total, count: result.count };
}

function getStats(root: MindNode) {
  let nodes = 0;
  let leaves = 0;
  let maxDepth = 0;
  const tags = new Set<string>();

  const visit = (node: MindNode, depth: number) => {
    nodes += 1;
    maxDepth = Math.max(maxDepth, depth);
    node.tags.forEach((tag) => tags.add(tag));
    if (node.children.length === 0) leaves += 1;
    node.children.forEach((child) => visit(child, depth + 1));
  };

  visit(root, 1);

  return {
    nodes,
    leaves,
    maxDepth,
    tags: tags.size,
    averageProgress: root.progress,
  };
}

function getPriorityLabel(priority: number) {
  if (priority >= 3) return "High";
  if (priority === 2) return "Medium";
  if (priority === 1) return "Low";
  return "None";
}

function getNodeCount(root: MindNode) {
  return flattenNodes(root).length;
}

function sortSavedMaps(items: SavedMindMap[]) {
  return [...items].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
}

function normalizeSavedMap(value: unknown): SavedMindMap | null {
  const raw = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  if (!raw.document) return null;

  try {
    const document = normalizeDocument(raw.document);
    const now = new Date().toISOString();
    const id = typeof raw.id === "string" && raw.id.trim() ? raw.id.trim() : createId();
    const title = String(raw.title ?? document.title ?? "Mind Map").trim() || "Mind Map";

    return {
      id,
      title,
      createdAt: typeof raw.createdAt === "string" ? raw.createdAt : document.createdAt || now,
      updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : document.updatedAt || now,
      nodeCount: Math.max(1, Number(raw.nodeCount ?? getNodeCount(document.root))),
      document,
    };
  } catch {
    return null;
  }
}

function parseSavedMaps(source: string | null) {
  if (!source) return [];

  const parsed = JSON.parse(source) as unknown;
  const items = Array.isArray(parsed) ? parsed : [];
  return sortSavedMaps(items.map(normalizeSavedMap).filter((item): item is SavedMindMap => Boolean(item))).slice(0, SAVED_MAP_LIMIT);
}

function makeSavedMap(document: MindMapDocument, title: string, existing?: SavedMindMap | null): SavedMindMap {
  const now = new Date().toISOString();
  const savedTitle = title.trim() || document.title || "Mind Map";
  const savedDocument = touchDocument(withComputedProgressDocument(cloneDocument(document)));

  return {
    id: existing?.id ?? createId(),
    title: savedTitle,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    nodeCount: getNodeCount(savedDocument.root),
    document: savedDocument,
  };
}

function getMetrics(density: DensityMode): LayoutMetrics {
  if (density === "compact") return { columnGap: 155, siblingGap: 4 };
  if (density === "spacious") return { columnGap: 430, siblingGap: 64 };
  return { columnGap: 265, siblingGap: 20 };
}

function getNodeSize(node: MindNode, density: DensityMode) {
  const hasMeta = Boolean(node.note || node.tags.length > 0 || node.progress > 0);

  if (density === "compact") {
    const width = Math.round(clamp(118 + node.title.length * 2.2, 118, 172));
    return { width, height: hasMeta ? 54 : 42 };
  }

  if (density === "spacious") {
    const width = Math.round(clamp(260 + node.title.length * 5.2, 260, 390));
    return { width, height: hasMeta ? 126 : 96 };
  }

  const width = Math.round(clamp(190 + node.title.length * 3.5, 190, 250));
  const height = hasMeta ? 82 : 66;
  return { width, height };
}

function getDensityVisuals(density: DensityMode): DensityVisuals {
  if (density === "compact") {
    return {
      titleSize: 11,
      metaSize: 8,
      lineHeight: 13,
      titleTop: 16,
      metaBottom: 12,
      progressInset: 9,
      progressBottom: 6,
      cornerRadius: 8,
      connectorWidth: 2.6,
      charWidth: 5.8,
    };
  }

  if (density === "spacious") {
    return {
      titleSize: 20,
      metaSize: 14,
      lineHeight: 24,
      titleTop: 36,
      metaBottom: 28,
      progressInset: 24,
      progressBottom: 14,
      cornerRadius: 18,
      connectorWidth: 6,
      charWidth: 10.2,
    };
  }

  return {
    titleSize: 15,
    metaSize: 11,
    lineHeight: 17,
    titleTop: 25,
    metaBottom: 17,
    progressInset: 14,
    progressBottom: 9,
    cornerRadius: 12,
    connectorWidth: 4,
    charWidth: 8,
  };
}

function buildLayoutTree(node: MindNode, depth: number, side: -1 | 1, density: DensityMode, metrics: LayoutMetrics): LayoutTree {
  const size = getNodeSize(node, density);
  const children = node.collapsed
    ? []
    : node.children.map((child) => buildLayoutTree(child, depth + 1, side, density, metrics));
  const childSpan = children.reduce((sum, child) => sum + child.span, 0);
  const span = Math.max(size.height + metrics.siblingGap, childSpan);

  return {
    node,
    side,
    depth,
    width: size.width,
    height: size.height,
    span,
    x: depth * metrics.columnGap * side,
    y: 0,
    children,
  };
}

function placeTree(tree: LayoutTree, startY: number) {
  tree.y = startY + tree.span / 2;

  const childSpan = tree.children.reduce((sum, child) => sum + child.span, 0);
  let childY = startY + Math.max(0, (tree.span - childSpan) / 2);
  tree.children.forEach((child) => {
    placeTree(child, childY);
    childY += child.span;
  });
}

function flattenLayout(
  tree: LayoutTree,
  nodes: ViewNode[],
  connectors: Connector[],
  parent: ViewNode | null = null,
  inheritedOffset = { x: 0, y: 0 },
) {
  const ownOffset = {
    x: tree.node.offsetX ?? 0,
    y: tree.node.offsetY ?? 0,
  };
  const totalOffset = {
    x: inheritedOffset.x + ownOffset.x,
    y: inheritedOffset.y + ownOffset.y,
  };
  const current: ViewNode = {
    node: tree.node,
    side: tree.side,
    depth: tree.depth,
    width: tree.width,
    height: tree.height,
    x: tree.x + totalOffset.x,
    y: tree.y + totalOffset.y,
  };

  nodes.push(current);

  if (parent) {
    connectors.push({
      id: `${parent.node.id}-${current.node.id}`,
      from: parent,
      to: current,
      path: makeConnectorPath(parent, current),
    });
  }

  tree.children.forEach((child) => flattenLayout(child, nodes, connectors, current, totalOffset));
}

function makeConnectorPath(from: ViewNode, to: ViewNode) {
  const side = to.side === -1 ? -1 : 1;
  const fromX = from.x + (from.width / 2) * side;
  const toX = to.x - (to.width / 2) * side;
  const controlOffset = Math.max(80, Math.abs(toX - fromX) * 0.48);
  const c1 = fromX + controlOffset * side;
  const c2 = toX - controlOffset * side;
  return `M ${fromX} ${from.y} C ${c1} ${from.y}, ${c2} ${to.y}, ${toX} ${to.y}`;
}

function buildViewModel(root: MindNode, layout: LayoutMode, density: DensityMode): ViewModel {
  const metrics = getMetrics(density);
  const rootSize = getNodeSize(root, density);
  const rootView: ViewNode = {
    node: root,
    side: 0,
    depth: 0,
    width: rootSize.width + 24,
    height: rootSize.height + 8,
    x: 0,
    y: 0,
  };
  const nodes: ViewNode[] = [rootView];
  const connectors: Connector[] = [];

  const children = root.collapsed ? [] : root.children;
  const rightChildren = layout === "left" ? [] : layout === "right" ? children : children.filter((_, index) => index % 2 === 0);
  const leftChildren = layout === "right" ? [] : layout === "left" ? children : children.filter((_, index) => index % 2 === 1);

  const placeForest = (items: MindNode[], side: -1 | 1) => {
    const trees = items.map((child) => buildLayoutTree(child, 1, side, density, metrics));
    const totalSpan = trees.reduce((sum, tree) => sum + tree.span, 0);
    let startY = -totalSpan / 2;

    trees.forEach((tree) => {
      placeTree(tree, startY);
      startY += tree.span;
      flattenLayout(tree, nodes, connectors, rootView);
    });
  };

  placeForest(rightChildren, 1);
  placeForest(leftChildren, -1);

  if (nodes.length === 1) {
    return {
      nodes,
      connectors,
      bounds: { x: -220, y: -160, width: 440, height: 320 },
    };
  }

  const margin = 120;
  const minX = Math.min(...nodes.map((item) => item.x - item.width / 2)) - margin;
  const maxX = Math.max(...nodes.map((item) => item.x + item.width / 2)) + margin;
  const minY = Math.min(...nodes.map((item) => item.y - item.height / 2)) - margin;
  const maxY = Math.max(...nodes.map((item) => item.y + item.height / 2)) + margin;

  return {
    nodes,
    connectors,
    bounds: {
      x: minX,
      y: minY,
      width: Math.max(420, maxX - minX),
      height: Math.max(320, maxY - minY),
    },
  };
}

function wrapText(value: string, maxChars: number, maxLines = 3) {
  const words = value.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words.length ? words : [value]) {
    if (word.length > maxChars) {
      if (current) {
        lines.push(current);
        current = "";
      }

      for (let index = 0; index < word.length; index += maxChars) {
        lines.push(word.slice(index, index + maxChars));
      }
      continue;
    }

    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }

  if (current) lines.push(current);

  if (lines.length > maxLines) {
    const clipped = lines.slice(0, maxLines);
    clipped[maxLines - 1] = `${clipped[maxLines - 1].slice(0, Math.max(0, maxChars - 3))}...`;
    return clipped;
  }

  return lines.length ? lines : ["Untitled"];
}

function getContrastColor(hex: string) {
  const red = Number.parseInt(hex.slice(1, 3), 16);
  const green = Number.parseInt(hex.slice(3, 5), 16);
  const blue = Number.parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;
  return luminance > 0.58 ? "#0f172a" : "#f8fafc";
}

function getSearchText(node: MindNode) {
  return `${node.title} ${node.note} ${node.tags.join(" ")}`.toLocaleLowerCase();
}

function getAncestorIds(root: MindNode, matchingIds: Set<string>) {
  const ancestors = new Set<string>();

  const visit = (node: MindNode, trail: string[]) => {
    if (matchingIds.has(node.id)) {
      trail.forEach((id) => ancestors.add(id));
    }

    node.children.forEach((child) => visit(child, [...trail, node.id]));
  };

  visit(root, []);
  return ancestors;
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function escapeMarkdown(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\[/g, "\\[").replace(/\]/g, "\\]");
}

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 64) || "mindmap"
  );
}

function serializeMarkdown(root: MindNode) {
  const lines = [`# ${escapeMarkdown(root.title)}`];

  const visit = (node: MindNode, depth: number) => {
    node.children.forEach((child) => {
      const indent = "  ".repeat(depth);
      const tags = child.tags.length ? ` ${child.tags.map((tag) => `#${tag}`).join(" ")}` : "";
      const progress = child.progress ? ` [${child.progress}%]` : "";
      lines.push(`${indent}- ${escapeMarkdown(child.title)}${tags}${progress}`);
      if (child.note) {
        child.note.split(/\r?\n/).forEach((noteLine) => lines.push(`${indent}  > ${escapeMarkdown(noteLine)}`));
      }
      visit(child, depth + 1);
    });
  };

  if (root.note) {
    root.note.split(/\r?\n/).forEach((noteLine) => lines.push(`> ${escapeMarkdown(noteLine)}`));
  }

  visit(root, 0);
  return lines.join("\n");
}

function serializeOpml(document: MindMapDocument) {
  const visit = (node: MindNode, depth: number): string => {
    const indent = "  ".repeat(depth);
    const attrs = [
      `text="${escapeXml(node.title)}"`,
      node.note ? `_note="${escapeXml(node.note)}"` : "",
      node.tags.length ? `category="${escapeXml(node.tags.join(","))}"` : "",
      `progress="${node.progress}"`,
      `priority="${node.priority}"`,
      `color="${escapeXml(node.color)}"`,
      `offsetX="${Math.round(node.offsetX ?? 0)}"`,
      `offsetY="${Math.round(node.offsetY ?? 0)}"`,
    ]
      .filter(Boolean)
      .join(" ");

    if (node.children.length === 0) return `${indent}<outline ${attrs} />`;
    return [`${indent}<outline ${attrs}>`, ...node.children.map((child) => visit(child, depth + 1)), `${indent}</outline>`].join("\n");
  };

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<opml version="2.0">',
    "  <head>",
    `    <title>${escapeXml(document.title)}</title>`,
    "  </head>",
    "  <body>",
    visit(document.root, 2),
    "  </body>",
    "</opml>",
  ].join("\n");
}

function serializeFreeMind(document: MindMapDocument) {
  const visit = (node: MindNode, depth: number): string => {
    const indent = "  ".repeat(depth);
    const attrs = [
      `ID="${escapeXml(node.id)}"`,
      `TEXT="${escapeXml(node.title)}"`,
      node.note ? `NOTE="${escapeXml(node.note)}"` : "",
      node.tags.length ? `TAGS="${escapeXml(node.tags.join(","))}"` : "",
      `PROGRESS="${node.progress}"`,
      `PRIORITY="${node.priority}"`,
      `COLOR="${escapeXml(node.color)}"`,
      `OFFSET_X="${Math.round(node.offsetX ?? 0)}"`,
      `OFFSET_Y="${Math.round(node.offsetY ?? 0)}"`,
      node.collapsed ? 'FOLDED="true"' : "",
    ]
      .filter(Boolean)
      .join(" ");

    if (node.children.length === 0) return `${indent}<node ${attrs} />`;
    return [`${indent}<node ${attrs}>`, ...node.children.map((child) => visit(child, depth + 1)), `${indent}</node>`].join("\n");
  };

  return ['<?xml version="1.0" encoding="UTF-8"?>', '<map version="1.0.1">', visit(document.root, 1), "</map>"].join("\n");
}

function cleanMermaidLabel(value: string) {
  return value.replace(/[\r\n]+/g, " ").replace(/[()[\]{}]/g, "").trim() || "Untitled";
}

function serializeMermaid(root: MindNode) {
  const lines = ["mindmap", `  root((${cleanMermaidLabel(root.title)}))`];

  const visit = (node: MindNode, depth: number) => {
    node.children.forEach((child) => {
      lines.push(`${"  ".repeat(depth)}${cleanMermaidLabel(child.title)}`);
      visit(child, depth + 1);
    });
  };

  visit(root, 2);
  return lines.join("\n");
}

function serializeCsv(root: MindNode) {
  const rows = [["id", "parent_id", "title", "note", "tags", "priority", "progress", "color", "collapsed", "offset_x", "offset_y"]];
  const visit = (node: MindNode, parentId = "") => {
    rows.push([
      node.id,
      parentId,
      node.title,
      node.note,
      node.tags.join("|"),
      String(node.priority),
      String(node.progress),
      node.color,
      node.collapsed ? "true" : "false",
      String(Math.round(node.offsetX ?? 0)),
      String(Math.round(node.offsetY ?? 0)),
    ]);
    node.children.forEach((child) => visit(child, node.id));
  };

  visit(root);
  return rows.map((row) => row.map(escapeCsvCell).join(",")).join("\n");
}

function escapeCsvCell(value: string) {
  if (/[",\r\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function serializeDocument(document: MindMapDocument, format: ExportFormat) {
  const computedDocument = withComputedProgressDocument(document);
  if (format === "json") return JSON.stringify(computedDocument, null, 2);
  if (format === "markdown") return serializeMarkdown(computedDocument.root);
  if (format === "opml") return serializeOpml(computedDocument);
  if (format === "freemind") return serializeFreeMind(computedDocument);
  if (format === "mermaid") return serializeMermaid(computedDocument.root);
  return serializeCsv(computedDocument.root);
}

function parseCsvRows(source: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];

    if (char === '"') {
      if (quoted && next === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (!quoted && char === ",") {
      row.push(cell);
      cell = "";
      continue;
    }

    if (!quoted && (char === "\n" || char === "\r")) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  row.push(cell);
  rows.push(row);
  return rows.filter((item) => item.some((value) => value.trim()));
}

function parseCsvDocument(source: string, title = "Imported CSV"): MindMapDocument {
  const rows = parseCsvRows(source);
  const header = rows.shift()?.map((item) => item.trim().toLowerCase()) ?? [];
  const indexOf = (name: string) => header.indexOf(name);
  const idIndex = indexOf("id");
  const parentIndex = indexOf("parent_id");
  const titleIndex = indexOf("title");

  if (idIndex < 0 || parentIndex < 0 || titleIndex < 0) {
    throw new Error("CSV import needs id, parent_id, and title columns.");
  }

  const nodes = new Map<string, MindNode>();
  const childrenByParent = new Map<string, string[]>();

  rows.forEach((row, rowIndex) => {
    const id = row[idIndex]?.trim() || createId();
    const parentId = row[parentIndex]?.trim() || "";
    const node = makeNode(row[titleIndex]?.trim() || `Idea ${rowIndex + 1}`, {
      note: row[indexOf("note")] ?? "",
      tags: (row[indexOf("tags")] ?? "")
        .split("|")
        .map((item) => item.trim())
        .filter(Boolean),
      priority: Number(row[indexOf("priority")] ?? 1),
      progress: Number(row[indexOf("progress")] ?? 0),
      color: normalizeColor(row[indexOf("color")], NODE_COLORS[rowIndex % NODE_COLORS.length]),
      collapsed: (row[indexOf("collapsed")] ?? "").toLowerCase() === "true",
      offsetX: Number(row[indexOf("offset_x")] ?? row[indexOf("offsetx")] ?? 0),
      offsetY: Number(row[indexOf("offset_y")] ?? row[indexOf("offsety")] ?? 0),
    });
    node.id = id;
    nodes.set(id, node);
    childrenByParent.set(parentId, [...(childrenByParent.get(parentId) ?? []), id]);
  });

  const attach = (node: MindNode): MindNode => ({
    ...node,
    children: (childrenByParent.get(node.id) ?? []).map((childId) => attach(nodes.get(childId)!)).filter(Boolean),
  });

  const rootId = childrenByParent.get("")?.[0];
  if (!rootId || !nodes.has(rootId)) throw new Error("CSV import could not find a root row.");

  return normalizeDocument({
    title,
    root: attach(nodes.get(rootId)!),
  });
}

function extractMetaFromTitle(rawTitle: string) {
  const progressMatch = rawTitle.match(/\[(\d{1,3})%\]/);
  const tags = Array.from(rawTitle.matchAll(/#([^\s#]+)/g)).map((match) => match[1]);
  const title = rawTitle
    .replace(/\[(\d{1,3})%\]/g, "")
    .replace(/#([^\s#]+)/g, "")
    .trim();

  return {
    title: title || "Untitled",
    tags,
    progress: progressMatch ? clamp(Number(progressMatch[1]), 0, 100) : 0,
  };
}

function parseMarkdownDocument(source: string, fallbackTitle = "Imported Markdown"): MindMapDocument {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  let root: MindNode | null = null;
  const stack: Array<{ depth: number; node: MindNode }> = [];
  let lastNode: MindNode | null = null;

  const attachNode = (depth: number, node: MindNode) => {
    if (!root) {
      root = node;
      stack.length = 0;
      stack.push({ depth: 0, node });
      return;
    }

    while (stack.length && stack[stack.length - 1].depth >= depth) stack.pop();
    const parent = stack[stack.length - 1]?.node ?? root;
    parent.children.push(node);
    stack.push({ depth, node });
  };

  lines.forEach((line) => {
    if (!line.trim()) return;

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      const meta = extractMetaFromTitle(heading[2]);
      const node = makeNode(meta.title, { tags: meta.tags, progress: meta.progress, color: NODE_COLORS[(heading[1].length - 1) % NODE_COLORS.length] });
      attachNode(heading[1].length - 1, node);
      lastNode = node;
      return;
    }

    const bullet = line.match(/^(\s*)[-*+]\s+(.+)$/);
    if (bullet) {
      const depth = Math.floor(bullet[1].replace(/\t/g, "  ").length / 2) + (root ? 1 : 0);
      const meta = extractMetaFromTitle(bullet[2]);
      const node = makeNode(meta.title, { tags: meta.tags, progress: meta.progress, color: NODE_COLORS[depth % NODE_COLORS.length] });
      attachNode(depth, node);
      lastNode = node;
      return;
    }

    const quote = line.match(/^\s*>\s?(.*)$/);
    if (quote && lastNode) {
      lastNode.note = lastNode.note ? `${lastNode.note}\n${quote[1]}` : quote[1];
    }
  });

  if (!root) {
    const firstLine = lines.find((line) => line.trim())?.trim() || fallbackTitle;
    root = makeNode(firstLine, { color: "#38bdf8" });
  }

  return normalizeDocument({
    title: root.title,
    root,
  });
}

function parseXml(source: string) {
  const parsed = new DOMParser().parseFromString(source, "application/xml");
  if (parsed.querySelector("parsererror")) throw new Error("XML could not be parsed.");
  return parsed;
}

function parseOpmlDocument(source: string, fallbackTitle = "Imported OPML"): MindMapDocument {
  const parsed = parseXml(source);
  const title = parsed.querySelector("head > title")?.textContent?.trim() || fallbackTitle;
  const outline = parsed.querySelector("body > outline");
  if (!outline) throw new Error("OPML body does not contain an outline.");

  const visit = (element: Element, depth: number): MindNode => {
    const node = makeNode(element.getAttribute("text") || element.getAttribute("title") || `Idea ${depth + 1}`, {
      note: element.getAttribute("_note") || "",
      tags: normalizeTags(element.getAttribute("category") || ""),
      progress: Number(element.getAttribute("progress") || 0),
      priority: Number(element.getAttribute("priority") || 1),
      color: normalizeColor(element.getAttribute("color"), NODE_COLORS[depth % NODE_COLORS.length]),
      offsetX: Number(element.getAttribute("offsetX") || element.getAttribute("x") || 0),
      offsetY: Number(element.getAttribute("offsetY") || element.getAttribute("y") || 0),
    });
    node.children = Array.from(element.children)
      .filter((child) => child.tagName.toLowerCase() === "outline")
      .map((child) => visit(child, depth + 1));
    return node;
  };

  return normalizeDocument({ title, root: visit(outline, 0) });
}

function parseFreeMindDocument(source: string, fallbackTitle = "Imported FreeMind"): MindMapDocument {
  const parsed = parseXml(source);
  const rootElement = parsed.querySelector("map > node");
  if (!rootElement) throw new Error("FreeMind map does not contain a root node.");

  const visit = (element: Element, depth: number): MindNode => {
    const node = makeNode(element.getAttribute("TEXT") || element.getAttribute("text") || `Idea ${depth + 1}`, {
      note: element.getAttribute("NOTE") || element.getAttribute("note") || "",
      tags: normalizeTags(element.getAttribute("TAGS") || element.getAttribute("tags") || ""),
      progress: Number(element.getAttribute("PROGRESS") || element.getAttribute("progress") || 0),
      priority: Number(element.getAttribute("PRIORITY") || element.getAttribute("priority") || 1),
      color: normalizeColor(element.getAttribute("COLOR") || element.getAttribute("color"), NODE_COLORS[depth % NODE_COLORS.length]),
      offsetX: Number(element.getAttribute("OFFSET_X") || element.getAttribute("offsetX") || 0),
      offsetY: Number(element.getAttribute("OFFSET_Y") || element.getAttribute("offsetY") || 0),
      collapsed: (element.getAttribute("FOLDED") || "").toLowerCase() === "true",
    });
    const id = element.getAttribute("ID") || element.getAttribute("id");
    if (id) node.id = id;
    node.children = Array.from(element.children)
      .filter((child) => child.tagName.toLowerCase() === "node")
      .map((child) => visit(child, depth + 1));
    return node;
  };

  const root = visit(rootElement, 0);
  return normalizeDocument({ title: root.title || fallbackTitle, root });
}

function unwrapMermaidLabel(value: string) {
  return value
    .replace(/^[A-Za-z0-9_-]*\(\((.*)\)\)$/u, "$1")
    .replace(/^[A-Za-z0-9_-]*\((.*)\)$/u, "$1")
    .replace(/^[A-Za-z0-9_-]*\[(.*)\]$/u, "$1")
    .trim();
}

function parseMermaidDocument(source: string, fallbackTitle = "Imported Mermaid"): MindMapDocument {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const useful = lines.filter((line) => line.trim() && !line.trim().startsWith("%%"));
  const mindmapIndex = useful.findIndex((line) => line.trim().toLowerCase() === "mindmap");
  const mapLines = (mindmapIndex >= 0 ? useful.slice(mindmapIndex + 1) : useful).filter((line) => line.trim());
  if (mapLines.length === 0) throw new Error("Mermaid mindmap has no nodes.");

  let root: MindNode | null = null;
  const stack: Array<{ depth: number; node: MindNode }> = [];

  for (const line of mapLines) {
    const depth = Math.floor((line.match(/^\s*/)?.[0].replace(/\t/g, "  ").length ?? 0) / 2);
    const title = unwrapMermaidLabel(line.trim());
    const node = makeNode(title, { color: NODE_COLORS[Math.round(depth) % NODE_COLORS.length] });

    if (!root) {
      root = node;
      stack.push({ depth, node });
      continue;
    }

    while (stack.length && stack[stack.length - 1].depth >= depth) stack.pop();
    const parent = stack[stack.length - 1]?.node ?? root;
    parent.children.push(node);
    stack.push({ depth, node });
  }

  if (!root) throw new Error("Mermaid mindmap could not be parsed.");
  return normalizeDocument({ title: root.title || fallbackTitle, root });
}

function detectImportFormat(source: string, fileName: string, selected: ImportFormat): Exclude<ImportFormat, "auto"> {
  if (selected !== "auto") return selected;
  const lowerName = fileName.toLowerCase();
  const trimmed = source.trim();

  if (lowerName.endsWith(".json") || trimmed.startsWith("{")) return "json";
  if (lowerName.endsWith(".opml") || /^<opml[\s>]/i.test(trimmed)) return "opml";
  if (lowerName.endsWith(".mm") || /^<map[\s>]/i.test(trimmed)) return "freemind";
  if (lowerName.endsWith(".mmd") || lowerName.endsWith(".mermaid") || /^mindmap\b/i.test(trimmed)) return "mermaid";
  if (lowerName.endsWith(".csv") || /^id,parent_id,title/i.test(trimmed)) return "csv";
  return "markdown";
}

function parseImportedDocument(source: string, fileName: string, selectedFormat: ImportFormat) {
  const format = detectImportFormat(source, fileName, selectedFormat);
  if (format === "json") return normalizeDocument(JSON.parse(source));
  if (format === "opml") return parseOpmlDocument(source, fileName || "Imported OPML");
  if (format === "freemind") return parseFreeMindDocument(source, fileName || "Imported FreeMind");
  if (format === "mermaid") return parseMermaidDocument(source, fileName || "Imported Mermaid");
  if (format === "csv") return parseCsvDocument(source, fileName || "Imported CSV");
  return parseMarkdownDocument(source, fileName || "Imported Markdown");
}

function buildExportSvg(viewModel: ViewModel, title: string) {
  const width = Math.ceil(viewModel.bounds.width);
  const height = Math.ceil(viewModel.bounds.height);
  const minX = Math.floor(viewModel.bounds.x);
  const minY = Math.floor(viewModel.bounds.y);

  const connectors = viewModel.connectors
    .map(
      (connector) =>
        `<path d="${connector.path}" fill="none" stroke="${escapeXml(connector.to.node.color)}" stroke-width="4" stroke-linecap="round" opacity="0.62" />`,
    )
    .join("\n");

  const nodes = viewModel.nodes
    .map((item) => {
      const x = item.x - item.width / 2;
      const y = item.y - item.height / 2;
      const textColor = getContrastColor(item.node.color);
      const titleLines = wrapText(item.node.title, Math.max(12, Math.floor((item.width - 26) / 8)), 3);
      const tagLine = item.node.tags.slice(0, 3).join("  ");
      const titleSvg = titleLines
        .map((line, index) => `<text x="${x + 16}" y="${y + 27 + index * 17}" fill="${textColor}" font-family="Segoe UI, Arial, sans-serif" font-size="15" font-weight="700">${escapeXml(line)}</text>`)
        .join("\n");
      const metaSvg = tagLine
        ? `<text x="${x + 16}" y="${y + item.height - 17}" fill="${textColor}" opacity="0.76" font-family="Segoe UI, Arial, sans-serif" font-size="11">${escapeXml(tagLine)}</text>`
        : "";
      const progressWidth = Math.max(0, (item.width - 32) * (item.node.progress / 100));

      return [
        `<g>`,
        `<rect x="${x}" y="${y}" width="${item.width}" height="${item.height}" rx="12" fill="${escapeXml(item.node.color)}" stroke="#0f172a" stroke-opacity="0.12" />`,
        titleSvg,
        metaSvg,
        `<rect x="${x + 16}" y="${y + item.height - 9}" width="${item.width - 32}" height="4" rx="2" fill="${textColor}" opacity="0.2" />`,
        `<rect x="${x + 16}" y="${y + item.height - 9}" width="${progressWidth}" height="4" rx="2" fill="${textColor}" opacity="0.8" />`,
        `</g>`,
      ].join("\n");
    })
    .join("\n");

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${minX} ${minY} ${width} ${height}" role="img" aria-label="${escapeXml(title)}">`,
    `<rect x="${minX}" y="${minY}" width="${width}" height="${height}" fill="#f8fafc" />`,
    `<text x="${minX + 28}" y="${minY + 42}" fill="#334155" font-family="Segoe UI, Arial, sans-serif" font-size="18" font-weight="700">${escapeXml(title)}</text>`,
    connectors,
    nodes,
    "</svg>",
  ].join("\n");
}

function parseSvgSize(svg: string) {
  const parsed = new DOMParser().parseFromString(svg, "image/svg+xml");
  const svgElement = parsed.documentElement;
  const viewBox = svgElement.getAttribute("viewBox");
  if (viewBox) {
    const values = viewBox.split(/[\s,]+/).map((item) => Number.parseFloat(item));
    if (values.length === 4 && values[2] > 0 && values[3] > 0) return { width: values[2], height: values[3] };
  }
  return {
    width: Number.parseFloat(svgElement.getAttribute("width") || "1200") || 1200,
    height: Number.parseFloat(svgElement.getAttribute("height") || "800") || 800,
  };
}

async function svgToPngBlob(svg: string) {
  const { width, height } = parseSvgSize(svg);
  const imageUrl = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));

  try {
    const image = new Image();
    image.decoding = "async";
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("PNG export failed."));
      image.src = imageUrl;
    });

    const scale = Math.max(1, Math.min(2, 8192 / Math.max(width, height)));
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(width * scale);
    canvas.height = Math.ceil(height * scale);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas is unavailable.");
    context.setTransform(scale, 0, 0, scale, 0, 0);
    context.drawImage(image, 0, 0, width, height);

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("PNG export failed."));
      }, "image/png");
    });
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

function getExtension(format: ExportFormat) {
  if (format === "markdown") return "md";
  if (format === "freemind") return "mm";
  if (format === "mermaid") return "mmd";
  return format;
}

function getImportError(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Import failed.";
}

function useHistoryState(): [HistoryState, (updater: (document: MindMapDocument) => MindMapDocument) => void, () => void, () => void, (document: MindMapDocument) => void] {
  const [history, setHistory] = useState<HistoryState>(() => ({
    past: [],
    present: withComputedProgressDocument(cloneDocument(DEFAULT_DOCUMENT)),
    future: [],
  }));

  const commit = (updater: (document: MindMapDocument) => MindMapDocument) => {
    setHistory((prev) => {
      const next = touchDocument(withComputedProgressDocument(normalizeDocument(updater(prev.present))));
      return {
        past: [...prev.past.slice(-(HISTORY_LIMIT - 1)), cloneDocument(prev.present)],
        present: next,
        future: [],
      };
    });
  };

  const undo = () => {
    setHistory((prev) => {
      const previous = prev.past[prev.past.length - 1];
      if (!previous) return prev;
      return {
        past: prev.past.slice(0, -1),
        present: previous,
        future: [cloneDocument(prev.present), ...prev.future],
      };
    });
  };

  const redo = () => {
    setHistory((prev) => {
      const next = prev.future[0];
      if (!next) return prev;
      return {
        past: [...prev.past, cloneDocument(prev.present)].slice(-HISTORY_LIMIT),
        present: next,
        future: prev.future.slice(1),
      };
    });
  };

  const replace = (document: MindMapDocument) => {
    setHistory((prev) => ({
      past: [...prev.past.slice(-(HISTORY_LIMIT - 1)), cloneDocument(prev.present)],
      present: touchDocument(withComputedProgressDocument(normalizeDocument(document))),
      future: [],
    }));
  };

  return [history, commit, undo, redo, replace];
}

function renderOutline(node: MindNode, options: OutlineRenderOptions, depth = 0) {
  const isSelected = options.selectedId === node.id;
  const isEditing = options.editor?.nodeId === node.id;
  const canDelete = node.id !== options.rootId;
  const rowStyle = { "--mindmap-outline-depth": depth } as CSSProperties;

  return (
    <div key={node.id} className="mindmap-outline-node">
      <div className="mindmap-outline-row">
        {isEditing ? (
          <div className={`mindmap-outline-button is-editing${isSelected ? " is-selected" : ""}`} style={rowStyle}>
            <span style={{ background: node.color }} />
            <input
              ref={options.inputRef}
              className="mindmap-outline-input"
              value={options.editor?.value ?? ""}
              onChange={(event) => options.onChangeEdit(event.target.value)}
              onBlur={options.onCommitEdit}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  options.onCommitEdit();
                }

                if (event.key === "Escape") {
                  event.preventDefault();
                  options.onCancelEdit();
                }
              }}
            />
            <small>{node.children.length}</small>
          </div>
        ) : (
          <button
            type="button"
            className={`mindmap-outline-button${isSelected ? " is-selected" : ""}`}
            style={rowStyle}
            onClick={() => options.onSelect(node)}
            onDoubleClick={(event) => {
              event.preventDefault();
              options.onStartEdit(node);
            }}
          >
            <span style={{ background: node.color }} />
            <strong>{node.title || "Untitled"}</strong>
            <small>{node.children.length}</small>
          </button>
        )}

        <button
          type="button"
          className="mindmap-outline-delete"
          onClick={() => options.onDelete(node.id)}
          disabled={!canDelete}
          title={canDelete ? "Delete node" : "Root cannot be deleted"}
          aria-label={`Delete ${node.title || "Untitled"}`}
        >
          ×
        </button>
      </div>
      {node.children.map((child) => renderOutline(child, options, depth + 1))}
    </div>
  );
}

export function MindMapClient() {
  const [history, commit, undo, redo, replaceDocument] = useHistoryState();
  const [selectedId, setSelectedId] = useState(DEFAULT_DOCUMENT.root.id);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [tagDraft, setTagDraft] = useState(DEFAULT_DOCUMENT.root.tags.join(", "));
  const [isTagInputFocused, setIsTagInputFocused] = useState(false);
  const [density, setDensity] = useState<DensityMode>("comfortable");
  const [isCanvasFocused, setIsCanvasFocused] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [exportFormat, setExportFormat] = useState<ExportFormat>("json");
  const [importFormat, setImportFormat] = useState<ImportFormat>("auto");
  const [importText, setImportText] = useState("");
  const [importStatus, setImportStatus] = useState("");
  const [isImportDragging, setIsImportDragging] = useState(false);
  const [savedMaps, setSavedMaps] = useState<SavedMindMap[]>([]);
  const [saveName, setSaveName] = useState("");
  const [activeSavedId, setActiveSavedId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState("");
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const [pngState, setPngState] = useState<"idle" | "working" | "failed">("idle");
  const [hasLoadedStorage, setHasLoadedStorage] = useState(false);
  const panStartRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const panMovedRef = useRef(false);
  const dragStateRef = useRef<DragState | null>(null);
  const nodeClickRef = useRef<{ nodeId: string; time: number } | null>(null);
  const outlineClickRef = useRef<{ nodeId: string; time: number } | null>(null);
  const skipTagCommitRef = useRef(false);
  const [dragPreview, setDragPreview] = useState<DragPreview | null>(null);
  const [inlineEditor, setInlineEditor] = useState<InlineEditorState | null>(null);
  const [outlineEditor, setOutlineEditor] = useState<OutlineEditorState | null>(null);
  const [hoverCard, setHoverCard] = useState<HoverCardState | null>(null);
  const inlineEditorInputRef = useRef<HTMLInputElement | null>(null);
  const outlineInputRef = useRef<HTMLInputElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const allNodes = useMemo(() => flattenNodes(history.present.root), [history.present.root]);
  const selectedNode = useMemo(() => findNode(history.present.root, selectedId) ?? history.present.root, [history.present.root, selectedId]);
  const focusRoot = useMemo(() => (focusId ? findNode(history.present.root, focusId) ?? history.present.root : history.present.root), [focusId, history.present.root]);
  const stats = useMemo(() => getStats(history.present.root), [history.present.root]);
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const matchingIds = useMemo(() => {
    if (!normalizedQuery) return new Set<string>();
    return new Set(allNodes.filter((node) => getSearchText(node).includes(normalizedQuery)).map((node) => node.id));
  }, [allNodes, normalizedQuery]);
  const ancestorIds = useMemo(() => getAncestorIds(history.present.root, matchingIds), [history.present.root, matchingIds]);
  const viewModel = useMemo(() => buildViewModel(focusRoot, history.present.layout, density), [density, focusRoot, history.present.layout]);
  const draggedIds = useMemo(() => {
    if (!dragPreview) return new Set<string>();
    const node = findNode(focusRoot, dragPreview.nodeId);
    return node ? new Set(flattenNodes(node).map((item) => item.id)) : new Set<string>();
  }, [dragPreview, focusRoot]);
  const exportText = useMemo(() => serializeDocument(history.present, exportFormat), [exportFormat, history.present]);
  const selectedEntry = useMemo(() => findEntry(history.present.root, selectedNode.id), [history.present.root, selectedNode.id]);
  const hoveredNode = useMemo(
    () => (hoverCard ? findNode(history.present.root, hoverCard.nodeId) ?? null : null),
    [history.present.root, hoverCard],
  );
  const selectedIsLeaf = selectedNode.children.length === 0;
  const selectedProgress = selectedNode.progress;
  const selectedLeafCount = useMemo(() => getLeafProgressSummary(selectedNode).count, [selectedNode]);
  const selectedLeafLabel = selectedLeafCount === 1 ? "1 leaf" : `${selectedLeafCount} leaves`;
  const canMoveUp = Boolean(selectedEntry?.parent && selectedEntry.index > 0);
  const canMoveDown = Boolean(selectedEntry?.parent && selectedEntry.index >= 0 && selectedEntry.index < selectedEntry.parent.children.length - 1);
  const canEditParentActions = selectedNode.id !== history.present.root.id;

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = normalizeDocument(JSON.parse(saved));
        replaceDocument(parsed);
        setSelectedId(parsed.root.id);
        setSaveName(parsed.title);
      } else {
        setSaveName(DEFAULT_DOCUMENT.title);
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
      setSaveName(DEFAULT_DOCUMENT.title);
    } finally {
      try {
        setSavedMaps(parseSavedMaps(window.localStorage.getItem(SAVED_MAPS_KEY)));
      } catch {
        window.localStorage.removeItem(SAVED_MAPS_KEY);
        setSavedMaps([]);
      }
      setHasLoadedStorage(true);
    }
    // replaceDocument intentionally runs once during client hydration.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hasLoadedStorage) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(withComputedProgressDocument(history.present)));
  }, [hasLoadedStorage, history.present]);

  useEffect(() => {
    if (!hasLoadedStorage) return;
    try {
      window.localStorage.setItem(SAVED_MAPS_KEY, JSON.stringify(savedMaps));
    } catch {
      setSaveStatus("Browser storage is full.");
    }
  }, [hasLoadedStorage, savedMaps]);

  useEffect(() => {
    if (!findNode(history.present.root, selectedId)) setSelectedId(history.present.root.id);
    if (focusId && !findNode(history.present.root, focusId)) setFocusId(null);
    if (outlineEditor && !findNode(history.present.root, outlineEditor.nodeId)) setOutlineEditor(null);
  }, [focusId, history.present.root, selectedId]);

  useEffect(() => {
    if (!outlineEditor) return;
    outlineInputRef.current?.focus();
    outlineInputRef.current?.select();
  }, [outlineEditor?.nodeId]);

  useEffect(() => {
    if (!isTagInputFocused) setTagDraft(selectedNode.tags.join(", "));
  }, [isTagInputFocused, selectedNode.id, selectedNode.tags]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return;

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        undo();
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y") {
        event.preventDefault();
        redo();
        return;
      }

      if (event.key === "Tab") {
        event.preventDefault();
        addChildNode();
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        addSiblingNode();
        return;
      }

      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        deleteSelectedNode();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();
      zoomCanvasAtPoint(event.deltaY, event.clientX, event.clientY);
    };

    svg.addEventListener("wheel", handleWheel, { passive: false });
    return () => svg.removeEventListener("wheel", handleWheel);
  }, [pan.x, pan.y, zoom]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const getEventNodeId = (target: EventTarget | null) => {
      if (!(target instanceof Element)) return null;
      return target.closest<SVGGElement>(".mindmap-svg-node")?.dataset.nodeId ?? null;
    };

    const handleNodeHover = (event: MouseEvent) => {
      const nodeId = getEventNodeId(event.target);
      if (nodeId) showNodeHoverCard(nodeId);
    };

    const handleNodeOut = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest<SVGGElement>(".mindmap-svg-node") : null;
      if (!target) return;
      if (event.relatedTarget instanceof Element && target.contains(event.relatedTarget)) return;

      const nodeId = target.dataset.nodeId;
      setHoverCard((prev) => (prev?.nodeId === nodeId ? null : prev));
    };

    const handleSvgLeave = () => setHoverCard(null);

    svg.addEventListener("mouseover", handleNodeHover);
    svg.addEventListener("mousemove", handleNodeHover);
    svg.addEventListener("mouseout", handleNodeOut);
    svg.addEventListener("mouseleave", handleSvgLeave);
    return () => {
      svg.removeEventListener("mouseover", handleNodeHover);
      svg.removeEventListener("mousemove", handleNodeHover);
      svg.removeEventListener("mouseout", handleNodeOut);
      svg.removeEventListener("mouseleave", handleSvgLeave);
    };
  }, [dragPreview, hoverCard?.nodeId, inlineEditor]);

  useEffect(() => {
    if (!inlineEditor) return;
    const input = inlineEditorInputRef.current;
    input?.focus();
    input?.select();
  }, [inlineEditor?.nodeId]);

  useEffect(() => {
    if (!inlineEditor) return;

    if (!findNode(history.present.root, inlineEditor.nodeId)) {
      setInlineEditor(null);
      return;
    }

    const rect = getNodeEditorRect(inlineEditor.nodeId);
    if (!rect) return;

    setInlineEditor((prev) => (prev ? { ...prev, rect } : prev));
  }, [density, history.present.root, inlineEditor?.nodeId, pan.x, pan.y, viewModel, zoom]);

  useEffect(() => {
    if (!hoverCard) return;

    if (dragPreview || inlineEditor) {
      setHoverCard(null);
      return;
    }

    if (!findNode(history.present.root, hoverCard.nodeId)) {
      setHoverCard(null);
      return;
    }

    const rect = getNodeHoverRect(hoverCard.nodeId);
    if (!rect) return;

    setHoverCard((prev) => (prev ? { ...prev, rect } : prev));
  }, [density, dragPreview, history.present.root, hoverCard?.nodeId, inlineEditor, pan.x, pan.y, viewModel, zoom]);

  function updateSelected(updater: (node: MindNode) => MindNode) {
    commit((document) => ({
      ...document,
      root: updateNodeById(document.root, selectedNode.id, (node) => {
        const next = updater(node);
        return next.id === document.root.id ? { ...next, title: next.title || "Mind Map" } : next;
      }),
    }));
  }

  function updateSelectedTitle(title: string) {
    updateSelected((node) => ({ ...node, title }));
  }

  function commitTagDraft() {
    const tags = normalizeTags(tagDraft);
    const normalizedDraft = tags.join(", ");
    setTagDraft(normalizedDraft);

    if (selectedNode.tags.join("\u001f") === tags.join("\u001f")) return;
    updateSelected((node) => ({ ...node, tags }));
  }

  function getNodeBoxElement(nodeId: string) {
    const svg = svgRef.current;
    if (!svg) return null;

    const nodeElement = Array.from(svg.querySelectorAll<SVGGElement>(".mindmap-svg-node")).find(
      (element) => element.dataset.nodeId === nodeId,
    );
    return nodeElement?.querySelector<SVGRectElement>(".mindmap-node-box") ?? null;
  }

  function getNodeEditorRect(nodeId: string): InlineEditorState["rect"] | null {
    const stage = stageRef.current;
    if (!stage) return null;

    const boxElement = getNodeBoxElement(nodeId);
    if (!boxElement) return null;

    const nodeRect = boxElement.getBoundingClientRect();
    const stageRect = stage.getBoundingClientRect();
    const width = Math.max(140, Math.min(380, nodeRect.width - 14));
    const height = Math.max(34, Math.min(46, nodeRect.height - 10));
    const left = clamp(nodeRect.left - stageRect.left + (nodeRect.width - width) / 2, 8, Math.max(8, stageRect.width - width - 8));
    const top = clamp(nodeRect.top - stageRect.top + (nodeRect.height - height) / 2, 8, Math.max(8, stageRect.height - height - 8));

    return { left, top, width, height };
  }

  function getNodeHoverRect(nodeId: string): HoverCardState["rect"] | null {
    const stage = stageRef.current;
    if (!stage) return null;

    const boxElement = getNodeBoxElement(nodeId);
    if (!boxElement) return null;

    const nodeRect = boxElement.getBoundingClientRect();
    const stageRect = stage.getBoundingClientRect();
    const width = Math.min(320, Math.max(240, stageRect.width - 24));
    const height = 224;
    const gap = 14;
    const margin = 10;
    const nodeBox = {
      left: nodeRect.left - stageRect.left,
      right: nodeRect.right - stageRect.left,
      top: nodeRect.top - stageRect.top,
      bottom: nodeRect.bottom - stageRect.top,
      centerX: nodeRect.left - stageRect.left + nodeRect.width / 2,
      centerY: nodeRect.top - stageRect.top + nodeRect.height / 2,
    };
    const maxLeft = Math.max(margin, stageRect.width - width - margin);
    const maxTop = Math.max(margin, stageRect.height - height - margin);
    const clampCandidate = (left: number, top: number, placement: HoverCardState["rect"]["placement"]) => ({
      left: clamp(left, margin, maxLeft),
      top: clamp(top, margin, maxTop),
      width,
      placement,
    });
    const candidates = [
      clampCandidate(nodeBox.right + gap, nodeBox.centerY - height / 2, "right"),
      clampCandidate(nodeBox.left - width - gap, nodeBox.centerY - height / 2, "left"),
      clampCandidate(nodeBox.centerX - width / 2, nodeBox.bottom + gap, "bottom"),
      clampCandidate(nodeBox.centerX - width / 2, nodeBox.top - height - gap, "top"),
    ];
    const preferredPlacements: Array<HoverCardState["rect"]["placement"]> = [
      ...(nodeBox.centerX <= stageRect.width / 2 ? (["right", "left"] as const) : (["left", "right"] as const)),
      ...(nodeBox.centerY <= stageRect.height / 2 ? (["bottom", "top"] as const) : (["top", "bottom"] as const)),
    ];
    const orderedCandidates = preferredPlacements.map((placement) => candidates.find((candidate) => candidate.placement === placement)!);
    const getOverlapArea = (candidate: HoverCardState["rect"]) => {
      const overlapX = Math.max(0, Math.min(candidate.left + width, nodeBox.right) - Math.max(candidate.left, nodeBox.left));
      const overlapY = Math.max(0, Math.min(candidate.top + height, nodeBox.bottom) - Math.max(candidate.top, nodeBox.top));
      return overlapX * overlapY;
    };

    return orderedCandidates.find((candidate) => getOverlapArea(candidate) === 0) ?? orderedCandidates.sort((a, b) => getOverlapArea(a) - getOverlapArea(b))[0];
  }

  function startInlineTitleEdit(node: MindNode) {
    const rect = getNodeEditorRect(node.id);
    if (!rect) return;

    setSelectedId(node.id);
    setInlineEditor({
      nodeId: node.id,
      value: node.title,
      rect,
    });
  }

  function showNodeHoverCard(nodeId: string) {
    if (dragPreview || inlineEditor) return;
    if (hoverCard?.nodeId === nodeId) return;

    const rect = getNodeHoverRect(nodeId);
    if (!rect) return;

    setHoverCard({ nodeId, rect });
  }

  function commitInlineTitleEdit() {
    if (!inlineEditor) return;
    const nextTitle = inlineEditor.value.trim() || "Untitled";
    const nodeId = inlineEditor.nodeId;

    commit((document) => ({
      ...document,
      root: updateNodeById(document.root, nodeId, (node) => ({ ...node, title: nextTitle })),
    }));
    setInlineEditor(null);
  }

  function startOutlineTitleEdit(node: MindNode) {
    setSelectedId(node.id);
    setOutlineEditor({ nodeId: node.id, value: node.title });
  }

  function handleOutlineNodeSelect(node: MindNode) {
    const now = window.performance.now();
    const lastClick = outlineClickRef.current;
    const isDoubleClick = lastClick?.nodeId === node.id && now - lastClick.time < 420;
    outlineClickRef.current = { nodeId: node.id, time: now };

    setSelectedId(node.id);
    if (isDoubleClick) startOutlineTitleEdit(node);
  }

  function commitOutlineTitleEdit() {
    if (!outlineEditor) return;
    const nodeId = outlineEditor.nodeId;
    const nextTitle = outlineEditor.value.trim() || "Untitled";

    commit((document) => ({
      ...document,
      root: updateNodeById(document.root, nodeId, (node) => ({ ...node, title: nextTitle })),
    }));
    setOutlineEditor(null);
  }

  function cancelOutlineTitleEdit() {
    setOutlineEditor(null);
  }

  function addChildNode() {
    const child = makeNode("New idea", { color: NODE_COLORS[(allNodes.length + 1) % NODE_COLORS.length] });
    commit((document) => ({
      ...document,
      root: insertChild(document.root, selectedNode.id, child),
    }));
    setSelectedId(child.id);
  }

  function addSiblingNode() {
    if (selectedNode.id === history.present.root.id) {
      addChildNode();
      return;
    }

    const sibling = makeNode("New idea", { color: NODE_COLORS[(allNodes.length + 2) % NODE_COLORS.length] });
    commit((document) => ({
      ...document,
      root: insertSibling(document.root, selectedNode.id, sibling),
    }));
    setSelectedId(sibling.id);
  }

  function duplicateSelectedNode() {
    if (selectedNode.id === history.present.root.id) return;
    const duplicate = cloneWithNewIds(selectedNode);
    commit((document) => ({
      ...document,
      root: insertSibling(document.root, selectedNode.id, duplicate),
    }));
    setSelectedId(duplicate.id);
  }

  function deleteSelectedNode() {
    deleteNodeById(selectedNode.id);
  }

  function deleteNodeById(nodeId: string) {
    if (nodeId === history.present.root.id) return;
    const entry = findEntry(history.present.root, nodeId);
    const parentId = entry?.parent?.id ?? history.present.root.id;
    commit((document) => ({
      ...document,
      root: removeNode(document.root, nodeId),
    }));
    if (outlineEditor?.nodeId === nodeId) setOutlineEditor(null);
    if (inlineEditor?.nodeId === nodeId) setInlineEditor(null);
    if (hoverCard?.nodeId === nodeId) setHoverCard(null);
    setSelectedId(parentId);
  }

  function moveSelected(direction: -1 | 1) {
    commit((document) => ({
      ...document,
      root: moveNode(document.root, selectedNode.id, direction),
    }));
  }

  function loadTemplate(document: MindMapDocument) {
    replaceDocument(document);
    setSelectedId(document.root.id);
    setFocusId(null);
    setSaveName(document.title);
    setActiveSavedId(null);
    setSaveStatus("");
    setPan({ x: 0, y: 0 });
    setZoom(100);
  }

  function changeLayout(layout: LayoutMode) {
    commit((document) => ({ ...document, layout }));
    setPan({ x: 0, y: 0 });
  }

  function importDocumentFromText(source: string, fileName = "Pasted map") {
    if (!source.trim()) {
      setImportStatus("Nothing to import.");
      return;
    }

    try {
      const imported = parseImportedDocument(source, fileName, importFormat);
      replaceDocument(imported);
      setSelectedId(imported.root.id);
      setFocusId(null);
      setSaveName(imported.title);
      setActiveSavedId(null);
      setImportStatus("Imported.");
      setPan({ x: 0, y: 0 });
      setZoom(100);
    } catch (error) {
      setImportStatus(getImportError(error));
    }
  }

  async function importFile(file: File) {
    if (file.size > IMPORT_LIMIT_BYTES) {
      setImportStatus("File is larger than 2 MB.");
      return;
    }

    try {
      const text = await file.text();
      setImportText(text);
      importDocumentFromText(text, file.name);
    } catch {
      setImportStatus("File could not be read.");
    }
  }

  async function handleImportFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    try {
      if (file) await importFile(file);
    } finally {
      event.target.value = "";
    }
  }

  function handleImportDragEnter(event: ReactDragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsImportDragging(true);
  }

  function handleImportDragOver(event: ReactDragEvent<HTMLLabelElement>) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    setIsImportDragging(true);
  }

  function handleImportDragLeave(event: ReactDragEvent<HTMLLabelElement>) {
    const nextTarget = event.relatedTarget;
    if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) return;
    setIsImportDragging(false);
  }

  function handleImportDrop(event: ReactDragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsImportDragging(false);

    const file = event.dataTransfer.files[0];
    if (file) void importFile(file);
  }

  async function copyExportText() {
    try {
      await window.navigator.clipboard.writeText(exportText);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }

    window.setTimeout(() => setCopyState("idle"), 1600);
  }

  function downloadCurrentExport() {
    const extension = getExtension(exportFormat);
    downloadBlob(new Blob([exportText], { type: "text/plain;charset=utf-8" }), `${slugify(history.present.title)}.${extension}`);
  }

  function downloadSvg() {
    const svg = buildExportSvg(viewModel, history.present.title);
    downloadBlob(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }), `${slugify(history.present.title)}.svg`);
  }

  async function downloadPng() {
    setPngState("working");
    try {
      const svg = buildExportSvg(viewModel, history.present.title);
      const blob = await svgToPngBlob(svg);
      downloadBlob(blob, `${slugify(history.present.title)}.png`);
      setPngState("idle");
    } catch {
      setPngState("failed");
      window.setTimeout(() => setPngState("idle"), 1800);
    }
  }

  function showSaveStatus(message: string) {
    setSaveStatus(message);
    window.setTimeout(() => setSaveStatus(""), 1800);
  }

  function saveCurrentToBrowser(asCopy = false) {
    const existing = !asCopy && activeSavedId ? savedMaps.find((item) => item.id === activeSavedId) ?? null : null;
    const saved = makeSavedMap(history.present, saveName || history.present.title, existing);

    setSavedMaps((prev) => {
      const next = existing ? prev.map((item) => (item.id === existing.id ? saved : item)) : [saved, ...prev];
      return sortSavedMaps(next).slice(0, SAVED_MAP_LIMIT);
    });
    setActiveSavedId(saved.id);
    setSaveName(saved.title);
    showSaveStatus(existing ? "Saved changes." : "Saved to browser.");
  }

  function loadSavedMap(item: SavedMindMap) {
    const document = cloneDocument(item.document);
    replaceDocument(document);
    setSelectedId(document.root.id);
    setFocusId(null);
    setSaveName(item.title);
    setActiveSavedId(item.id);
    setSaveStatus("");
    setPan({ x: 0, y: 0 });
    setZoom(100);
  }

  function deleteSavedMap(id: string) {
    setSavedMaps((prev) => prev.filter((item) => item.id !== id));
    if (activeSavedId === id) setActiveSavedId(null);
    showSaveStatus("Deleted.");
  }

  function formatSavedAt(value: string) {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return "Unknown";

    return new Intl.DateTimeFormat("ko-KR", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }

  function selectNextMatch() {
    const matches = allNodes.filter((node) => matchingIds.has(node.id));
    if (matches.length === 0) return;
    const currentIndex = matches.findIndex((node) => node.id === selectedNode.id);
    const next = matches[(currentIndex + 1 + matches.length) % matches.length];
    setSelectedId(next.id);
  }

  function getModelDelta(startClientX: number, startClientY: number, clientX: number, clientY: number) {
    if (!svgRef.current) return { dx: 0, dy: 0 };

    const rect = svgRef.current.getBoundingClientRect();
    const scale = zoom / 100;

    return {
      dx: ((clientX - startClientX) * viewModel.bounds.width) / Math.max(1, rect.width) / scale,
      dy: ((clientY - startClientY) * viewModel.bounds.height) / Math.max(1, rect.height) / scale,
    };
  }

  function getModelPoint(clientX: number, clientY: number) {
    const svg = svgRef.current;
    if (!svg) return null;

    const matrix = svg.getScreenCTM();
    if (!matrix) return null;

    const point = svg.createSVGPoint();
    point.x = clientX;
    point.y = clientY;
    const svgPoint = point.matrixTransform(matrix.inverse());
    const scale = zoom / 100;

    return {
      x: (svgPoint.x - pan.x) / scale,
      y: (svgPoint.y - pan.y) / scale,
    };
  }

  function getSvgPoint(clientX: number, clientY: number) {
    const svg = svgRef.current;
    if (!svg) return null;

    const matrix = svg.getScreenCTM();
    if (!matrix) return null;

    const point = svg.createSVGPoint();
    point.x = clientX;
    point.y = clientY;
    return point.matrixTransform(matrix.inverse());
  }

  function findDropTarget(clientX: number, clientY: number, nodeId: string) {
    const point = getModelPoint(clientX, clientY);
    if (!point) return null;

    const movingNode = findNode(focusRoot, nodeId);
    const blockedIds = movingNode ? new Set(flattenNodes(movingNode).map((node) => node.id)) : new Set<string>([nodeId]);

    return (
      [...viewModel.nodes]
        .reverse()
        .find((item) => {
          if (blockedIds.has(item.node.id)) return false;
          return (
            point.x >= item.x - item.width / 2 &&
            point.x <= item.x + item.width / 2 &&
            point.y >= item.y - item.height / 2 &&
            point.y <= item.y + item.height / 2
          );
        })?.node.id ?? null
    );
  }

  function handleNodePointerDown(event: ReactPointerEvent<SVGGElement>, item: ViewNode) {
    event.stopPropagation();
    setSelectedId(item.node.id);

    if (event.button === 0) {
      const now = window.performance.now();
      const lastClick = nodeClickRef.current;
      const isDoubleClick = lastClick?.nodeId === item.node.id && now - lastClick.time < 420;
      nodeClickRef.current = { nodeId: item.node.id, time: now };

      if (isDoubleClick) {
        event.preventDefault();
        dragStateRef.current = null;
        setDragPreview(null);
        window.setTimeout(() => startInlineTitleEdit(item.node), 0);
        return;
      }
    }

    if (item.node.id === history.present.root.id || event.button !== 0) return;

    dragStateRef.current = {
      nodeId: item.node.id,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startOffsetX: item.node.offsetX ?? 0,
      startOffsetY: item.node.offsetY ?? 0,
    };
    setDragPreview({
      nodeId: item.node.id,
      dx: 0,
      dy: 0,
      targetId: null,
      isDragging: false,
    });
    svgRef.current?.setPointerCapture(event.pointerId);
  }

  function handleCanvasPointerDown(event: ReactPointerEvent<SVGSVGElement>) {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (!target.classList.contains("mindmap-canvas-bg") && target !== event.currentTarget) return;

    panStartRef.current = {
      x: event.clientX,
      y: event.clientY,
      panX: pan.x,
      panY: pan.y,
    };
    panMovedRef.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleCanvasPointerMove(event: ReactPointerEvent<SVGSVGElement>) {
    const dragState = dragStateRef.current;
    if (dragState) {
      const { dx, dy } = getModelDelta(dragState.startClientX, dragState.startClientY, event.clientX, event.clientY);
      const isDragging = Math.abs(event.clientX - dragState.startClientX) > 4 || Math.abs(event.clientY - dragState.startClientY) > 4;
      setDragPreview({
        nodeId: dragState.nodeId,
        dx,
        dy,
        targetId: isDragging ? findDropTarget(event.clientX, event.clientY, dragState.nodeId) : null,
        isDragging,
      });
      return;
    }

    if (!panStartRef.current || !svgRef.current) return;
    const { dx, dy } = getModelDelta(panStartRef.current.x, panStartRef.current.y, event.clientX, event.clientY);
    if (Math.abs(event.clientX - panStartRef.current.x) > 4 || Math.abs(event.clientY - panStartRef.current.y) > 4) {
      panMovedRef.current = true;
    }
    setPan({ x: panStartRef.current.panX + dx, y: panStartRef.current.panY + dy });
  }

  function handleCanvasPointerUp(event: ReactPointerEvent<SVGSVGElement>) {
    const dragState = dragStateRef.current;
    const preview = dragPreview;
    if (dragState) {
      dragStateRef.current = null;

      if (preview?.isDragging) {
        nodeClickRef.current = null;

        if (preview.targetId) {
          commit((document) => ({
            ...document,
            root: relocateNode(document.root, dragState.nodeId, preview.targetId!),
          }));
        } else {
          const nextOffsetX = Math.round(clamp(dragState.startOffsetX + preview.dx, -4000, 4000));
          const nextOffsetY = Math.round(clamp(dragState.startOffsetY + preview.dy, -4000, 4000));
          commit((document) => ({
            ...document,
            root: updateNodeById(document.root, dragState.nodeId, (node) => ({
              ...node,
              offsetX: nextOffsetX,
              offsetY: nextOffsetY,
            })),
          }));
        }
      }

      setDragPreview(null);
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      return;
    }

    panStartRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function handleCanvasBackgroundClick(event: React.MouseEvent<SVGRectElement>) {
    event.stopPropagation();

    if (panMovedRef.current) {
      panMovedRef.current = false;
      return;
    }

    setSelectedId(focusRoot.id);
  }

  function zoomCanvasAtPoint(deltaY: number, clientX: number, clientY: number) {
    const svgPoint = getSvgPoint(clientX, clientY);
    if (!svgPoint) return;

    const oldScale = zoom / 100;
    const zoomFactor = deltaY < 0 ? 1.1 : 1 / 1.1;
    const nextZoom = Math.round(clamp(zoom * zoomFactor, ZOOM_MIN, ZOOM_MAX));
    if (nextZoom === zoom) return;

    const nextScale = nextZoom / 100;
    const worldX = (svgPoint.x - pan.x) / oldScale;
    const worldY = (svgPoint.y - pan.y) / oldScale;

    setZoom(nextZoom);
    setPan({
      x: svgPoint.x - worldX * nextScale,
      y: svgPoint.y - worldY * nextScale,
    });
  }

  function renderNode(item: ViewNode) {
    const visuals = getDensityVisuals(density);
    const titleLines = wrapText(
      item.node.title,
      Math.max(8, Math.floor((item.width - visuals.progressInset * 2) / visuals.charWidth)),
      density === "compact" ? 2 : 3,
    );
    const textColor = getContrastColor(item.node.color);
    const isSelected = item.node.id === selectedNode.id;
    const isMatched = matchingIds.has(item.node.id);
    const isAncestor = ancestorIds.has(item.node.id);
    const isDropTarget = dragPreview?.targetId === item.node.id;
    const isDragged = Boolean(dragPreview && draggedIds.has(item.node.id));
    const previewDx = isDragged ? dragPreview?.dx ?? 0 : 0;
    const previewDy = isDragged ? dragPreview?.dy ?? 0 : 0;
    const isInlineEditing = inlineEditor?.nodeId === item.node.id;
    const nodeProgress = item.node.progress;
    const progressWidth = Math.max(0, (item.width - visuals.progressInset * 2) * (nodeProgress / 100));
    const tagLine = item.node.tags.slice(0, 2).join("  ");
    const toggleX = item.side === -1 ? -item.width / 2 - 14 : item.width / 2 + 14;
    const showQuickMenu = isSelected && !dragPreview && !isInlineEditing;
    const quickMenuActions = [
      {
        id: "child",
        label: "+ child",
        title: "Add child",
        disabled: false,
        action: addChildNode,
      },
      {
        id: "sibling",
        label: "+ sibling",
        title: "Add sibling",
        disabled: item.node.id === history.present.root.id,
        action: addSiblingNode,
      },
      {
        id: "delete",
        label: "delete",
        title: "Delete node",
        disabled: item.node.id === history.present.root.id,
        action: deleteSelectedNode,
      },
    ];
    const quickActionWidth = 68;
    const quickActionGap = 6;
    const quickMenuPadding = 6;
    const quickMenuWidth = quickMenuActions.length * quickActionWidth + (quickMenuActions.length - 1) * quickActionGap + quickMenuPadding * 2;
    const quickMenuY = -item.height / 2 - 44;

    return (
      <g
        key={item.node.id}
        data-node-id={item.node.id}
        className={`mindmap-svg-node${isSelected ? " is-selected" : ""}${isMatched ? " is-match" : ""}${isAncestor ? " is-ancestor" : ""}${isDropTarget ? " is-drop-target" : ""}${isDragged ? " is-dragging" : ""}`}
        transform={`translate(${item.x + previewDx} ${item.y + previewDy})`}
        onPointerEnter={() => showNodeHoverCard(item.node.id)}
        onPointerLeave={() => setHoverCard((prev) => (prev?.nodeId === item.node.id ? null : prev))}
        onMouseMove={() => showNodeHoverCard(item.node.id)}
        onMouseEnter={() => showNodeHoverCard(item.node.id)}
        onMouseLeave={() => setHoverCard((prev) => (prev?.nodeId === item.node.id ? null : prev))}
        onPointerDown={(event) => handleNodePointerDown(event, item)}
        onClick={(event) => {
          event.stopPropagation();
          setSelectedId(item.node.id);
        }}
        onDoubleClick={(event) => {
          event.stopPropagation();
          startInlineTitleEdit(item.node);
        }}
      >
        <rect
          className="mindmap-node-shadow"
          x={-item.width / 2}
          y={-item.height / 2 + 4}
          width={item.width}
          height={item.height}
          rx={visuals.cornerRadius}
        />
        <rect
          className="mindmap-node-box"
          x={-item.width / 2}
          y={-item.height / 2}
          width={item.width}
          height={item.height}
          rx={visuals.cornerRadius}
          fill={item.node.color}
        />
        {titleLines.map((line, index) => (
          <text
            key={`${item.node.id}-line-${index}`}
            x={-item.width / 2 + visuals.progressInset}
            y={-item.height / 2 + visuals.titleTop + index * visuals.lineHeight}
            fill={textColor}
            className="mindmap-node-title"
            style={{ fontSize: visuals.titleSize }}
          >
            {line}
          </text>
        ))}
        {tagLine ? (
          <text
            x={-item.width / 2 + visuals.progressInset}
            y={item.height / 2 - visuals.metaBottom}
            fill={textColor}
            className="mindmap-node-meta"
            style={{ fontSize: visuals.metaSize }}
          >
            {tagLine}
          </text>
        ) : null}
        <rect
          x={-item.width / 2 + visuals.progressInset}
          y={item.height / 2 - visuals.progressBottom}
          width={item.width - visuals.progressInset * 2}
          height={density === "compact" ? 3 : density === "spacious" ? 6 : 4}
          rx="2"
          fill={textColor}
          opacity="0.18"
        />
        <rect
          x={-item.width / 2 + visuals.progressInset}
          y={item.height / 2 - visuals.progressBottom}
          width={progressWidth}
          height={density === "compact" ? 3 : density === "spacious" ? 6 : 4}
          rx="2"
          fill={textColor}
          opacity="0.82"
        />
        {item.node.children.length > 0 ? (
          <g
            className="mindmap-collapse-control"
            transform={`translate(${toggleX} 0)`}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              updateSelectedById(item.node.id, (node) => ({ ...node, collapsed: !node.collapsed }));
            }}
          >
            <circle r="12" />
            <text y="4">{item.node.collapsed ? "+" : "-"}</text>
          </g>
        ) : null}
        {showQuickMenu ? (
          <g
            className="mindmap-quick-menu"
            transform={`translate(${-quickMenuWidth / 2} ${quickMenuY})`}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
          >
            <rect className="mindmap-quick-menu-bg" width={quickMenuWidth} height="36" rx="18" />
            {quickMenuActions.map((action, index) => (
              <g
                key={action.id}
                className={`mindmap-quick-action${action.disabled ? " is-disabled" : ""}${action.id === "delete" ? " is-danger" : ""}`}
                role="button"
                aria-label={action.title}
                tabIndex={action.disabled ? -1 : 0}
                transform={`translate(${quickMenuPadding + index * (quickActionWidth + quickActionGap)} 6)`}
                onClick={(event) => {
                  event.stopPropagation();
                  if (!action.disabled) action.action();
                }}
              >
                <title>{action.title}</title>
                <rect width={quickActionWidth} height="24" rx="12" />
                <text x={quickActionWidth / 2} y="16">
                  {action.label}
                </text>
              </g>
            ))}
          </g>
        ) : null}
      </g>
    );
  }

  function renderHoverCard() {
    if (!hoverCard || !hoveredNode || inlineEditor) return null;

    const note = hoveredNode.note.trim();
    const tags = hoveredNode.tags.slice(0, 5);
    const childCount = hoveredNode.children.length;
    const hoveredProgress = hoveredNode.progress;

    return (
      <div
        className={`mindmap-hover-card is-${hoverCard.rect.placement}`}
        role="tooltip"
        style={
          {
            left: hoverCard.rect.left,
            top: hoverCard.rect.top,
            width: hoverCard.rect.width,
            "--mindmap-hover-color": hoveredNode.color,
          } as CSSProperties
        }
      >
        <div className="mindmap-hover-header">
          <span className="mindmap-hover-swatch" />
          <strong>{hoveredNode.title}</strong>
        </div>

        <p className={note ? "mindmap-hover-note" : "mindmap-hover-note is-empty"}>{note || "No note yet."}</p>

        <div className="mindmap-hover-progress" aria-hidden="true">
          <span style={{ width: `${hoveredProgress}%` }} />
        </div>

        <div className="mindmap-hover-meta">
          <span>Priority {getPriorityLabel(hoveredNode.priority)}</span>
          <span>{childCount > 0 ? `Auto ${hoveredProgress}% done` : `${hoveredProgress}% done`}</span>
          <span>{childCount === 1 ? "1 child" : `${childCount} children`}</span>
        </div>

        {tags.length > 0 ? (
          <div className="mindmap-hover-tags">
            {tags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  function updateSelectedById(id: string, updater: (node: MindNode) => MindNode) {
    commit((document) => ({
      ...document,
      root: updateNodeById(document.root, id, updater),
    }));
  }

  const viewBox = `${viewModel.bounds.x} ${viewModel.bounds.y} ${viewModel.bounds.width} ${viewModel.bounds.height}`;
  const densityVisuals = getDensityVisuals(density);

  return (
    <>
      <section className="panel stack">
        <div className="eyebrow">utility / mindmap</div>
        <div className="utility-title-row">
          <div>
            <h1 style={{ marginBottom: 8 }}>Mind Map Studio</h1>
          </div>
          <div className="utility-status-tags" aria-live="polite">
            <span className="tag neutral">{stats.nodes} nodes</span>
            <span className="tag neutral">{stats.maxDepth} levels</span>
            <span className="tag neutral">{stats.averageProgress}%</span>
            <span className="tag neutral">{history.present.layout}</span>
          </div>
        </div>
      </section>

      <section className={`mindmap-workbench section${isCanvasFocused ? " is-canvas-focused" : ""}`}>
        <div className="panel stack mindmap-canvas-panel">
          <div className="mindmap-control-deck">
            <div className="mindmap-toolbar mindmap-toolbar-primary">
              <div className="mindmap-toolbar-group mindmap-action-group" aria-label="Node actions">
                <button type="button" className="ghost-button" onClick={undo} disabled={history.past.length === 0} title="Undo">
                  Undo
                </button>
                <button type="button" className="ghost-button" onClick={redo} disabled={history.future.length === 0} title="Redo">
                  Redo
                </button>
                <button type="button" className="button" onClick={addChildNode}>
                  Add child
                </button>
                <button type="button" className="ghost-button" onClick={addSiblingNode}>
                  Add sibling
                </button>
              </div>

              <div className="mindmap-toolbar-group mindmap-view-group" aria-label="Canvas view">
                <button
                  type="button"
                  className="ghost-button mindmap-icon-button"
                  onClick={() => setZoom((value) => Math.max(ZOOM_MIN, value - 10))}
                  aria-label="Zoom out"
                >
                  -
                </button>
                <span className="mindmap-zoom-label">{zoom}%</span>
                <button
                  type="button"
                  className="ghost-button mindmap-icon-button"
                  onClick={() => setZoom((value) => Math.min(ZOOM_MAX, value + 10))}
                  aria-label="Zoom in"
                >
                  +
                </button>
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => {
                    setZoom(100);
                    setPan({ x: 0, y: 0 });
                  }}
                >
                  Fit
                </button>
                <button type="button" className="button" onClick={() => setIsCanvasFocused((value) => !value)}>
                  {isCanvasFocused ? "Show panels" : "Focus canvas"}
                </button>
              </div>
            </div>

            <div className="mindmap-toolbar mindmap-toolbar-secondary">
              <div className="mindmap-setting-group">
                <span className="mindmap-control-label">Layout</span>
                <div className="segmented-control mindmap-segmented" role="group" aria-label="Layout">
                  {(["balanced", "right", "left"] as const).map((layout) => (
                    <button
                      key={layout}
                      type="button"
                      className={`segment${history.present.layout === layout ? " active" : ""}`}
                      onClick={() => changeLayout(layout)}
                    >
                      {layout}
                    </button>
                  ))}
                </div>
              </div>

              <label className="mindmap-setting-group">
                <span className="mindmap-control-label">Density</span>
                <select className="input mindmap-density-select" value={density} onChange={(event) => setDensity(event.target.value as DensityMode)}>
                  <option value="compact">Compact</option>
                  <option value="comfortable">Comfortable</option>
                  <option value="spacious">Spacious</option>
                </select>
              </label>

              <div className="mindmap-search-field">
                <label className="mindmap-control-label" htmlFor="mindmap-node-search">
                  Search
                </label>
                <div className="mindmap-search-row">
                  <input
                    id="mindmap-node-search"
                    className="input mindmap-search-input"
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search nodes"
                  />
                  <button type="button" className="ghost-button" onClick={selectNextMatch} disabled={matchingIds.size === 0}>
                    Next
                  </button>
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => {
                      commit((document) => ({ ...document, root: setCollapsedForAll(document.root, false) }));
                      setFocusId(null);
                    }}
                  >
                    Expand
                  </button>
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => commit((document) => ({ ...document, root: setCollapsedForAll(document.root, true) }))}
                  >
                    Collapse
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div ref={stageRef} className={`mindmap-stage density-${density}`}>
            <svg
              ref={svgRef}
              className="mindmap-svg"
              viewBox={viewBox}
              role="img"
              aria-label={history.present.title}
              onPointerDown={handleCanvasPointerDown}
              onPointerMove={handleCanvasPointerMove}
              onPointerUp={handleCanvasPointerUp}
              onPointerCancel={handleCanvasPointerUp}
            >
              <rect
                className="mindmap-canvas-bg"
                x={viewModel.bounds.x}
                y={viewModel.bounds.y}
                width={viewModel.bounds.width}
                height={viewModel.bounds.height}
                onClick={handleCanvasBackgroundClick}
              />
              <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom / 100})`}>
                {viewModel.connectors.map((connector) => (
                  <path
                    key={connector.id}
                    className="mindmap-connector"
                    d={connector.path}
                    style={
                      {
                        "--mindmap-connector-color": connector.to.node.color,
                        "--mindmap-connector-width": `${densityVisuals.connectorWidth}px`,
                      } as CSSProperties
                    }
                  />
                ))}
                {viewModel.nodes.map(renderNode)}
              </g>
            </svg>
            {renderHoverCard()}
            {inlineEditor ? (
              <input
                ref={inlineEditorInputRef}
                className="mindmap-inline-editor"
                value={inlineEditor.value}
                style={{
                  left: inlineEditor.rect.left,
                  top: inlineEditor.rect.top,
                  width: inlineEditor.rect.width,
                  height: inlineEditor.rect.height,
                }}
                onChange={(event) =>
                  setInlineEditor((prev) => (prev ? { ...prev, value: event.target.value } : prev))
                }
                onBlur={commitInlineTitleEdit}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    commitInlineTitleEdit();
                  }

                  if (event.key === "Escape") {
                    event.preventDefault();
                    setInlineEditor(null);
                  }
                }}
                onPointerDown={(event) => event.stopPropagation()}
              />
            ) : null}
          </div>

          {!isCanvasFocused ? (
            <section className="mindmap-exchange-panel stack">
              <div className="list-item-header">
                <h2 style={{ margin: 0 }}>Exchange</h2>
                <select className="input mindmap-format-select" value={exportFormat} onChange={(event) => setExportFormat(event.target.value as ExportFormat)}>
                  {EXPORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <textarea className="textarea mono-textarea mindmap-export-textarea" readOnly value={exportText} />

              <div className="actions">
                <button type="button" className="ghost-button" onClick={copyExportText}>
                  {copyState === "copied" ? "Copied" : copyState === "failed" ? "Copy failed" : "Copy"}
                </button>
                <button type="button" className="button" onClick={downloadCurrentExport}>
                  Download
                </button>
                <button type="button" className="button" onClick={downloadSvg}>
                  SVG
                </button>
                <button type="button" className="button" onClick={downloadPng} disabled={pngState === "working"}>
                  {pngState === "working" ? "PNG..." : pngState === "failed" ? "PNG failed" : "PNG"}
                </button>
              </div>

              <div className="mindmap-import-grid">
                <select className="input" value={importFormat} onChange={(event) => setImportFormat(event.target.value as ImportFormat)}>
                  {IMPORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <label
                  className={`file-drop-zone mindmap-import-drop-zone${isImportDragging ? " is-dragging" : ""}`}
                  onDragEnter={handleImportDragEnter}
                  onDragOver={handleImportDragOver}
                  onDragLeave={handleImportDragLeave}
                  onDrop={handleImportDrop}
                >
                  <span className="file-drop-title">{isImportDragging ? "Drop to import" : "Drop or choose file"}</span>
                  <span className="file-drop-hint">JSON, Markdown, OPML, FreeMind, Mermaid, CSV</span>
                  <input
                    className="file-drop-input"
                    type="file"
                    accept=".json,.md,.markdown,.opml,.mm,.xml,.mmd,.mermaid,.csv,.txt"
                    aria-label="Import mind map file"
                    onChange={handleImportFile}
                  />
                </label>
              </div>

              <textarea
                className="textarea mono-textarea mindmap-import-textarea"
                value={importText}
                onChange={(event) => setImportText(event.target.value)}
                placeholder="Paste JSON, Markdown, OPML, FreeMind, Mermaid, or CSV"
                spellCheck={false}
              />

              <div className="actions">
                <button type="button" className="button" onClick={() => importDocumentFromText(importText)}>
                  Import text
                </button>
                <button type="button" className="ghost-button" onClick={() => setImportText("")}>
                  Clear
                </button>
              </div>
              {importStatus ? <div className={importStatus === "Imported." ? "notice notice-success" : "notice notice-error"}>{importStatus}</div> : null}
            </section>
          ) : null}

          {!isCanvasFocused ? (
            <section className="mindmap-browser-library stack">
              <div className="list-item-header">
                <h2 style={{ margin: 0 }}>Browser Library</h2>
                <span className="tag neutral">{savedMaps.length} saved</span>
              </div>

              <div className="mindmap-save-row">
                <label className="field">
                  <span className="label">Save name</span>
                  <input
                    className="input"
                    value={saveName}
                    onChange={(event) => setSaveName(event.target.value)}
                    placeholder="Mind Map"
                  />
                </label>
                <div className="actions mindmap-save-actions">
                  <button type="button" className="button" onClick={() => saveCurrentToBrowser(false)}>
                    {activeSavedId ? "Save changes" : "Save"}
                  </button>
                  <button type="button" className="ghost-button" onClick={() => saveCurrentToBrowser(true)}>
                    Save copy
                  </button>
                </div>
              </div>

              {saveStatus ? <div className={saveStatus === "Browser storage is full." ? "notice notice-error" : "notice notice-success"}>{saveStatus}</div> : null}

              <div className="mindmap-saved-list">
                {savedMaps.length === 0 ? (
                  <div className="mindmap-saved-empty">
                    <span>No browser saves yet.</span>
                  </div>
                ) : (
                  savedMaps.map((item) => (
                    <div key={item.id} className={`mindmap-saved-row${activeSavedId === item.id ? " is-active" : ""}`}>
                      <button type="button" className="mindmap-saved-main" onClick={() => loadSavedMap(item)}>
                        <strong>{item.title}</strong>
                        <span>
                          {item.nodeCount} nodes / {formatSavedAt(item.updatedAt)}
                        </span>
                      </button>
                      <div className="mindmap-saved-actions">
                        <button type="button" className="ghost-button" onClick={() => loadSavedMap(item)}>
                          Load
                        </button>
                        <button type="button" className="danger-button" onClick={() => deleteSavedMap(item.id)}>
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          ) : null}
        </div>

        {!isCanvasFocused ? (
          <aside className="mindmap-side-stack">
          <section className="panel stack mindmap-node-panel">
            <div className="list-item-header">
              <h2 style={{ margin: 0 }}>Node</h2>
              <span className="tag neutral">{selectedNode.children.length} children</span>
            </div>

            <label className="field">
              <span className="label">Title</span>
              <input className="input" value={selectedNode.title} onChange={(event) => updateSelectedTitle(event.target.value)} />
            </label>

            <label className="field">
              <span className="label">Note</span>
              <textarea
                className="textarea mindmap-note-input"
                value={selectedNode.note}
                onChange={(event) => updateSelected((node) => ({ ...node, note: event.target.value }))}
              />
            </label>

            <label className="field">
              <span className="label">Tags</span>
              <input
                className="input"
                value={tagDraft}
                placeholder="research, urgent, v2"
                onFocus={() => setIsTagInputFocused(true)}
                onChange={(event) => setTagDraft(event.target.value)}
                onBlur={() => {
                  if (skipTagCommitRef.current) {
                    skipTagCommitRef.current = false;
                    setTagDraft(selectedNode.tags.join(", "));
                    setIsTagInputFocused(false);
                    return;
                  }

                  commitTagDraft();
                  setIsTagInputFocused(false);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    commitTagDraft();
                    skipTagCommitRef.current = true;
                    event.currentTarget.blur();
                  }

                  if (event.key === "Escape") {
                    event.preventDefault();
                    skipTagCommitRef.current = true;
                    setTagDraft(selectedNode.tags.join(", "));
                    event.currentTarget.blur();
                  }
                }}
              />
            </label>

            <div className="mindmap-editor-grid">
              <label className="field">
                <span className="label">Priority</span>
                <select
                  className="input"
                  value={selectedNode.priority}
                  onChange={(event) => updateSelected((node) => ({ ...node, priority: Number(event.target.value) }))}
                >
                  <option value={0}>None</option>
                  <option value={1}>Low</option>
                  <option value={2}>Medium</option>
                  <option value={3}>High</option>
                </select>
              </label>

              <label className="field">
                <span className="label">Progress</span>
                <input
                  className="input"
                  type="number"
                  min={0}
                  max={100}
                  value={selectedProgress}
                  disabled={!selectedIsLeaf}
                  onChange={(event) => {
                    if (!selectedIsLeaf) return;
                    updateSelected((node) => ({ ...node, progress: Math.round(clamp(Number(event.target.value), 0, 100)) }));
                  }}
                />
              </label>
            </div>

            <label className={`mindmap-range-row${selectedIsLeaf ? "" : " is-readonly"}`}>
              <input
                type="range"
                min={0}
                max={100}
                value={selectedProgress}
                disabled={!selectedIsLeaf}
                onChange={(event) => {
                  if (!selectedIsLeaf) return;
                  updateSelected((node) => ({ ...node, progress: Number(event.target.value) }));
                }}
              />
              <span>{selectedProgress}%</span>
            </label>
            {!selectedIsLeaf ? <div className="mindmap-progress-note">Auto from {selectedLeafLabel}.</div> : null}

            <div className="mindmap-node-section">
              <span className="mindmap-node-section-title">Color</span>
              <div className="mindmap-color-grid" aria-label="Node color">
                {NODE_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`mindmap-color-swatch${selectedNode.color === color ? " is-selected" : ""}`}
                    style={{ background: color }}
                    onClick={() => updateSelected((node) => ({ ...node, color }))}
                    title={color}
                  />
                ))}
              </div>
            </div>

            <label className="mindmap-check-row">
              <input
                type="checkbox"
                checked={selectedNode.collapsed}
                onChange={(event) => updateSelected((node) => ({ ...node, collapsed: event.target.checked }))}
                disabled={selectedNode.children.length === 0}
              />
              Collapsed
            </label>

            <div className="mindmap-node-action-stack">
              <div className="mindmap-node-action-group">
                <span className="mindmap-node-section-title">Structure</span>
                <div className="mindmap-node-button-row is-structure">
                  <button type="button" className="ghost-button mindmap-node-button" onClick={duplicateSelectedNode} disabled={!canEditParentActions}>
                    Duplicate
                  </button>
                  <button type="button" className="ghost-button mindmap-node-button" onClick={() => moveSelected(-1)} disabled={!canMoveUp}>
                    Up
                  </button>
                  <button type="button" className="ghost-button mindmap-node-button" onClick={() => moveSelected(1)} disabled={!canMoveDown}>
                    Down
                  </button>
                  <button
                    type="button"
                    className="ghost-button mindmap-node-button is-wide"
                    onClick={() => updateSelected((node) => ({ ...node, offsetX: 0, offsetY: 0 }))}
                    disabled={(selectedNode.offsetX ?? 0) === 0 && (selectedNode.offsetY ?? 0) === 0}
                  >
                    Reset position
                  </button>
                  <button type="button" className="danger-button mindmap-node-button" onClick={deleteSelectedNode} disabled={!canEditParentActions}>
                    Delete
                  </button>
                </div>
              </div>

              <div className="mindmap-node-action-group">
                <span className="mindmap-node-section-title">View</span>
                <div className="mindmap-node-button-row is-view">
                  <button type="button" className="ghost-button mindmap-node-button" onClick={() => setFocusId(selectedNode.id)}>
                    Focus
                  </button>
                  <button type="button" className="ghost-button mindmap-node-button" onClick={() => setFocusId(null)} disabled={!focusId}>
                    Clear focus
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section className="panel stack mindmap-template-panel">
            <div className="list-item-header">
              <h2 style={{ margin: 0 }}>Templates</h2>
              <button type="button" className="ghost-button mindmap-template-sample" onClick={() => loadTemplate(cloneDocument(DEFAULT_DOCUMENT))}>
                Sample map
              </button>
            </div>
            <div className="mindmap-template-grid">
              {TEMPLATE_BUILDERS.map((template) => (
                <button key={template.id} type="button" className="mindmap-template-button" onClick={() => loadTemplate(template.build())}>
                  <strong>{template.label}</strong>
                  <span>{template.description}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="panel stack">
            <div className="list-item-header">
              <h2 style={{ margin: 0 }}>Outline</h2>
              <span className="tag neutral">{stats.leaves} leaves</span>
            </div>
            <div className="mindmap-outline">
              {renderOutline(history.present.root, {
                selectedId: selectedNode.id,
                rootId: history.present.root.id,
                editor: outlineEditor,
                inputRef: outlineInputRef,
                onSelect: handleOutlineNodeSelect,
                onStartEdit: startOutlineTitleEdit,
                onChangeEdit: (value) => setOutlineEditor((prev) => (prev ? { ...prev, value } : prev)),
                onCommitEdit: commitOutlineTitleEdit,
                onCancelEdit: cancelOutlineTitleEdit,
                onDelete: deleteNodeById,
              })}
            </div>
          </section>
          </aside>
        ) : null}
      </section>
    </>
  );
}
