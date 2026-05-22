import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

const STORAGE_PREFIX = 'dt_';

function loadState(key) {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveState(key, state) {
  try { localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(state)); } catch {}
}

function getSortValue(item, col) {
  if (col.sortKey) return item[col.sortKey];
  if (item[col.key] != null) return item[col.key];
  if (col.render) {
    const v = col.render(item);
    if (typeof v === 'string') return v;
    if (v?.props?.children) return String(v.props.children);
  }
  return '';
}

export default function DynamicTable({ columns: rawColumns, data, storageKey, emptyMessage, loading, loadingRows = 5 }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const menuRef = useRef(null);

  const saved = storageKey ? loadState(storageKey) : null;

  const [colState, setColState] = useState(() => {
    if (saved) return saved;
    return rawColumns.map(c => ({
      key: c.key,
      visible: c.defaultVisible !== false,
      width: c.defaultWidth || 150,
    }));
  });

  useEffect(() => {
    if (storageKey) saveState(storageKey, colState);
  }, [colState, storageKey]);

  useEffect(() => {
    const handler = (e) => {
      if (menuOpen && menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const visibleColumns = rawColumns.filter(c => {
    const st = colState.find(s => s.key === c.key);
    return st ? st.visible : true;
  });

  const colWidth = (key) => {
    const st = colState.find(s => s.key === key);
    return st ? st.width : 150;
  };

  const toggleCol = (key) => {
    setColState(prev => prev.map(s => s.key === key ? { ...s, visible: !s.visible } : s));
  };

  const handleSort = (key) => {
    setSortKey(prev => {
      if (prev === key) {
        setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        return key;
      }
      setSortDir('asc');
      return key;
    });
  };

  const sorted = useMemo(() => {
    if (!sortKey || !data.length) return data;
    const col = rawColumns.find(c => c.key === sortKey);
    if (!col || col.sortable === false) return data;
    const sortedData = [...data];
    sortedData.sort((a, b) => {
      const va = getSortValue(a, col);
      const vb = getSortValue(b, col);
      if (va == null) return 1;
      if (vb == null) return -1;
      const cmp = String(va).localeCompare(String(vb), 'es', { sensitivity: 'base' });
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return sortedData;
  }, [data, sortKey, sortDir, rawColumns]);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
      <div className="flex justify-end px-4 pt-3 pb-0 relative" ref={menuRef}>
        <button onClick={() => setMenuOpen(!menuOpen)}
          className="flex items-center gap-1.5 text-xs text-slate-500 bg-transparent border border-slate-200 rounded-md px-2.5 py-1.5 cursor-pointer hover:bg-slate-50 transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>
          Columnas
        </button>
        {menuOpen && (
          <div className="absolute right-4 top-11 z-30 bg-white border border-slate-200 rounded-lg shadow-lg p-2 min-w-[180px]">
            {rawColumns.map(c => (
              <label key={c.key} className="flex items-center gap-2 px-2.5 py-1.5 text-sm text-slate-700 hover:bg-slate-50 rounded cursor-pointer whitespace-nowrap">
                <input type="checkbox" checked={colState.find(s => s.key === c.key)?.visible !== false}
                  onChange={() => toggleCol(c.key)}
                  className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                {c.label}
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
          <thead>
            <tr className="bg-slate-50">
              {visibleColumns.map(c => (
                <ResizableTh key={c.key} label={c.label} width={colWidth(c.key)}
                  sortable={c.sortable !== false}
                  sortKey={c.key} activeSort={sortKey} sortDir={sortDir}
                  onSort={handleSort}
                  onResize={(w) => setColState(prev => prev.map(s => s.key === c.key ? { ...s, width: Math.max(60, w) } : s))} />
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && Array.from({ length: loadingRows }).map((_, i) => (
              <tr key={i} className="border-t border-slate-100">
                {visibleColumns.map(c => (
                  <td key={c.key} className="px-4 py-3">
                    <div className="h-4 bg-slate-100 rounded animate-pulse" />
                  </td>
                ))}
              </tr>
            ))}
            {!loading && sorted.length === 0 && (
              <tr>
                <td colSpan={visibleColumns.length} className="px-4 py-12 text-center text-slate-400 text-sm">
                  {emptyMessage || 'No hay datos'}
                </td>
              </tr>
            )}
            {!loading && sorted.length > 0 && sorted.map((item, i) => (
              <tr key={item._key || i} className="border-t border-slate-100 transition-colors hover:bg-slate-50">
                {visibleColumns.map(c => (
                  <td key={c.key} className={`px-4 py-3 text-sm truncate ${c.cellClass || 'text-slate-700'}`}
                    style={{ width: colWidth(c.key), minWidth: colWidth(c.key), maxWidth: colWidth(c.key) }}>
                    {c.render ? c.render(item) : (item[c.key] != null ? String(item[c.key]) : '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ResizableTh({ label, width, onResize, sortable, sortKey, activeSort, sortDir, onSort }) {
  const dragging = useRef(false);

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    dragging.current = true;
    const startX = e.clientX;
    const startW = width;

    const onMove = (ev) => {
      if (!dragging.current) return;
      const newW = startW + (ev.clientX - startX);
      if (newW >= 60) onResize(newW);
    };

    const onUp = () => {
      dragging.current = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [width, onResize]);

  const isActive = sortKey === activeSort;

  return (
    <th className={`text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 relative select-none ${sortable ? 'cursor-pointer hover:text-slate-700' : ''}`}
      style={{ width, minWidth: width, maxWidth: width }}
      onClick={sortable ? () => onSort(sortKey) : undefined}>
      <span className="truncate block">
        {label}
        {isActive && (
          <svg className="inline-block ml-1 -mt-0.5" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            {sortDir === 'asc' ? (
              <polyline points="18 15 12 9 6 15" />
            ) : (
              <polyline points="6 9 12 15 18 9" />
            )}
          </svg>
        )}
      </span>
      <div onMouseDown={handleMouseDown}
        className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-indigo-400/30 active:bg-indigo-500/50 z-10" />
    </th>
  );
}
