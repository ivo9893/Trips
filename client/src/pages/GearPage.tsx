import { useStore } from '../store';
import { PageHeader } from '../components/ui';
import { GEAR_CATEGORY_LABEL } from '../constants';
import type { GearCategory } from '../api';

const CATS: { key: GearCategory; emoji: string; tint: string }[] = [
  { key: 'mandatory', emoji: '✅', tint: 'border-pine-300 bg-pine-50/50' },
  { key: 'recommended', emoji: '🌤️', tint: 'border-sea-300 bg-sea-50/50' },
  { key: 'optional', emoji: '✨', tint: 'border-sand-300 bg-sand-50/50' },
];

export default function GearPage() {
  const { lists } = useStore();

  return (
    <div>
      <PageHeader
        title="Необходимо"
        emoji="🎒"
        subtitle="Какво да носим. Списъкът се редактира от „Списъци“."
      />
      <div className="grid gap-4 md:grid-cols-3">
        {CATS.map(({ key, emoji, tint }) => {
          const items = lists.gearItems.filter((g) => g.category === key);
          return (
            <div key={key} className={`card ${tint}`}>
              <h3 className="font-display font-bold text-pine-800 mb-3 flex items-center gap-2">
                <span>{emoji}</span> {GEAR_CATEGORY_LABEL[key]}
              </h3>
              <ul className="space-y-2">
                {items.map((g) => (
                  <li key={g.id} className="flex items-start gap-2 text-sm text-pine-700">
                    <span className="mt-1 w-1.5 h-1.5 rounded-full bg-pine-400 shrink-0" />
                    <span>
                      {g.name}
                      {g.note && <span className="text-pine-400"> — {g.note}</span>}
                    </span>
                  </li>
                ))}
                {items.length === 0 && <li className="text-sm text-pine-400">— празно —</li>}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
