import { useEffect, useRef, useState } from 'react';

export interface Option {
  id: number;
  name: string;
  group?: string;
}

interface Props {
  options: Option[];
  value: number[];
  onChange: (ids: number[]) => void;
  placeholder?: string;
  className?: string;
}

/** Chip-based multi-select dropdown. Options come from DB-backed lists. */
export default function MultiSelect({ options, value, onChange, placeholder = 'Избери…', className }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const selected = options.filter((o) => value.includes(o.id));
  const toggle = (id: number) =>
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);

  // group options if any group present
  const groups = Array.from(new Set(options.map((o) => o.group).filter(Boolean))) as string[];

  return (
    <div className={`relative ${className ?? ''}`} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full min-h-[38px] rounded-xl border border-pine-200 bg-white px-2 py-1.5 text-left text-sm flex flex-wrap gap-1 items-center hover:border-pine-300 focus:ring-2 focus:ring-pine-200/60"
      >
        {selected.length === 0 && <span className="text-pine-400 px-1">{placeholder}</span>}
        {selected.map((o) => (
          <span key={o.id} className="chip bg-pine-100 text-pine-700">
            {o.name}
            <span
              role="button"
              onClick={(e) => {
                e.stopPropagation();
                toggle(o.id);
              }}
              className="ml-0.5 text-pine-500 hover:text-terracotta-500 cursor-pointer"
            >
              ×
            </span>
          </span>
        ))}
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-full max-h-64 overflow-auto rounded-xl border border-pine-200 bg-white shadow-lg p-1">
          {options.length === 0 && <div className="px-3 py-2 text-sm text-pine-400">Няма опции</div>}
          {groups.length > 0
            ? groups.map((g) => (
                <div key={g}>
                  <div className="px-2 pt-2 pb-1 text-[11px] font-bold uppercase tracking-wide text-pine-400">
                    {g}
                  </div>
                  {options
                    .filter((o) => o.group === g)
                    .map((o) => (
                      <Row key={o.id} o={o} checked={value.includes(o.id)} onClick={() => toggle(o.id)} />
                    ))}
                </div>
              ))
            : options.map((o) => (
                <Row key={o.id} o={o} checked={value.includes(o.id)} onClick={() => toggle(o.id)} />
              ))}
        </div>
      )}
    </div>
  );
}

function Row({ o, checked, onClick }: { o: Option; checked: boolean; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer text-sm ${
        checked ? 'bg-pine-50 text-pine-800 font-semibold' : 'hover:bg-stone-100 text-pine-700'
      }`}
    >
      <span
        className={`inline-grid place-items-center w-4 h-4 rounded border ${
          checked ? 'bg-pine-600 border-pine-600 text-white' : 'border-pine-300'
        }`}
      >
        {checked ? '✓' : ''}
      </span>
      {o.name}
    </div>
  );
}
