import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import api from '../lib/api';

export default function LoginPage() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'email' | 'pin'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    try { await login(email, password); navigate('/'); }
    catch (err: any) { toast.error(err?.response?.data?.message || err?.message || 'Login failed'); }
    finally { setLoading(false); }
  };

  const handlePinLogin = async () => {
    if (pin.length < 4) { toast.error('Enter at least 4 digits'); return; }
    setLoading(true);
    try {
      const res = await api.post('/auth/pin-login', { pin });
      const data = res.data?.data || res.data;
      if (!data?.access_token) throw new Error('Login failed');
      localStorage.setItem('token', data.access_token);
      if (data.refresh_token) localStorage.setItem('refresh_token', data.refresh_token);
      localStorage.setItem('user', JSON.stringify(data.user));
      const branch = data.user?.branch || data.user?.assignedBranches?.[0];
      if (branch) localStorage.setItem('activeBranch', JSON.stringify({ id: branch.id, name: branch.name, nameAr: branch.nameAr }));
      toast.success(`Welcome, ${data.user.firstName}!`);
      window.location.href = '/';
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Invalid PIN');
      setPin('');
    } finally { setLoading(false); }
  };

  const handleNumpad = (key: string) => {
    if (key === 'C') setPin('');
    else if (key === '⌫') setPin(p => p.slice(0, -1));
    else if (key === 'OK') handlePinLogin();
    else if (pin.length < 6) setPin(p => p + key);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-900 via-brand-800 to-brand-700 p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">GWK V8</h1>
          <p className="text-brand-200 text-sm mt-1">{t('auth.subtitle')}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Mode toggle */}
          <div className="flex border-b border-gray-100">
            <button onClick={() => setMode('email')} className={`flex-1 py-3 text-sm font-medium transition ${mode === 'email' ? 'text-brand-600 border-b-2 border-brand-600' : 'text-gray-400'}`}>
              Email & Password
            </button>
            <button onClick={() => setMode('pin')} className={`flex-1 py-3 text-sm font-medium transition ${mode === 'pin' ? 'text-brand-600 border-b-2 border-brand-600' : 'text-gray-400'}`}>
              PIN Code
            </button>
          </div>

          <div className="p-6">
            {mode === 'email' ? (
              <form onSubmit={handleEmailLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('auth.email')}</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="you@company.com" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('auth.password')}</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="Enter your password" />
                </div>
                <button type="submit" disabled={loading} className="w-full bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white font-semibold py-3 rounded-xl transition-colors">
                  {loading ? 'Signing in...' : t('auth.login')}
                </button>
              </form>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-gray-500 text-center">Enter your 4-6 digit PIN to clock in</p>
                {/* PIN display */}
                <div className="text-center">
                  <div className="text-3xl font-mono tracking-[0.5em] min-h-[48px] flex items-center justify-center">
                    {pin ? '●'.repeat(pin.length) : <span className="text-gray-300">- - - -</span>}
                  </div>
                </div>
                {/* Numpad */}
                <div className="grid grid-cols-3 gap-2">
                  {['1','2','3','4','5','6','7','8','9','C','0','⌫'].map(key => (
                    <button key={key} onClick={() => handleNumpad(key)}
                      className={`py-4 rounded-xl text-xl font-bold transition active:scale-95 ${key === 'C' ? 'bg-red-50 text-red-600' : key === '⌫' ? 'bg-gray-100 text-gray-500' : 'bg-gray-50 hover:bg-gray-100 text-gray-800'}`}
                    >
                      {key}
                    </button>
                  ))}
                </div>
                <button onClick={handlePinLogin} disabled={loading || pin.length < 4}
                  className="w-full bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white font-semibold py-3 rounded-xl transition-colors">
                  {loading ? 'Signing in...' : 'Login with PIN'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
