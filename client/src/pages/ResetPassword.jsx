import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { PawPrint, Eye, EyeOff, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi } from '../api/admin';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-emerald-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 text-center">
          <p className="text-red-500">Ungültiger Link. Bitte erneut anfordern.</p>
          <Link to="/forgot-password" className="btn-primary mt-4 inline-flex">Erneut anfordern</Link>
        </div>
      </div>
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (password.length < 8) return toast.error('Passwort mind. 8 Zeichen.');
    if (password !== confirm) return toast.error('Passwörter stimmen nicht überein.');
    setLoading(true);
    try {
      await authApi.resetPassword(token, password);
      setDone(true);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Fehler beim Zurücksetzen');
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-emerald-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={28} className="text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Passwort geändert!</h2>
          <p className="text-gray-600">Du kannst dich jetzt mit deinem neuen Passwort anmelden.</p>
          <button onClick={() => navigate('/login')} className="btn-primary mt-6 inline-flex">
            Zur Anmeldung
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-emerald-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-primary-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
            <PawPrint size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Neues Passwort</h1>
          <p className="text-gray-500 text-sm mt-1">Gib dein neues Passwort ein.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="form-group">
            <label className="label">Neues Passwort</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                className="input pr-10"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Mind. 8 Zeichen"
                required
                autoFocus
              />
              <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="label">Passwort bestätigen</label>
            <input
              type="password"
              className={`input ${confirm && confirm !== password ? 'border-red-400' : ''}`}
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="Passwort wiederholen"
              required
            />
            {confirm && confirm !== password && <p className="text-xs text-red-500 mt-1">Passwörter stimmen nicht überein.</p>}
          </div>

          <button type="submit" disabled={loading || (confirm && confirm !== password)} className="btn-primary w-full justify-center py-2.5 mt-2">
            {loading ? 'Speichern...' : 'Passwort speichern'}
          </button>
        </form>
      </div>
    </div>
  );
}
