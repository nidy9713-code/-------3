// Небольшие переиспользуемые UI-блоки для компактного и понятного интерфейса.

export function NavButton({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
        active
          ? "bg-emerald-600 text-white shadow"
          : "bg-white text-slate-700 hover:bg-slate-100"
      }`}
    >
      {children}
    </button>
  );
}

export function StatCard({ title, value, hint }) {
  return (
    <article className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <p className="text-sm text-slate-500">{title}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
      <p className="mt-2 text-xs text-slate-500">{hint}</p>
    </article>
  );
}

export function SectionCard({ title, children, actions }) {
  return (
    <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        {actions && <div className="flex gap-2">{actions}</div>}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function ActionButton({ children, onClick, variant = "primary" }) {
  const styles = {
    primary: "bg-emerald-600 text-white hover:bg-emerald-700",
    outline: "border border-slate-200 text-slate-700 hover:bg-slate-50",
    danger: "text-rose-600 hover:bg-rose-50"
  };
  return (
    <button
      onClick={onClick}
      className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${styles[variant]}`}
    >
      {children}
    </button>
  );
}

export function FormField({ label, children }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </label>
      {children}
    </div>
  );
}

export function Input({ ...props }) {
  return (
    <input
      {...props}
      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
    />
  );
}

export function Select({ options, ...props }) {
  return (
    <select
      {...props}
      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

export function EmptyState({ message, icon = "📝" }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <span className="mb-3 text-4xl" role="img" aria-label="empty">
        {icon}
      </span>
      <p className="text-sm font-medium text-slate-500">{message}</p>
      <p className="mt-1 text-xs text-slate-400">Начните вводить данные выше, чтобы увидеть их здесь</p>
    </div>
  );
}
