import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Plus, Pencil, Trash2, Clock, CheckCircle, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { vetVisitsApi } from '../../../api/pets';
import Modal from '../../../components/UI/Modal';
import ConfirmDialog from '../../../components/UI/ConfirmDialog';
import { exportToExcel, formatDateTime, yesNo } from '../../../utils/exportExcel';

function VetForm({ petId, visit, onClose }) {
  const qc = useQueryClient();
  const { register, handleSubmit, watch } = useForm({
    defaultValues: visit ? { ...visit, visit_date: visit.visit_date?.slice(0, 16) } : { is_future: false }
  });
  const isFuture = watch('is_future');

  const mutation = useMutation({
    mutationFn: data => visit ? vetVisitsApi.update(petId, visit.id, data) : vetVisitsApi.create(petId, data),
    onSuccess: () => { qc.invalidateQueries(['vet-visits', petId]); toast.success('Gespeichert'); onClose(); },
    onError: e => toast.error(e.response?.data?.error || 'Fehler')
  });

  return (
    <form onSubmit={handleSubmit(mutation.mutate)} className="space-y-4">
      <div className="flex items-center gap-3">
        <input type="checkbox" id="is_future" {...register('is_future')} className="w-4 h-4 text-primary-600" />
        <label htmlFor="is_future" className="text-sm font-medium text-gray-700">Zukünftiger Termin</label>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="form-group col-span-2">
          <label className="label">Datum & Uhrzeit *</label>
          <input type="datetime-local" className="input" {...register('visit_date', { required: true })} />
        </div>
        <div className="form-group col-span-2">
          <label className="label">Grund *</label>
          <textarea className="input" rows={2} {...register('reason', { required: true })} />
        </div>
        {!isFuture && <>
          <div className="form-group col-span-2">
            <label className="label">Diagnose</label>
            <textarea className="input" rows={2} {...register('diagnosis')} />
          </div>
          <div className="form-group col-span-2">
            <label className="label">Behandlung</label>
            <textarea className="input" rows={2} {...register('treatment')} />
          </div>
        </>}
        <div className="form-group">
          <label className="label">Tierarzt</label>
          <input className="input" {...register('vet_name')} />
        </div>
        <div className="form-group">
          <label className="label">Praxis</label>
          <input className="input" {...register('vet_clinic')} />
        </div>
        {!isFuture && <div className="form-group">
          <label className="label">Kosten (€)</label>
          <input type="number" step="0.01" className="input" {...register('cost')} />
        </div>}
        {isFuture && <div className="flex items-center gap-3 col-span-2">
          <input type="checkbox" id="reminder" {...register('reminder_enabled')} className="w-4 h-4" />
          <label htmlFor="reminder" className="text-sm">E-Mail-Erinnerung aktivieren</label>
        </div>}
        <div className="form-group col-span-2">
          <label className="label">Notizen</label>
          <textarea className="input" rows={2} {...register('notes')} />
        </div>
      </div>
      <div className="flex gap-3 justify-end pt-2">
        <button type="button" onClick={onClose} className="btn-secondary">Abbrechen</button>
        <button type="submit" disabled={mutation.isPending} className="btn-primary">Speichern</button>
      </div>
    </form>
  );
}

