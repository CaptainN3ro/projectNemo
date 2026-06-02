import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { Plus, Download, Trash2, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { bloodWorkApi } from '../../../api/pets';
import Modal from '../../../components/UI/Modal';
import ConfirmDialog from '../../../components/UI/ConfirmDialog';
import { RatingStars, RatingBadge } from '../../../components/UI/RatingStars';
import { exportToExcel, formatDate } from '../../../utils/exportExcel';

function BloodWorkForm({ petId, onClose }) {
  const qc = useQueryClient();
  const { register, handleSubmit, watch, control } = useForm();
  const file = watch('file')?.[0];
  const rating = watch('rating');

  const mutation = useMutation({
    mutationFn: data => bloodWorkApi.upload(
      petId,
      data.file[0],
      {
        exam_date: data.exam_date,
        description: data.description || '',
        ...(data.rating ? { rating: data.rating } : {})
      }
    ),
    onSuccess: () => { qc.invalidateQueries(['blood-work', petId]); toast.success('Blutbild hochgeladen'); onClose(); },
    onError: e => toast.error(e.response?.data?.error || 'Fehler')
  });

  return (
    <form onSubmit={handleSubmit(mutation.mutate)} className="space-y-4">
      <div className="form-group">
        <label className="label">Untersuchungsdatum *</label>
        <input type="date" className="input" {...register('exam_date', { required: true })} />
      </div>

      <div className="form-group">
        <label className="label">Bewertung (optional)</label>
        <Controller name="rating" control={control} render={({ field }) => (
          <RatingStars value={field.value} onChange={field.onChange} />
        )} />
        {rating && <div className="mt-1"><RatingBadge value={parseInt(rating)} /></div>}
        <p className="text-xs text-gray-400 mt-1">Eigene Einschätzung des Ergebnisses</p>
      </div>

      <div className="form-group">
        <label className="label">PDF-Datei *</label>
        <input type="file" accept=".pdf" className="input" {...register('file', { required: true })} />
        {file && <p className="text-xs text-gray-500 mt-1">{file.name}</p>}
      </div>

      <div className="form-group">
        <label className="label">Beschreibung / Befund</label>
        <textarea className="input" rows={3} placeholder="Auffälligkeiten, Diagnose, Hinweise..." {...register('description')} />
      </div>

      <div className="flex gap-3 justify-end pt-2">
        <button type="button" onClick={onClose} className="btn-secondary">Abbrechen</button>
        <button type="submit" disabled={mutation.isPending} className="btn-primary">Hochladen</button>
      </div>
    </form>
  );
}

const ratingColors = ['', 'bg-red-50 border-red-200', 'bg-orange-50 border-orange-200', 'bg-yellow-50 border-yellow-200', 'bg-lime-50 border-lime-200', 'bg-green-50 border-green-200'];

export default function BloodWorkTab({ petId }) {
  const [modal, setModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const qc = useQueryClient();
  const { data: records = [] } = useQuery({ queryKey: ['blood-work', petId], queryFn: () => bloodWorkApi.getAll(petId) });

  const deleteMutation = useMutation({
    mutationFn: id => bloodWorkApi.delete(petId, id),
    onSuccess: () => { qc.invalidateQueries(['blood-work', petId]); toast.success('Gelöscht'); setDeleteTarget(null); }
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold">Blutbilder</h2>
        <div className="flex gap-2">
          {records.length > 0 && (
            <button onClick={() => exportToExcel(records, [
              { key: 'exam_date', header: 'Datum', width: 14, format: formatDate },
              { key: 'rating', header: 'Bewertung (1–5)', width: 18, format: v => v ?? '' },
              { key: 'original_filename', header: 'Dateiname', width: 30 },
              { key: 'description', header: 'Beschreibung', width: 40 }
            ], 'Blutbilder')} className="btn-secondary btn-sm">
              <FileText size={14} /> Excel
            </button>
          )}
          <button onClick={() => setModal(true)} className="btn-primary btn-sm"><Plus size={14} /> Hochladen</button>
        </div>
      </div>

      {records.length === 0 ? (
        <p className="text-center text-gray-400 py-8">Noch keine Blutbilder hochgeladen</p>
      ) : (
        <div className="space-y-3">
          {records.map(r => (
            <div key={r.id} className={`card p-4 flex items-start gap-4 border ${r.rating ? ratingColors[r.rating] : ''}`}>
              <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center shrink-0 mt-0.5">
                <FileText size={18} className="text-red-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <p className="font-medium text-gray-900">{r.original_filename || 'Blutbild.pdf'}</p>
                  {r.rating && <RatingBadge value={r.rating} />}
                </div>
                <p className="text-sm text-gray-500">
                  {format(new Date(r.exam_date), 'd. MMMM yyyy', { locale: de })}
                </p>
                {r.description && <p className="text-sm text-gray-600 mt-1 line-clamp-2">{r.description}</p>}
              </div>
              <div className="flex gap-2 shrink-0">
                <a
                  href={bloodWorkApi.download(petId, r.id)}
                  download
                  className="btn-secondary btn-sm"
                >
                  <Download size={12} /> Laden
                </a>
                <button onClick={() => setDeleteTarget(r)} className="btn-danger btn-sm"><Trash2 size={12} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="Blutbild hochladen">
        <BloodWorkForm petId={petId} onClose={() => setModal(false)} />
      </Modal>
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate(deleteTarget?.id)}
        title="Blutbild löschen"
        message="Blutbild und PDF unwiderruflich löschen?"
      />
    </div>
  );
}
