import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Plus, Pencil, Trash2, Clock, CheckCircle, Paperclip, Download, X, ChevronDown, ChevronUp, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { vetVisitsApi } from '../../../api/pets';
import client from '../../../api/client';
import Modal from '../../../components/UI/Modal';
import ConfirmDialog from '../../../components/UI/ConfirmDialog';
import { exportToExcel, formatDateTime, yesNo } from '../../../utils/exportExcel';

// ── Bearbeiten-Formular ───────────────────────────────────────────────────
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
        <label htmlFor="is_future" className="text-sm font-medium text-gray-700">Zukuenftiger Termin</label>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="form-group col-span-2"><label className="label">Datum &amp; Uhrzeit *</label><input type="datetime-local" className="input" {...register('visit_date', { required: true })} /></div>
        <div className="form-group col-span-2"><label className="label">Grund *</label><textarea className="input" rows={2} {...register('reason', { required: true })} /></div>
        {!isFuture && <>
          <div className="form-group col-span-2"><label className="label">Diagnose</label><textarea className="input" rows={2} {...register('diagnosis')} /></div>
          <div className="form-group col-span-2"><label className="label">Behandlung</label><textarea className="input" rows={2} {...register('treatment')} /></div>
        </>}
        <div className="form-group"><label className="label">Tierarzt</label><input className="input" {...register('vet_name')} /></div>
        <div className="form-group"><label className="label">Praxis</label><input className="input" {...register('vet_clinic')} /></div>
        {!isFuture && <div className="form-group"><label className="label">Kosten (Euro)</label><input type="number" step="0.01" className="input" {...register('cost')} /></div>}
        {isFuture && <div className="flex items-center gap-3 col-span-2">
          <input type="checkbox" id="reminder" {...register('reminder_enabled')} className="w-4 h-4" />
          <label htmlFor="reminder" className="text-sm">E-Mail-Erinnerung aktivieren</label>
        </div>}
        <div className="form-group col-span-2"><label className="label">Notizen</label><textarea className="input" rows={2} {...register('notes')} /></div>
      </div>
      <div className="flex gap-3 justify-end pt-2">
        <button type="button" onClick={onClose} className="btn-secondary">Abbrechen</button>
        <button type="submit" disabled={mutation.isPending} className="btn-primary">Speichern</button>
      </div>
    </form>
  );
}

