import { useState } from 'react';
import { api, type ListItem } from '../api';
import { useStore } from '../store';
import { PageHeader } from '../components/ui';
import { DRINK_CATEGORY_LABEL, GEAR_CATEGORY_LABEL } from '../constants';

type Tab = {
  key: string; // api list key
  label: string;
  emoji: string;
  items: () => ListItem[];
  categories?: { value: string; label: string }[];
  hasUrl?: boolean;
  hasNote?: boolean;
};

export default function ListsPage() {
  const { lists, refreshLists } = useStore();

  const tabs: Tab[] = [
    { key: 'people', label: 'Хора', emoji: '👥', items: () => lists.people },
    { key: 'meats', label: 'Месо', emoji: '🍖', items: () => lists.meats },
    {
      key: 'drinks',
      label: 'Напитки',
      emoji: '🍹',
      items: () => lists.drinks,
      categories: (['alcohol', 'carbonated', 'noncarbonated'] as const).map((c) => ({
        value: c,
        label: DRINK_CATEGORY_LABEL[c],
      })),
    },
    { key: 'locations', label: 'Места', emoji: '📍', items: () => lists.locations, hasUrl: true },
    { key: 'bring-items', label: 'Носим', emoji: '🎒', items: () => lists.bringItems },
    {
      key: 'gear-items',
      label: 'Необходимо',
      emoji: '🧭',
      items: () => lists.gearItems,
      hasNote: true,
      categories: (['mandatory', 'recommended', 'optional'] as const).map((c) => ({
        value: c,
        label: GEAR_CATEGORY_LABEL[c],
      })),
    },
  ];

  const [active, setActive] = useState(tabs[0].key);
  const tab = tabs.find((t) => t.key === active)!;

  return (
    <div>
      <PageHeader title="Списъци" emoji="⚙️" subtitle="Динамичните списъци, които захранват всички падащи менюта." />

      <div className="flex flex-wrap gap-1 mb-5 bg-stone-100 p-1 rounded-xl w-fit">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActive(t.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${
              active === t.key ? 'bg-white text-pine-700 shadow-sm' : 'text-pine-500 hover:text-pine-700'
            }`}
          >
            {t.emoji} {t.label}
          </button>
        ))}
      </div>

      {/* key={active} remounts the editor per tab so add-form state (incl. the
          category dropdown) resets and uncontrolled inputs get fresh values. */}
      <ListEditor key={active} tab={tab} refresh={refreshLists} />
    </div>
  );
}

function ListEditor({ tab, refresh }: { tab: Tab; refresh: () => Promise<void> }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState(tab.categories?.[0]?.value ?? '');
  const [url, setUrl] = useState('');
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');

  const add = async () => {
    if (!name.trim()) return;
    setErr('');
    try {
      await api.createListItem(tab.key, {
        name: name.trim(),
        ...(tab.categories ? { category } : {}),
        ...(tab.hasUrl ? { url } : {}),
        ...(tab.hasNote ? { note } : {}),
      });
      setName('');
      setUrl('');
      setNote('');
      await refresh();
    } catch (e: any) {
      setErr(e.message);
    }
  };

  const update = async (id: number, data: Partial<ListItem>) => {
    await api.updateListItem(tab.key, id, data);
    await refresh();
  };
  const remove = async (id: number) => {
    if (!confirm('Изтриване? Това ще премахне записа и свързаните избори.')) return;
    await api.deleteListItem(tab.key, id);
    await refresh();
  };

  const items = tab.items();
  const grouped = tab.categories
    ? tab.categories.map((c) => ({ cat: c, rows: items.filter((i) => i.category === c.value) }))
    : [{ cat: null, rows: items }];

  return (
    <div className="card max-w-2xl">
      {/* add row */}
      <div className="flex flex-wrap gap-2 items-end pb-4 mb-4 border-b border-pine-100">
        <div className="flex-1 min-w-[140px]">
          <input
            className="input"
            placeholder="Нов запис…"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
          />
        </div>
        {tab.categories && (
          <select className="input w-auto" value={category} onChange={(e) => setCategory(e.target.value)}>
            {tab.categories.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        )}
        {tab.hasUrl && (
          <input className="input w-40" placeholder="Линк (по избор)" value={url} onChange={(e) => setUrl(e.target.value)} />
        )}
        {tab.hasNote && (
          <input className="input w-40" placeholder="Бележка" value={note} onChange={(e) => setNote(e.target.value)} />
        )}
        <button className="btn-primary" onClick={add}>
          + Добави
        </button>
      </div>
      {err && <div className="text-terracotta-600 text-sm mb-3">{err}</div>}

      {grouped.map(({ cat, rows }) => (
        <div key={cat?.value ?? 'all'} className="mb-4 last:mb-0">
          {cat && (
            <div className="text-xs font-bold uppercase tracking-wide text-pine-400 mb-2">{cat.label}</div>
          )}
          <ul className="space-y-1">
            {rows.map((it) => (
              <li key={it.id} className="group flex items-center gap-2">
                <input
                  className="flex-1 bg-transparent text-sm outline-none focus:bg-stone-100 rounded px-2 py-1"
                  defaultValue={it.name}
                  onBlur={(e) => e.target.value.trim() && e.target.value !== it.name && update(it.id, { name: e.target.value.trim() })}
                />
                {tab.hasNote && (
                  <input
                    className="w-40 bg-transparent text-sm text-pine-500 outline-none focus:bg-stone-100 rounded px-2 py-1"
                    defaultValue={it.note ?? ''}
                    placeholder="бележка"
                    onBlur={(e) => e.target.value !== (it.note ?? '') && update(it.id, { note: e.target.value })}
                  />
                )}
                <button
                  onClick={() => remove(it.id)}
                  className="opacity-0 group-hover:opacity-100 text-pine-300 hover:text-terracotta-500 text-sm px-1"
                >
                  ✕
                </button>
              </li>
            ))}
            {rows.length === 0 && <li className="text-sm text-pine-400 px-2">— празно —</li>}
          </ul>
        </div>
      ))}
    </div>
  );
}
