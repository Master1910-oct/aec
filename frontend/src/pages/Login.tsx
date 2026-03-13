import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { Shield, Loader2 } from 'lucide-react';
import { useStore } from '@/store/useStore';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const { setActiveRole } = useStore();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await api.post<{ data: { token: string; role: string } }>(
                '/api/v1/auth/login',
                { email, password }
            );

            localStorage.setItem('aes_auth_token', response.data.token);

            const role = response.data.role;
            if (['admin', 'hospital', 'ambulance'].includes(role)) {
                setActiveRole(role as any);
            }

            switch (role) {
                case 'hospital':   navigate('/hospital');   break;
                case 'ambulance':
                case 'dispatcher': navigate('/ambulance');  break;
                default:           navigate('/');            break;
            }
        } catch (err: any) {
            setError(err.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-background text-foreground">
            <div className="w-full max-w-sm rounded-lg border border-border bg-card p-8 shadow-xl animate-slide-in-up">
                <div className="flex flex-col items-center mb-8">
                    <div className="h-12 w-12 rounded-lg bg-primary/20 flex items-center justify-center mb-4 text-primary glow-primary">
                        <Shield className="h-7 w-7" />
                    </div>
                    <h1 className="text-xl font-bold tracking-tight">AES CONTROL</h1>
                    <p className="text-xs text-muted-foreground font-mono tracking-wider mt-1">EMERGENCY SYSTEM LOGIN</p>
                </div>

                {error && (
                    <div className="mb-6 rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive-foreground">
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs font-mono text-muted-foreground tracking-wider uppercase">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full h-10 px-3 rounded-md bg-input border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors"
                            placeholder="admin@aes.com"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-mono text-muted-foreground tracking-wider uppercase">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="w-full h-10 px-3 rounded-md bg-input border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors"
                            placeholder="••••••••"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full h-10 mt-4 rounded-md bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity flex items-center justify-center"
                    >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'AUTHENTICATE'}
                    </button>
                </form>

                <div className="mt-8 pt-4 border-t border-border flex justify-between text-[10px] font-mono text-muted-foreground tracking-wider">
                    <span>SECURE CONNECTION</span>
                    <span className="text-success">V_1.0.0</span>
                </div>
            </div>
        </div>
    );
}
