/**
 * SavedViewsMenu — Dropdown menu for managing saved filter/group views.
 * 
 * Features:
 * - List saved views with quick-load
 * - Save current view with name prompt
 * - Set default (auto-loads on page visit)
 * - Delete views
 * - Star icon for default indicator
 */
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  SavedView, getViews, saveView, deleteView, setDefaultView, persistViews,
} from '../lib/savedViews';
import api from '../lib/api';
import { usePrompt } from '../lib/usePrompt';

interface Props {
  pageId: string;
  currentFilters: Record<string, string>;
  currentGroupBy: string[];
  currentColumns?: string[];
  onLoad: (view: SavedView) => void;
}

export default function SavedViewsMenu({
  pageId,
  currentFilters,
  currentGroupBy,
  currentColumns,
  onLoad,
}: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [views, setViews] = useState<SavedView[]>(getViews(pageId));
  const [promptFn, PromptDialog] = usePrompt();

  // Sync from backend on mount (best-effort — falls back to localStorage)
  useEffect(() => {
    api.get('/user-views', { params: { pageId } })
      .then((res) => {
        const backendViews = (res.data?.data || []).map((v: any) => ({
          id: v.id?.toString() || String(Date.now()),
          name: v.name,
          filters: v.filters || {},
          groupBy: v.groupBy || [],
          columns: v.columns,
          isDefault: v.isDefault,
          createdAt: v.createdAt,
        }));
        if (backendViews.length) {
          persistViews(pageId, backendViews);
          setViews(backendViews);
        }
      })
      .catch(() => {}); // silent — localStorage is primary
  }, [pageId]);

  const refresh = () => setViews(getViews(pageId));

  const handleSave = async () => {
    const name = await promptFn({ title: 'Save View', placeholder: 'View name...' });
    if (!name?.trim()) return;
    const view = saveView(pageId, name.trim(), {
      filters: currentFilters,
      groupBy: currentGroupBy,
      columns: currentColumns,
    });
    // Best-effort backend sync
    api.post('/user-views', { pageId, name: name.trim(), filters: currentFilters, groupBy: currentGroupBy, columns: currentColumns }).catch(() => {});
    refresh();
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteView(pageId, id);
    // Best-effort backend sync
    api.delete(`/user-views/${id}`).catch(() => {});
    refresh();
  };

  const handleSetDefault = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const view = views.find((v) => v.id === id);
    // Toggle: if already default, unset; otherwise set
    setDefaultView(pageId, view?.isDefault ? null : id);
    refresh();
  };

  const handleLoad = (view: SavedView) => {
    onLoad(view);
    setOpen(false);
  };

  const hasActiveState =
    Object.keys(currentFilters).length > 0 || currentGroupBy.length > 0;

  return (
    <div className="relative inline-block">
      <PromptDialog />
      <button
        onClick={() => setOpen(!open)}
        className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
          views.some((v) => v.isDefault)
            ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'
            : 'border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
        }`}
      >
        ⭐ Views{views.length > 0 ? ` (${views.length})` : ''}
      </button>

      {open && (
        <div className="absolute z-40 top-full mt-1 right-0 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-lg w-64 overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
            <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">Saved Views</span>
            {hasActiveState && (
              <button
                onClick={handleSave}
                className="text-[10px] font-medium text-primary hover:underline"
              >
                + Save current
              </button>
            )}
          </div>

          {/* Views list */}
          <div className="max-h-48 overflow-y-auto">
            {views.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-gray-400">
                No saved views yet. Apply filters and click "Save current".
              </div>
            ) : (
              views.map((view) => (
                <div
                  key={view.id}
                  onClick={() => handleLoad(view)}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer border-b border-gray-100 dark:border-gray-800 last:border-b-0"
                >
                  {/* Star (default) */}
                  <button
                    onClick={(e) => handleSetDefault(view.id, e)}
                    className={`text-sm ${view.isDefault ? 'text-amber-500' : 'text-gray-300 hover:text-amber-400'}`}
                    title={view.isDefault ? 'Unset as default' : 'Set as default'}
                  >
                    {view.isDefault ? '★' : '☆'}
                  </button>

                  {/* View info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">
                      {view.name}
                    </div>
                    <div className="text-[10px] text-gray-400">
                      {Object.keys(view.filters).filter((k) => k !== '_logic').length} filter{Object.keys(view.filters).length !== 1 ? 's' : ''}
                      {view.groupBy.length > 0 && ` · ${view.groupBy.length} group`}
                    </div>
                  </div>

                  {/* Delete */}
                  <button
                    onClick={(e) => handleDelete(view.id, e)}
                    className="text-gray-300 hover:text-red-500 text-sm"
                    title="Delete view"
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Footer: close */}
          <div className="border-t border-gray-200 dark:border-gray-700 px-3 py-1.5">
            <button onClick={() => setOpen(false)} className="text-[10px] text-gray-400 hover:text-gray-600">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
