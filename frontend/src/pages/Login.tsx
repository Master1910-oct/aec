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
    <div
      className="min-h-dvh w-full flex items-center justify-center p-4"
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

      <div
        className="relative w-full animate-slide-in-up"
        style={{
          maxWidth: 400,
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          padding: '36px 32px',
        }}
      >
        {/* Header */}
        <div className="flex flex-col items-center mb-8 text-center">
          {/* AES logo mark */}
          <div
            className="flex items-center justify-center rounded mb-4"
            style={{
              width: 56,
              height: 56,
              background: 'var(--critical)',
              boxShadow: '0 0 32px rgba(232,0,29,0.25)',
            }}
          >
            <span
              style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 700,
                fontSize: 22,
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
              fontSize: 36,
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
            className="mb-5 rounded px-4 py-3 text-sm"
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

        <form onSubmit={handleLogin} className="flex flex-col gap-5">

          {/* Role pills */}
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
                      height: 44,
                      fontFamily: "'Barlow Condensed', sans-serif",
                      fontWeight: 700,
                      fontSize: 13,
                      letterSpacing: '2px',
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
              placeholder="••••••••"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !role}
            className="btn-base btn-primary w-full mt-2"
            style={{
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
          className="flex items-center justify-between mt-8 pt-5"
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
      </div>
    </div>
  );
}