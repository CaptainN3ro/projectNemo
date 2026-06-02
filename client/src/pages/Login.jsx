import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { PawPrint, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { useQuery } from '@tanstack/react-query';
import useAuthStore from '../store/authStore';
import { authApi } from '../api/admin';
import { useBranding } from '../hooks/useBranding';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();
  const branding = useBranding();
  const appName = branding.app_name || 'Project Nemo';

  const { data: publicSettings = {} } = useQuery({
    queryKey: ['public-settings'],
    queryFn: authApi.publicSettings,
    retry: false
  });

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await authApi.login(email, password);
      setAuth(data.user, data.token, data.refreshToken);
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Anmeldung fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-emerald-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-primary-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg overflow-hidden">
            {branding.logo_path
              ? <img src={branding.logo_path} alt={appName} className="w-full h-full object-cover" />
              : <PawPrint size={32} className="text-white" />}
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{appName}</h1>
          <p className="text-gray-500 text-sm mt-1">Tier-Dokumentationssystem</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="form-group">
            <label className="label">E-Mail</label>
            <input
              type="email"
              className="input"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="name@example.com"
              required
              autoFocus
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
                placeholder="••••••••"
                required
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

          {publicSettings.allowPasswordReset && (
            <div className="text-right">
              <Link to="/forgot-password" className="text-sm text-primary-600 hover:text-primary-700">
                Passwort vergessen?
              </Link>
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5 mt-2">
            {loading ? 'Anmelden...' : 'Anmelden'}
          </button>
        </form>

        {publicSettings.allowRegistration && (
          <p className="text-center text-sm text-gray-500 mt-6">
            Noch kein Konto?{' '}
            <Link to="/register" className="text-primary-600 hover:text-primary-700 font-medium">
              Registrieren
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
