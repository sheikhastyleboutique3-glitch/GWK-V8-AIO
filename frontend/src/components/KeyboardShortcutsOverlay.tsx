import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Keyboard Shortcuts Overlay — press '?' to toggle.
 * Shows all available keyboard shortcuts across the app.
 */
export default function KeyboardShortcutsOverlay() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't trigger when typing in inputs
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable) return;
      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setVisible((v) => !v);
      }
      if (e.key === 'Escape' && visible) {
        setVisible(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [visible]);

  if (!visible) return null;

  const sections = [
    {
      title: 'Global',
      shortcuts: [
        { keys: ['Ctrl', 'K'], description: 'Command Palette (search anything)' },
        { keys: ['?'], description: 'Show/hide this overlay' },
        { keys: ['Esc'], description: 'Close modal / go back' },
      ],
    },
    {
      title: 'POS Terminal',
      shortcuts: [
        { keys: ['F2'], description: 'Open payment screen' },
        { keys: ['F3'], description: 'Hold current order' },
        { keys: ['F4'], description: 'Print last receipt' },
        { keys: ['F8'], description: 'Clear cart' },
        { keys: ['F9'], description: 'View all orders' },
        { keys: ['+'], description: 'Increase quantity' },
        { keys: ['-'], description: 'Decrease quantity' },
      ],
    },
    {
      title: 'Navigation',
      shortcuts: [
        { keys: ['Alt', '1'], description: 'Go to Dashboard' },
        { keys: ['Alt', 'P'], description: 'Open POS' },
        { keys: ['Alt', 'W'], description: 'Open Waiter view' },
        { keys: ['Alt', 'K'], description: 'Open KDS' },
      ],
    },
    {
      title: 'Data Tables',
      shortcuts: [
        { keys: ['Ctrl', 'E'], description: 'Export current view' },
        { keys: ['Ctrl', 'F'], description: 'Focus search/filter' },
        { keys: ['Enter'], description: 'Open selected row' },
        { keys: ['Delete'], description: 'Delete selected item (with confirm)' },
      ],
    },
  ];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setVisible(false)}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Keyboard Shortcuts</h2>
          <button onClick={() => setVisible(false)} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sections.map((section) => (
            <div key={section.title}>
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                {section.title}
              </h3>
              <div className="space-y-2">
                {section.shortcuts.map((shortcut, i) => (
                  <div key={i} className="flex items-center justify-between gap-3">
                    <span className="text-sm text-gray-700 dark:text-gray-300">{shortcut.description}</span>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {shortcut.keys.map((key, j) => (
                        <span key={j}>
                          <kbd className="inline-flex items-center justify-center min-w-[1.75rem] h-6 px-1.5 text-xs font-mono font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded shadow-sm">
                            {key}
                          </kbd>
                          {j < shortcut.keys.length - 1 && <span className="text-gray-400 mx-0.5">+</span>}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 pt-4 border-t border-gray-200 dark:border-gray-800 text-center">
          <p className="text-xs text-gray-400">Press <kbd className="px-1.5 py-0.5 text-xs bg-gray-100 dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-600">?</kbd> to toggle this overlay</p>
        </div>
      </div>
    </div>
  );
}
