import { useEffect, useState } from 'react';
import { api, type Participant, type DrinkCategory } from '../api';
import { useStore } from '../store';
import { PageHeader, Spinner, NoTrip } from '../components/ui';
import MultiSelect from '../components/MultiSelect';
import { DRINK_CATEGORY_LABEL } from '../constants';

const CATS: DrinkCategory[] = ['alcohol', 'carbonated', 'noncarbonated'];

export default function DrinksPage() {
  const { currentTrip, lists, meId, showAll, me } = useStore();
  const personalView = !showAll && meId != null;
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!currentTrip) return;
    setLoading(true);
    setParticipants(await api.getParticipants(currentTrip.id));
    setLoading(false);
  };
  useEffect(() => {
    load(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrip?.id]);

  if (!currentTrip) return <NoTrip />;

  // drink options per category
  const optsByCat: Record<DrinkCategory, { id: number; name: string }[]> = {
    alcohol: [],
    carbonated: [],
    noncarbonated: [],
  };
  lists.drinks.forEach((d) => optsByCat[d.category as DrinkCategory]?.push({ id: d.id, name: d.name }));
  const idCat = new Map(lists.drinks.map((d) => [d.id, d.category as DrinkCategory]));

  const visible = participants
    .filter((p) => (personalView ? p.person_id === meId : p.attending !== 'no'));

  return (
    <div>
      <PageHeader
        title={personalView ? 'Моите напитки' : 'Напитки'}
        emoji="🍹"
        subtitle={personalView && me ? me.name : currentTrip.name}
      />
      <p className="text-sm text-pine-500 mb-4 -mt-2">
        Ако няма посочени предпочитания, се взима каквото се намери.
      </p>
      {loading ? (
        <Spinner />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {visible.map((p) => (
            <DrinkCard key={p.id} p={p} optsByCat={optsByCat} idCat={idCat} />
          ))}
          {personalView && visible.length === 0 && (
            <div className="card text-pine-500 md:col-span-2">
              Не си в състава на това пътуване.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DrinkCard({
  p,
  optsByCat,
  idCat,
}: {
  p: Participant;
  optsByCat: Record<DrinkCategory, { id: number; name: string }[]>;
  idCat: Map<number, DrinkCategory>;
}) {
  const [draft, setDraft] = useState(p);
  const [saving, setSaving] = useState(false);
  useEffect(() => setDraft(p), [p.id]);

  const idsForCat = (cat: DrinkCategory) => draft.drink_ids.filter((id) => idCat.get(id) === cat);

  const setCat = async (cat: DrinkCategory, ids: number[]) => {
    const others = draft.drink_ids.filter((id) => idCat.get(id) !== cat);
    const next = [...others, ...ids];
    setDraft({ ...draft, drink_ids: next });
    setSaving(true);
    await api.updateParticipant(p.id, { drink_ids: next });
    setSaving(false);
  };

  const saveNote = async (field: 'beer_note' | 'juice_note', value: string) => {
    setDraft({ ...draft, [field]: value });
    await api.updateParticipant(p.id, { [field]: value });
  };

  return (
    <div className={`card ${draft.attending === 'unknown' ? 'border-sand-300' : 'border-pine-100'}`}>
      <div className="flex items-center justify-between">
        <h3 className="font-display font-bold text-lg text-pine-800">{draft.person_name}</h3>
        {saving && <span className="text-[11px] text-pine-400">записва…</span>}
      </div>
      <div className="mt-3 space-y-3">
        {CATS.map((cat) => (
          <div key={cat}>
            <label className="text-xs font-semibold uppercase tracking-wide text-pine-500">
              {DRINK_CATEGORY_LABEL[cat]}
            </label>
            <div className="mt-1">
              <MultiSelect
                options={optsByCat[cat]}
                value={idsForCat(cat)}
                onChange={(ids) => setCat(cat, ids)}
                placeholder="Избери…"
              />
            </div>
          </div>
        ))}
        <input
          className="input"
          placeholder="Предпочитания за бира / съмърсби…"
          defaultValue={draft.beer_note ?? ''}
          onBlur={(e) => e.target.value !== (draft.beer_note ?? '') && saveNote('beer_note', e.target.value)}
        />
        <input
          className="input"
          placeholder="Предпочитания за сок / студен чай…"
          defaultValue={draft.juice_note ?? ''}
          onBlur={(e) => e.target.value !== (draft.juice_note ?? '') && saveNote('juice_note', e.target.value)}
        />
      </div>
    </div>
  );
}
