import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { Plus, Trash2, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { behaviorApi } from '../../../api/pets';
import Modal from '../../../components/UI/Modal';
import ConfirmDialog from '../../../components/UI/ConfirmDialog';
import { RatingStars, RatingBadge } from '../../../components/UI/RatingStars';
import { exportToExcel, formatDate, yesNo } from '../../../utils/exportExcel';

const CATEGORIES = ['Allgemein', 'Fressverhalten', 'Spielverhalten', 'Aggressivität', 'Angst', 'Aktivität', 'Sozialverhalten', 'Schlaf'];

function BehaviorForm({ petId, onClose }) {
  const qc = useQueryClient();
  const { register, handleSubmit, control } = useForm({ defaultValues: { entry_date: new Date().toISOString().split('T')[0], rating: 3 } });
  const mutation = useMutation({
    mutationFn: data => {
      const { files, ...rest } = data;
      return behaviorApi.create(petId, rest, files ? Array.from(files) : []);
    },
    onSuccess: () => { qc.invalidateQueries(['behavior', petId]); toast.success('Eintrag gespeichert'); onClose(); },
    onError: e => toast.error(e.response?.data?.error || 'Fehler')
  });
  return (
    <form onSubmit={handleSubmit(mutation.mutate)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="form-group"><label className="label">Datum *</label><input type="date" className="input" {...register('entry_date', { required: true })} /></div>
        <div className="form-group"><label className="label">Uhrzeit</label><input type="time" className="input" {...register('entry_time')} /></div>
      </div>
      <div className="form-group">
        <label className="label">Bewertung (1=schlecht, 5=sehr gut) *</label>
        <Controller name="rating" control={control} rules={{ required: true }} render={({ field }) => (
          <RatingStars value={field.value} onChange={field.onChange} />
        )} />
      </div>
      <div className="form-group">
        <label className="label">Kategorie</label>
        <select className="input" {...register('category')}>
          <option value="">Allgemein</option>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>
      <div className="form-group"><label className="label">Notizen</label><textarea className="input" rows={3} {...register('notes')} /></div>
      <div className="form-group"><label className="label">Fotos</label><input type="file" accept="image/*" multiple className="input" {...register('files')} /></div>
      <div className="flex gap-3 justify-end pt-2">
        <button type="button" onClick={onClose} className="btn-secondary">Abbrechen</button>
        <button type="submit" disabled={mutation.isPending} className="btn-primary">Speichern</button>
      </div>
    </form>
  );
}

export default function BehaviorTab({ petId }) {
  const [modal, setModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const qc = useQueryClient();
  const { data: entries = [] } = useQuery({ queryKey: ['behavior', petId], queryFn: () => behaviorApi.getAll(petId) });
  const deleteMutation = useMutation({
    mutationFn: id => behaviorApi.delete(petId, id),
    onSuccess: () => { qc.invalidateQueries(['behavior', petId]); toast.success('Gelöscht'); setDeleteTarget(null); }
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold">Verhaltenstagebuch</h2>
        <div className="flex gap-2">
          {entries.length > 0 && (
            <button onClick={() => exportToExcel(entries, [
              { key: 'entry_date', header: 'Datum', width: 12, format: formatDate },
              { key: 'entry_time', header: 'Uhrzeit', width: 10, format: v => v ? v.slice(0, 5) : '' },
              { key: 'rating', header: 'Bewertung (1–5)', width: 18 },
              { key: 'category', header: 'Kategorie', width: 18 },
              { key: 'notes', header: 'Notizen', width: 35 }
            ], 'Verhaltenstagebuch')} className="btn-secondary btn-sm">
              <Download size={14} /> Excel
            </button>
          )}
          <button onClick={() => setModal(true)} className="btn-primary btn-sm"><Plus size={14} /> Eintrag</button>
        </div>
      </div>

      {entries.length === 0 ? (
        <p className="text-center text-gray-400 py-8">Noch keine Einträge</p>
      ) : (
        <div className="space-y-3">
          {entries.map(e => (
            <div key={e.id} className="card p-4 flex gap-4">
              <div className="text-center shrink-0 w-12">
                <p className="text-2xl font-bold" style={{ color: ['#ef4444','#f97316','#eab308','#84cc16','#22c55e'][e.rating-1] }}>{e.rating}</p>
                <p className="text-xs text-gray-400">/ 5</p>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <RatingBadge value={e.rating} />
                  {e.category && <span className="badge bg-purple-100 text-purple-700">{e.category}</span>}
                </div>
                {e.notes && <p className="text-sm text-gray-600 mt-1">{e.notes}</p>}
                <p className="text-xs text-gray-400 mt-1">{format(new Date(e.entry_date), 'dd.MM.yyyy')}{e.entry_time ? ` ${e.entry_time.slice(0, 5)} Uhr` : ''}</p>
              </div>
              <button onClick={() => setDeleteTarget(e)} className="btn-danger btn-sm self-start"><Trash2 size={12} /></button>
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="Neuer Verhaltenseintrag" size="lg">
        <BehaviorForm petId={petId} onClose={() => setModal(false)} />
      </Modal>
      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={() => deleteMutation.mutate(deleteTarget?.id)} title="Eintrag löschen" message="Eintrag wirklich löschen?" />
    </div>
  );
}
