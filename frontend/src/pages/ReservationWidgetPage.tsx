/**
 * #10 — Online Reservation Widget (Public — embeddable)
 *
 * URL: /book?branchId=2
 * Customers see a clean booking form, pick date/time/party size → submitted.
 * Can be embedded in restaurant website via iframe.
 *
 * No login required. Posts to a public API endpoint.
 */
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';

export default function ReservationWidgetPage() {
  const [searchParams] = useSearchParams();
  const branchId = parseInt(searchParams.get('branchId') || '1', 10);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('19:00');
  const [partySize, setPartySize] = useState(2);
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone || !date) { setError('Please fill all required fields'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/tables/reservations/public', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchId,
          customerName: name,
          phone,
          reservedAt: `${date}T${time}:00.000Z`,
          partySize,
          notes,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || 'Booking failed');
      }
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Failed to submit reservation');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-emerald-100 p-4">
        <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Reservation Confirmed!</h1>
          <p className="text-sm text-gray-500 mb-4">
            {name}, your table for {partySize} on {date} at {time} has been booked.
          </p>
          <p className="text-xs text-gray-400">We'll send a confirmation to {phone}</p>
          <button onClick={() => { setSubmitted(false); setName(''); setPhone(''); setDate(''); setNotes(''); }} className="mt-6 px-6 py-2 rounded-xl bg-primary text-white text-sm font-medium">
            Make Another Reservation
          </button>
        </div>
      </div>
    );
  }

  // Get minimum date (today)
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <div className="text-3xl mb-2">🍽️</div>
          <h1 className="text-xl font-bold text-gray-900">Reserve a Table</h1>
          <p className="text-sm text-gray-500 mt-1">Book your dining experience</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" required className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+974 XXXX XXXX" type="tel" required className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} min={today} required className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
              <select value={time} onChange={e => setTime(e.target.value)} className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary">
                {Array.from({ length: 28 }, (_, i) => {
                  const h = Math.floor(i / 2) + 10;
                  const m = (i % 2) * 30;
                  const val = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
                  return <option key={val} value={val}>{val}</option>;
                })}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Party Size</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5, 6, 8, 10].map(n => (
                <button key={n} type="button" onClick={() => setPartySize(n)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${partySize === n ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Special Requests</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Birthday, dietary needs, seating preference..." rows={2} className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm resize-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
          </div>

          {error && <p className="text-sm text-red-600 text-center">{error}</p>}

          <button type="submit" disabled={loading} className="w-full py-4 rounded-xl bg-primary text-white font-bold text-lg disabled:opacity-50 transition-colors hover:bg-primary/90">
            {loading ? 'Booking...' : 'Reserve Table'}
          </button>
        </form>

        <p className="text-[10px] text-gray-400 text-center mt-4">Powered by GWK Restaurant System</p>
      </div>
    </div>
  );
}
