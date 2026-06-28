import { useEffect, useState } from 'react';

/**
 * useDebounce — Delays updating a value until the user stops typing.
 * Prevents burst API calls on every keystroke in search inputs.
 *
 * Usage:
 *   const [search, setSearch] = useState('');
 *   const debouncedSearch = useDebounce(search, 300);
 *   // Use debouncedSearch in your query key instead of search
 *
 * @param value - The raw input value that changes on every keystroke
 * @param delay - Milliseconds to wait after last change (default 300ms)
 * @returns The debounced value (only updates after delay of inactivity)
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
