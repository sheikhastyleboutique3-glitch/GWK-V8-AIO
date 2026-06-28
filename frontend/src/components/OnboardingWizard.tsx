/**
 * First-Run Onboarding Wizard
 *
 * Shown once on first login. Guides admin through:
 * Step 1: Company info (name, logo, currency)
 * Step 2: Create first branch
 * Step 3: Add first products (or import CSV)
 * Step 4: Set up floor plan
 * Step 5: Open first POS session
 *
 * Dismisses permanently after completion (stored in localStorage + settings).
 */
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../lib/api';

interface Props {
  onDismiss: () => void;
}

const STEPS = [
  { title: 'Welcome!', icon: '👋', description: 'Let\'s set up your restaurant in 5 quick steps.' },
  { title: 'Company Info', icon: '🏢', description: 'Set your business name, logo, and currency.' },
  { title: 'Your Branch', icon: '📍', description: 'Create your restaurant location.' },
  { title: 'Add Products', icon: '🍽️', description: 'Add your menu items or import from CSV.' },
  { title: 'Floor Plan', icon: '🪑', description: 'Set up your dining areas and tables.' },
  { title: 'Ready!', icon: '🎉', description: 'You\'re all set. Open your first POS session!' },
];

export default function OnboardingWizard({ onDismiss }: Props) {
  const [step, setStep] = useState(0);
  const [companyName, setCompanyName] = useState('');
  const [currency, setCurrency] = useState('QAR');
  const [branchName, setBranchName] = useState('Main Branch');
  const navigate = useNavigate();
  const qc = useQueryClient();

  const saveMut = useMutation({
    mutationFn: async () => {
      // Save company info
      if (companyName.trim()) {
        await api.post('/settings/bulk', { settings: [
          { key: 'company_name', value: companyName.trim() },
          { key: 'default_currency', value: currency },
          { key: 'onboarding_complete', value: 'true' },
        ]});
      }
      // Create branch if not exists
      if (branchName.trim()) {
        try {
          await api.post('/branches', { name: branchName.trim(), nameAr: branchName.trim() });
        } catch { /* branch may already exist */ }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] });
      qc.invalidateQueries({ queryKey: ['branches'] });
    },
  });

  const handleComplete = async () => {
    await saveMut.mutateAsync();
    localStorage.setItem('gwk_onboarding_complete', 'true');
    toast.success('Setup complete! Welcome to GWK.');
    onDismiss();
  };

  const handleSkip = () => {
    localStorage.setItem('gwk_onboarding_complete', 'true');
    onDismiss();
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Progress bar */}
        <div className="h-1.5 bg-gray-100 dark:bg-gray-800">
          <div className="h-full bg-primary transition-all duration-500" style={{ width: `${(step / (STEPS.length - 1)) * 100}%` }} />
        </div>

        {/* Content */}
        <div className="p-8">
          <div className="text-center mb-6">
            <div className="text-5xl mb-3">{STEPS[step].icon}</div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{STEPS[step].title}</h2>
            <p className="text-sm text-gray-500 mt-1">{STEPS[step].description}</p>
          </div>

          {/* Step-specific content */}
          {step === 0 && (
            <div className="text-center text-sm text-gray-500 space-y-2">
              <p>This wizard will help you configure your restaurant management system.</p>
              <p>It only takes 2 minutes. You can always change settings later.</p>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Restaurant Name</label>
                <input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="e.g. Al Maha Restaurant" className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm" autoFocus />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Currency</label>
                <select value={currency} onChange={e => setCurrency(e.target.value)} className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm">
                  <option value="QAR">QAR (Qatari Riyal)</option>
                  <option value="SAR">SAR (Saudi Riyal)</option>
                  <option value="AED">AED (UAE Dirham)</option>
                  <option value="USD">USD (US Dollar)</option>
                  <option value="EUR">EUR (Euro)</option>
                  <option value="GBP">GBP (British Pound)</option>
                  <option value="KWD">KWD (Kuwaiti Dinar)</option>
                  <option value="BHD">BHD (Bahraini Dinar)</option>
                  <option value="OMR">OMR (Omani Rial)</option>
                </select>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Branch / Location Name</label>
                <input value={branchName} onChange={e => setBranchName(e.target.value)} placeholder="e.g. Main Branch, Downtown, Mall" className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-sm" autoFocus />
              </div>
              <p className="text-xs text-gray-400">You can add more branches later from Settings → Branches.</p>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 text-center">
              <p className="text-sm text-gray-500">You can add products now or later.</p>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => { handleComplete(); navigate('/catalog'); }} className="p-4 rounded-xl border-2 border-dashed border-gray-300 hover:border-primary text-sm font-medium">
                  ➕ Add Products Manually
                </button>
                <button onClick={() => { handleComplete(); navigate('/catalog'); }} className="p-4 rounded-xl border-2 border-dashed border-gray-300 hover:border-primary text-sm font-medium">
                  📥 Import from CSV
                </button>
              </div>
              <p className="text-xs text-gray-400">Or skip — you can add products anytime from the Catalog page.</p>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4 text-center">
              <p className="text-sm text-gray-500">Set up your dining areas and table layout.</p>
              <button onClick={() => { handleComplete(); navigate('/tables'); }} className="px-6 py-3 rounded-xl border-2 border-dashed border-gray-300 hover:border-primary text-sm font-medium">
                🪑 Set Up Floor Plan
              </button>
              <p className="text-xs text-gray-400">Or skip — you can set up tables later from the POS edit mode.</p>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4 text-center">
              <p className="text-sm text-gray-500">Everything is ready! Open your first POS session to start taking orders.</p>
              <button onClick={() => { handleComplete(); navigate('/pos-dashboard'); }} className="px-8 py-4 rounded-xl bg-primary text-white text-lg font-bold hover:bg-primary/90 transition-colors">
                🚀 Open POS
              </button>
            </div>
          )}
        </div>

        {/* Footer navigation */}
        <div className="px-8 pb-6 flex items-center justify-between">
          <button onClick={handleSkip} className="text-xs text-gray-400 hover:text-gray-600">
            Skip setup
          </button>
          <div className="flex gap-2">
            {step > 0 && (
              <button onClick={() => setStep(s => s - 1)} className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-sm font-medium">
                Back
              </button>
            )}
            {step < STEPS.length - 1 && (
              <button onClick={() => { if (step === 1 || step === 2) saveMut.mutate(); setStep(s => s + 1); }} className="px-6 py-2 rounded-xl bg-primary text-white text-sm font-medium">
                Next →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
