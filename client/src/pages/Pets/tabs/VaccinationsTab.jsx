import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Plus, Pencil, Trash2, AlertTriangle, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { format, isPast, isWithinInterval, addDays } from 'date-fns';
import { vaccinationsApi } from '../../../api/pets';
import { exportToExcel, formatDate, yesNo } from '../../../utils/exportExcel';
import Modal from '../../../components/UI/Modal';
import ConfirmDialog from '../../../components/UI/ConfirmDialog';

function VacForm({ petId, vac, onClose }) {
  const qc = useQueryClient();
  const { register, handleSubmit } = useForm({ defaultValues: vac || {} });
  const mutation = useMutation({
    mutationFn: data => vac ? vaccinationsApi.update(petId, vac.id, data) : vaccinationsApi.create(petId, data),
    onSuccess: () => { qc.invalidateQueries(['vaccinations', petId]); toast.success('Gespeichert'); onClose(); },
    onError: e => toast.error(e.response?.data?.error || 'Fehler')
  });
  return (
    <form onSubmit={handleSubmit(mutation.mutate)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="form-group col-span-2"><label className="label">Impfstoff *</label><input className="input" {...register('vaccine_name', { required: true })} /></div>
        <div className="form-group"><label className="label">Impfdatum *</label><input type="date" className="input" {...register('vaccination_date', { required: true })} /></div>
        <div className="form-group"><label className="label">Nächste Impfung fällig</label><input type="date" className="input" {...register('next_due_date')} /></div>
        <div className="form-group"><label className="label">Chargen-Nr.</label><input className="input" {...register('batch_number')} /></div>
        <div className="form-group"><label className="label">Tierarzt</label><input className="input" {...register('vet_name')} /></div>
        <div className="form-group col-span-2"><label className="label">Notizen</label><textarea className="input" rows={2} {...register('notes')} /></div>
        <div className="flex items-center gap-2 col-span-2">
          <input type="checkbox" id="reminder" {...register('reminder_enabled')} className="w-4 h-4" />
          <label htmlFor="reminder" className="text-sm">E-Mail-Erinnerung bei Fälligkeit</label>
        </div>
      </div>
      <div className="flex gap-3 justify-end pt-2">
        <button type="button" onClick={onClose} className="btn-secondary">Abbrechen</button>
        <button type="submit" disabled={mutation.isPending} className="btn-primary">Speichern</button>
      </div>
    </form>
  );
}

function StatusBadge({ nextDue }) {
  if (!nextDue) return null;
  const d = new Date(nextDue);
  if (isPast(d)) return <span className="badge bg-red-100 text-red-700"><AlertTriangle size={10} /> Überfällig</span>;
  if (isWithinInterval(d, { start: new Date(), end: addDays(new Date(), 30) })) return <span className="badge bg-amber-100 text-amber-700">Bald fällig</span>;
  return <span className="badge bg-green-100 text-green-700">Aktuell</span>;
}

export default function VaccinationsTab({ petId }) {
  const [modal, setModal] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const qc = useQueryClient();
  const { data: vacs = [] } = useQuery({ queryKey: ['vaccinations', petId], queryFn: () => vaccinationsApi.getAll(petId) });
  const deleteMutation = useMutation({
    mutationFn: id => vaccinationsApi.delete(petId, id),
    onSuccess: () => { qc.invalidateQueries(['vaccinations', petId]); toast.success('Gelöscht'); setDeleteTarget(null); }
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold">Impfplan</h2>
        <div className="flex gap-2">
          {vacs.length > 0 && (
            <button onClick={() => exportToExcel(vacs, [
              { key: 'vaccine_name', header: 'Impfstoff', width: 25 },
              { key: 'vaccination_date', header: 'Impfdatum', width: 14, format: formatDate },
              { key: 'next_due_date', header: 'Nächste Fälligkeit', width: 20, format: formatDate },
              { key: 'batch_number', header: 'Chargen-Nr.', width: 16 },
              { key: 'vet_name', header: 'Tierarzt', width: 20 },
              { key: 'notes', header: 'Notizen', width: 30 }
            ], 'Impfplan')} className="btn-secondary btn-sm">
              <Download size={14} /> Excel
            </button>
          )}
          <button onClick={() => setModal({ type: 'new' })} className="btn-primary btn-sm"><Plus size={14} /> Hinzufügen</button>
        </div>
      </div>

      {vacs.length === 0 ? <p className="text-center text-gray-400 py-8">Noch keine Impfungen eingetragen</p> : (
        <div className="space-y-3">
          {vacs.map(v => (
            <div key={v.id} className="card p-4 flex gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <p className="font-medium text-gray-900">{v.vaccine_name}</p>
                  <StatusBadge nextDue={v.next_due_date} />
                </div>
                <p className="text-sm text-gray-500">Geimpft: {format(new Date(v.vaccination_date), 'dd.MM.yyyy')}</p>
                {v.next_due_date && <p className="text-sm text-gray-500">Nächste: {format(new Date(v.next_due_date), 'dd.MM.yyyy')}</p>}
                {v.vet_name && <p className="text-xs text-gray-400 mt-1">{v.vet_name}{v.batch_number ? ` · Charge: ${v.batch_number}` : ''}</p>}
              </div>
              <div className="flex gap-2 items-start">
                <button onClick={() => setModal({ type: 'edit', vac: v })} className="btn-secondary btn-sm"><Pencil size={12} /></button>
                <button onClick={() => setDeleteTarget(v)} className="btn-danger btn-sm"><Trash2 size={12} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.type === 'edit' ? 'Impfung bearbeiten' : 'Neue Impfung'} size="lg">
        <VacForm petId={petId} vac={modal?.vac} onClose={() => setModal(null)} />
      </Modal>
      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={() => deleteMutation.mutate(deleteTarget?.id)} title="Impfung löschen" message="Impfeintrag löschen?" />
    </div>
  );
}
