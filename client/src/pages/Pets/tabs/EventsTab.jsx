import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Plus, Pencil, Trash2, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { eventsApi } from '../../../api/pets';
import { exportToExcel, formatDateTime } from '../../../utils/exportExcel';
import Modal from '../../../components/UI/Modal';
import ConfirmDialog from '../../../components/UI/ConfirmDialog';

const CATEGORIES = [
  { value: 'misc', label: 'Sonstiges' },
  { value: 'grooming', label: 'Pflege/Grooming' },
  { value: 'training', label: 'Training' },
  { value: 'social', label: 'Sozialkontakt' },
  { value: 'travel', label: 'Reise' },
  { value: 'surgery', label: 'Operation' },
  { value: 'checkup', label: 'Vorsorge' }
];

const catColors = {
  misc: 'bg-gray-100 text-gray-700', grooming: 'bg-pink-100 text-pink-700',
  training: 'bg-blue-100 text-blue-700', social: 'bg-purple-100 text-purple-700',
  travel: 'bg-teal-100 text-teal-700', surgery: 'bg-red-100 text-red-700',
  checkup: 'bg-emerald-100 text-emerald-700'
};

function EventForm({ petId, event, onClose }) {
  const qc = useQueryClient();
  const { register, handleSubmit, watch } = useForm({
    defaultValues: event ? { ...event, event_date: event.event_date?.slice(0, 16) } : { category: 'misc', reminder_enabled: false }
  });
  const reminderEnabled = watch('reminder_enabled');
  const mutation = useMutation({
    mutationFn: data => event ? eventsApi.update(petId, event.id, data) : eventsApi.create(petId, data),
    onSuccess: () => { qc.invalidateQueries(['events', petId]); toast.success('Gespeichert'); onClose(); },
    onError: e => toast.error(e.response?.data?.error || 'Fehler')
  });

  function onSubmit(data) {
    if (!data.reminder_enabled) data.reminder_at = null;
    mutation.mutate(data);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="form-group col-span-2"><label className="label">Titel *</label><input className="input" {...register('title', { required: true })} /></div>
        <div className="form-group"><label className="label">Datum *</label><input type="datetime-local" className="input" {...register('event_date', { required: true })} /></div>
        <div className="form-group"><label className="label">Bis (optional)</label><input type="datetime-local" className="input" {...register('end_date')} /></div>
        <div className="form-group col-span-2">
          <label className="label">Kategorie</label>
          <select className="input" {...register('category')}>
            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div className="form-group col-span-2"><label className="label">Beschreibung</label><textarea className="input" rows={3} {...register('description')} /></div>
        <div className="flex items-center gap-2 col-span-2">
          <input type="checkbox" id="reminder" {...register('reminder_enabled')} className="w-4 h-4" />
          <label htmlFor="reminder" className="text-sm">Erinnerung aktivieren</label>
        </div>
        {reminderEnabled && <div className="form-group col-span-2"><label className="label">Erinnerungszeitpunkt</label><input type="datetime-local" className="input" {...register('reminder_at')} /></div>}
      </div>
      <div className="flex gap-3 justify-end pt-2">
        <button type="button" onClick={onClose} className="btn-secondary">Abbrechen</button>
        <button type="submit" disabled={mutation.isPending} className="btn-primary">Speichern</button>
      </div>
    </form>
  );
}

export default function EventsTab({ petId }) {
  const [modal, setModal] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const qc = useQueryClient();
  const { data: events = [] } = useQuery({ queryKey: ['events', petId], queryFn: () => eventsApi.getAll(petId) });
  const deleteMutation = useMutation({
    mutationFn: id => eventsApi.delete(petId, id),
    onSuccess: () => { qc.invalidateQueries(['events', petId]); toast.success('Gelöscht'); setDeleteTarget(null); }
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold">Sonstige Ereignisse</h2>
        <div className="flex gap-2">
          {events.length > 0 && (
            <button onClick={() => exportToExcel(events, [
              { key: 'title', header: 'Titel', width: 25 },
              { key: 'event_date', header: 'Datum', width: 18, format: formatDateTime },
              { key: 'end_date', header: 'Bis', width: 18, format: formatDateTime },
              { key: 'category', header: 'Kategorie', width: 15 },
              { key: 'description', header: 'Beschreibung', width: 35 }
            ], 'Ereignisse')} className="btn-secondary btn-sm">
              <Download size={14} /> Excel
            </button>
          )}
          <button onClick={() => setModal({ type: 'new' })} className="btn-primary btn-sm"><Plus size={14} /> Hinzufügen</button>
        </div>
      </div>

      {events.length === 0 ? <p className="text-center text-gray-400 py-8">Noch keine Ereignisse eingetragen</p> : (
        <div className="space-y-3">
          {events.map(e => (
            <div key={e.id} className="card p-4 flex gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium text-gray-900">{e.title}</p>
                  <span className={`badge ${catColors[e.category] || catColors.misc}`}>{CATEGORIES.find(c => c.value === e.category)?.label || e.category}</span>
                </div>
                <p className="text-sm text-gray-500">{format(new Date(e.event_date), 'dd.MM.yyyy HH:mm')}</p>
                {e.description && <p className="text-sm text-gray-600 mt-1">{e.description}</p>}
              </div>
              <div className="flex gap-2 items-start">
                <button onClick={() => setModal({ type: 'edit', event: e })} className="btn-secondary btn-sm"><Pencil size={12} /></button>
                <button onClick={() => setDeleteTarget(e)} className="btn-danger btn-sm"><Trash2 size={12} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.type === 'edit' ? 'Ereignis bearbeiten' : 'Neues Ereignis'} size="lg">
        <EventForm petId={petId} event={modal?.event} onClose={() => setModal(null)} />
      </Modal>
      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={() => deleteMutation.mutate(deleteTarget?.id)} title="Ereignis löschen" message="Ereignis wirklich löschen?" />
    </div>
  );
}
