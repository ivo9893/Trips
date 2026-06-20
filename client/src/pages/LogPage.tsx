import { useEffect, useState } from 'react';
import { api, type LogEntry } from '../api';
import { PageHeader, Spinner } from '../components/ui';

const METHOD_ICON: Record<string, string> = {
  POST: '➕',
  PUT: '✏️',
  PATCH: '✏️',
  DELETE: '🗑️',
  EVENT: '🔑',
};

export default function LogPage() {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setEntries(await api.getLog());
    setLoading(false);
  };
  useEffect(() => {
    load();
  }, []);

  const clear = async () => {
    if (!confirm('Изтриване на целия дневник? Това действие е необратимо.')) return;
    await api.clearLog();
    await load();
  };

  // group entries by day
  const groups: { day: string; items: LogEntry[] }[] = [];
  for (const e of entries) {
    const day = dayLabel(e.at);
    const last = groups[groups.length - 1];
    if (last && last.day === day) last.items.push(e);
    else groups.push({ day, items: [e] });
  }

  return (
    <div>
      <PageHeader
        title="Дневник"
        emoji="📓"
        subtitle="Хронология на всички действия в приложението."
        actions={
          <>
            <button className="btn-ghost" onClick={load}>
              🔄 Обнови
            </button>
            <button className="btn-danger" onClick={clear} disabled={entries.length === 0}>
              Изчисти
            </button>
          </>
        }
      />

      {loading ? (
        <Spinner />
      ) : entries.length === 0 ? (
        <div className="card text-pine-500 text-center py-10">Все още няма записи.</div>
      ) : (
        <div className="space-y-6">
          {groups.map((g) => (
            <div key={g.day}>
              <div className="text-xs font-bold uppercase tracking-wide text-pine-400 mb-2 ml-1">{g.day}</div>
              <div className="card p-0 overflow-hidden divide-y divide-pine-100">
                {g.items.map((e) => (
                  <div key={e.id} className="flex items-start gap-3 px-4 py-2.5 hover:bg-stone-50">
                    <span className="text-lg leading-6 shrink-0">{METHOD_ICON[e.method] ?? '•'}</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-pine-800">{e.action}</div>
                      <div className="text-xs text-pine-400 mt-0.5">
                        {e.actor ? <span className="font-semibold text-pine-500">{e.actor}</span> : 'Гост'} ·{' '}
                        {timeLabel(e.at)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function parse(iso: string) {
  // Postgres returns full ISO (…Z / with offset); the old SQLite format was
  // 'YYYY-MM-DD HH:MM:SS' (UTC, no zone). Normalise both.
  let s = iso.includes('T') ? iso : iso.replace(' ', 'T');
  if (!/[Zz]|[+-]\d\d:?\d\d$/.test(s)) s += 'Z';
  return new Date(s);
}
function dayLabel(iso: string) {
  const d = parse(iso);
  const today = new Date();
  const yest = new Date();
  yest.setDate(today.getDate() - 1);
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (same(d, today)) return 'Днес';
  if (same(d, yest)) return 'Вчера';
  return d.toLocaleDateString('bg-BG', { day: 'numeric', month: 'long', year: 'numeric' });
}
function timeLabel(iso: string) {
  return parse(iso).toLocaleTimeString('bg-BG', { hour: '2-digit', minute: '2-digit' });
}
