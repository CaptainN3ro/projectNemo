import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Plus, Pencil, Trash2, CheckCircle, XCircle, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { medicationsApi } from '../../../api/pets';
import { exportToExcel, formatDate, yesNo } from '../../../utils/exportExcel';
import Modal from '../../../components/UI/Modal';
import ConfirmDialog from '../../../components/UI/ConfirmDialog';

function MedForm({ petId, med, onClose }) {
  const qc = useQueryClient();
  const { register, handleSubmit } = useForm({ defaultValues: med || { active: true } });
  const mutation = useMutation({
    mutationFn: data => med ? medicationsApi.update(petId, med.id, data) : medicationsApi.create(petId, data),
    onSuccess: () => { qc.invalidateQueries(['medications', petId]); toast.success('Gespeichert'); onClose(); },
    onError: e => toast.error(e.response?.data?.error || 'Fehler')
  });
  return (
    <form onSubmit={handleSubmit(mutation.mutate)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="form-group col-span-2"><label className="label">Medikament *</label><input className="input" {...register('name', { required: true })} /></div>
        <div className="form-group"><label className="label">Dosierung</label><input className="input" placeholder="z.B. 5" {...register('dosage')} /></div>
        <div className="form-group"><label className="label">Einheit</label><input className="input" placeholder="mg, ml, Tablette..." {...register('unit')} /></div>
        <div className="form-group"><label className="label">Häufigkeit</label><input className="input" placeholder="z.B. täglich" {...register('frequency')} /></div>
        <div className="form-group"><label className="label">Mal pro Tag</label><input type="number" className="input" {...register('times_per_day')} /></div>
        <div className="form-group"><label className="label">Von</label><input type="date" className="input" {...register('start_date')} /></div>
        <div className="form-group"><label className="label">Bis</label><input type="date" className="input" {...register('end_date')} /></div>
        <div className="form-group col-span-2"><label className="label">Notizen</label><textarea className="input" rows={2} {...register('notes')} /></div>
        <div className="flex items-center gap-2 col-span-2">
          <input type="checkbox" id="active" {...register('active')} className="w-4 h-4" />
          <label htmlFor="active" className="text-sm">Aktiv</label>
        </div>
      </div>
      <div className="flex gap-3 justify-end pt-2">
        <button type="button" onClick={onClose} className="btn-secondary">Abbrechen</button>
        <button type="submit" disabled={mutation.isPending} className="btn-primary">Speichern</button>
      </div>
    </form>
  );
}

export default function MedicationsTab({ petId }) {
  const [modal, setModal] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const qc = useQueryClient();
  const { data: meds = [] } = useQuery({ queryKey: ['medications', petId], queryFn: () => medicationsApi.getAll(petId) });
  const deleteMutation = useMutation({
    mutationFn: id => medicationsApi.delete(petId, id),
    onSuccess: () => { qc.invalidateQueries(['medications', petId]); toast.success('Gelöscht'); setDeleteTarget(null); }
  });

  const active = meds.filter(m => m.active);
  const inactive = meds.filter(m => !m.active);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold">Medikamentenpläne</h2>
        <div className="flex gap-2">
          {meds.length > 0 && (
            <button onClick={() => exportToExcel(meds, [
              { key: 'name', header: 'Medikament', width: 25 },
              { key: 'dosage', header: 'Dosierung', width: 12 },
              { key: 'unit', header: 'Einheit', width: 10 },
              { key: 'frequency', header: 'Häufigkeit', width: 16 },
              { key: 'times_per_day', header: 'Mal/Tag', width: 10 },
              { key: 'start_date', header: 'Von', width: 12, format: formatDate },
              { key: 'end_date', header: 'Bis', width: 12, format: formatDate },
              { key: 'active', header: 'Aktiv', width: 8, format: yesNo },
              { key: 'notes', header: 'Notizen', width: 30 }
            ], 'Medikamente')} className="btn-secondary btn-sm">
              <Download size={14} /> Excel
            </button>
          )}
          <button onClick={() => setModal({ type: 'new' })} className="btn-primary btn-sm"><Plus size={14} /> Hinzufügen</button>
        </div>
      </div>

      {active.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-green-600 mb-3 flex items-center gap-2"><CheckCircle size={14} /> Aktive Medikamente</h3>
          <div className="space-y-2">
            {active.map(m => (
              <div key={m.id} className="card p-4 flex items-center gap-4 border-l-4 border-green-400">
                <div className="flex-1">
                  <p className="font-medium">{m.name}</p>
                  <p className="text-sm text-gray-500">{[m.dosage && `${m.dosage} ${m.unit || ''}`, m.frequency, m.times_per_day && `${m.times_per_day}× täglich`].filter(Boolean).join(' · ')}</p>
                  {(m.start_date || m.end_date) && <p className="text-xs text-gray-400">{m.start_date ? format(new Date(m.start_date), 'dd.MM.yyyy') : '?'} – {m.end_date ? format(new Date(m.end_date), 'dd.MM.yyyy') : 'offen'}</p>}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setModal({ type: 'edit', med: m })} className="btn-secondary btn-sm"><Pencil size={12} /></button>
                  <button onClick={() => setDeleteTarget(m)} className="btn-danger btn-sm"><Trash2 size={12} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {inactive.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2"><XCircle size={14} /> Inaktive Medikamente</h3>
          <div className="space-y-2">
            {inactive.map(m => (
              <div key={m.id} className="card p-4 flex items-center gap-4 opacity-60">
                <div className="flex-1">
                  <p className="font-medium text-gray-500">{m.name}</p>
                  <p className="text-sm text-gray-400">{[m.dosage && `${m.dosage} ${m.unit || ''}`, m.frequency].filter(Boolean).join(' · ')}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setModal({ type: 'edit', med: m })} className="btn-secondary btn-sm"><Pencil size={12} /></button>
                  <button onClick={() => setDeleteTarget(m)} className="btn-danger btn-sm"><Trash2 size={12} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {meds.length === 0 && <p className="text-center text-gray-400 py-8">Noch keine Medikamente eingetragen</p>}

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.type === 'edit' ? 'Medikament bearbeiten' : 'Neues Medikament'} size="lg">
        <MedForm petId={petId} med={modal?.med} onClose={() => setModal(null)} />
      </Modal>
      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={() => deleteMutation.mutate(deleteTarget?.id)} title="Medikament löschen" message={`"${deleteTarget?.name}" wirklich löschen?`} />
    </div>
  );
}
