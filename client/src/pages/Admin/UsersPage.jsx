import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Plus, Pencil, UserX, Trash2, Shield, User, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { adminUsersApi } from '../../api/admin';
import Modal from '../../components/UI/Modal';
import ConfirmDialog from '../../components/UI/ConfirmDialog';
import useAuthStore from '../../store/authStore';

function UserForm({ user, onClose }) {
  const qc = useQueryClient();
  const { register, handleSubmit, formState: { errors } } = useForm({ defaultValues: user || { role: 'user', active: true } });
  const mutation = useMutation({
    mutationFn: data => user ? adminUsersApi.update(user.id, data) : adminUsersApi.create(data),
    onSuccess: () => { qc.invalidateQueries(['admin-users']); toast.success('Gespeichert'); onClose(); },
    onError: e => toast.error(e.response?.data?.error || 'Fehler')
  });
  return (
    <form onSubmit={handleSubmit(mutation.mutate)} className="space-y-4">
      <div className="form-group"><label className="label">Name *</label><input className="input" {...register('name', { required: true })} /></div>
      <div className="form-group">
        <label className="label">E-Mail {!user && '*'}</label>
        <input type="email" className="input" {...register('email', { required: !user })} />
        {user && <p className="text-xs text-gray-400 mt-1">Leer lassen, um die E-Mail-Adresse nicht zu ändern.</p>}
      </div>
      <div className="form-group">
        <label className="label">{user ? 'Neues Passwort (leer = unverändert)' : 'Passwort *'}</label>
        <input type="password" className="input" {...register('password', { required: !user, minLength: 8 })} />
        {errors.password && <p className="text-xs text-red-500">Mind. 8 Zeichen</p>}
      </div>
      <div className="form-group">
        <label className="label">Rolle</label>
        <select className="input" {...register('role')}>
          <option value="user">Nutzer</option>
          <option value="admin">Administrator</option>
        </select>
      </div>
      {user && <div className="flex items-center gap-2">
        <input type="checkbox" id="active" {...register('active')} className="w-4 h-4" />
        <label htmlFor="active" className="text-sm">Konto aktiv</label>
      </div>}
      <div className="flex gap-3 justify-end pt-2">
        <button type="button" onClick={onClose} className="btn-secondary">Abbrechen</button>
        <button type="submit" disabled={mutation.isPending} className="btn-primary">Speichern</button>
      </div>
    </form>
  );
}

