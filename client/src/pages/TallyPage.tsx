import { useEffect, useState } from 'react';
import { api, type Tally } from '../api';
import { useStore } from '../store';
import { PageHeader, Spinner, NoTrip } from '../components/ui';
import { DRINK_CATEGORY_LABEL } from '../constants';

export default function TallyPage() {
  const { currentTrip } = useStore();
  const [tally, setTally] = useState<Tally | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentTrip) return;
    setLoading(true);
    api.getTally(currentTrip.id).then((t) => {
      setTally(t);
      setLoading(false);
    });
  }, [currentTrip?.id]);

  if (!currentTrip) return <NoTrip />;
  if (loading || !tally) return <Spinner />;

  const a = tally.attendance;
  const maxMeat = Math.max(1, ...tally.meats.map((m) => m.count));
  const maxDrink = Math.max(1, ...tally.drinks.map((d) => d.count));

  return (
    <div>
      <PageHeader
        title="Бройка"
        emoji="📊"
        subtitle={`${currentTrip.name}${tally.lastUpdated ? ` · обновено ${tally.lastUpdated}` : ''}`}
      />

      {/* attendance summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Metric label="Идват" value={a.yes} emoji="🏕️" tint="bg-pine-600" />
        <Metric label="Не идват" value={a.no} emoji="🚫" tint="bg-terracotta-500" />
        <Metric label="Без отговор" value={a.unknown} emoji="❓" tint="bg-sand-500" />
        <Metric label="Общо нощувки" value={a.total_nights} emoji="🌙" tint="bg-sea-600" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <BarCard title="Месо" emoji="🍖" rows={tally.meats} max={maxMeat} color="bg-terracotta-500" />
        <BarCard
          title="Напитки"
          emoji="🥤"
          rows={tally.drinks.map((d) => ({ ...d, sub: DRINK_CATEGORY_LABEL[d.category] }))}
          max={maxDrink}
          color="bg-sea-500"
        />
        {tally.bring.length > 0 && (
          <BarCard
            title="Носим оборудване"
            emoji="🎒"
            rows={tally.bring}
            max={Math.max(1, ...tally.bring.map((b) => b.count))}
            color="bg-pine-500"
          />
        )}
        {tally.noResponse.length > 0 && (
          <div className="card">
            <h3 className="font-display font-bold text-pine-800 mb-3">❓ Не са отговорили</h3>
            <div className="flex flex-wrap gap-2">
              {tally.noResponse.map((n) => (
                <span key={n} className="chip bg-sand-200 text-sand-800">
                  {n}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value, emoji, tint }: { label: string; value: number; emoji: string; tint: string }) {
  return (
    <div className={`rounded-2xl ${tint} text-white p-4 shadow-sm`}>
      <div className="text-2xl">{emoji}</div>
      <div className="text-3xl font-display font-extrabold mt-1">{value}</div>
      <div className="text-xs opacity-90">{label}</div>
    </div>
  );
}

function BarCard({
  title,
  emoji,
  rows,
  max,
  color,
}: {
  title: string;
  emoji: string;
  rows: { id: number; name: string; count: number; sub?: string }[];
  max: number;
  color: string;
}) {
  return (
    <div className="card">
      <h3 className="font-display font-bold text-pine-800 mb-3 flex items-center gap-2">
        <span>{emoji}</span> {title}
      </h3>
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.id} className="flex items-center gap-3">
            <div className="w-32 shrink-0 text-sm text-pine-700 truncate" title={r.name}>
              {r.name}
              {r.sub && <span className="text-pine-400 text-xs"> · {r.sub}</span>}
            </div>
            <div className="flex-1 bg-stone-100 rounded-full h-5 overflow-hidden">
              <div
                className={`${color} h-full rounded-full flex items-center justify-end px-2 text-white text-xs font-bold transition-all`}
                style={{ width: `${(r.count / max) * 100}%` }}
              >
                {r.count}
              </div>
            </div>
          </div>
        ))}
        {rows.length === 0 && <div className="text-sm text-pine-400">— няма данни —</div>}
      </div>
    </div>
  );
}
