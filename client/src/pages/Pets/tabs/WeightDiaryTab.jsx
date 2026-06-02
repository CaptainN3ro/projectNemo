import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Plus, Pencil, Trash2, Download, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine
} from 'recharts';
import { weightApi } from '../../../api/pets';
import Modal from '../../../components/UI/Modal';
import ConfirmDialog from '../../../components/UI/ConfirmDialog';
import { exportToExcel, formatDate } from '../../../utils/exportExcel';

function WeightForm({ petId, entry, onClose }) {
  const qc = useQueryClient();
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: entry
      ? { entry_date: entry.entry_date, weight: entry.weight, notes: entry.notes || '' }
      : { entry_date: new Date().toISOString().split('T')[0] }
  });

  const mutation = useMutation({
    mutationFn: data => entry
      ? weightApi.update(petId, entry.id, data)
      : weightApi.create(petId, data),
    onSuccess: () => {
      qc.invalidateQueries(['weight', petId]);
      qc.invalidateQueries(['pet', petId]);
      qc.invalidateQueries(['pets']);
      toast.success('Gewicht gespeichert');
      onClose();
    },
    onError: e => toast.error(e.response?.data?.error || 'Fehler')
  });

  return (
    <form onSubmit={handleSubmit(mutation.mutate)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="form-group">
          <label className="label">Datum *</label>
          <input type="date" className="input" {...register('entry_date', { required: true })} />
        </div>
        <div className="form-group">
          <label className="label">Gewicht (kg) *</label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            className={`input ${errors.weight ? 'border-red-400' : ''}`}
            placeholder="z.B. 4.85"
            {...register('weight', { required: true, min: 0.01 })}
          />
        </div>
        <div className="form-group col-span-2">
          <label className="label">Notizen</label>
          <textarea className="input" rows={2} placeholder="Optional..." {...register('notes')} />
        </div>
      </div>
      <div className="flex gap-3 justify-end pt-2">
        <button type="button" onClick={onClose} className="btn-secondary">Abbrechen</button>
        <button type="submit" disabled={mutation.isPending} className="btn-primary">
          {mutation.isPending ? 'Speichern...' : 'Speichern'}
        </button>
      </div>
    </form>
  );
}

function TrendBadge({ entries }) {
  if (entries.length < 2) return null;
  // Compare last 2 entries (sorted DESC, so [0] is newest)
  const diff = parseFloat(entries[0].weight) - parseFloat(entries[1].weight);
  if (Math.abs(diff) < 0.01) return (
    <span className="badge bg-gray-100 text-gray-600 flex items-center gap-1"><Minus size={11} /> Stabil</span>
  );
  if (diff > 0) return (
    <span className="badge bg-amber-100 text-amber-700 flex items-center gap-1">
      <TrendingUp size={11} /> +{diff.toFixed(2)} kg
    </span>
  );
  return (
    <span className="badge bg-green-100 text-green-700 flex items-center gap-1">
      <TrendingDown size={11} /> {diff.toFixed(2)} kg
    </span>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-sm">
      <p className="font-medium text-gray-700">{label}</p>
      <p className="text-primary-600 font-semibold">{payload[0].value} kg</p>
    </div>
  );
};

