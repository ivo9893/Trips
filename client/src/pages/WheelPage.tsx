import { useEffect, useRef, useState } from 'react';
import { api, type Wheel, type DutyRecord, type WheelPerson } from '../api';
import { useStore } from '../store';
import { PageHeader, Spinner, NoTrip } from '../components/ui';

// Earthy slice colors, cycled around the wheel.
const SLICE_COLORS = ['#316247', '#bd5a3c', '#2c7e96', '#bf8a47', '#5f9a78', '#a44732', '#469bb0', '#caa063'];

export default function WheelPage() {
  const { currentTrip } = useStore();
  const [wheel, setWheel] = useState<Wheel | null>(null);
  const [history, setHistory] = useState<DutyRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState<WheelPerson | null>(null);
  const rotationRef = useRef(0);

  const load = async () => {
    if (!currentTrip) return;
    setLoading(true);
    const [w, h] = await Promise.all([api.getWheel(currentTrip.id), api.getWheelHistory(currentTrip.id)]);
    setWheel(w);
    setHistory(h);
    setLoading(false);
  };
  useEffect(() => {
    setWinner(null);
    load(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrip?.id]);

  if (!currentTrip) return <NoTrip />;
  if (loading || !wheel) return <Spinner />;

  const eligible = wheel.eligible;
  const n = eligible.length;
  const slice = n > 0 ? 360 / n : 0;

  const spin = () => {
    if (spinning || n === 0) return;
    setWinner(null);
    const w = Math.floor(Math.random() * n);
    const centerAngle = w * slice + slice / 2; // clockwise from top
    const turns = 5 + Math.floor(Math.random() * 4);
    const base = Math.ceil(rotationRef.current / 360) * 360;
    const target = base + 360 * turns + (360 - centerAngle);
    rotationRef.current = target;
    setSpinning(true);
    setRotation(target);
    // reveal winner after the CSS transition (4s) ends
    window.setTimeout(() => {
      setSpinning(false);
      setWinner(eligible[w]);
    }, 4200);
  };

  const confirmPick = async () => {
    if (!winner) return;
    await api.pickDuty(currentTrip.id, winner.person_id);
    setWinner(null);
    await load();
  };

  return (
    <div>
      <PageHeader
        title="Колело на късмета"
        emoji="🎡"
        subtitle="Кой отива на пазар? Избраният е освободен за 6 месеца."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="card flex flex-col items-center">
          {n === 0 ? (
            <div className="text-center py-16 text-pine-500">
              🎉 Всички идващи са били на пазар през последните {wheel.windowMonths} месеца!
              <div className="text-sm mt-2 text-pine-400">Няма кого да завъртим.</div>
            </div>
          ) : (
            <>
              <WheelSvg eligible={eligible} slice={slice} rotation={rotation} spinning={spinning} />
              <button
                className="btn-primary mt-6 text-base px-8 py-3"
                onClick={spin}
                disabled={spinning}
              >
                {spinning ? 'Върти се…' : '🎯 Завърти'}
              </button>
              <p className="text-xs text-pine-400 mt-2">{n} участника в колелото</p>
            </>
          )}
        </div>

        <div className="space-y-4">
          <div className="card">
            <h3 className="font-display font-bold text-pine-800 mb-3">🛡️ Освободени</h3>
            {wheel.safe.length === 0 ? (
              <p className="text-sm text-pine-400">Никой не е освободен.</p>
            ) : (
              <ul className="space-y-2">
                {wheel.safe.map((s) => (
                  <li key={s.person_id} className="flex items-center justify-between text-sm">
                    <span className="text-pine-700 font-semibold">{s.name}</span>
                    <span className="text-pine-400 text-xs">до {fmt(s.safe_until)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="card">
            <h3 className="font-display font-bold text-pine-800 mb-3">📜 История</h3>
            {history.length === 0 ? (
              <p className="text-sm text-pine-400">Още няма избрани.</p>
            ) : (
              <ul className="space-y-2">
                {history.map((h) => (
                  <li key={h.id} className="group flex items-center justify-between text-sm">
                    <span className="text-pine-700">
                      🛒 <strong>{h.name}</strong>
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="text-pine-400 text-xs">{fmt(h.chosen_at)}</span>
                      <button
                        title="Отмени"
                        onClick={async () => {
                          await api.undoDuty(h.id);
                          await load();
                        }}
                        className="opacity-0 group-hover:opacity-100 text-pine-300 hover:text-terracotta-500"
                      >
                        ✕
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {winner && (
        <div className="fixed inset-0 z-50 bg-pine-900/50 backdrop-blur-sm grid place-items-center p-4" onClick={() => setWinner(null)}>
          <div className="card w-full max-w-sm text-center" onClick={(e) => e.stopPropagation()}>
            <div className="text-5xl mb-2">🛒</div>
            <p className="text-pine-500">На пазар отива</p>
            <h2 className="font-display text-3xl font-extrabold text-pine-800 my-1">{winner.name}</h2>
            <p className="text-sm text-pine-400 mb-5">Ще бъде освободен за следващите {wheel.windowMonths} месеца.</p>
            <div className="flex gap-2 justify-center">
              <button className="btn-ghost" onClick={spin}>
                🔁 Завърти пак
              </button>
              <button className="btn-primary" onClick={confirmPick}>
                ✅ Потвърди
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function WheelSvg({
  eligible,
  slice,
  rotation,
  spinning,
}: {
  eligible: WheelPerson[];
  slice: number;
  rotation: number;
  spinning: boolean;
}) {
  const cx = 100;
  const cy = 100;
  const r = 95;
  const n = eligible.length;

  // point on circle at angle (degrees clockwise from top)
  const pt = (angle: number, radius: number) => {
    const rad = ((angle - 90) * Math.PI) / 180;
    return [cx + radius * Math.cos(rad), cy + radius * Math.sin(rad)];
  };

  return (
    <div className="relative w-full max-w-[360px] aspect-square">
      {/* pointer */}
      <div className="absolute left-1/2 -translate-x-1/2 -top-1 z-10 text-3xl drop-shadow">🔻</div>
      <svg viewBox="0 0 200 200" className="w-full h-full">
        <g
          style={{
            transform: `rotate(${rotation}deg)`,
            transformOrigin: '100px 100px',
            transition: spinning ? 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none',
          }}
        >
          {n === 1 ? (
            <circle cx={cx} cy={cy} r={r} fill={SLICE_COLORS[0]} />
          ) : (
            eligible.map((p, i) => {
              const start = i * slice;
              const end = (i + 1) * slice;
              const [x1, y1] = pt(start, r);
              const [x2, y2] = pt(end, r);
              const large = slice > 180 ? 1 : 0;
              const d = `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2} Z`;
              return <path key={p.person_id} d={d} fill={SLICE_COLORS[i % SLICE_COLORS.length]} stroke="#fbf7f0" strokeWidth="0.5" />;
            })
          )}
          {/* labels — laid along each spoke, anchored at the rim, reading inward */}
          {eligible.map((p, i) => {
            const mid = i * slice + slice / 2;
            const [tx, ty] = pt(mid, r * 0.94);
            // align horizontal text to the spoke (east -> outward radial = mid - 90)
            let rot = mid - 90;
            let anchor: 'start' | 'end' = 'end';
            if (mid > 180) {
              rot += 180; // flip bottom-left half so it isn't upside-down
              anchor = 'start';
            }
            const max = n > 12 ? 9 : 12;
            const name = p.name.length > max ? p.name.slice(0, max - 1) + '…' : p.name;
            return (
              <text
                key={p.person_id}
                x={tx}
                y={ty}
                fill="#fff"
                fontSize={n > 14 ? 6 : n > 9 ? 7 : 8}
                fontWeight="700"
                textAnchor={anchor}
                dominantBaseline="central"
                transform={`rotate(${rot}, ${tx}, ${ty})`}
              >
                {name}
              </text>
            );
          })}
        </g>
        {/* hub */}
        <circle cx={cx} cy={cy} r="9" fill="#223f30" stroke="#fbf7f0" strokeWidth="2" />
      </svg>
    </div>
  );
}

function fmt(iso: string) {
  // accepts 'YYYY-MM-DD' or 'YYYY-MM-DD HH:MM:SS'
  const d = new Date(iso.replace(' ', 'T'));
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('bg-BG', { day: 'numeric', month: 'short', year: 'numeric' });
}
