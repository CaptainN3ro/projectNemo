export function RatingStars({ value, onChange, readonly = false }) {
  const stars = [1, 2, 3, 4, 5];
  const colors = ['text-red-500', 'text-orange-500', 'text-yellow-500', 'text-lime-500', 'text-green-500'];

  return (
    <div className="flex gap-1">
      {stars.map(s => (
        <button
          key={s}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(s)}
          className={`text-2xl transition-transform ${readonly ? 'cursor-default' : 'hover:scale-110'} ${s <= value ? colors[value - 1] : 'text-gray-300'}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export function RatingBadge({ value }) {
  const config = {
    1: { label: 'Sehr schlecht', color: 'bg-red-100 text-red-700' },
    2: { label: 'Schlecht', color: 'bg-orange-100 text-orange-700' },
    3: { label: 'Mittel', color: 'bg-yellow-100 text-yellow-700' },
    4: { label: 'Gut', color: 'bg-lime-100 text-lime-700' },
    5: { label: 'Sehr gut', color: 'bg-green-100 text-green-700' }
  };
  const c = config[value] || config[3];
  return <span className={`badge ${c.color}`}>{c.label}</span>;
}
