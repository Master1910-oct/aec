import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { Loader2 } from 'lucide-react';
import { useStore } from '@/store/useStore';

type Role = 'admin' | 'hospital' | 'ambulance';

const ROLES: { value: Role; label: string; accent: string; dimAccent: string }[] = [
  { value: 'admin',     label: 'Admin',     accent: '#7C3AED', dimAccent: 'rgba(124,58,237,0.15)' },
  { value: 'hospital',  label: 'Hospital',  accent: '#16A34A', dimAccent: 'rgba(22,163,74,0.15)'  },
  { value: 'ambulance', label: 'Ambulance', accent: '#F59E0B', dimAccent: 'rgba(245,158,11,0.15)' },
];

export default function Login() {
  const [role,     setRole]     = useState<Role | ''>('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const navigate = useNavigate();
  const { setActiveRole } = useStore();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!role) { setError('Please select a role'); return; }

    setLoading(true);
    setError('');

    try {
      const response = await api.post<{
        data: { token: string; role: string; user_id: number; entity_id: number }
      }>('/api/v1/auth/login', { email, password, role });

      const returnedRole = response.data.role;

      if (returnedRole !== role) {
        setError('Wrong role selected for this account');
        return;
      }

      localStorage.setItem('aes_auth_token', response.data.token);

      if (['admin', 'hospital', 'ambulance'].includes(returnedRole)) {
        setActiveRole(returnedRole as any);
      }

      switch (returnedRole) {
        case 'hospital':  navigate('/hospital');  break;
        case 'ambulance': navigate('/ambulance'); break;
        default:          navigate('/');          break;
      }
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const activeRole = ROLES.find(r => r.value === role);

  return (
    /*
     * Responsive Login Layout:
     *   Mobile (<768px)  — full-screen centered card, 16px side padding
     *   Tablet (768px+)  — centered card max-w 420px
     *   Laptop (1024px+) — split: left branding panel + right login card
     *
     * Test: 375 / 390 / 768 / 1024 / 1280 / 1920px
     */
    <div
      className="min-h-dvh w-full flex items-center justify-center"
      style={{ background: 'var(--bg-base)' }}
    >
      {/* Subtle grid overlay */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          opacity: 0.25,
        }}
      />

      {/* ── Split wrapper: stacked on mobile/tablet, side-by-side on laptop ── */}
      <div className="relative z-10 w-full flex flex-col lg:flex-row lg:min-h-dvh">

        {/* Left branding panel — only on lg+ */}
        <div
          className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12 gap-8"
          style={{ background: 'var(--bg-surface)', borderRight: '1px solid var(--border)' }}
        >
          <div
            className="flex items-center justify-center rounded"
            style={{ width: 80, height: 80, background: 'var(--critical)', boxShadow: '0 0 48px rgba(232,0,29,0.3)' }}
          >
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 32, letterSpacing: '3px', color: '#fff' }}>AES</span>
          </div>
          <div className="text-center flex flex-col gap-3">
            <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 40, color: 'var(--text)', letterSpacing: '2px', lineHeight: 1 }}>
              Ambulance Emergency System
            </h2>
            <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 15, color: 'var(--text-dim)', lineHeight: 1.6, maxWidth: 380 }}>
              Real-time emergency dispatch, fleet coordination, and hospital network management.
            </p>
          </div>
          <div className="flex flex-col gap-3 w-full max-w-xs">
            {[['Active Dispatch', 'Real-time ambulance routing'], ['Hospital Network', 'Live bed availability'], ['SLA Monitoring', 'Automated breach alerts']].map(([t, d]) => (
              <div key={t} className="flex items-center gap-3 p-3 rounded" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: 'var(--critical)' }} />
                <div>
                  <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 13, color: 'var(--text)', letterSpacing: '0.5px' }}>{t}</p>
                  <p style={{ fontSize: 11, color: 'var(--text-dim)' }}>{d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right login card — full width mobile, max 420px tablet, 50% desktop */}
        <div className="flex-1 flex items-center justify-center p-4 sm:p-8 lg:p-12">
          <div
            className="relative w-full animate-slide-in-up px-5 py-7 sm:px-8 sm:py-9"
            style={{
              maxWidth: 400,
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 8,
            }}
          >
            {/* Header */}
            <div className="flex flex-col items-center mb-6 sm:mb-8 text-center">
              {/* AES logo mark */}
              <div
                className="flex items-center justify-center rounded mb-3 sm:mb-4"
                style={{
                  width: 48,
                  height: 48,
                  background: 'var(--critical)',
                  boxShadow: '0 0 32px rgba(232,0,29,0.25)',
                }}
              >
                <span
                  style={{
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontWeight: 700,
                    fontSize: 18,
                    letterSpacing: '2px',
                    color: '#fff',
                  }}
                >
                  AES
                </span>
              </div>

              <h1
                style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontWeight: 700,
                  fontSize: 30,
                  color: 'var(--text)',
                  letterSpacing: '1px',
                  lineHeight: 1,
                  marginBottom: 6,
                }}
              >
                AES
              </h1>
              <p
                style={{
                  fontFamily: "'Barlow', sans-serif",
                  fontSize: 13,
                  color: 'var(--text-dim)',
                  letterSpacing: '0.5px',
                }}
              >
                Ambulance Emergency System
              </p>
            </div>

            {/* Error */}
            {error && (
              <div
                className="mb-4 rounded px-4 py-3 text-sm"
                style={{
                  background: 'var(--critical-bg)',
                  border: '1px solid var(--critical-br)',
                  color: 'var(--critical)',
                  fontFamily: "'Barlow', sans-serif",
                }}
              >
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="flex flex-col gap-4 sm:gap-5">

              {/* Role pills — full width row, 48px min-height for touch */}
              <div className="flex flex-col gap-2">
                <label className="section-label">Select Role</label>
                <div className="flex gap-2">
                  {ROLES.map(r => {
                    const isActive = role === r.value;
                    return (
                      <button
                        key={r.value}
                        type="button"
                        onClick={() => setRole(r.value)}
                        className="flex-1 flex items-center justify-center rounded transition-all"
                        style={{
                          height: 48,
                          fontFamily: "'Barlow Condensed', sans-serif",
                          fontWeight: 700,
                          fontSize: 12,
                          letterSpacing: '1.5px',
                          textTransform: 'uppercase',
                          border: `1px solid ${isActive ? r.accent : 'var(--border)'}`,
                          background: isActive ? r.dimAccent : 'var(--bg-raised)',
                          color: isActive ? r.accent : 'var(--text-dim)',
                          cursor: 'pointer',
                        }}
                      >
                        {r.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Email */}
              <div className="flex flex-col gap-2">
                <label className="section-label">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="input-aes"
                  style={{ minHeight: 48 }}
                  placeholder={role ? `${role}@aes.com` : 'Select a role first'}
                />
              </div>

              {/* Password */}
              <div className="flex flex-col gap-2">
                <label className="section-label">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="input-aes"
                  style={{ minHeight: 48 }}
                  placeholder="••••••••"
                />
              </div>

              {/* Submit — full width, 52px */}
              <button
                type="submit"
                disabled={loading || !role}
                className="btn-base btn-primary w-full mt-1 sm:mt-2"
                style={{
                  height: 52,
                  fontSize: 14,
                  letterSpacing: '2.5px',
                  background: activeRole ? activeRole.accent : 'var(--critical)',
                }}
              >
                {loading
                  ? <Loader2 size={18} className="animate-spin" />
                  : role
                  ? `Sign in as ${role.toUpperCase()}`
                  : 'Select a role'}
              </button>
            </form>

            {/* Footer */}
            <div
              className="flex items-center justify-between mt-6 sm:mt-8 pt-4 sm:pt-5"
              style={{ borderTop: '1px solid var(--border)' }}
            >
              <span
                style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: 11,
                  letterSpacing: '1.5px',
                  color: 'var(--text-dim)',
                  textTransform: 'uppercase',
                }}
              >
                Secure Connection
              </span>
              <span
                style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: 11,
                  letterSpacing: '1.5px',
                  color: 'var(--safe)',
                  textTransform: 'uppercase',
                }}
              >
                v1.0.0
              </span>
            </div>
          </div>{/* /.card */}
        </div>{/* /.right panel */}
      </div>{/* /.split wrapper */}
    </div>
  );
}