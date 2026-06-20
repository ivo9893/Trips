import { useState } from 'react';
import { useStore } from '../store';
import { api } from '../api';
import Logo from './Logo';

/** First-run screen: ask who the user is so we can show their data by default. */
export default function IdentityGate() {
  const { lists, setMeId, setShowAll } = useStore();
  const [q, setQ] = useState('');

  const people = lists.people
    .filter((p) => p.active)
    .filter((p) => p.name.toLowerCase().includes(q.trim().toLowerCase()));

  const pick = (id: number) => {
    const name = lists.people.find((p) => p.id === id)?.name ?? '';
    setMeId(id);
    setShowAll(false);
    // log sign-in (pass actor explicitly to avoid a header race)
    api.logEvent(`🔑 ${name} влезе в приложението`, name).catch(() => {});
  };

  return (
    <div className="min-h-screen grid place-items-center p-4">
      <div className="card w-full max-w-md">
        <div className="flex flex-col items-center text-center">
          <Logo size={56} />
          <h1 className="font-display text-2xl font-extrabold text-pine-800 mt-3">Кой си ти?</h1>
          <p className="text-pine-500 text-sm mt-1">
            Избери името си, за да виждаш своите данни. Винаги можеш да видиш всички.
          </p>
        </div>

        <input
          autoFocus
          className="input mt-5"
          placeholder="Търси име…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />

        <div className="mt-3 grid grid-cols-2 gap-2 max-h-72 overflow-auto pr-1">
          {people.map((p) => (
            <button
              key={p.id}
              onClick={() => pick(p.id)}
              className="rounded-xl border border-pine-100 bg-white px-3 py-2.5 text-sm font-semibold text-pine-700 hover:bg-pine-50 hover:border-pine-300 transition text-left"
            >
              {p.name}
            </button>
          ))}
          {people.length === 0 && (
            <div className="col-span-2 text-sm text-pine-400 text-center py-4">Няма съвпадения</div>
          )}
        </div>

        <button
          onClick={() => setShowAll(true)}
          className="mt-4 w-full text-sm text-pine-500 hover:text-pine-700 underline underline-offset-2"
        >
          Само разглеждам — покажи всичко
        </button>
      </div>
    </div>
  );
}
