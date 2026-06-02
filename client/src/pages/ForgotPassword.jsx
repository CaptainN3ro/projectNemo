import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PawPrint, ArrowLeft, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi } from '../api/admin';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await authApi.forgotPassword(email);
      setSent(true);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Fehler beim Senden');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-emerald-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-primary-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
            <PawPrint size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Passwort vergessen</h1>
          <p className="text-gray-500 text-sm mt-1 text-center">
            Gib deine E-Mail ein und wir senden dir einen Link zum Zurücksetzen.
          </p>
        </div>

        {sent ? (
          <div className="text-center">
            <div className="w-14 h-14 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail size={24} className="text-primary-600" />
            </div>
            <p className="text-gray-700 font-medium mb-1">E-Mail gesendet</p>
            <p className="text-sm text-gray-500">
              Falls ein Konto mit dieser E-Mail existiert, hast du einen Reset-Link erhalten.
            </p>
            <Link to="/login" className="btn-primary mt-6 inline-flex">Zur Anmeldung</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="form-group">
              <label className="label">E-Mail-Adresse</label>
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
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5">
              {loading ? 'Sende...' : 'Reset-Link anfordern'}
            </button>
          </form>
        )}

        <div className="mt-6 text-center">
          <Link to="/login" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
            <ArrowLeft size={14} /> Zurück zur Anmeldung
          </Link>
        </div>
      </div>
    </div>
  );
}
