import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import PageHeader from '../components/PageHeader';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';

type Shape = 'SQUARE' | 'ROUND' | 'RECTANGLE';
interface TableData {
  id: number; name: string; seats: number; shape: Shape;
  posX: number; posY: number; width: number; height: number;
  status: string; floorId: number | null; isActive: boolean;
}
interface FloorData {
  id: number; name: string; nameAr?: string; background?: string;
  branchId: number; sortOrder: number; isActive: boolean; tables: TableData[];
}

const SHAPES: { value: Shape; label: string; icon: string }[] = [
  { value: 'SQUARE', label: 'Square', icon: '⬜' },
  { value: 'ROUND', label: 'Round', icon: '⚪' },
  { value: 'RECTANGLE', label: 'Rectangle', icon: '▬' },
];

const CANVAS_W = 900;
const CANVAS_H = 600;

export default function TablesPage() {
  const { t } = useTranslation();
  const { activeBranch } = useAuth();
  const qc = useQueryClient();
  const branchId = activeBranch?.id;

  const [activeFloorId, setActiveFloorId] = useState<number | null>(null);
  const [editTable, setEditTable] = useState<TableData | null>(null);
  const [showAddFloor, setShowAddFloor] = useState(false);
  const [showAddTable, setShowAddTable] = useState(false);
  const [floorForm, setFloorForm] = useState({ name: '', nameAr: '', background: '#f5f5f4' });
  const [tableForm, setTableForm] = useState({ name: '', seats: '4', shape: 'SQUARE' as Shape });
  const [dragging, setDragging] = useState<{ id: number; startX: number; startY: number; origX: number; origY: number } | null>(null);
  const [resizing, setResizing] = useState<{ id: number; startX: number; startY: number; origW: number; origH: number } | null>(null);
  const [localPositions, setLocalPositions] = useState<Record<number, { posX: number; posY: number; width: number; height: number }>>({});
  const [dirty, setDirty] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  const { data: floors, isLoading } = useQuery({
    queryKey: ['floors', branchId],
    queryFn: () => api.get('/floors', { params: branchId ? { branchId } : {} }).then((r) => r.data.data),
    enabled: !!branchId,
  });

  const floorList: FloorData[] = useMemo(() => floors || [], [floors]);
  const activeFloor = useMemo(() => floorList.find((f) => f.id === activeFloorId) || floorList[0] || null, [floorList, activeFloorId]);

  useEffect(() => {
    if (activeFloor && activeFloorId !== activeFloor.id) setActiveFloorId(activeFloor.id);
  }, [activeFloor]);

  // Sync local positions when floor data changes
  useEffect(() => {
    if (!activeFloor) return;
    const pos: Record<number, { posX: number; posY: number; width: number; height: number }> = {};
    activeFloor.tables.filter((t) => t.isActive).forEach((t) => {
      pos[t.id] = { posX: t.posX, posY: t.posY, width: t.width, height: t.height };
    });
    setLocalPositions(pos);
    setDirty(false);
  }, [activeFloor?.id, activeFloor?.tables]);

  const tables = useMemo(() => {
    if (!activeFloor) return [];
    return activeFloor.tables.filter((t) => t.isActive).map((t) => ({
      ...t,
      posX: localPositions[t.id]?.posX ?? t.posX,
      posY: localPositions[t.id]?.posY ?? t.posY,
      width: localPositions[t.id]?.width ?? t.width,
      height: localPositions[t.id]?.height ?? t.height,
    }));
  }, [activeFloor, localPositions]);

  const refresh = () => qc.invalidateQueries({ queryKey: ['floors'] });

  // ---- Mutations ----
  const createFloorMut = useMutation({
    mutationFn: () => api.post('/floors', { branchId, ...floorForm }),
    onSuccess: () => { toast.success('Area created'); setShowAddFloor(false); setFloorForm({ name: '', nameAr: '', background: '#f5f5f4' }); refresh(); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const deleteFloorMut = useMutation({
    mutationFn: (id: number) => api.delete(`/floors/${id}`),
    onSuccess: () => { toast.success('Area removed'); setActiveFloorId(null); refresh(); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const createTableMut = useMutation({
    mutationFn: () => api.post('/tables', {
      branchId,
      floorId: activeFloor?.id,
      name: tableForm.name,
      seats: parseInt(tableForm.seats, 10) || 4,
      shape: tableForm.shape,
      posX: Math.random() * (CANVAS_W - 100) + 20,
      posY: Math.random() * (CANVAS_H - 100) + 20,
      width: tableForm.shape === 'RECTANGLE' ? 140 : 80,
      height: 80,
    }),
    onSuccess: () => { toast.success('Table added'); setShowAddTable(false); setTableForm({ name: '', seats: '4', shape: 'SQUARE' }); refresh(); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const updateTableMut = useMutation({
    mutationFn: (data: Partial<TableData> & { id: number }) => api.patch(`/tables/${data.id}`, data),
    onSuccess: () => { toast.success('Saved'); setEditTable(null); refresh(); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const deleteTableMut = useMutation({
    mutationFn: (id: number) => api.delete(`/tables/${id}`),
    onSuccess: () => { toast.success('Table removed'); setEditTable(null); refresh(); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const savePositions = useMutation({
    mutationFn: () => api.patch('/tables/bulk-positions', {
      tables: Object.entries(localPositions).map(([id, pos]) => ({ id: parseInt(id, 10), ...pos })),
    }),
    onSuccess: () => { toast.success('Layout saved'); setDirty(false); refresh(); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  // ---- Drag handling ----
  const onMouseDown = useCallback((e: React.MouseEvent, tableId: number) => {
    e.preventDefault();
    e.stopPropagation();
    const pos = localPositions[tableId];
    if (!pos) return;
    setDragging({ id: tableId, startX: e.clientX, startY: e.clientY, origX: pos.posX, origY: pos.posY });
  }, [localPositions]);

  const onResizeDown = useCallback((e: React.MouseEvent, tableId: number) => {
    e.preventDefault();
    e.stopPropagation();
    const pos = localPositions[tableId];
    if (!pos) return;
    setResizing({ id: tableId, startX: e.clientX, startY: e.clientY, origW: pos.width, origH: pos.height });
  }, [localPositions]);

  useEffect(() => {
    if (!dragging && !resizing) return;
    const onMove = (e: MouseEvent) => {
      if (dragging) {
        const dx = e.clientX - dragging.startX;
        const dy = e.clientY - dragging.startY;
        const newX = Math.max(0, Math.min(CANVAS_W - 40, dragging.origX + dx));
        const newY = Math.max(0, Math.min(CANVAS_H - 40, dragging.origY + dy));
        setLocalPositions((p) => ({ ...p, [dragging.id]: { ...p[dragging.id], posX: newX, posY: newY } }));
        setDirty(true);
      }
      if (resizing) {
        const dx = e.clientX - resizing.startX;
        const dy = e.clientY - resizing.startY;
        const newW = Math.max(40, resizing.origW + dx);
        const newH = Math.max(40, resizing.origH + dy);
        setLocalPositions((p) => ({ ...p, [resizing.id]: { ...p[resizing.id], width: newW, height: newH } }));
        setDirty(true);
      }
    };
    const onUp = () => { setDragging(null); setResizing(null); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [dragging, resizing]);

  // ---- Status colors ----
  const statusColor = (s: string) => {
    switch (s) {
      case 'OCCUPIED': return 'border-amber-400 bg-amber-50 dark:bg-amber-500/10';
      case 'BILL_REQUESTED': return 'border-red-400 bg-red-50 dark:bg-red-500/10';
      case 'RESERVED': return 'border-sky-400 bg-sky-50 dark:bg-sky-500/10';
      default: return 'border-emerald-400 bg-emerald-50 dark:bg-emerald-500/10';
    }
  };

  if (!branchId) return <div><PageHeader title={t('nav.tables')} /><p className="text-sm text-amber-600">Select a branch first.</p></div>;

  return (
    <div>
      <PageHeader title="Floor Plan Editor" subtitle={activeBranch?.name} />

      {isLoading ? <LoadingSpinner /> : (
        <>
          {/* Area / Floor tabs */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {floorList.map((f) => (
              <button
                key={f.id}
                onClick={() => setActiveFloorId(f.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeFloorId === f.id || (!activeFloorId && f.id === floorList[0]?.id)
                  ? 'bg-primary text-white shadow-sm' : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200'}`}
              >
                {f.name}
              </button>
            ))}
            <button onClick={() => setShowAddFloor(true)} className="px-3 py-2 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700 text-sm text-gray-500 hover:border-primary hover:text-primary">
              + New Area
            </button>
            {activeFloor && (
              <button onClick={() => { if (confirm(`Delete area "${activeFloor.name}"?`)) deleteFloorMut.mutate(activeFloor.id); }}
                className="ms-auto text-xs text-red-500 hover:text-red-700">Delete area</button>
            )}
          </div>

          {/* Toolbar */}
          {activeFloor && (
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <button onClick={() => setShowAddTable(true)} className="px-3 py-2 rounded-lg bg-primary text-white text-sm font-medium">
                + Add Table
              </button>
              {dirty && (
                <button onClick={() => savePositions.mutate()} disabled={savePositions.isPending}
                  className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium disabled:opacity-50 animate-pulse">
                  Save Layout
                </button>
              )}
              <span className="text-xs text-gray-400 ms-2">Drag tables to arrange. Drag corner to resize. Double-click to edit.</span>
            </div>
          )}

          {/* Canvas */}
          {activeFloor ? (
            <div
              ref={canvasRef}
              className="relative border-2 border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden select-none"
              style={{ width: CANVAS_W, height: CANVAS_H, background: activeFloor.background || '#f5f5f4' }}
            >
              {tables.map((tb) => {
                const isRound = tb.shape === 'ROUND';
                return (
                  <div
                    key={tb.id}
                    onMouseDown={(e) => onMouseDown(e, tb.id)}
                    onDoubleClick={() => setEditTable(tb)}
                    className={`absolute border-2 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing transition-shadow hover:shadow-lg ${statusColor(tb.status)} ${isRound ? 'rounded-full' : tb.shape === 'RECTANGLE' ? 'rounded-xl' : 'rounded-lg'}`}
                    style={{
                      left: tb.posX,
                      top: tb.posY,
                      width: tb.width,
                      height: tb.height,
                    }}
                  >
                    <span className="font-bold text-sm text-gray-800 dark:text-gray-100">{tb.name}</span>
                    <span className="text-[10px] text-gray-500">{tb.seats} seats</span>
                    {/* Resize handle */}
                    <div
                      onMouseDown={(e) => onResizeDown(e, tb.id)}
                      className="absolute bottom-0 right-0 w-4 h-4 bg-gray-400/50 hover:bg-primary/70 cursor-se-resize rounded-tl-md"
                      style={{ borderBottomRightRadius: isRound ? '50%' : undefined }}
                    />
                    {/* Chair indicators */}
                    {tb.seats <= 8 && (
                      <div className="absolute inset-0 pointer-events-none">
                        {Array.from({ length: Math.min(tb.seats, 8) }).map((_, i) => {
                          const angle = (360 / Math.min(tb.seats, 8)) * i - 90;
                          const rad = (angle * Math.PI) / 180;
                          const rx = tb.width / 2 + (tb.width / 2 + 6) * Math.cos(rad);
                          const ry = tb.height / 2 + (tb.height / 2 + 6) * Math.sin(rad);
                          return (
                            <div
                              key={i}
                              className="absolute w-3 h-3 rounded-full bg-gray-400/40 border border-gray-400/60"
                              style={{ left: rx - 6, top: ry - 6 }}
                            />
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
              {!tables.length && (
                <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
                  No tables in this area yet. Click "+ Add Table" to start.
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-16 text-gray-400">
              <p className="text-lg mb-2">No areas created yet</p>
              <p className="text-sm">Click "+ New Area" to create your first floor zone (Main Hall, Terrace, VIP, etc.)</p>
            </div>
          )}
        </>
      )}

      {/* Add Area modal */}
      <Modal open={showAddFloor} onClose={() => setShowAddFloor(false)} title="New Area / Zone" size="sm">
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-500">Name *</label>
            <input value={floorForm.name} onChange={(e) => setFloorForm({ ...floorForm, name: e.target.value })}
              placeholder="e.g. Main Hall, Terrace, VIP Room"
              className="w-full mt-1 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500">Name (Arabic)</label>
            <input value={floorForm.nameAr} onChange={(e) => setFloorForm({ ...floorForm, nameAr: e.target.value })} dir="rtl"
              className="w-full mt-1 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500">Background Color</label>
            <input type="color" value={floorForm.background} onChange={(e) => setFloorForm({ ...floorForm, background: e.target.value })}
              className="w-full mt-1 h-10 rounded-lg border border-gray-300 cursor-pointer" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setShowAddFloor(false)} className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-sm">Cancel</button>
            <button onClick={() => createFloorMut.mutate()} disabled={!floorForm.name || createFloorMut.isPending}
              className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium disabled:opacity-50">Create Area</button>
          </div>
        </div>
      </Modal>

      {/* Add Table modal */}
      <Modal open={showAddTable} onClose={() => setShowAddTable(false)} title="Add Table" size="sm">
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-500">Table Name *</label>
            <input value={tableForm.name} onChange={(e) => setTableForm({ ...tableForm, name: e.target.value })}
              placeholder="e.g. T1, Table 5, VIP-1"
              className="w-full mt-1 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500">Seats</label>
            <input type="number" min={1} max={20} value={tableForm.seats} onChange={(e) => setTableForm({ ...tableForm, seats: e.target.value })}
              className="w-full mt-1 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500">Shape</label>
            <div className="flex gap-2 mt-1">
              {SHAPES.map((s) => (
                <button key={s.value} onClick={() => setTableForm({ ...tableForm, shape: s.value })}
                  className={`flex-1 py-2 rounded-lg border text-center text-sm ${tableForm.shape === s.value ? 'border-primary bg-primary/10 font-medium' : 'border-gray-200 dark:border-gray-700'}`}>
                  {s.icon} {s.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setShowAddTable(false)} className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-sm">Cancel</button>
            <button onClick={() => createTableMut.mutate()} disabled={!tableForm.name || createTableMut.isPending}
              className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium disabled:opacity-50">Add Table</button>
          </div>
        </div>
      </Modal>

      {/* Edit Table modal */}
      <Modal open={!!editTable} onClose={() => setEditTable(null)} title={`Edit ${editTable?.name || 'Table'}`} size="sm">
        {editTable && (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-500">Name</label>
              <input value={editTable.name} onChange={(e) => setEditTable({ ...editTable, name: e.target.value })}
                className="w-full mt-1 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Seats (Chairs)</label>
              <input type="number" min={1} max={20} value={editTable.seats} onChange={(e) => setEditTable({ ...editTable, seats: parseInt(e.target.value) || 2 })}
                className="w-full mt-1 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Shape</label>
              <div className="flex gap-2 mt-1">
                {SHAPES.map((s) => (
                  <button key={s.value} onClick={() => setEditTable({ ...editTable, shape: s.value })}
                    className={`flex-1 py-2 rounded-lg border text-center text-sm ${editTable.shape === s.value ? 'border-primary bg-primary/10 font-medium' : 'border-gray-200 dark:border-gray-700'}`}>
                    {s.icon} {s.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-gray-500">Width</label>
                <input type="number" min={40} max={300} value={editTable.width} onChange={(e) => setEditTable({ ...editTable, width: parseInt(e.target.value) || 80 })}
                  className="w-full mt-1 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Height</label>
                <input type="number" min={40} max={300} value={editTable.height} onChange={(e) => setEditTable({ ...editTable, height: parseInt(e.target.value) || 80 })}
                  className="w-full mt-1 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-800">
              <button onClick={() => { if (confirm('Delete this table?')) deleteTableMut.mutate(editTable.id); }}
                className="px-3 py-2 rounded-lg text-red-600 text-sm hover:bg-red-50">Delete Table</button>
              <div className="flex gap-2">
                <button onClick={() => setEditTable(null)} className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-sm">Cancel</button>
                <button onClick={() => updateTableMut.mutate({ id: editTable.id, name: editTable.name, seats: editTable.seats, shape: editTable.shape, width: editTable.width, height: editTable.height })}
                  disabled={updateTableMut.isPending}
                  className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium disabled:opacity-50">Save</button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
