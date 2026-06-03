import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar
} from 'recharts';
import { TrendingUp, TrendingDown, Minus, Scale } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { statsApi, weightApi, urineApi } from '../../../api/pets';

function TrendIcon({ trend }) {
  if (trend === 'improving') return <div className="flex items-center gap-1 text-green-600"><TrendingUp size={16} /> Verbesserung</div>;
  if (trend === 'declining') return <div className="flex items-center gap-1 text-red-600"><TrendingDown size={16} /> Verschlechterung</div>;
  if (trend === 'stable') return <div className="flex items-center gap-1 text-gray-500"><Minus size={16} /> Stabil</div>;
  return <div className="text-gray-400 text-sm">Zu wenig Daten</div>;
}

const CustomTooltip = ({ active, payload, label, unit = '' }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-sm">
      <p className="font-medium text-gray-700">{label}</p>
      <p className="text-primary-600 font-semibold">{payload[0].value}{unit}</p>
    </div>
  );
};

// Diary statistics panel (stool / behavior)
function DiaryStatsPanel({ petId, type, label, color }) {
  const [period, setPeriod] = useState('month');
  const { data, isLoading } = useQuery({
    queryKey: ['stats', petId, type, period],
    queryFn: () => statsApi.get(petId, { type, period })
  });

  const chartData = data?.dailyAverages?.map(d => ({
    date: format(new Date(d.date), 'dd.MM.', { locale: de }),
    avg: d.avg,
    count: d.count
  })) || [];

  const hourData = data?.hourlyPattern?.map(h => ({
    hour: `${h.hour}:00`,
    avg: h.avg,
    count: h.count
  })) || [];

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">{label}</h3>
        <div className="flex gap-1">
          {['week', 'month', 'quarter'].map(p => (
            <button key={p} onClick={() => setPeriod(p)} className={`px-3 py-1 text-xs rounded-lg transition-colors ${period === p ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {p === 'week' ? 'Woche' : p === 'month' ? 'Monat' : 'Quartal'}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? <p className="text-gray-400 text-center py-8">Lade...</p>
        : !data || data.totalEntries === 0 ? <p className="text-gray-400 text-center py-8">Keine Daten im gewählten Zeitraum</p>
        : (
          <>
            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-xl font-bold text-gray-900">{data.overallAvg ?? '–'}</p>
                <p className="text-xs text-gray-500">Ø Bewertung</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-xl font-bold text-gray-900">{data.totalEntries}</p>
                <p className="text-xs text-gray-500">Einträge</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg flex items-center justify-center">
                <TrendIcon trend={data.trend} />
              </div>
            </div>

            {chartData.length > 1 && (
              <div className="mb-5">
                <p className="text-xs font-medium text-gray-500 mb-2">Tagesdurchschnitt</p>
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis domain={[1, 5]} tick={{ fontSize: 10 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="avg" stroke={color} strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {hourData.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-2">Muster nach Tageszeit</p>
                <ResponsiveContainer width="100%" height={130}>
                  <BarChart data={hourData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="hour" tick={{ fontSize: 9 }} />
                    <YAxis domain={[0, 5]} tick={{ fontSize: 9 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="avg" fill={color} radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}
    </div>
  );
}

// Weight statistics panel
function WeightStatsPanel({ petId }) {
  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['weight', petId],
    queryFn: () => weightApi.getAll(petId)
  });

  const sorted = [...entries].sort((a, b) => new Date(a.entry_date) - new Date(b.entry_date));

  const chartData = sorted.map(e => ({
    date: format(new Date(e.entry_date), 'dd.MM.yy', { locale: de }),
    weight: parseFloat(e.weight)
  }));

  const current = sorted.length ? parseFloat(sorted[sorted.length - 1].weight) : null;
  const min = sorted.length ? Math.min(...sorted.map(e => parseFloat(e.weight))) : null;
  const max = sorted.length ? Math.max(...sorted.map(e => parseFloat(e.weight))) : null;
  const avg = sorted.length
    ? (sorted.reduce((s, e) => s + parseFloat(e.weight), 0) / sorted.length).toFixed(2)
    : null;

  // Trend: compare first vs last entry
  let trend = 'stable';
  if (sorted.length >= 2) {
    const diff = parseFloat(sorted[sorted.length - 1].weight) - parseFloat(sorted[0].weight);
    if (diff > 0.05) trend = 'up';
    else if (diff < -0.05) trend = 'down';
  }

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-4">
        <Scale size={18} className="text-primary-600" />
        <h3 className="font-semibold text-gray-900">Gewichtsverlauf</h3>
      </div>

      {isLoading ? <p className="text-gray-400 text-center py-8">Lade...</p>
        : sorted.length === 0 ? <p className="text-gray-400 text-center py-8">Noch keine Gewichtseinträge vorhanden</p>
        : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              {[
                { label: 'Aktuell', value: current ? `${current} kg` : '–', highlight: true },
                { label: 'Minimum', value: `${min} kg` },
                { label: 'Maximum', value: `${max} kg` },
                { label: 'Durchschnitt', value: avg ? `${avg} kg` : '–' }
              ].map(s => (
                <div key={s.label} className={`rounded-xl p-3 text-center ${s.highlight ? 'bg-primary-50 border border-primary-100' : 'bg-gray-50'}`}>
                  <p className={`text-lg font-bold ${s.highlight ? 'text-primary-700' : 'text-gray-800'}`}>{s.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="mb-3 flex items-center gap-2">
              {trend === 'up' && <span className="badge bg-amber-100 text-amber-700 flex items-center gap-1"><TrendingUp size={11} /> Zunahme</span>}
              {trend === 'down' && <span className="badge bg-green-100 text-green-700 flex items-center gap-1"><TrendingDown size={11} /> Abnahme</span>}
              {trend === 'stable' && <span className="badge bg-gray-100 text-gray-600 flex items-center gap-1"><Minus size={11} /> Stabil</span>}
              <span className="text-xs text-gray-400">{sorted.length} Einträge gesamt</span>
            </div>

            {chartData.length >= 2 && (
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    domain={[d => Math.max(0, +(d - 0.5).toFixed(1)), d => +(d + 0.5).toFixed(1)]}
                    unit=" kg"
                  />
                  <Tooltip content={<CustomTooltip unit=" kg" />} />
                  <Line type="monotone" dataKey="weight" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3, fill: '#10b981', strokeWidth: 0 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </>
        )}
    </div>
  );
}

export default function StatisticsTab({ petId, petName }) {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Statistiken — {petName}</h2>
        <p className="text-sm text-gray-500">Trends aus Tagebüchern und Gewichtsverlauf</p>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <DiaryStatsPanel petId={petId} type="stool"    label="Kottagebuch — Trends"    color="#10b981" />
        <DiaryStatsPanel petId={petId} type="urine"    label="Urintagebuch — Trends"   color="#f59e0b" />
        <DiaryStatsPanel petId={petId} type="behavior" label="Verhalten — Trends"      color="#8b5cf6" />
        <WeightStatsPanel petId={petId} />
      </div>
    </div>
  );
}
