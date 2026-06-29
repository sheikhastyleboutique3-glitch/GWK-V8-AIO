/**
 * Manager PIN Verify Hook — prompts for a manager PIN when a restricted
 * action is attempted (void, large discount, refund, etc.).
 *
 * Usage:
 *   const verifyPin = usePinVerify();
 *   const doVoid = async () => {
 *     const ok = await verifyPin('Void this order?');
 *     if (ok) { // proceed with void }
 *   };
 *
 * Shows a numpad modal, calls /auth/pin-verify, resolves true/false.
 */
import { useState, useCallback, useRef } from 'react';
import api from './api';

interface PinVerifyState {
  open: boolean;
  title: string;
  pin: string;
  loading: boolean;
  error: string;
}

type Resolver = (result: boolean) => void;

export function usePinVerify(): [(title?: string) => Promise<boolean>, () => JSX.Element | null] {
  const [state, setState] = useState<PinVerifyState>({ open: false, title: '', pin: '', loading: false, error: '' });
  const resolverRef = useRef<Resolver | null>(null);

  const verify = useCallback((title = 'Manager PIN Required'): Promise<boolean> => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setState({ open: true, title, pin: '', loading: false, error: '' });
    });
  }, []);

  const handleSubmit = async () => {
    if (state.pin.length < 4) { setState(s => ({ ...s, error: 'Enter at least 4 digits' })); return; }
    setState(s => ({ ...s, loading: true, error: '' }));
    try {
      await api.post('/auth/pin-verify', { pin: state.pin });
      setState(s => ({ ...s, open: false }));
      resolverRef.current?.(true);
    } catch (e: any) {
      setState(s => ({ ...s, error: e?.response?.data?.message || 'Invalid PIN', pin: '', loading: false }));
    }
  };

  const handleClose = () => {
    setState(s => ({ ...s, open: false }));
    resolverRef.current?.(false);
  };

  const handleKey = (key: string) => {
    if (key === 'C') setState(s => ({ ...s, pin: '', error: '' }));
    else if (key === '⌫') setState(s => ({ ...s, pin: s.pin.slice(0, -1) }));
    else if (key === 'OK') handleSubmit();
    else if (state.pin.length < 6) setState(s => ({ ...s, pin: s.pin + key }));
  };

  const PinVerifyDialog = useCallback(() => {
    if (!state.open) return null;
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-xs p-5 text-center">
          <h3 className="font-bold text-base mb-1">{state.title}</h3>
          <p className="text-xs text-gray-500 mb-3">Enter manager/admin PIN to authorize</p>
          <div className="text-2xl font-mono tracking-[0.4em] min-h-[40px] flex items-center justify-center mb-3">
            {state.pin ? '●'.repeat(state.pin.length) : <span className="text-gray-300">- - - -</span>}
          </div>
          {state.error && <p className="text-xs text-red-600 mb-2">{state.error}</p>}
          <div className="grid grid-cols-3 gap-2 mb-3">
            {['1','2','3','4','5','6','7','8','9','C','0','⌫'].map(key => (
              <button key={key} onClick={() => handleKey(key)} disabled={state.loading}
                className={`py-3 rounded-xl text-lg font-bold transition active:scale-95 ${key === 'C' ? 'bg-red-50 text-red-600' : key === '⌫' ? 'bg-gray-100 text-gray-500' : 'bg-gray-50 hover:bg-gray-100'}`}
              >{key}</button>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={handleClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium">Cancel</button>
            <button onClick={handleSubmit} disabled={state.loading || state.pin.length < 4}
              className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-bold disabled:opacity-50">
              {state.loading ? '...' : 'Verify'}
            </button>
          </div>
        </div>
      </div>
    );
  }, [state]);

  return [verify, PinVerifyDialog];
}