export default function UsersPage() {
  const [modal, setModal] = useState(null);
  const [deactivateTarget, setDeactivateTarget] = useState(null);
  const [permanentDeleteTarget, setPermanentDeleteTarget] = useState(null);
  const qc = useQueryClient();
  const { user: currentUser } = useAuthStore();

  const { data: users = [] } = useQuery({ queryKey: ['admin-users'], queryFn: adminUsersApi.getAll });

  const deactivateMutation = useMutation({
    mutationFn: id => adminUsersApi.deactivate(id),
    onSuccess: () => { qc.invalidateQueries(['admin-users']); toast.success('Nutzer deaktiviert'); setDeactivateTarget(null); }
  });

  const permanentDeleteMutation = useMutation({
    mutationFn: id => adminUsersApi.permanentDelete(id),
    onSuccess: () => { qc.invalidateQueries(['admin-users']); toast.success('Nutzer endgültig gelöscht'); setPermanentDeleteTarget(null); },
    onError: e => toast.error(e.response?.data?.error || 'Fehler')
  });

  const active = users.filter(u => u.active);
  const inactive = users.filter(u => !u.active);

  function UserRow({ u }) {
    return (
      <tr className={`hover:bg-gray-50 ${!u.active ? 'opacity-60' : ''}`}>
        <td className="table-cell">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${u.active ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-500'}`}>
              {u.name?.[0]?.toUpperCase()}
            </div>
            <span className="font-medium">{u.name}</span>
          </div>
        </td>
        <td className="table-cell text-gray-500">{u.email}</td>
        <td className="table-cell">
          <span className={`badge ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
            {u.role === 'admin' ? <><Shield size={10} /> Admin</> : <><User size={10} /> Nutzer</>}
          </span>
        </td>
        <td className="table-cell">
          <span className={`badge ${u.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
            {u.active ? 'Aktiv' : 'Deaktiviert'}
          </span>
        </td>
        <td className="table-cell text-gray-400 text-xs">{format(new Date(u.created_at), 'dd.MM.yyyy')}</td>
        <td className="table-cell">
          <div className="flex gap-2">
            <button onClick={() => setModal({ type: 'edit', user: u })} className="btn-secondary btn-sm" title="Bearbeiten">
              <Pencil size={12} />
            </button>
            {u.id !== currentUser?.id && u.active && (
              <button onClick={() => setDeactivateTarget(u)} className="btn-danger btn-sm" title="Deaktivieren">
                <UserX size={12} />
              </button>
            )}
            {!u.active && (
              <button
                onClick={() => setPermanentDeleteTarget(u)}
                className="btn-danger btn-sm"
                title="Endgültig löschen"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
        </td>
      </tr>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-gray-500">
          {active.length} aktiv{inactive.length > 0 && `, ${inactive.length} deaktiviert`}
        </p>
        <button onClick={() => setModal({ type: 'new' })} className="btn-primary btn-sm">
          <Plus size={14} /> Neuer Nutzer
        </button>
      </div>

      <div className="card overflow-hidden p-0 overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="table-header">Name</th>
              <th className="table-header">E-Mail</th>
              <th className="table-header">Rolle</th>
              <th className="table-header">Status</th>
              <th className="table-header">Erstellt</th>
              <th className="table-header"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {active.map(u => <UserRow key={u.id} u={u} />)}
            {inactive.length > 0 && active.length > 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-2 text-xs font-medium text-gray-400 uppercase tracking-wider bg-gray-50">
                  Deaktivierte Nutzer — <span className="text-red-500 normal-case font-normal">Mülleimer-Symbol löscht alle Daten dauerhaft</span>
                </td>
              </tr>
            )}
            {inactive.map(u => <UserRow key={u.id} u={u} />)}
          </tbody>
        </table>
      </div>

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.type === 'edit' ? 'Nutzer bearbeiten' : 'Neuer Nutzer'}>
        <UserForm user={modal?.user} onClose={() => setModal(null)} />
      </Modal>

      <ConfirmDialog
        open={!!deactivateTarget}
        onClose={() => setDeactivateTarget(null)}
        onConfirm={() => deactivateMutation.mutate(deactivateTarget?.id)}
        title="Nutzer deaktivieren"
        message={`"${deactivateTarget?.name}" deaktivieren? Der Nutzer kann sich nicht mehr anmelden. Die Daten bleiben erhalten.`}
        confirmLabel="Deaktivieren"
      />

      {/* Permanent delete — custom modal for extra warning */}
      <Modal
        open={!!permanentDeleteTarget}
        onClose={() => setPermanentDeleteTarget(null)}
        title="Nutzer endgültig löschen"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg p-3">
            <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
            <div className="text-sm text-red-700">
              <p className="font-medium mb-1">Diese Aktion ist unwiderruflich.</p>
              <p>
                Das Konto von <strong>{permanentDeleteTarget?.name}</strong> sowie alle zugehörigen
                Tiere, Tagebücher, Dokumente und Daten werden <strong>dauerhaft gelöscht</strong>.
              </p>
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <button onClick={() => setPermanentDeleteTarget(null)} className="btn-secondary">
              Abbrechen
            </button>
            <button
              onClick={() => permanentDeleteMutation.mutate(permanentDeleteTarget?.id)}
              disabled={permanentDeleteMutation.isPending}
              className="btn-danger"
            >
              {permanentDeleteMutation.isPending ? 'Lösche...' : 'Endgültig löschen'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
