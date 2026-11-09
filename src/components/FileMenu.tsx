import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

export interface FileMenuItem {
  separator?: boolean;
  label?: string;
  icon?: React.ReactNode;
  shortcut?: string; // affichage, p. ex. « Ctrl+Maj+S »
  key?: string; // touche (minuscule) du raccourci
  shift?: boolean;
  onSelect?: () => void;
}

/** Menu déroulant « Fichier » (style barre de menu) avec raccourcis clavier globaux. */
export function FileMenu({ items }: { items: FileMenuItem[] }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const actionable = items.map((it, i) => (it.separator ? -1 : i)).filter(i => i >= 0);

  // Raccourcis globaux : preventDefault pour éviter l'action du navigateur
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
      const k = e.key.toLowerCase();
      const it = items.find(x => !x.separator && x.key === k && !!x.shift === e.shiftKey);
      if (it) { e.preventDefault(); setOpen(false); it.onSelect?.(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [items]);

  // Fermeture : clic extérieur
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!rootRef.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const run = (it: FileMenuItem) => { if (!it.separator) { setOpen(false); it.onSelect?.(); } };

  const onMenuKey = (e: React.KeyboardEvent) => {
    const pos = actionable.indexOf(active);
    if (e.key === 'Escape') { e.preventDefault(); setOpen(false); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setActive(actionable[(pos + 1) % actionable.length]); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(actionable[(pos - 1 + actionable.length) % actionable.length]); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); run(items[active]); }
  };

  return (
    <div ref={rootRef} className="relative" onKeyDown={onMenuKey}>
      <button
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => { setActive(actionable[0]); setOpen(o => !o); }}
        className={`flex items-center gap-1 px-3 py-2 rounded-xl border transition-colors ${open ? 'bg-slate-700 border-slate-600 text-white' : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'}`}
        title="Menu Fichier"
      >
        <span>Fichier</span><ChevronDown size={12} />
      </button>
      {open && (
        <div role="menu" aria-label="Fichier" className="absolute right-0 top-full mt-1 z-50 min-w-[17rem] bg-slate-800 border border-slate-600 rounded-xl shadow-2xl py-1 text-slate-100">
          {items.map((it, i) => it.separator ? (
            <div key={`sep${i}`} role="separator" className="my-1 border-t border-slate-600" />
          ) : (
            <button
              key={it.label}
              role="menuitem"
              autoFocus={i === active}
              onMouseEnter={() => setActive(i)}
              onClick={() => run(it)}
              className={`w-full flex items-center gap-3 px-3 py-2 text-left text-xs font-semibold ${i === active ? 'bg-blue-600 text-white' : 'hover:bg-slate-700'}`}
            >
              <span className="w-4 flex justify-center">{it.icon}</span>
              <span className="flex-1">{it.label}</span>
              <span className="font-mono text-[10px] opacity-70">{it.shortcut}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
