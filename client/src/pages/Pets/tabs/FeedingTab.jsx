import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, useFieldArray } from 'react-hook-form';
import { Plus, Trash2, Pencil, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { feedingApi } from '../../../api/pets';
import Modal from '../../../components/UI/Modal';
import ConfirmDialog from '../../../components/UI/ConfirmDialog';

function FeedingForm({ petId, plan, onClose }) {
  const qc = useQueryClient();
  const { register, handleSubmit, control } = useForm({
    defaultValues: plan ? { ...plan, entries: plan.FeedingEntries || [] } : { active: true, entries: [{ food_type: '', amount: '', unit: '', time_of_day: '' }] }
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'entries' });
  const mutation = useMutation({
    mutationFn: data => {
      const sanitized = {
        ...data,
        entries: (data.entries || []).map(e => ({ ...e, amount: e.amount === '' ? null : e.amount }))
      };
      return plan ? feedingApi.update(petId, plan.id, sanitized) : feedingApi.create(petId, sanitized);
    },
    onSuccess: () => { qc.invalidateQueries(['feeding', petId]); toast.success('Gespeichert'); onClose(); },
    onError: e => toast.error(e.response?.data?.error || 'Fehler')
  });
  return (
    <form onSubmit={handleSubmit(mutation.mutate)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="form-group col-span-2"><label className="label">Plan-Name *</label><input className="input" {...register('name', { required: true })} /></div>
        <div className="flex items-center gap-2 col-span-2">
          <input type="checkbox" id="active" {...register('active')} className="w-4 h-4" />
          <label htmlFor="active" className="text-sm">Aktiver Plan</label>
        </div>
        <div className="form-group col-span-2"><label className="label">Notizen</label><textarea className="input" rows={2} {...register('notes')} /></div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="label mb-0">Mahlzeiten</label>
          <button type="button" onClick={() => append({ food_type: '', amount: '', unit: '', time_of_day: '', notes: '' })} className="btn-secondary btn-sm"><Plus size={12} /> Mahlzeit</button>
        </div>
        <div className="space-y-2">
          {fields.map((field, i) => (
            <div key={field.id} className="flex gap-2 items-center bg-gray-50 p-3 rounded-lg">
              <input type="time" className="input w-28" placeholder="Uhrzeit" {...register(`entries.${i}.time_of_day`)} />
              <input className="input flex-1" placeholder="Futter/Nahrung *" {...register(`entries.${i}.food_type`, { required: true })} />
              <input type="number" className="input w-20" placeholder="Menge" {...register(`entries.${i}.amount`)} />
              <input className="input w-20" placeholder="g/ml..." {...register(`entries.${i}.unit`)} />
              <button type="button" onClick={() => remove(i)} className="btn-danger btn-sm"><Trash2 size={12} /></button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3 justify-end pt-2">
        <button type="button" onClick={onClose} className="btn-secondary">Abbrechen</button>
        <button type="submit" disabled={mutation.isPending} className="btn-primary">Speichern</button>
      </div>
    </form>
  );
}

export default function FeedingTab({ petId }) {
  const [modal, setModal] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const qc = useQueryClient();
  const { data: plans = [] } = useQuery({ queryKey: ['feeding', petId], queryFn: () => feedingApi.getAll(petId) });
  const deleteMutation = useMutation({
    mutationFn: id => feedingApi.delete(petId, id),
    onSuccess: () => { qc.invalidateQueries(['feeding', petId]); toast.success('Gelöscht'); setDeleteTarget(null); }
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold">Futterplan</h2>
        <button onClick={() => setModal({ type: 'new' })} className="btn-primary btn-sm"><Plus size={14} /> Neuer Plan</button>
      </div>

      {plans.length === 0 ? <p className="text-center text-gray-400 py-8">Noch kein Futterplan erstellt</p> : (
        <div className="space-y-4">
          {plans.map(plan => (
            <div key={plan.id} className={`card p-5 border-l-4 ${plan.active ? 'border-primary-400' : 'border-gray-200 opacity-60'}`}>
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900">{plan.name}</h3>
                  {!plan.active && <span className="badge bg-gray-100 text-gray-500">Inaktiv</span>}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setModal({ type: 'edit', plan })} className="btn-secondary btn-sm"><Pencil size={12} /></button>
                  <button onClick={() => setDeleteTarget(plan)} className="btn-danger btn-sm"><Trash2 size={12} /></button>
                </div>
              </div>
              {plan.FeedingEntries?.length > 0 && (
                <div className="space-y-2">
                  {plan.FeedingEntries.map(e => (
                    <div key={e.id} className="flex items-center gap-3 text-sm">
                      {e.time_of_day && <span className="flex items-center gap-1 text-gray-400 w-14 shrink-0"><Clock size={12} />{e.time_of_day.slice(0, 5)}</span>}
                      <span className="font-medium text-gray-800">{e.food_type}</span>
                      {e.amount && <span className="text-gray-500">{e.amount} {e.unit}</span>}
                    </div>
                  ))}
                </div>
              )}
              {plan.notes && <p className="text-xs text-gray-400 mt-2">{plan.notes}</p>}
            </div>
          ))}
        </div>
      )}

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.type === 'edit' ? 'Plan bearbeiten' : 'Neuer Futterplan'} size="lg">
        <FeedingForm petId={petId} plan={modal?.plan} onClose={() => setModal(null)} />
      </Modal>
      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={() => deleteMutation.mutate(deleteTarget?.id)} title="Plan löschen" message={`"${deleteTarget?.name}" wirklich löschen?`} />
    </div>
  );
}
