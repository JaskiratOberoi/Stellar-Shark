import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { NexusMark } from '../components/nexus/NexusMark.jsx';
import { SectionMarker } from '../components/nexus/SectionMarker.jsx';
import { HairlineRule } from '../components/nexus/HairlineRule.jsx';
import { CornerBrackets } from '../components/nexus/CornerBrackets.jsx';
import { ThemeToggle } from '../components/nexus/ThemeToggle.jsx';

export function LoginPage() {
    const { login, isAuthenticated, authRequired, loading } = useAuth();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const navigate = useNavigate();
    const loc = useLocation();
    const reduce = useReducedMotion();
    const from = loc.state?.from?.pathname || '/';

    if (!loading && authRequired === false) {
        return <Navigate to="/teller/dashboard" replace />;
    }

    if (!loading && isAuthenticated) {
        return <Navigate to={from} replace />;
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSubmitting(true);
        try {
            await login(username, password);
            navigate(from, { replace: true });
        } catch (err) {
            setError(err.message || String(err));
        } finally {
            setSubmitting(false);
        }
    };

    const enterY = reduce ? 0 : 12;

    return (
        <div className="min-h-dvh bg-bg text-ink relative overflow-hidden">
            {/* Hairline grid backdrop */}
            <div className="nexus-bg" aria-hidden />

            {/* Header strip */}
            <header className="relative z-10 flex items-center justify-between px-6 md:px-10 py-5 border-b border-ink">
                <div className="flex items-center gap-3">
                    <NexusMark size={22} animate loop={7000} />
                    <span className="font-mono uppercase text-eyebrow text-ink-2">
                        Stellar Infomatica <span className="text-ink-3">/</span> Genomics LIS
                    </span>
                </div>
                <ThemeToggle />
            </header>

            <div className="relative z-10 grid lg:grid-cols-[1.3fr_1fr] min-h-[calc(100dvh-65px)]">
                {/* LEFT: editorial hero */}
                <section className="relative px-6 md:px-12 py-12 lg:py-20 border-b lg:border-b-0 lg:border-r border-ink flex flex-col justify-between">
                    <div>
                        <SectionMarker number={1} label="Sign in" />
                        <motion.h1
                            initial={{ opacity: 0, y: enterY }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, ease: [0.65, 0, 0.35, 1] }}
                            className="mt-6 font-display font-bold text-display-1 lg:text-display-hero leading-[0.9] tracking-[-0.04em] text-ink"
                        >
                            NEXUS
                        </motion.h1>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.4, delay: 0.2 }}
                            className="mt-4 flex items-center gap-3"
                        >
                            <span className="block w-8 h-[2px] bg-accent" aria-hidden />
                            <p className="font-mono uppercase text-eyebrow text-ink-2">
                                The genomics operations console
                            </p>
                        </motion.div>
                        <motion.p
                            initial={{ opacity: 0, y: enterY }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.3, ease: [0.65, 0, 0.35, 1] }}
                            className="mt-10 max-w-md text-base text-ink-2 leading-relaxed"
                        >
                            Daily test volume, instrument throughput, and laboratory operations -- one
                            instrument-grade interface for your entire LIS.
                        </motion.p>
                    </div>

                    {/* Decorative geometric mark + meta */}
                    <div className="hidden lg:flex items-end justify-between mt-16">
                        <div className="flex items-center gap-6">
                            <NexusMark size={120} animate loop={7000} />
                            <div>
                                <p className="font-mono uppercase text-eyebrow text-ink-3">Build</p>
                                <p className="font-mono text-sm text-ink num">v2.5.0</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="font-mono uppercase text-eyebrow text-ink-3">Issued</p>
                            <p className="font-mono text-sm text-ink num">{new Date().getFullYear()}</p>
                        </div>
                    </div>
                </section>

                {/* RIGHT: form */}
                <section className="relative px-6 md:px-12 py-12 lg:py-20 flex items-start lg:items-center">
                    <motion.div
                        initial={{ opacity: 0, y: enterY }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.15, ease: [0.65, 0, 0.35, 1] }}
                        className="w-full max-w-md"
                    >
                        <div className="flex items-center justify-between">
                            <SectionMarker number={2} label="Credentials" />
                            <span className="font-mono text-eyebrow uppercase text-ink-3">Required</span>
                        </div>
                        <HairlineRule className="mt-3" />

                        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                            <div className="group relative">
                                <label
                                    className="font-mono uppercase text-eyebrow text-ink-2 block mb-2"
                                    htmlFor="user"
                                >
                                    Username
                                </label>
                                <div className="relative">
                                    <input
                                        id="user"
                                        autoComplete="username"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        className="nexus-input"
                                        required
                                    />
                                    <CornerBrackets onHover />
                                </div>
                            </div>
                            <div className="group relative">
                                <label
                                    className="font-mono uppercase text-eyebrow text-ink-2 block mb-2"
                                    htmlFor="pass"
                                >
                                    Password
                                </label>
                                <div className="relative">
                                    <input
                                        id="pass"
                                        type="password"
                                        autoComplete="current-password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="nexus-input"
                                        required
                                    />
                                    <CornerBrackets onHover />
                                </div>
                            </div>

                            {error ? (
                                <div className="border border-signal-danger bg-signal-danger/10 px-4 py-3">
                                    <p className="font-mono uppercase text-eyebrow text-signal-danger mb-1">
                                        Error
                                    </p>
                                    <p className="text-sm text-ink">{error}</p>
                                </div>
                            ) : null}

                            <button
                                type="submit"
                                disabled={submitting}
                                className="nexus-btn-accent w-full justify-between"
                            >
                                <span>{submitting ? 'Signing in' : 'Sign in'}</span>
                                <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
                            </button>
                        </form>

                        <p className="mt-10 font-mono uppercase text-eyebrow text-ink-3">
                            Stellar Infomatica <span className="text-ink-3">/</span> Confidential
                        </p>
                    </motion.div>
                </section>
            </div>
        </div>
    );
}
