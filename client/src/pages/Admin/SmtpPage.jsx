import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Mail, Send, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminSmtpApi } from '../../api/admin';

export default function SmtpPage() {
  const qc = useQueryClient();
  const { data: settings } = useQuery({ queryKey: ['smtp'], queryFn: adminSmtpApi.get });
  const { register, handleSubmit, reset, watch } = useForm();

  useEffect(() => {
    if (settings) reset({ ...settings, password: '' });
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: adminSmtpApi.update,
    onSuccess: () => { qc.invalidateQueries(['smtp']); toast.success('SMTP-Einstellungen gespeichert'); },
    onError: e => toast.error(e.response?.data?.error || 'Fehler')
  });

  const testMutation = useMutation({
    mutationFn: adminSmtpApi.test,
    onSuccess: d => toast.success(d.message),
    onError: e => toast.error(e.response?.data?.error || 'Test fehlgeschlagen')
  });

  const active = watch('active');

  return (
    <div className="max-w-xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
          <Mail size={20} className="text-blue-600" />
        </div>
        <div>
          <h2 className="font-semibold text-gray-900">SMTP-Konfiguration</h2>
          <p className="text-sm text-gray-500">Für E-Mail-Erinnerungen und Benachrichtigungen</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(saveMutation.mutate)} className="space-y-4">
        <div className="card space-y-4">
          <div className="flex items-center gap-3">
            <input type="checkbox" id="active" {...register('active')} className="w-4 h-4 text-primary-600" />
            <label htmlFor="active" className="text-sm font-medium">E-Mail-Versand aktivieren</label>
            {settings?.active && <span className="badge bg-green-100 text-green-700"><CheckCircle size={10} /> Aktiv</span>}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="form-group col-span-2">
              <label className="label">SMTP-Host</label>
              <input className="input" placeholder="smtp.example.com" {...register('host')} />
            </div>
            <div className="form-group">
              <label className="label">Port</label>
              <input type="number" className="input" placeholder="587" {...register('port')} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label className="label">Benutzername</label>
              <input className="input" {...register('username')} />
            </div>
            <div className="form-group">
              <label className="label">Passwort {settings?.hasPassword && <span className="text-xs text-gray-400">(gesetzt)</span>}</label>
              <input type="password" className="input" placeholder={settings?.hasPassword ? '••••••••' : ''} {...register('password')} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label className="label">Absender-E-Mail</label>
              <input type="email" className="input" placeholder="nemo@example.com" {...register('from_email')} />
            </div>
            <div className="form-group">
              <label className="label">Absender-Name</label>
              <input className="input" placeholder="Project Nemo" {...register('from_name')} />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="tls" {...register('use_tls')} className="w-4 h-4" />
            <label htmlFor="tls" className="text-sm">TLS/STARTTLS verwenden</label>
          </div>
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={saveMutation.isPending} className="btn-primary">
            Einstellungen speichern
          </button>
          <button
            type="button"
            disabled={testMutation.isPending || !settings?.active}
            onClick={() => testMutation.mutate()}
            className="btn-secondary"
            title={!settings?.active ? 'SMTP muss aktiviert sein' : ''}
          >
            <Send size={14} /> {testMutation.isPending ? 'Sende...' : 'Test-E-Mail senden'}
          </button>
        </div>
      </form>
    </div>
  );
}