export default function WeightDiaryTab({ petId }) {
  const [modal, setModal] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const qc = useQueryClient();

  const { data: entries = [] } = useQuery({
    queryKey: ['weight', petId],
    queryFn: () => weightApi.getAll(petId)
  });

  const deleteMutation = useMutation({
    mutationFn: id => weightApi.delete(petId, id),
    onSuccess: () => {
      qc.invalidateQueries(['weight', petId]);
      qc.invalidateQueries(['pet', petId]);
      qc.invalidateQueries(['pets']);
      toast.success('Eintrag gelöscht');
      setDeleteTarget(null);
    }
  });

  // Chart data: ascending order
  const chartData = [...entries]
    .sort((a, b) => new Date(a.entry_date) - new Date(b.entry_date))
    .map(e => ({
      date: format(new Date(e.entry_date), 'dd.MM.yy', { locale: de }),
      weight: parseFloat(e.weight)
    }));

  const currentWeight = entries[0] ? parseFloat(entries[0].weight) : null;
  const minWeight = entries.length ? Math.min(...entries.map(e => parseFloat(e.weight))) : 0;
  const maxWeight = entries.length ? Math.max(...entries.map(e => parseFloat(e.weight))) : 0;
  const avgWeight = entries.length
    ? (entries.reduce((s, e) => s + parseFloat(e.weight), 0) / entries.length).toFixed(2)
    : null;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-gray-900">Gewichtstagebuch</h2>
          {entries.length >= 2 && <TrendBadge entries={entries} />}
        </div>
        <div className="flex gap-2">
          {entries.length > 0 && (
            <button
              onClick={() => exportToExcel(entries, [
                { key: 'entry_date', header: 'Datum', width: 14, format: formatDate },
                { key: 'weight', header: 'Gewicht (kg)', width: 14 },
                { key: 'notes', header: 'Notizen', width: 35 }
              ], 'Gewichtstagebuch')}
              className="btn-secondary btn-sm"
            >
              <Download size={14} /> Excel
            </button>
          )}
          <button onClick={() => setModal({ type: 'new' })} className="btn-primary btn-sm">
            <Plus size={14} /> Eintrag
          </button>
        </div>
      </div>

      {/* Stats row */}
      {entries.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Aktuell', value: currentWeight ? `${currentWeight} kg` : '–', highlight: true },
            { label: 'Minimum', value: `${minWeight} kg` },
            { label: 'Maximum', value: `${maxWeight} kg` },
            { label: 'Durchschnitt', value: avgWeight ? `${avgWeight} kg` : '–' }
          ].map(s => (
            <div key={s.label} className={`rounded-xl p-4 text-center ${s.highlight ? 'bg-primary-50 border border-primary-100' : 'bg-gray-50'}`}>
              <p className={`text-xl font-bold ${s.highlight ? 'text-primary-700' : 'text-gray-800'}`}>{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Chart */}
      {chartData.length >= 2 && (
        <div className="card mb-6 p-5">
          <p className="text-sm font-medium text-gray-600 mb-4">Gewichtsverlauf</p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis
                tick={{ fontSize: 11 }}
                domain={[
                  d => Math.max(0, (d - 0.5).toFixed(1) * 1),
                  d => (d + 0.5).toFixed(1) * 1
                ]}
                unit=" kg"
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="weight"
                stroke="#10b981"
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#10b981', strokeWidth: 0 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Entry list */}
      {entries.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p>Noch keine Gewichtseinträge vorhanden.</p>
          <p className="text-sm mt-1">Das Gewicht aus dem Tier-Profil wird durch den neuesten Eintrag automatisch aktualisiert.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((e, idx) => (
            <div key={e.id} className={`flex items-center gap-4 p-4 rounded-xl border ${idx === 0 ? 'border-primary-200 bg-primary-50' : 'border-gray-100 bg-white'}`}>
              <div className="text-center shrink-0 w-20">
                <p className={`text-xl font-bold ${idx === 0 ? 'text-primary-700' : 'text-gray-800'}`}>
                  {parseFloat(e.weight).toFixed(2)}
                </p>
                <p className="text-xs text-gray-400">kg</p>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-700">
                  {format(new Date(e.entry_date), 'EEEE, d. MMMM yyyy', { locale: de })}
                </p>
                {e.notes && <p className="text-xs text-gray-500 truncate mt-0.5">{e.notes}</p>}
              </div>
              {idx === 0 && (
                <span className="badge bg-primary-100 text-primary-700 shrink-0">Aktuell</span>
              )}
              {idx > 0 && entries[idx - 1] && (() => {
                const diff = parseFloat(e.weight) - parseFloat(entries[idx - 1].weight);
                if (Math.abs(diff) < 0.01) return null;
                return (
                  <span className={`text-xs font-medium shrink-0 ${diff > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                    {diff > 0 ? '+' : ''}{diff.toFixed(2)} kg
                  </span>
                );
              })()}
              <div className="flex gap-1.5 shrink-0">
                <button onClick={() => setModal({ type: 'edit', entry: e })} className="btn-secondary btn-sm">
                  <Pencil size={12} />
                </button>
                <button onClick={() => setDeleteTarget(e)} className="btn-danger btn-sm">
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.type === 'edit' ? 'Gewicht bearbeiten' : 'Gewicht eintragen'} size="md">
        <WeightForm petId={petId} entry={modal?.entry} onClose={() => setModal(null)} />
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate(deleteTarget?.id)}
        title="Eintrag löschen"
        message={`Eintrag vom ${deleteTarget ? format(new Date(deleteTarget.entry_date), 'dd.MM.yyyy') : ''} (${deleteTarget?.weight} kg) wirklich löschen?`}
      />
    </div>
  );
}
