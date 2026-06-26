/**
 * SavedViews — Persist named filter + groupBy + column configurations per page.
 * 
 * Stored in localStorage. Each page has its own view namespace.
 * Users can save, load, rename, delete views, and set one as default.
 *
 * Usage:
 *   const { views, save, remove, setDefault, defaultView } = useSavedViews('sales-history');
 */

export interface SavedView {
  id: string;
  name: string;
  filters: Record<string, string>;
  groupBy: string[];
  columns?: string[];
  isDefault: boolean;
  createdAt: string;
}

const STORAGE_PREFIX = 'gwk-saved-views-';

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export function getViews(pageId: string): SavedView[] {
  try {
    return JSON.parse(localStorage.getItem(`${STORAGE_PREFIX}${pageId}`) || '[]');
  } catch {
    return [];
  }
}

export function persistViews(pageId: string, views: SavedView[]) {
  localStorage.setItem(`${STORAGE_PREFIX}${pageId}`, JSON.stringify(views));
}

export function saveView(
  pageId: string,
  name: string,
  config: { filters: Record<string, string>; groupBy: string[]; columns?: string[] },
): SavedView {
  const views = getViews(pageId);
  const view: SavedView = {
    id: genId(),
    name,
    filters: config.filters,
    groupBy: config.groupBy,
    columns: config.columns,
    isDefault: false,
    createdAt: new Date().toISOString(),
  };
  views.push(view);
  persistViews(pageId, views);
  return view;
}

export function deleteView(pageId: string, viewId: string) {
  const views = getViews(pageId).filter((v) => v.id !== viewId);
  persistViews(pageId, views);
}

export function setDefaultView(pageId: string, viewId: string | null) {
  const views = getViews(pageId).map((v) => ({
    ...v,
    isDefault: v.id === viewId,
  }));
  persistViews(pageId, views);
}

export function getDefaultView(pageId: string): SavedView | null {
  return getViews(pageId).find((v) => v.isDefault) || null;
}

export function renameView(pageId: string, viewId: string, newName: string) {
  const views = getViews(pageId).map((v) =>
    v.id === viewId ? { ...v, name: newName } : v
  );
  persistViews(pageId, views);
}
