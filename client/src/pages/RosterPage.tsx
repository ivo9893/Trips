import { useEffect, useMemo, useState } from 'react';
import { api, type Participant } from '../api';
import { useStore } from '../store';
import { PageHeader, Spinner, NoTrip } from '../components/ui';
import MultiSelect from '../components/MultiSelect';
import { ATTENDING_LABEL, MEAT_SLOT_LABEL } from '../constants';

export default function RosterPage() {
  const { currentTrip, lists, meId, showAll, me } = useStore();
  const personalView = !showAll && meId != null;
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'yes'>('all');

  const load = async () => {
    if (!currentTrip) return;
    setLoading(true);
    setParticipants(await api.getParticipants(currentTrip.id));
    setLoading(false);
  };
  useEffect(() => {
    load(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrip?.id]);

  const counts = useMemo(() => {
    const c = { yes: 0, no: 0, unknown: 0 };
    participants.forEach((p) => (c[p.attending] += 1));
    return c;
  }, [participants]);

  if (!currentTrip) return <NoTrip />;

  const meatOpts = lists.meats.map((m) => ({ id: m.id, name: m.name }));
  const bringOpts = lists.bringItems.map((b) => ({ id: b.id, name: b.name }));
  const peopleNotInTrip = lists.people.filter((p) => !participants.some((tp) => tp.person_id === p.id));

  const visible = participants
    .filter((p) => (personalView ? p.person_id === meId : true))
    .filter((p) => (filter === 'yes' ? p.attending === 'yes' : true));

  return (
    <div>
      <PageHeader
        title={personalView ? 'Моите данни' : 'Хора'}
        emoji="👥"
        subtitle={personalView && me ? `${me.name} · ${currentTrip.name}` : currentTrip.name}
        actions={
          personalView ? undefined : (
            <AddPerson tripId={currentTrip.id} people={peopleNotInTrip} onAdded={load} />
          )
        }
      />

      {!personalView && (
        <div className="flex flex-wrap items-center gap-2 mb-5">
          <Stat label="Идват" value={counts.yes} color="bg-pine-100 text-pine-700" />
          <Stat label="Не" value={counts.no} color="bg-terracotta-400/20 text-terracotta-600" />
          <Stat label="Без отговор" value={counts.unknown} color="bg-sand-200 text-sand-800" />
          <div className="ml-auto flex gap-1 rounded-xl bg-stone-100 p-1">
            <FilterBtn active={filter === 'all'} onClick={() => setFilter('all')}>
              Всички
            </FilterBtn>
            <FilterBtn active={filter === 'yes'} onClick={() => setFilter('yes')}>
              Само идващи
            </FilterBtn>
          </div>
        </div>
      )}

      {personalView && (
        <div className="card bg-pine-50/60 mb-5 text-sm text-pine-600 flex items-center gap-2">
          👋 Показват се само твоите данни. За целия състав избери <strong>„Всички"</strong> вляво.
        </div>
      )}

      {loading ? (
        <Spinner />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {visible.map((p) => (
            <ParticipantCard
              key={p.id}
              p={p}
              meatOpts={meatOpts}
              bringOpts={bringOpts}
              onChange={(updated) =>
                setParticipants((list) => list.map((x) => (x.id === updated.id ? updated : x)))
              }
              onRemove={() => setParticipants((list) => list.filter((x) => x.id !== p.id))}
            />
          ))}
          {personalView && visible.length === 0 && (
            <div className="card text-pine-500 md:col-span-2">
              Не си в състава на това пътуване. Избери <strong>„Всички"</strong> вляво и се добави.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ParticipantCard({
  p,
  meatOpts,
  bringOpts,
  onChange,
  onRemove,
}: {
  p: Participant;
  meatOpts: { id: number; name: string }[];
  bringOpts: { id: number; name: string }[];
  onChange: (p: Participant) => void;
  onRemove: () => void;
}) {
  const [saving, setSaving] = useState(false);

  const save = async (patch: Partial<Participant>) => {
    const optimistic = { ...p, ...patch } as Participant;
    onChange(optimistic);
    setSaving(true);
    try {
      const saved = await api.updateParticipant(p.id, patch);
      onChange(saved);
    } finally {
      setSaving(false);
    }
  };

  const attendingColor =
    p.attending === 'yes' ? 'border-pine-300' : p.attending === 'no' ? 'border-terracotta-400/40 opacity-75' : 'border-sand-300';

  return (
    <div className={`card ${attendingColor}`}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-display font-bold text-lg text-pine-800">{p.person_name}</h3>
        <div className="flex items-center gap-1">
          {saving && <span className="text-[11px] text-pine-400">…</span>}
          <AttendingToggle value={p.attending} onChange={(v) => save({ attending: v })} />
          <button
            className="text-pine-300 hover:text-terracotta-500 px-1"
            title="Премахни от пътуването"
            onClick={async () => {
              await api.removeParticipant(p.id);
              onRemove();
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {p.attending === 'yes' && (
        <div className="mt-3 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-pine-500">Нощувки</span>
            <div className="flex gap-1">
              {[1, 2].map((n) => (
                <button
                  key={n}
                  onClick={() => save({ nights: p.nights === n ? null : n })}
                  className={`w-8 h-8 rounded-lg text-sm font-bold ${
                    p.nights === n ? 'bg-pine-600 text-white' : 'bg-stone-100 text-pine-600 hover:bg-pine-100'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {(['night1', 'night2', 'other'] as const).map((slot) => (
            <div key={slot}>
              <label className="text-xs font-semibold uppercase tracking-wide text-pine-500">
                {MEAT_SLOT_LABEL[slot]}
              </label>
              <div className="mt-1">
                <MultiSelect
                  options={meatOpts}
                  value={p.meats[slot]}
                  onChange={(ids) => save({ meats: { ...p.meats, [slot]: ids } })}
                  placeholder="Избери месо…"
                />
              </div>
            </div>
          ))}

          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-pine-500">Мога да донеса</label>
            <div className="mt-1">
              <MultiSelect
                options={bringOpts}
                value={p.bring_item_ids}
                onChange={(ids) => save({ bring_item_ids: ids })}
                placeholder="Избери неща…"
              />
            </div>
            <input
              className="input mt-2"
              placeholder="Друго (свободен текст)…"
              defaultValue={p.bring_note ?? ''}
              onBlur={(e) => e.target.value !== (p.bring_note ?? '') && save({ bring_note: e.target.value })}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function AttendingToggle({ value, onChange }: { value: Participant['attending']; onChange: (v: Participant['attending']) => void }) {
  const opts: Participant['attending'][] = ['yes', 'no', 'unknown'];
  const color: Record<string, string> = {
    yes: 'bg-pine-600 text-white',
    no: 'bg-terracotta-500 text-white',
    unknown: 'bg-sand-300 text-sand-900',
  };
  return (
    <div className="flex rounded-lg overflow-hidden border border-pine-100">
      {opts.map((o) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className={`px-2 py-1 text-xs font-bold ${value === o ? color[o] : 'bg-white text-pine-400 hover:bg-stone-100'}`}
        >
          {ATTENDING_LABEL[o]}
        </button>
      ))}
    </div>
  );
}

function AddPerson({ tripId, people, onAdded }: { tripId: number; people: { id: number; name: string }[]; onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const { refreshLists } = useStore();

  const add = async (data: { person_id?: number; name?: string }) => {
    await api.addParticipant(tripId, data);
    await refreshLists();
    onAdded();
    setOpen(false);
    setName('');
  };

  if (!open)
    return (
      <button className="btn-primary" onClick={() => setOpen(true)}>
        + Добави човек
      </button>
    );

  return (
    <div className="card absolute right-0 z-20 w-72 mt-12 shadow-lg">
      <div className="text-sm font-semibold text-pine-700 mb-2">Добави човек</div>
      <input
        className="input mb-2"
        placeholder="Ново име…"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && name.trim() && add({ name })}
      />
      {people.length > 0 && (
        <div className="max-h-40 overflow-auto border-t border-pine-100 pt-2 mb-2">
          {people.map((p) => (
            <button
              key={p.id}
              onClick={() => add({ person_id: p.id })}
              className="block w-full text-left text-sm px-2 py-1 rounded hover:bg-pine-50"
            >
              {p.name}
            </button>
          ))}
        </div>
      )}
      <div className="flex justify-end gap-2">
        <button className="btn-ghost" onClick={() => setOpen(false)}>
          Затвори
        </button>
        <button className="btn-primary" disabled={!name.trim()} onClick={() => add({ name })}>
          Добави
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`chip ${color} text-sm px-3 py-1.5`}>
      <strong className="text-base">{value}</strong> {label}
    </div>
  );
}

function FilterBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-lg text-sm font-semibold ${active ? 'bg-white text-pine-700 shadow-sm' : 'text-pine-500'}`}
    >
      {children}
    </button>
  );
}
