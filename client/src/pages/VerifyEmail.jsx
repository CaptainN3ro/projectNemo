import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { PawPrint, CheckCircle, XCircle, Loader } from 'lucide-react';
import { authApi } from '../api/admin';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState('loading'); // loading | success | error
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) { setStatus('error'); setMessage('Token fehlt.'); return; }
    authApi.verifyEmail(token)
      .then(d => { setStatus('success'); setMessage(d.message); })
      .catch(e => { setStatus('error'); setMessage(e.response?.data?.error || 'Verifizierung fehlgeschlagen.'); });
  }, [token]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-emerald-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 text-center">
        <div className="w-16 h-16 bg-primary-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
          <PawPrint size={32} className="text-white" />
        </div>

        {status === 'loading' && (
          <>
            <Loader size={28} className="text-primary-500 animate-spin mx-auto mb-3" />
            <p className="text-gray-600">E-Mail wird verifiziert...</p>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle size={36} className="text-green-500 mx-auto mb-3" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">E-Mail bestätigt!</h2>
            <p className="text-gray-600">{message}</p>
            <Link to="/login" className="btn-primary mt-6 inline-flex">Jetzt anmelden</Link>
          </>
        )}
        {status === 'error' && (
          <>
            <XCircle size={36} className="text-red-500 mx-auto mb-3" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Verifizierung fehlgeschlagen</h2>
            <p className="text-gray-600">{message}</p>
            <Link to="/login" className="btn-secondary mt-6 inline-flex">Zur Anmeldung</Link>
          </>
        )}
      </div>
    </div>
  );
}
