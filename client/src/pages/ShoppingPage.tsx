import { useEffect, useRef, useState } from 'react';
import { api, type ShoppingItem, type ShopCategory, type ShopStatus, type Trip } from '../api';
import { useStore } from '../store';
import { PageHeader, Spinner, NoTrip } from '../components/ui';
import { SHOP_CATEGORY_LABEL, SHOP_STATUS_LABEL } from '../constants';

const CATS: ShopCategory[] = ['fruit_veg', 'other_food', 'consumables'];
const CAT_EMOJI: Record<ShopCategory, string> = { fruit_veg: '🥕', other_food: '🥫', consumables: '🧻' };

const STATUS_STYLE: Record<ShopStatus, string> = {
  active: '',
  taken: 'line-through text-pine-400',
  discuss: 'text-sand-700',
};
const STATUS_NEXT: Record<ShopStatus, ShopStatus> = { active: 'taken', taken: 'discuss', discuss: 'active' };
const STATUS_DOT: Record<ShopStatus, string> = {
  active: 'bg-white border-pine-300',
  taken: 'bg-pine-500 border-pine-500',
  discuss: 'bg-sand-400 border-sand-400',
};

export default function ShoppingPage() {
  const { currentTrip, trips } = useStore();
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!currentTrip) return;
    setLoading(true);
    setItems(await api.getShopping(currentTrip.id));
    setLoading(false);
  };
  useEffect(() => {
    load(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrip?.id]);

  if (!currentTrip) return <NoTrip />;

  const patch = async (id: number, data: Partial<ShoppingItem>) => {
    const saved = await api.updateShopping(id, data);
    setItems((list) => list.map((x) => (x.id === id ? saved : x)));
  };
  const remove = async (id: number) => {
    await api.deleteShopping(id);
    setItems((list) => list.filter((x) => x.id !== id));
  };
  const add = async (category: ShopCategory, name: string) => {
    const created = await api.addShopping(currentTrip.id, { category, name });
    setItems((list) => [...list, created]);
  };

  const importFrom = async (fromTripId: number) => {
    const res = await api.importShopping(currentTrip.id, fromTripId);
    setItems(res.items);
    return res;
  };

  return (
    <div>
      <PageHeader
        title="Пазар"
        emoji="🛒"
        subtitle={currentTrip.name}
        actions={
          <ImportMenu
            trips={trips.filter((t) => t.id !== currentTrip.id)}
            onImport={importFrom}
          />
        }
      />
      <div className="flex flex-wrap gap-3 mb-4 text-xs text-pine-500">
        <Legend dot="taken" /> <Legend dot="discuss" /> <Legend dot="active" />
      </div>
      {loading ? (
        <Spinner />
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {CATS.map((cat) => (
            <div key={cat} className="card">
              <h3 className="font-display font-bold text-pine-800 mb-3 flex items-center gap-2">
                <span>{CAT_EMOJI[cat]}</span> {SHOP_CATEGORY_LABEL[cat]}
              </h3>
              <ul className="space-y-1">
                {items
                  .filter((i) => i.category === cat)
                  .map((i) => (
                    <li key={i.id} className="group flex items-center gap-2">
                      <button
                        title="Смени статус"
                        onClick={() => patch(i.id, { status: STATUS_NEXT[i.status] })}
                        className={`shrink-0 w-4 h-4 rounded-full border ${STATUS_DOT[i.status]}`}
                      />
                      <input
                        className={`flex-1 bg-transparent text-sm outline-none focus:bg-stone-100 rounded px-1 py-0.5 ${STATUS_STYLE[i.status]}`}
                        defaultValue={i.name}
                        onBlur={(e) => e.target.value.trim() && e.target.value !== i.name && patch(i.id, { name: e.target.value.trim() })}
                      />
                      <button
                        onClick={() => remove(i.id)}
                        className="opacity-0 group-hover:opacity-100 text-pine-300 hover:text-terracotta-500 text-xs px-1"
                      >
                        ✕
                      </button>
                    </li>
                  ))}
              </ul>
              <AddItem onAdd={(name) => add(cat, name)} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Legend({ dot }: { dot: ShopStatus }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`w-3 h-3 rounded-full border ${STATUS_DOT[dot]}`} /> {SHOP_STATUS_LABEL[dot]}
    </span>
  );
}

function AddItem({ onAdd }: { onAdd: (name: string) => void }) {
  const [name, setName] = useState('');
  const submit = () => {
    if (name.trim()) {
      onAdd(name.trim());
      setName('');
    }
  };
  return (
    <div className="flex gap-1 mt-3 pt-3 border-t border-pine-100">
      <input
        className="input py-1.5"
        placeholder="Добави…"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
      />
      <button className="btn-ghost px-3" onClick={submit}>
        +
      </button>
    </div>
  );
}

function ImportMenu({
  trips,
  onImport,
}: {
  trips: Trip[];
  onImport: (fromTripId: number) => Promise<{ imported: number; skipped: number }>;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const pick = async (id: number) => {
    setBusy(true);
    setResult(null);
    try {
      const r = await onImport(id);
      setResult(`Добавени ${r.imported}${r.skipped ? `, пропуснати ${r.skipped} (вече ги има)` : ''}`);
    } catch (e: any) {
      setResult(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button className="btn-ghost" onClick={() => setOpen((o) => !o)} disabled={trips.length === 0}>
        📥 Импортирай списък
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-1 w-64 card p-2 shadow-lg">
          <div className="text-xs font-semibold uppercase tracking-wide text-pine-500 px-2 py-1">
            Копирай от пътуване
          </div>
          {trips.length === 0 && <div className="text-sm text-pine-400 px-2 py-2">Няма други пътувания</div>}
          <div className="max-h-56 overflow-auto">
            {trips.map((t) => (
              <button
                key={t.id}
                disabled={busy}
                onClick={() => pick(t.id)}
                className="block w-full text-left text-sm px-2 py-1.5 rounded-lg hover:bg-pine-50 disabled:opacity-50"
              >
                {t.name}
                {t.date_start && <span className="text-pine-400 text-xs"> · {t.date_start}</span>}
              </button>
            ))}
          </div>
          {result && (
            <div className="text-xs text-pine-600 bg-pine-50 rounded-lg px-2 py-1.5 mt-1">{result}</div>
          )}
        </div>
      )}
    </div>
  );
}
