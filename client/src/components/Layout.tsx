import { NavLink, Outlet } from 'react-router-dom';
import Logo from './Logo';
import { useStore } from '../store';

const NAV = [
  { to: '/', label: 'Пътувания', icon: '🧭', end: true },
  { to: '/roster', label: 'Хора', icon: '👥' },
  { to: '/drinks', label: 'Напитки', icon: '🍹' },
  { to: '/shopping', label: 'Пазар', icon: '🛒' },
  { to: '/wheel', label: 'Колело', icon: '🎡' },
  { to: '/gear', label: 'Необходимо', icon: '🎒' },
  { to: '/tally', label: 'Бройка', icon: '📊' },
  { to: '/log', label: 'Дневник', icon: '📓' },
  { to: '/lists', label: 'Списъци', icon: '⚙️' },
];

export default function Layout() {
  const { trips, currentTrip, setCurrentTripId, me, setMeId, showAll, setShowAll } = useStore();

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="md:w-60 bg-pine-800 text-pine-50 md:min-h-screen md:sticky md:top-0 flex flex-col">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-pine-700">
          <Logo size={34} />
          <div>
            <div className="font-display font-extrabold text-lg leading-none">Палатки</div>
            <div className="text-[11px] text-pine-300">планер за излети</div>
          </div>
        </div>

        {/* Trip selector */}
        <div className="px-4 py-3 border-b border-pine-700">
          <label className="text-[11px] uppercase tracking-wide text-pine-300">Пътуване</label>
          <select
            className="mt-1 w-full rounded-lg bg-pine-700 text-pine-50 text-sm px-2 py-1.5 border border-pine-600 outline-none focus:border-sand-400"
            value={currentTrip?.id ?? ''}
            onChange={(e) => setCurrentTripId(Number(e.target.value))}
          >
            {trips.length === 0 && <option value="">— няма —</option>}
            {trips.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        {/* Identity + personal/all toggle */}
        <div className="px-4 py-3 border-b border-pine-700">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-wide text-pine-300">Ти си</div>
              <div className="font-semibold text-sm truncate">{me ? me.name : 'Гост 👀'}</div>
            </div>
            <button
              onClick={() => setMeId(null)}
              className="text-[11px] text-pine-300 hover:text-sand-300 underline underline-offset-2"
            >
              смени
            </button>
          </div>
          <div className="mt-2 flex rounded-lg overflow-hidden border border-pine-600 text-xs font-bold">
            <button
              onClick={() => setShowAll(false)}
              disabled={!me}
              className={`flex-1 py-1.5 ${!showAll && me ? 'bg-sand-400 text-pine-900' : 'bg-pine-700 text-pine-200 disabled:opacity-40'}`}
            >
              Само моите
            </button>
            <button
              onClick={() => setShowAll(true)}
              className={`flex-1 py-1.5 ${showAll || !me ? 'bg-sand-400 text-pine-900' : 'bg-pine-700 text-pine-200'}`}
            >
              Всички
            </button>
          </div>
        </div>

        <nav className="flex md:flex-col gap-1 p-2 overflow-x-auto">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold whitespace-nowrap transition ${
                  isActive ? 'bg-sand-400 text-pine-900' : 'text-pine-100 hover:bg-pine-700'
                }`
              }
            >
              <span className="text-base">{n.icon}</span>
              {n.label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto hidden md:block px-5 py-4 text-[11px] text-pine-400">
          🏕️ Лагер до море и планина
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 p-4 md:p-8 max-w-6xl w-full mx-auto">
        <Outlet />
      </main>
    </div>
  );
}
