import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Settings, AlertTriangle, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminSettingsApi } from '../../api/admin';

export default function SettingsPage() {
  const qc = useQueryClient();
  const { data: settings } = useQuery({ queryKey: ['admin-settings'], queryFn: adminSettingsApi.get });
  const { register, handleSubmit, reset, watch } = useForm();

  useEffect(() => {
    if (settings) reset(settings);
  }, [settings]);

  const mutation = useMutation({
    mutationFn: adminSettingsApi.update,
    onSuccess: () => { qc.invalidateQueries(['admin-settings']); toast.success('Einstellungen gespeichert'); },
    onError: e => toast.error(e.response?.data?.error || 'Fehler')
  });

  const allowRegistration = watch('allow_registration');
  const smtpActive = settings?.smtpActive;

  return (
    <div className="max-w-xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
          <Settings size={20} className="text-slate-600" />
        </div>
        <div>
          <h2 className="font-semibold text-gray-900">App-Einstellungen</h2>
          <p className="text-sm text-gray-500">Registrierung, E-Mail-Verifikation und Passwort-Reset</p>
        </div>
      </div>

      {!smtpActive && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">SMTP nicht konfiguriert</p>
            <p className="text-xs text-amber-700 mt-0.5">
              E-Mail-Verifikation und Passwort-Reset benötigen aktives SMTP.{' '}
              <a href="/admin/smtp" className="underline">SMTP konfigurieren →</a>
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(mutation.mutate)} className="space-y-4">
        <div className="card space-y-5">
          {/* Registration */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-medium text-gray-900">Registrierung erlauben</p>
              <p className="text-sm text-gray-500 mt-0.5">Zeigt den "Registrieren"-Button auf der Login-Seite.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input type="checkbox" className="sr-only peer" {...register('allow_registration')} />
              <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>

          {/* Email verification */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <p className={`font-medium ${!smtpActive ? 'text-gray-400' : 'text-gray-900'}`}>
                  Registrierung mit E-Mail-Bestätigung
                </p>
                {!smtpActive && <span className="badge bg-gray-100 text-gray-400">SMTP benötigt</span>}
              </div>
              <p className="text-sm text-gray-500 mt-0.5">
                Neue Nutzer müssen ihre E-Mail bestätigen, bevor sie sich anmelden können.
              </p>
            </div>
            <label className={`relative inline-flex items-center shrink-0 ${!smtpActive ? 'opacity-40 pointer-events-none' : 'cursor-pointer'}`}>
              <input type="checkbox" className="sr-only peer" {...register('require_email_verification')} disabled={!smtpActive} />
              <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>

          {/* Password reset */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <p className={`font-medium ${!smtpActive ? 'text-gray-400' : 'text-gray-900'}`}>
                  Passwort vergessen
                </p>
                {!smtpActive && <span className="badge bg-gray-100 text-gray-400">SMTP benötigt</span>}
              </div>
              <p className="text-sm text-gray-500 mt-0.5">
                Zeigt den "Passwort vergessen?"-Link auf der Login-Seite. Sendet Reset-Links per E-Mail.
              </p>
            </div>
            <label className={`relative inline-flex items-center shrink-0 ${!smtpActive ? 'opacity-40 pointer-events-none' : 'cursor-pointer'}`}>
              <input type="checkbox" className="sr-only peer" {...register('allow_password_reset')} disabled={!smtpActive} />
              <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>
        </div>

        <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-700">
          <Info size={16} className="shrink-0 mt-0.5" />
          <p>Admins können sich immer anmelden, unabhängig von diesen Einstellungen.</p>
        </div>

        <button type="submit" disabled={mutation.isPending} className="btn-primary">
          Einstellungen speichern
        </button>
      </form>
    </div>
  );
}
