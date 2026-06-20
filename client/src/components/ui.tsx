import type { ReactNode } from 'react';

export function PageHeader({
  title,
  subtitle,
  emoji,
  actions,
}: {
  title: string;
  subtitle?: string;
  emoji?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-4 mb-6 flex-wrap">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-extrabold text-pine-800 flex items-center gap-2">
          {emoji && <span>{emoji}</span>}
          {title}
        </h1>
        {subtitle && <p className="text-pine-500 mt-1 text-sm">{subtitle}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}

export function Spinner({ label = 'Зареждане…' }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 text-pine-500 py-10 justify-center">
      <span className="inline-block w-5 h-5 border-2 border-pine-300 border-t-pine-600 rounded-full animate-spin" />
      {label}
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="card text-center text-pine-500 py-10">{children}</div>;
}

export function NoTrip() {
  return (
    <EmptyState>
      Избери или създай пътуване от <strong>Пътувания</strong> 🧭
    </EmptyState>
  );
}
