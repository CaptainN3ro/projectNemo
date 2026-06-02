import { useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Palette, Upload, Trash2, Globe, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { brandingApi } from '../../api/branding';

function ImageUploadCard({ label, hint, currentPath, onUpload, onDelete, isUploading }) {
  const inputRef = useRef();
  return (
    <div className="border border-gray-200 rounded-xl p-4 space-y-3">
      <p className="font-medium text-sm text-gray-700">{label}</p>
      {hint && <p className="text-xs text-gray-400">{hint}</p>}
      {currentPath ? (
        <div className="flex items-center gap-3">
          <img src={currentPath} alt="" className="w-12 h-12 object-contain rounded-lg border border-gray-100 bg-gray-50" />
          <div className="flex gap-2">
            <button onClick={() => inputRef.current?.click()} className="btn-secondary btn-sm">
              <Upload size={12} /> Ersetzen
            </button>
            <button onClick={onDelete} className="btn-danger btn-sm">
              <Trash2 size={12} />
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
          className="w-full border-2 border-dashed border-gray-200 rounded-lg p-4 text-center text-sm text-gray-400 hover:border-primary-400 hover:text-primary-600 transition-colors"
        >
          <Upload size={18} className="mx-auto mb-1" />
          {isUploading ? 'Wird hochgeladen...' : 'Datei auswählen'}
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.ico"
        className="hidden"
        onChange={e => e.target.files?.[0] && onUpload(e.target.files[0])}
      />
    </div>
  );
}

export default function BrandingPage() {
  const qc = useQueryClient();
  const { data: settings } = useQuery({ queryKey: ['admin-branding'], queryFn: brandingApi.get });
  const { register, handleSubmit, reset } = useForm();

  useEffect(() => {
    if (settings) reset({
      app_name: settings.app_name || 'Project Nemo',
      seo_title: settings.seo_title || '',
      seo_description: settings.seo_description || '',
      robots_index: settings.robots_index !== false
    });
  }, [settings]);

  function invalidate() {
    qc.invalidateQueries(['admin-branding']);
    qc.invalidateQueries(['public-branding']);
  }

  const saveMutation = useMutation({
    mutationFn: brandingApi.update,
    onSuccess: () => { invalidate(); toast.success('Branding gespeichert'); },
    onError: e => toast.error(e.response?.data?.error || 'Fehler')
  });

  const logoUpload = useMutation({ mutationFn: brandingApi.uploadLogo, onSuccess: () => { invalidate(); toast.success('Logo hochgeladen'); }, onError: () => toast.error('Upload fehlgeschlagen') });
  const faviconUpload = useMutation({ mutationFn: brandingApi.uploadFavicon, onSuccess: () => { invalidate(); toast.success('Favicon hochgeladen'); }, onError: () => toast.error('Upload fehlgeschlagen') });
  const logoDelete = useMutation({ mutationFn: brandingApi.deleteLogo, onSuccess: () => { invalidate(); toast.success('Logo entfernt'); } });
  const faviconDelete = useMutation({ mutationFn: brandingApi.deleteFavicon, onSuccess: () => { invalidate(); toast.success('Favicon entfernt'); } });

  return (
    <div className="max-w-xl space-y-8">
      {/* Branding */}
      <section>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center">
            <Palette size={18} className="text-purple-600" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Branding</h2>
            <p className="text-xs text-gray-500">App-Name, Logo und Favicon</p>
          </div>
        </div>

        <div className="card space-y-5">
          <div className="form-group">
            <label className="label">App-Name</label>
            <input className="input" placeholder="Project Nemo" {...register('app_name')} />
            <p className="text-xs text-gray-400 mt-1">Erscheint in der Seitenleiste, Login und Browsertab.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ImageUploadCard
              label="Logo"
              hint="PNG/SVG, wird im Sidebar-Header angezeigt"
              currentPath={settings?.logo_path}
              onUpload={logoUpload.mutate}
              onDelete={logoDelete.mutate}
              isUploading={logoUpload.isPending}
            />
            <ImageUploadCard
              label="Favicon"
              hint="ICO/PNG 32×32 oder 64×64 empfohlen"
              currentPath={settings?.favicon_path}
              onUpload={faviconUpload.mutate}
              onDelete={faviconDelete.mutate}
              isUploading={faviconUpload.isPending}
            />
          </div>
        </div>
      </section>

      {/* SEO */}
      <section>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center">
            <Search size={18} className="text-blue-600" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">SEO-Einstellungen</h2>
            <p className="text-xs text-gray-500">Meta-Tags für Suchmaschinen</p>
          </div>
        </div>

        <div className="card space-y-4">
          <div className="form-group">
            <label className="label">Seitentitel (Title-Tag)</label>
            <input className="input" placeholder="Project Nemo – Tier-Dokumentation" {...register('seo_title')} />
            <p className="text-xs text-gray-400 mt-1">Erscheint im Browser-Tab und Suchergebnissen. Leer = App-Name.</p>
          </div>

          <div className="form-group">
            <label className="label">Meta-Beschreibung</label>
            <textarea className="input" rows={3} placeholder="Kurze Beschreibung..." {...register('seo_description')} />
            <p className="text-xs text-gray-400 mt-1">Wird in Google-Suchergebnissen angezeigt. Ca. 150–160 Zeichen.</p>
          </div>

          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-medium text-sm text-gray-900">Suchmaschinen-Indexierung</p>
              <p className="text-xs text-gray-500 mt-0.5">Aktiviert: Suchmaschinen dürfen die Seite indexieren.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input type="checkbox" className="sr-only peer" {...register('robots_index')} />
              <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>
        </div>
      </section>

      <form onSubmit={handleSubmit(saveMutation.mutate)}>
        <button type="submit" disabled={saveMutation.isPending} className="btn-primary">
          {saveMutation.isPending ? 'Speichern...' : 'Alle Einstellungen speichern'}
        </button>
      </form>
    </div>
  );
}
