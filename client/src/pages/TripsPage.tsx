import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, type Trip } from '../api';
import { useStore } from '../store';
import { PageHeader } from '../components/ui';

export default function TripsPage() {
  const { trips, currentTrip, setCurrentTripId, refreshTrips, lists } = useStore();
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  const open = (t: Trip) => {
    setCurrentTripId(t.id);
    navigate('/roster');
  };

  return (
    <div>
      <PageHeader
        title="Пътувания"
        emoji="🧭"
        subtitle="Всяко пътуване има свой състав, пазар и бройка."
        actions={
          <button className="btn-primary" onClick={() => setCreating(true)}>
            + Ново пътуване
          </button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {trips.map((t) => (
          <div
            key={t.id}
            className={`card cursor-pointer transition hover:shadow-md hover:-translate-y-0.5 ${
              currentTrip?.id === t.id ? 'ring-2 ring-pine-400' : ''
            }`}
            onClick={() => open(t)}
          >
            <div className="flex items-start justify-between">
              <h3 className="font-display font-bold text-lg text-pine-800">{t.name}</h3>
              {currentTrip?.id === t.id && <span className="chip bg-pine-100 text-pine-700">избрано</span>}
            </div>
            <div className="mt-2 text-sm text-pine-500 space-y-1">
              {(t.date_start || t.date_end) && (
                <div>📅 {[t.date_start, t.date_end].filter(Boolean).join(' – ')}</div>
              )}
              {t.location_name && <div>📍 {t.location_name}</div>}
            </div>
          </div>
        ))}
        {trips.length === 0 && (
          <div className="text-pine-500">Все още няма пътувания. Създай първото!</div>
        )}
      </div>

      {creating && (
        <TripModal
          locations={lists.locations}
          onClose={() => setCreating(false)}
          onSaved={async (t) => {
            await refreshTrips();
            setCurrentTripId(t.id);
            setCreating(false);
          }}
        />
      )}
    </div>
  );
}

function TripModal({
  locations,
  onClose,
  onSaved,
}: {
  locations: { id: number; name: string }[];
  onClose: () => void;
  onSaved: (t: Trip) => void;
}) {
  const [name, setName] = useState('');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [locationId, setLocationId] = useState('');
  const [addAll, setAddAll] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const save = async () => {
    if (!name.trim()) return setErr('Въведи име');
    setBusy(true);
    try {
      const t = await api.createTrip({
        name,
        date_start: dateStart || null,
        date_end: dateEnd || null,
        location_id: locationId ? Number(locationId) : null,
        addAllPeople: addAll,
      });
      onSaved(t);
    } catch (e: any) {
      setErr(e.message);
      setBusy(false);
    }
  };

  return (
    <Modal onClose={onClose} title="Ново пътуване">
      <div className="space-y-3">
        <Field label="Име">
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Палатки — …" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="От">
            <input type="date" className="input" value={dateStart} onChange={(e) => setDateStart(e.target.value)} />
          </Field>
          <Field label="До">
            <input type="date" className="input" value={dateEnd} onChange={(e) => setDateEnd(e.target.value)} />
          </Field>
        </div>
        <Field label="Местоположение">
          <select className="input" value={locationId} onChange={(e) => setLocationId(e.target.value)}>
            <option value="">— избери —</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </Field>
        <label className="flex items-center gap-2 text-sm text-pine-700">
          <input type="checkbox" checked={addAll} onChange={(e) => setAddAll(e.target.checked)} />
          Добави всички хора в състава
        </label>
        {err && <div className="text-terracotta-600 text-sm">{err}</div>}
      </div>
      <div className="flex justify-end gap-2 mt-5">
        <button className="btn-ghost" onClick={onClose}>
          Отказ
        </button>
        <button className="btn-primary" onClick={save} disabled={busy}>
          Създай
        </button>
      </div>
    </Modal>
  );
}

export function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-pine-900/40 backdrop-blur-sm grid place-items-center p-4" onClick={onClose}>
      <div className="card w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display font-bold text-xl text-pine-800 mb-4">{title}</h2>
        {children}
      </div>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wide text-pine-500">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