export default function VetVisitsTab({ petId }) {
  const [modal, setModal] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const qc = useQueryClient();

  const { data: visits = [] } = useQuery({ queryKey: ['vet-visits', petId], queryFn: () => vetVisitsApi.getAll(petId) });

  const deleteMutation = useMutation({
    mutationFn: id => vetVisitsApi.delete(petId, id),
    onSuccess: () => { qc.invalidateQueries(['vet-visits', petId]); toast.success('Gelöscht'); setDeleteTarget(null); }
  });

  const future = visits.filter(v => v.is_future);
  const past = visits.filter(v => !v.is_future);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Tierarztbesuche</h2>
        <div className="flex gap-2">
          {visits.length > 0 && (
            <button onClick={() => exportToExcel(visits, [
              { key: 'visit_date', header: 'Datum', width: 16, format: formatDateTime },
              { key: 'is_future', header: 'Zukünftig', width: 12, format: yesNo },
              { key: 'reason', header: 'Grund', width: 30 },
              { key: 'diagnosis', header: 'Diagnose', width: 30 },
              { key: 'treatment', header: 'Behandlung', width: 30 },
              { key: 'vet_name', header: 'Tierarzt', width: 20 },
              { key: 'vet_clinic', header: 'Praxis', width: 20 },
              { key: 'cost', header: 'Kosten (€)', width: 12 },
              { key: 'notes', header: 'Notizen', width: 30 }
            ], 'Tierarztbesuche')} className="btn-secondary btn-sm">
              <Download size={14} /> Excel
            </button>
          )}
          <button onClick={() => setModal({ type: 'new' })} className="btn-primary btn-sm"><Plus size={14} /> Hinzufügen</button>
        </div>
      </div>

      {future.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-blue-600 mb-3 flex items-center gap-2"><Clock size={14} /> Zukünftige Termine ({future.length})</h3>
          <div className="space-y-3">
            {future.map(v => (
              <div key={v.id} className="border border-blue-200 bg-blue-50 rounded-lg p-4 flex gap-4">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{v.reason}</p>
                  <p className="text-sm text-blue-600 mt-1">{format(new Date(v.visit_date), "dd.MM.yyyy 'um' HH:mm 'Uhr'", { locale: de })}</p>
                  {v.vet_name && <p className="text-xs text-gray-500 mt-1">{v.vet_name}{v.vet_clinic ? ` · ${v.vet_clinic}` : ''}</p>}
                </div>
                <div className="flex gap-2 items-start">
                  <button onClick={() => setModal({ type: 'edit', visit: v })} className="btn-secondary btn-sm"><Pencil size={12} /></button>
                  <button onClick={() => setDeleteTarget(v)} className="btn-danger btn-sm"><Trash2 size={12} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {past.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2"><CheckCircle size={14} /> Vergangene Besuche ({past.length})</h3>
          <div className="space-y-3">
            {past.map(v => (
              <div key={v.id} className="card p-4 flex gap-4">
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <p className="font-medium text-gray-900">{v.reason}</p>
                    <p className="text-xs text-gray-500 ml-4 shrink-0">{format(new Date(v.visit_date), 'dd.MM.yyyy', { locale: de })}</p>
                  </div>
                  {v.diagnosis && <p className="text-sm text-gray-600 mt-1"><span className="font-medium">Diagnose:</span> {v.diagnosis}</p>}
                  {v.treatment && <p className="text-sm text-gray-600"><span className="font-medium">Behandlung:</span> {v.treatment}</p>}
                  {v.vet_name && <p className="text-xs text-gray-400 mt-1">{v.vet_name}{v.vet_clinic ? ` · ${v.vet_clinic}` : ''}{v.cost ? ` · ${v.cost}€` : ''}</p>}
                </div>
                <div className="flex gap-2 items-start">
                  <button onClick={() => setModal({ type: 'edit', visit: v })} className="btn-secondary btn-sm"><Pencil size={12} /></button>
                  <button onClick={() => setDeleteTarget(v)} className="btn-danger btn-sm"><Trash2 size={12} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {visits.length === 0 && <p className="text-center text-gray-400 py-8">Noch keine Tierarztbesuche eingetragen</p>}

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.type === 'edit' ? 'Termin bearbeiten' : 'Neuer Termin'} size="lg">
        <VetForm petId={petId} visit={modal?.visit} onClose={() => setModal(null)} />
      </Modal>
      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={() => deleteMutation.mutate(deleteTarget?.id)} title="Termin löschen" message="Termin wirklich löschen?" />
    </div>
  );
}