// ── Anlage-Upload-Formular ────────────────────────────────────────────────
function AttachmentUpload({ petId, visitId, types, onDone }) {
  const qc = useQueryClient();
  const fileRef = useRef();
  const [typeId, setTypeId] = useState(types[0]?.id || '');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  async function handleUpload(e) {
    e.preventDefault();
    if (!file || !typeId) return toast.error('Datei und Typ erforderlich');
    setUploading(true);
    try {
      await vetVisitsApi.uploadAttachment(petId, visitId, file, typeId, description);
      qc.invalidateQueries(['vet-visits', petId]);
      toast.success('Anlage hochgeladen');
      setFile(null); setDescription(''); fileRef.current.value = '';
      onDone?.();
    } catch (e) { toast.error(e.response?.data?.error || 'Fehler'); }
    finally { setUploading(false); }
  }

  return (
    <form onSubmit={handleUpload} className="bg-gray-50 rounded-lg p-3 mt-3 space-y-2">
      <p className="text-xs font-medium text-gray-600">Neue Anlage hinzufuegen</p>
      <div className="flex gap-2 flex-wrap">
        <select value={typeId} onChange={e => setTypeId(e.target.value)} className="input flex-1 min-w-32 text-sm">
          {types.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
        <input ref={fileRef} type="file" className="input flex-1 min-w-40 text-sm" onChange={e => setFile(e.target.files?.[0] || null)} />
        <input type="text" placeholder="Beschreibung (optional)" className="input flex-1 min-w-40 text-sm" value={description} onChange={e => setDescription(e.target.value)} />
        <button type="submit" disabled={uploading || !file} className="btn-primary btn-sm shrink-0">
          {uploading ? 'Hochladen...' : 'Hochladen'}
        </button>
      </div>
    </form>
  );
}

// ── Anlage-Zeile ──────────────────────────────────────────────────────────
const IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic'];

function fileExt(filename) {
  return (filename || '').toLowerCase().match(/\.[^.]+$/)?.[0] || '';
}

function canPreview(filename) {
  const ext = fileExt(filename);
  return ext === '.pdf' || IMAGE_EXTS.includes(ext);
}

function AttachmentPreviewModal({ petId, visitId, att, onClose }) {
  const [blobUrl, setBlobUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const isPdf = fileExt(att.original_filename) === '.pdf';

  // Datei mit Auth-Header laden und als Blob-URL bereitstellen
  useEffect(() => {
    let objectUrl;
    client.get(`/pets/${petId}/vet-visits/${visitId}/attachments/${att.id}/view`, { responseType: 'blob' })
      .then(res => {
        objectUrl = URL.createObjectURL(res.data);
        setBlobUrl(objectUrl);
      })
      .catch(() => setError('Vorschau konnte nicht geladen werden.'))
      .finally(() => setLoading(false));

    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, []);

  function handleDownload() {
    if (!blobUrl) return;
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = att.original_filename || 'anlage';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative z-10 bg-white rounded-xl shadow-2xl flex flex-col"
           style={{ width: '90vw', maxWidth: 960, height: '90vh' }}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
          <span className="text-sm font-medium text-gray-800 truncate">{att.original_filename || 'Vorschau'}</span>
          <div className="flex gap-2">
            <button onClick={handleDownload} disabled={!blobUrl} className="btn-secondary btn-sm">
              <Download size={13} /> Herunterladen
            </button>
            <button onClick={onClose} className="btn-secondary btn-sm"><X size={13} /></button>
          </div>
        </div>
        <div className="flex-1 overflow-hidden p-2 flex items-center justify-center">
          {loading && <p className="text-gray-400 text-sm">Lade Vorschau...</p>}
          {error   && <p className="text-red-500 text-sm">{error}</p>}
          {blobUrl && isPdf && (
            <iframe src={blobUrl} title={att.original_filename} className="w-full h-full rounded border-0" />
          )}
          {blobUrl && !isPdf && (
            <img src={blobUrl} alt={att.original_filename} className="max-w-full max-h-full object-contain rounded" />
          )}
        </div>
      </div>
    </div>
  );
}

function AttachmentRow({ petId, visitId, att, types, onDeleted }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [preview, setPreview] = useState(false);
  const [typeId, setTypeId] = useState(att.type_id);
  const [desc, setDesc] = useState(att.description || '');

  const deleteMutation = useMutation({
    mutationFn: () => vetVisitsApi.deleteAttachment(petId, visitId, att.id),
    onSuccess: () => { qc.invalidateQueries(['vet-visits', petId]); toast.success('Anlage geloescht'); onDeleted?.(); }
  });

  const updateMutation = useMutation({
    mutationFn: () => vetVisitsApi.updateAttachment(petId, visitId, att.id, { type_id: typeId, description: desc }),
    onSuccess: () => { qc.invalidateQueries(['vet-visits', petId]); setEditing(false); toast.success('Gespeichert'); }
  });

  const typeName = att.AttachmentType?.label || types.find(t => t.id === att.type_id)?.label || 'Unbekannt';

  async function handleDownload() {
    try {
      const res = await client.get(
        `/pets/${petId}/vet-visits/${visitId}/attachments/${att.id}/download`,
        { responseType: 'blob' }
      );
      const url = URL.createObjectURL(res.data);
      const a   = document.createElement('a');
      a.href     = url;
      a.download = att.original_filename || 'anlage';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch { toast.error('Download fehlgeschlagen'); }
  }

  if (editing) {
    return (
      <div className="flex gap-2 items-center bg-blue-50 rounded-lg p-2">
        <select value={typeId} onChange={e => setTypeId(parseInt(e.target.value))} className="input text-xs flex-shrink-0 w-36">
          {types.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
        <input value={desc} onChange={e => setDesc(e.target.value)} className="input text-xs flex-1" placeholder="Beschreibung" />
        <button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending} className="btn-primary btn-sm">OK</button>
        <button onClick={() => setEditing(false)} className="btn-secondary btn-sm"><X size={12} /></button>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-2 py-1.5 text-sm">
        <span className="badge bg-indigo-100 text-indigo-700 shrink-0">{typeName}</span>
        <span className="text-gray-700 truncate flex-1">{att.original_filename || 'Anlage'}</span>
        {att.description && <span className="text-gray-400 text-xs truncate max-w-32">{att.description}</span>}
        {att.file_size && <span className="text-gray-400 text-xs shrink-0">{(att.file_size / 1024).toFixed(0)} KB</span>}
        <div className="flex gap-1 shrink-0">
          {canPreview(att.original_filename) && (
            <button onClick={() => setPreview(true)} className="btn-secondary btn-sm" title="Vorschau anzeigen">
              <Eye size={11} />
            </button>
          )}
          <button onClick={handleDownload} className="btn-secondary btn-sm" title="Herunterladen">
            <Download size={11} />
          </button>
          <button onClick={() => setEditing(true)} className="btn-secondary btn-sm" title="Bearbeiten"><Pencil size={11} /></button>
          <button onClick={() => deleteMutation.mutate()} className="btn-danger btn-sm" title="Loeschen"><Trash2 size={11} /></button>
        </div>
      </div>
      {preview && <AttachmentPreviewModal petId={petId} visitId={visitId} att={att} onClose={() => setPreview(false)} />}
    </>
  );
}

// ── Besuchs-Karte ─────────────────────────────────────────────────────────
function VisitCard({ visit, petId, types, highlighted, onEdit, onDelete }) {
  const [open, setOpen] = useState(highlighted);
  const [showUpload, setShowUpload] = useState(false);
  const attachments = visit.VetVisitAttachments || [];

  return (
    <div className={`card p-4 border-l-4 transition-all ${highlighted ? 'border-primary-500 ring-2 ring-primary-200' : visit.is_future ? 'border-blue-300 bg-blue-50/40' : 'border-gray-200'}`}>
      {/* Kopfzeile */}
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium text-gray-900">{visit.reason}</p>
            {visit.is_future && <span className="badge bg-blue-100 text-blue-700 flex items-center gap-1"><Clock size={10} /> Geplant</span>}
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            {format(new Date(visit.visit_date), "dd.MM.yyyy 'um' HH:mm 'Uhr'", { locale: de })}
            {visit.vet_name && ` — ${visit.vet_name}${visit.vet_clinic ? ` (${visit.vet_clinic})` : ''}`}
          </p>
          {!visit.is_future && visit.diagnosis && <p className="text-sm text-gray-600 mt-1"><span className="font-medium">Diagnose:</span> {visit.diagnosis}</p>}
          {!visit.is_future && visit.treatment && <p className="text-sm text-gray-600"><span className="font-medium">Behandlung:</span> {visit.treatment}</p>}
          {visit.notes && <p className="text-xs text-gray-400 mt-1">{visit.notes}</p>}
          {!visit.is_future && visit.cost && <p className="text-xs text-gray-400">{visit.cost} Euro</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {attachments.length > 0 && (
            <button onClick={() => setOpen(o => !o)} className="flex items-center gap-1 text-xs text-gray-500 hover:text-primary-600 transition-colors">
              <Paperclip size={12} /> {attachments.length}
              {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          )}
          <button onClick={onEdit} className="btn-secondary btn-sm"><Pencil size={12} /></button>
          <button onClick={onDelete} className="btn-danger btn-sm"><Trash2 size={12} /></button>
        </div>
      </div>

      {/* Anlage-Toggle-Button wenn keine Anlagen vorhanden */}
      {!open && (
        <button onClick={() => setOpen(true)} className="mt-2 text-xs text-gray-400 hover:text-primary-600 flex items-center gap-1">
          <Paperclip size={11} /> Anlagen ansehen / hinzufuegen
        </button>
      )}

      {/* Anlagenbereich */}
      {open && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          {attachments.length > 0 && (
            <div className="space-y-1 mb-2 divide-y divide-gray-50">
              {attachments.map(att => (
                <AttachmentRow key={att.id} petId={petId} visitId={visit.id} att={att} types={types} />
              ))}
            </div>
          )}
          {showUpload ? (
            <AttachmentUpload petId={petId} visitId={visit.id} types={types} onDone={() => setShowUpload(false)} />
          ) : (
            <button onClick={() => setShowUpload(true)} className="btn-secondary btn-sm mt-1">
              <Plus size={12} /> Anlage hinzufuegen
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Haupt-Tab ─────────────────────────────────────────────────────────────
export default function VetVisitsTab({ petId }) {
  const [modal, setModal] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [highlightedId, setHighlightedId] = useState(null);
  const qc = useQueryClient();

  const { data: visits = [] } = useQuery({ queryKey: ['vet-visits', petId], queryFn: () => vetVisitsApi.getAll(petId) });
  const { data: quickActions = [] } = useQuery({ queryKey: ['vet-qa', petId], queryFn: () => vetVisitsApi.getQuickActions(petId) });
  const { data: types = [] } = useQuery({ queryKey: ['attachment-types'], queryFn: vetVisitsApi.getAttachmentTypes, staleTime: Infinity });

  const deleteMutation = useMutation({
    mutationFn: id => vetVisitsApi.delete(petId, id),
    onSuccess: () => { qc.invalidateQueries(['vet-visits', petId]); toast.success('Geloescht'); setDeleteTarget(null); }
  });

  const future = visits.filter(v => v.is_future);
  const past   = visits.filter(v => !v.is_future);

  function handleQuickAction(action) {
    if (!action.lastVisitId) return;
    setHighlightedId(action.lastVisitId);
    setTimeout(() => {
      const el = document.getElementById(`visit-${action.lastVisitId}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
    setTimeout(() => setHighlightedId(null), 3000);
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Tierarztbesuche</h2>
        <div className="flex gap-2">
          {visits.length > 0 && (
            <button onClick={() => exportToExcel(visits, [
              { key: 'visit_date', header: 'Datum', width: 16, format: formatDateTime },
              { key: 'is_future', header: 'Geplant', width: 10, format: yesNo },
              { key: 'reason', header: 'Grund', width: 30 },
              { key: 'diagnosis', header: 'Diagnose', width: 30 },
              { key: 'treatment', header: 'Behandlung', width: 30 },
              { key: 'vet_name', header: 'Tierarzt', width: 20 },
              { key: 'cost', header: 'Kosten (Euro)', width: 14 }
            ], 'Tierarztbesuche')} className="btn-secondary btn-sm">
              <Download size={14} /> Excel
            </button>
          )}
          <button onClick={() => setModal({ type: 'new' })} className="btn-primary btn-sm"><Plus size={14} /> Hinzufuegen</button>
        </div>
      </div>

      {/* Quick Actions */}
      {quickActions.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-5">
          {quickActions.map(action => (
            <button
              key={action.name}
              onClick={() => handleQuickAction(action)}
              disabled={!action.lastVisitId}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                action.lastVisitId
                  ? 'bg-white border-primary-300 text-primary-700 hover:bg-primary-50'
                  : 'bg-gray-50 border-gray-200 text-gray-400 cursor-default'
              }`}
              title={action.lastVisitId ? `Zum letzten Eintrag springen` : 'Kein passender Eintrag vorhanden'}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}

      {future.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-blue-600 mb-3 flex items-center gap-2"><Clock size={14} /> Geplante Termine ({future.length})</h3>
          <div className="space-y-3">
            {future.map(v => (
              <div key={v.id} id={`visit-${v.id}`}>
                <VisitCard visit={v} petId={petId} types={types} highlighted={highlightedId === v.id}
                  onEdit={() => setModal({ type: 'edit', visit: v })}
                  onDelete={() => setDeleteTarget(v)} />
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
              <div key={v.id} id={`visit-${v.id}`}>
                <VisitCard visit={v} petId={petId} types={types} highlighted={highlightedId === v.id}
                  onEdit={() => setModal({ type: 'edit', visit: v })}
                  onDelete={() => setDeleteTarget(v)} />
              </div>
            ))}
          </div>
        </div>
      )}

      {visits.length === 0 && <p className="text-center text-gray-400 py-8">Noch keine Tierarztbesuche eingetragen</p>}

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.type === 'edit' ? 'Termin bearbeiten' : 'Neuer Termin'} size="lg">
        <VetForm petId={petId} visit={modal?.visit} onClose={() => setModal(null)} />
      </Modal>
      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={() => deleteMutation.mutate(deleteTarget?.id)} title="Termin loeschen" message="Termin und alle Anlagen loeschen?" />
    </div>
  );
}
