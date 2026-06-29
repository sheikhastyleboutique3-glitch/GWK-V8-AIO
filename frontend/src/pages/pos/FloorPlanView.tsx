import React, { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import { usePrompt } from '../../lib/usePrompt';

interface FloorTable {
  id: number;
  name: string;
  seats: number;
  shape: string;
  posX: number;
  posY: number;
  width: number;
  height: number;
  status?: string;
  isActive: boolean;
}

interface Floor {
  id: number;
  name: string;
  background?: string;
  tables?: FloorTable[];
}

interface FloorPlanViewProps {
  branchId: number | undefined;
  pendingBills: any[];
  canEditFloor: boolean;
  onOpenTable: (table: FloorTable) => void;
  onNewOrder: () => void;
}

const FloorPlanView = React.memo(function FloorPlanView({
  branchId,
  pendingBills,
  canEditFloor,
  onOpenTable,
  onNewOrder,
}: FloorPlanViewProps) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [prompt, PromptDialog] = usePrompt();

  // Floor plan edit mode
  const [floorEditMode, setFloorEditMode] = useState(false);
  const [floorDragging, setFloorDragging] = useState<{ id: number; startX: number; startY: number; origX: number; origY: number } | null>(null);
  const [floorResizing, setFloorResizing] = useState<{ id: number; startX: number; startY: number; origW: number; origH: number } | null>(null);
  const [floorLocalPos, setFloorLocalPos] = useState<Record<number, { posX: number; posY: number; width: number; height: number }>>({});
  const [floorDirty, setFloorDirty] = useState(false);
  const [activeFloorIdx, setActiveFloorIdx] = useState(0);

  // Floor plan data
  const { data: floors } = useQuery({
    queryKey: ['pos-floors', branchId],
    queryFn: () => api.get('/floors', { params: { branchId } }).then((r) => r.data.data),
    enabled: !!branchId,
    refetchInterval: 60_000,
  });

  const activeFloor: Floor | null = (floors || [])[activeFloorIdx] || null;

  // Sync local positions when floor changes
  useMemo(() => {
    if (!activeFloor) return;
    const pos: Record<number, { posX: number; posY: number; width: number; height: number }> = {};
    (activeFloor.tables || []).filter((t) => t.isActive).forEach((t) => {
      if (!floorLocalPos[t.id]) pos[t.id] = { posX: t.posX, posY: t.posY, width: t.width, height: t.height };
    });
    if (Object.keys(pos).length) setFloorLocalPos((prev) => ({ ...prev, ...pos }));
  }, [activeFloor?.id, activeFloor?.tables?.length]);

  const handleFloorDrag = useCallback((e: React.MouseEvent) => {
    if (floorDragging) {
      const dx = e.clientX - floorDragging.startX;
      const dy = e.clientY - floorDragging.startY;
      setFloorLocalPos((p) => ({ ...p, [floorDragging.id]: { ...p[floorDragging.id], posX: Math.max(0, floorDragging.origX + dx), posY: Math.max(0, floorDragging.origY + dy) } }));
      setFloorDirty(true);
    }
    if (floorResizing) {
      const dx = e.clientX - floorResizing.startX;
      const dy = e.clientY - floorResizing.startY;
      setFloorLocalPos((p) => ({ ...p, [floorResizing.id]: { ...p[floorResizing.id], width: Math.max(50, floorResizing.origW + dx), height: Math.max(50, floorResizing.origH + dy) } }));
      setFloorDirty(true);
    }
  }, [floorDragging, floorResizing]);

  const handleFloorDragEnd = useCallback(() => {
    setFloorDragging(null);
    setFloorResizing(null);
  }, []);

  const saveLayout = useCallback(() => {
    api.patch('/tables/bulk-positions', { tables: Object.entries(floorLocalPos).map(([id, p]) => ({ id: parseInt(id), ...p })) })
      .then(() => { toast.success('Layout saved'); setFloorDirty(false); qc.invalidateQueries({ queryKey: ['pos-floors'] }); });
  }, [floorLocalPos, qc]);

  const addArea = useCallback(async () => {
    const name = await prompt({ title: 'New area name', placeholder: 'e.g. Terrace' });
    if (name?.trim()) {
      api.post('/floors', { branchId, name: name.trim(), background: '#e9d5ff' }).then(() => {
        toast.success('Area created');
        qc.invalidateQueries({ queryKey: ['pos-floors'] });
      });
    }
  }, [branchId, prompt, qc]);

  const addTable = useCallback(async () => {
    if (!activeFloor) return;
    const name = await prompt({ title: 'New table name', defaultValue: `T${(activeFloor.tables?.length || 0) + 1}` });
    if (name?.trim()) {
      const seatsStr = await prompt({ title: 'Seats', defaultValue: '4', type: 'number' });
      const seats = parseInt(seatsStr || '4', 10);
      api.post('/tables', {
        branchId, floorId: activeFloor.id, name: name.trim(), seats,
        shape: 'SQUARE', posX: 50 + Math.random() * 300, posY: 50 + Math.random() * 200, width: 90, height: 90,
      }).then(() => { toast.success('Table added'); qc.invalidateQueries({ queryKey: ['pos-floors'] }); });
    }
  }, [activeFloor, branchId, prompt, qc]);

  const editTable = useCallback(async (table: FloorTable) => {
    const name = await prompt({ title: 'Edit Table', defaultValue: table.name, placeholder: 'Table name' });
    if (name === null) return;
    const seatsStr = await prompt({ title: 'Seats', defaultValue: String(table.seats), type: 'number' });
    if (seatsStr === null) return;
    const seats = parseInt(seatsStr, 10) || table.seats;
    const shape = await prompt({ title: 'Shape', defaultValue: table.shape || 'SQUARE', type: 'select', options: [{ value: 'SQUARE', label: 'Square' }, { value: 'ROUND', label: 'Round' }, { value: 'RECTANGLE', label: 'Rectangle' }] });
    if (shape === null) return;
    api.patch(`/tables/${table.id}`, { name: name || table.name, seats, shape }).then(() => { toast.success('Table updated'); qc.invalidateQueries({ queryKey: ['pos-floors'] }); });
  }, [prompt, qc]);

  return (
    <div className="flex-1 overflow-hidden p-4 flex flex-col">
      {/* Floor tabs + edit toggle */}
      <div className="flex items-center gap-2 mb-4">
        {(floors || []).map((f: Floor, idx: number) => (
          <button key={f.id} onClick={() => setActiveFloorIdx(idx)}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${activeFloorIdx === idx ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-800'}`}>
            {f.name}
          </button>
        ))}
        {floorEditMode && (
          <>
            <button onClick={addArea} className="px-3 py-2 rounded-lg border-2 border-dashed border-gray-300 text-xs text-gray-500">+ Area</button>
            <button onClick={addTable} className="px-3 py-2 rounded-lg bg-primary text-white text-xs font-medium">+ Table</button>
            <input
              type="color"
              value={activeFloor?.background || '#e9d5ff'}
              onChange={(e) => {
                if (activeFloor) {
                  api.patch(`/floors/${activeFloor.id}`, { background: e.target.value }).then(() => qc.invalidateQueries({ queryKey: ['pos-floors'] }));
                }
              }}
              title="Floor background color"
              className="w-9 h-9 rounded-lg border border-gray-300 dark:border-gray-700 cursor-pointer"
            />
          </>
        )}
        {canEditFloor && (
          <button onClick={() => setFloorEditMode(!floorEditMode)}
            className={`ms-auto w-9 h-9 rounded-lg flex items-center justify-center text-lg transition ${floorEditMode ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200'}`}
            title={floorEditMode ? 'Exit edit mode' : 'Edit floor plan'}>
            ✏️
          </button>
        )}
      </div>

      {/* Floor canvas with positioned tables */}
      {activeFloor ? (
        <div className="relative rounded-2xl overflow-hidden border-2 border-gray-200 dark:border-gray-700 w-full flex-1"
          style={{ background: activeFloor.background || '#f5f5f4' }}
          onMouseMove={floorEditMode ? handleFloorDrag : undefined}
          onMouseUp={floorEditMode ? handleFloorDragEnd : undefined}
          onMouseLeave={floorEditMode ? handleFloorDragEnd : undefined}
          onTouchMove={floorEditMode ? (e) => { const t = e.touches[0]; handleFloorDrag({ clientX: t.clientX, clientY: t.clientY } as any); } : undefined}
          onTouchEnd={floorEditMode ? handleFloorDragEnd : undefined}>
          {(activeFloor.tables || []).filter((t) => t.isActive).map((table) => {
            const tableOrders = (pendingBills || []).filter((o: any) => o.tableName === table.name);
            const hasOrder = tableOrders.length > 0;
            const isOccupied = table.status === 'OCCUPIED' || hasOrder;
            const isRound = table.shape === 'ROUND';
            const bgColor = isOccupied ? 'bg-red-400/80' : 'bg-emerald-400/80';
            const pos = floorLocalPos[table.id] || { posX: table.posX, posY: table.posY, width: table.width, height: table.height };
            return (
              <div
                key={table.id}
                onMouseDown={floorEditMode ? (e) => { e.preventDefault(); setFloorDragging({ id: table.id, startX: e.clientX, startY: e.clientY, origX: pos.posX, origY: pos.posY }); } : undefined}
                onTouchStart={floorEditMode ? (e) => { const t = e.touches[0]; setFloorDragging({ id: table.id, startX: t.clientX, startY: t.clientY, origX: pos.posX, origY: pos.posY }); } : undefined}
                onClick={!floorEditMode ? () => onOpenTable(table) : () => editTable(table)}
                className={`absolute flex flex-col items-center justify-center text-white font-bold shadow-lg transition-transform ${!floorEditMode ? 'cursor-pointer hover:scale-105' : 'cursor-grab active:cursor-grabbing'} ${bgColor} ${isRound ? 'rounded-full' : 'rounded-xl'}`}
                style={{ left: pos.posX, top: pos.posY, width: pos.width, height: pos.height }}
              >
                <span className="text-sm">{table.name}</span>
                <span className="text-[10px] opacity-80">{table.seats} 👤</span>
                {tableOrders.length > 1 && <span className="absolute top-1 right-1 min-w-[18px] h-[18px] bg-white rounded-full flex items-center justify-center text-[9px] font-bold text-gray-900">{tableOrders.length}</span>}
                {tableOrders.length === 1 && <span className="absolute top-1 right-1 w-3 h-3 bg-white rounded-full flex items-center justify-center text-[8px] text-gray-900">✓</span>}
                {/* Resize handle in edit mode */}
                {floorEditMode && (
                  <div
                    onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setFloorResizing({ id: table.id, startX: e.clientX, startY: e.clientY, origW: pos.width, origH: pos.height }); }}
                    className="absolute bottom-0 right-0 w-4 h-4 bg-white/50 hover:bg-white/80 cursor-se-resize rounded-tl"
                  />
                )}
              </div>
            );
          })}
          {!(activeFloor.tables || []).filter((t) => t.isActive).length && (
            <div className="absolute inset-0 flex items-center justify-center text-white/70 text-sm">
              {floorEditMode ? 'Click "+ Table" to add tables' : 'No tables. Click ✏️ to enter edit mode.'}
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-16 text-gray-400">
          <p>No floor plan. Click ✏️ then "+ Area" to create one.</p>
        </div>
      )}
      {floorEditMode && floorDirty && (
        <button onClick={saveLayout} className="mt-3 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium animate-pulse">
          Save Layout
        </button>
      )}
      {/* New Order button (for non-table orders like takeaway) */}
      {!floorEditMode && (
        <div className="mt-4">
          <button onClick={onNewOrder} className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium">
            + New Order (no table)
          </button>
        </div>
      )}
      <PromptDialog />
    </div>
  );
});

export default FloorPlanView;
