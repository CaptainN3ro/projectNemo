import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { PawPrint, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { useQuery } from '@tanstack/react-query';
import useAuthStore from '../store/authStore';
import { authApi } from '../api/admin';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const { data: publicSettings = {} } = useQuery({
    queryKey: ['public-settings'],
    queryFn: authApi.publicSettings,
    retry: false
  });

  if (!publicSettings.allowRegistration && Object.keys(publicSettings).length > 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-emerald-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 text-center">
          <p className="text-gray-600">Registrierung ist deaktiviert.</p>
          <Link to="/login" className="btn-primary mt-4 inline-flex">Zur Anmeldung</Link>
        </div>
      </div>
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (password.length < 8) return toast.error('Passwort mind. 8 Zeichen.');
    setLoading(true);
    try {
      const data = await authApi.register({ name, email, password });
      if (data.token) {
        // Auto-login (no email verification required)
        setAuth(data.user, data.token, data.refreshToken);
        toast.success('Willkommen bei Project Nemo!');
        navigate('/');
      } else {
        // Email verification required
        setDone(true);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registrierung fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-emerald-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 text-center">
          <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <PawPrint size={28} className="text-primary-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Fast geschafft!</h2>
          <p className="text-gray-600">Wir haben dir eine Bestätigungs-E-Mail geschickt. Bitte klicke auf den Link, um dein Konto zu aktivieren.</p>
          <Link to="/login" className="btn-secondary mt-6 inline-flex">Zur Anmeldung</Link>
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
          <h1 className="text-2xl font-bold text-gray-900">Konto erstellen</h1>
          <p className="text-gray-500 text-sm mt-1">Project Nemo</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="form-group">
            <label className="label">Name</label>
            <input
              type="text"
              className="input"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Dein Name"
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="label">E-Mail</label>
            <input
              type="email"
              className="input"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="name@example.com"
              required
            />
          </div>

          <div className="form-group">
            <label className="label">Passwort</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                className="input pr-10"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Mind. 8 Zeichen"
                required
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowPw(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5 mt-2">
            {loading ? 'Konto wird erstellt...' : 'Registrieren'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Bereits ein Konto?{' '}
          <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
            Anmelden
          </Link>
        </p>
      </div>
    </div>
  );
}
