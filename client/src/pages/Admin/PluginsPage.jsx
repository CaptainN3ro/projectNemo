import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDropzone } from 'react-dropzone';
import { Upload, Trash2, Power, PowerOff, Puzzle, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { adminPluginsApi } from '../../api/admin';
import ConfirmDialog from '../../components/UI/ConfirmDialog';

function DropZone({ onInstall, isUploading }) {
  const onDrop = useCallback(files => { if (files[0]) onInstall(files[0]); }, [onInstall]);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'application/zip': ['.zip'] }, multiple: false });

  return (
    <div {...getRootProps()} className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${isDragActive ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-primary-400 hover:bg-gray-50'}`}>
      <input {...getInputProps()} />
      <Upload size={32} className="mx-auto text-gray-400 mb-3" />
      <p className="font-medium text-gray-700">{isDragActive ? 'ZIP hier ablegen' : 'Plugin installieren'}</p>
      <p className="text-sm text-gray-400 mt-1">ZIP-Datei hierher ziehen oder klicken</p>
      {isUploading && <p className="text-sm text-primary-600 mt-2">Installiere...</p>}
    </div>
  );
}

export default function PluginsPage() {
  const [deleteTarget, setDeleteTarget] = useState(null);
  const qc = useQueryClient();

  const { data: plugins = [] } = useQuery({ queryKey: ['admin-plugins'], queryFn: adminPluginsApi.getAll });

  const installMutation = useMutation({
    mutationFn: file => adminPluginsApi.install(file),
    onSuccess: () => { qc.invalidateQueries(['admin-plugins']); qc.invalidateQueries(['active-plugins']); toast.success('Plugin installiert'); },
    onError: e => toast.error(e.response?.data?.error || 'Installation fehlgeschlagen')
  });

  const toggleMutation = useMutation({
    mutationFn: id => adminPluginsApi.toggle(id),
    onSuccess: () => { qc.invalidateQueries(['admin-plugins']); qc.invalidateQueries(['active-plugins']); }
  });

  const uninstallMutation = useMutation({
    mutationFn: id => adminPluginsApi.uninstall(id),
    onSuccess: () => { qc.invalidateQueries(['admin-plugins']); qc.invalidateQueries(['active-plugins']); toast.success('Plugin deinstalliert'); setDeleteTarget(null); },
    onError: e => toast.error(e.response?.data?.error || 'Fehler')
  });

  return (
    <div>
      <div className="mb-6">
        <DropZone onInstall={installMutation.mutate} isUploading={installMutation.isPending} />
      </div>

      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-medium text-gray-700">Installierte Plugins ({plugins.length})</h3>
      </div>

      {plugins.length === 0 ? (
        <div className="card text-center py-12">
          <Puzzle size={40} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400">Noch keine Plugins installiert</p>
          <p className="text-sm text-gray-400 mt-1">Lade eine Plugin-ZIP-Datei hoch, um zu beginnen</p>
        </div>
      ) : (
        <div className="space-y-3">
          {plugins.map(p => (
            <div key={p.id} className={`card p-5 flex items-start gap-4 ${!p.active ? 'opacity-60' : ''}`}>
              <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                {p.icon_path ? <img src={p.icon_path} alt="" className="w-8 h-8" /> : <Puzzle size={22} className="text-gray-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-gray-900">{p.long_name}</h4>
                  {p.version && <span className="badge bg-gray-100 text-gray-500">v{p.version}</span>}
                  <span className={`badge ${p.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {p.active ? 'Aktiv' : 'Deaktiviert'}
                  </span>
                </div>
                {p.description && <p className="text-sm text-gray-500 mt-1">{p.description}</p>}
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                  {p.author && <span>von {p.author_link ? <a href={p.author_link} target="_blank" rel="noopener" className="text-primary-600 hover:underline inline-flex items-center gap-1">{p.author} <ExternalLink size={10} /></a> : p.author}</span>}
                  <span>Installiert: {format(new Date(p.installed_at), 'dd.MM.yyyy')}</span>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => toggleMutation.mutate(p.id)}
                  disabled={toggleMutation.isPending}
                  className={`btn-sm ${p.active ? 'btn-secondary' : 'btn-primary'}`}
                  title={p.active ? 'Deaktivieren' : 'Aktivieren'}
                >
                  {p.active ? <PowerOff size={14} /> : <Power size={14} />}
                </button>
                <button onClick={() => setDeleteTarget(p)} className="btn-danger btn-sm" title="Deinstallieren">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => uninstallMutation.mutate(deleteTarget?.id)}
        title="Plugin deinstallieren"
        message={`"${deleteTarget?.long_name}" wirklich deinstallieren? Alle Plugin-Daten und -Tabellen werden gelöscht.`}
        confirmLabel="Deinstallieren"
      />
    </div>
  );
}
