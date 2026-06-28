/**
 * PIN-based Cashier Switch Modal (Odoo-style)
 *
 * Allows quick user switching at the POS without full logout/login.
 * Cashier taps their name → enters 4-digit PIN → instant switch.
 * The new user's JWT replaces the current one in localStorage.
 */
import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import api from '../lib/api';

interface Props {
  open: boolean;
  onClose: () => void;
  onSwitched: (userData: any) => void;
  branchId?: number;
}

export default function PinSwitchModal({ open, onClose, onSwitched, branchId }: Props) {
  const { t } = useTranslation();
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setPin('');
      setError('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const handleSubmit = async () => {
    if (pin.length < 4) {
      setError('Enter at least 4 digits');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/pin-login', { pin, branchId });
      const data = res.data?.data || res.data;
      if (!data?.access_token) throw new Error('No token returned');

      // Store the new session
      localStorage.setItem('token', data.access_token);
      if (data.refresh_token) localStorage.setItem('refresh_token', data.refresh_token);
      localStorage.setItem('user', JSON.stringify(data.user));

      // Update active branch if the new user has one
      const branch = data.user?.branch || data.user?.assignedBranches?.[0];
      if (branch) {
        localStorage.setItem('activeBranch', JSON.stringify({ id: branch.id, name: branch.name, nameAr: branch.nameAr }));
      }

      toast.success(`Switched to ${data.user.firstName} ${data.user.lastName}`);
      onSwitched(data.user);
      onClose();
    } catch (e: any) {
      const msg = e.response?.data?.message || e.message || 'Invalid PIN';
      setError(msg);
      setPin('');
      inputRef.current?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleNumpad = (key: string) => {
    if (key === 'C') {
      setPin('');
      setError('');
    } else if (key === '⌫') {
      setPin((p) => p.slice(0, -1));
    } else if (key === 'OK') {
      handleSubmit();
    } else if (pin.length < 6) {
      const newPin = pin + key;
      setPin(newPin);
      // Auto-submit on 4 digits
      if (newPin.length === 4) {
        setTimeout(() => {
          setLoading(true);
          setError('');
          api.post('/auth/pin-login', { pin: newPin, branchId })
            .then((res) => {
              const data = res.data?.data || res.data;
              if (!data?.access_token) throw new Error('No token');
              localStorage.setItem('token', data.access_token);
              if (data.refresh_token) localStorage.setItem('refresh_token', data.refresh_token);
              localStorage.setItem('user', JSON.stringify(data.user));
              const branch = data.user?.branch || data.user?.assignedBranches?.[0];
              if (branch) localStorage.setItem('activeBranch', JSON.stringify({ id: branch.id, name: branch.name, nameAr: branch.nameAr }));
              toast.success(`Switched to ${data.user.firstName} ${data.user.lastName}`);
              onSwitched(data.user);
              onClose();
            })
            .catch((e: any) => {
              setError(e.response?.data?.message || 'Invalid PIN');
              setPin('');
            })
            .finally(() => setLoading(false));
        }, 100);
      }
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="text-center mb-5">
          <div className="text-4xl mb-2">👤</div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
            {t('pos.pinSwitch.title', 'Switch Cashier')}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t('pos.pinSwitch.subtitle', 'Enter your 4-digit PIN')}
          </p>
        </div>

        {/* PIN display */}
        <div className="flex justify-center gap-3 mb-4">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center text-2xl font-bold transition-all ${
                pin.length > i
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-gray-200 dark:border-gray-700 text-gray-300'
              }`}
            >
              {pin.length > i ? '●' : ''}
            </div>
          ))}
        </div>

        {/* Error message */}
        {error && (
          <div className="text-center text-sm text-red-600 dark:text-red-400 mb-3 font-medium">
            {error}
          </div>
        )}

        {/* Hidden input for keyboard entry */}
        <input
          ref={inputRef}
          type="password"
          inputMode="numeric"
          maxLength={6}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
          className="sr-only"
          autoFocus
        />

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {['1','2','3','4','5','6','7','8','9','C','0','⌫'].map((key) => (
            <button
              key={key}
              onClick={() => handleNumpad(key)}
              disabled={loading}
              className={`py-3.5 rounded-xl text-lg font-bold transition-all active:scale-95 ${
                key === 'C'
                  ? 'bg-red-50 dark:bg-red-900/20 text-red-600 hover:bg-red-100'
                  : key === '⌫'
                  ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 hover:bg-amber-100'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {key}
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            {t('common.cancel', 'Cancel')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={pin.length < 4 || loading}
            className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-bold disabled:opacity-50 transition-all"
          >
            {loading ? '...' : t('pos.pinSwitch.confirm', 'Switch')}
          </button>
        </div>
      </div>
    </div>
  );
}
