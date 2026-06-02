import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { User, Lock, Mail, Trash2, AlertTriangle, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';
import { authApi } from '../api/admin';
import Modal from '../components/UI/Modal';

function Section({ icon: Icon, color, title, description, children }) {
  return (
    <div className="card">
      <div className="flex items-center gap-3 mb-5">
        <div className={`w-9 h-9 rounded-xl ${color} flex items-center justify-center`}>
          <Icon size={18} className="text-white" />
        </div>
        <div>
          <h2 className="font-semibold text-gray-900">{title}</h2>
          {description && <p className="text-xs text-gray-500">{description}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

function ChangeEmailForm({ user, setUser }) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm();
  const mutation = useMutation({
    mutationFn: authApi.changeEmail,
    onSuccess: (data) => {
      setUser({ ...user, email: data.email });
      toast.success('E-Mail-Adresse aktualisiert.');
      reset();
    },
    onError: e => toast.error(e.response?.data?.error || 'Fehler')
  });

  return (
    <form onSubmit={handleSubmit(mutation.mutate)} className="space-y-4">
      <div className="form-group">
        <label className="label">Aktuelle E-Mail</label>
        <input className="input bg-gray-50" value={user?.email || ''} disabled readOnly />
      </div>
      <div className="form-group">
        <label className="label">Neue E-Mail-Adresse *</label>
        <input
          type="email"
          className={`input ${errors.email ? 'border-red-400' : ''}`}
          placeholder="neue@email.de"
          {...register('email', { required: true })}
        />
      </div>
      <div className="form-group">
        <label className="label">Aktuelles Passwort zur Bestätigung *</label>
        <input
          type="password"
          className="input"
          placeholder="••••••••"
          {...register('currentPassword', { required: true })}
        />
      </div>
      <button type="submit" disabled={mutation.isPending} className="btn-primary">
        {mutation.isPending ? 'Speichern...' : 'E-Mail ändern'}
      </button>
    </form>
  );
}

function ChangePasswordForm() {
  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm();
  const newPassword = watch('newPassword');
  const mutation = useMutation({
    mutationFn: authApi.changePassword,
    onSuccess: () => { toast.success('Passwort aktualisiert.'); reset(); },
    onError: e => toast.error(e.response?.data?.error || 'Fehler')
  });

  return (
    <form onSubmit={handleSubmit(mutation.mutate)} className="space-y-4">
      <div className="form-group">
        <label className="label">Aktuelles Passwort *</label>
        <input type="password" className="input" placeholder="••••••••" {...register('currentPassword', { required: true })} />
      </div>
      <div className="form-group">
        <label className="label">Neues Passwort *</label>
        <input
          type="password"
          className={`input ${errors.newPassword ? 'border-red-400' : ''}`}
          placeholder="Mind. 8 Zeichen"
          {...register('newPassword', { required: true, minLength: 8 })}
        />
        {errors.newPassword && <p className="text-xs text-red-500 mt-1">Mind. 8 Zeichen.</p>}
      </div>
      <div className="form-group">
        <label className="label">Neues Passwort bestätigen *</label>
        <input
          type="password"
          className={`input ${watch('confirm') && watch('confirm') !== newPassword ? 'border-red-400' : ''}`}
          placeholder="Wiederholen"
          {...register('confirm', {
            required: true,
            validate: v => v === newPassword || 'Passwörter stimmen nicht überein'
          })}
        />
        {errors.confirm && <p className="text-xs text-red-500 mt-1">{errors.confirm.message}</p>}
      </div>
      <button type="submit" disabled={mutation.isPending} className="btn-primary">
        {mutation.isPending ? 'Speichern...' : 'Passwort ändern'}
      </button>
    </form>
  );
}

function DeleteAccountSection({ userRole }) {
  const [modal, setModal] = useState(false);
  const [password, setPassword] = useState('');
  const { logout } = useAuthStore();
  const navigate = useNavigate();

  const mutation = useMutation({
    mutationFn: () => authApi.deleteAccount(password),
    onSuccess: () => {
      toast.success('Konto wurde gelöscht.');
      logout();
      navigate('/login');
    },
    onError: e => toast.error(e.response?.data?.error || 'Fehler')
  });

  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-gray-700">
            Dein Konto und <strong>alle damit verbundenen Tier-Daten</strong> werden unwiderruflich gelöscht.
            Diese Aktion kann nicht rückgängig gemacht werden.
          </p>
          {userRole === 'admin' && (
            <p className="text-xs text-amber-600 mt-1">
              Als Administrator kann dein Konto nur gelöscht werden, wenn noch mindestens ein weiterer Admin existiert.
            </p>
          )}
        </div>
        <button onClick={() => setModal(true)} className="btn-danger shrink-0">
          <Trash2 size={14} /> Konto löschen
        </button>
      </div>

      <Modal open={modal} onClose={() => { setModal(false); setPassword(''); }} title="Konto unwiderruflich löschen" size="sm">
        <div className="space-y-4">
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg p-3">
            <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">
              Alle deine Tiere, Einträge, Tagebücher und Dateien werden <strong>dauerhaft gelöscht</strong>.
              Diese Aktion kann nicht rückgängig gemacht werden.
            </p>
          </div>
          <div className="form-group">
            <label className="label">Aktuelles Passwort zur Bestätigung *</label>
            <input
              type="password"
              className="input"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoFocus
            />
          </div>
          <div className="flex gap-3 justify-end">
            <button onClick={() => { setModal(false); setPassword(''); }} className="btn-secondary">Abbrechen</button>
            <button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending || !password}
              className="btn-danger"
            >
              {mutation.isPending ? 'Lösche...' : 'Ja, Konto löschen'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}

export default function Profile() {
  const { user, setUser } = useAuthStore();

  return (
    <div className="p-4 sm:p-8 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Mein Konto</h1>
        <p className="text-gray-500 text-sm mt-1">E-Mail, Passwort und Konto verwalten</p>
      </div>

      {/* Account info card */}
      <div className="card mb-6 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-primary-600 flex items-center justify-center text-white text-xl font-bold shrink-0">
          {user?.name?.[0]?.toUpperCase() || '?'}
        </div>
        <div>
          <p className="font-semibold text-gray-900 text-lg">{user?.name}</p>
          <p className="text-gray-500 text-sm">{user?.email}</p>
          <span className={`badge mt-1 ${user?.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
            {user?.role === 'admin' ? 'Administrator' : 'Nutzer'}
          </span>
        </div>
      </div>

      <div className="space-y-6">
        <Section icon={Mail} color="bg-blue-500" title="E-Mail-Adresse ändern" description="Aktuelles Passwort wird zur Bestätigung benötigt">
          <ChangeEmailForm user={user} setUser={setUser} />
        </Section>

        <Section icon={Lock} color="bg-primary-600" title="Passwort ändern">
          <ChangePasswordForm />
        </Section>

        <Section icon={Trash2} color="bg-red-500" title="Konto löschen" description="Gefährlicher Bereich — diese Aktion ist nicht umkehrbar">
          <DeleteAccountSection userRole={user?.role} />
        </Section>
      </div>
    </div>
  );
}
