import { useEffect, useState } from 'react';

export function LiveClock() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const time = now.toLocaleTimeString('en-IN', { hour12: false });
  const date = now.toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  }).toUpperCase();

  return (
    <div className="flex flex-col items-end leading-tight">
      <span
        style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontWeight: 700,
          fontSize: 18,
          color: 'var(--text)',
          letterSpacing: '1px',
        }}
      >
        {time}
      </span>
      <span
        style={{
          fontFamily: "'Barlow', sans-serif",
          fontSize: 11,
          color: 'var(--text-dim)',
          letterSpacing: '0.5px',
        }}
      >
        {date}
      </span>
    </div>
  );
}
