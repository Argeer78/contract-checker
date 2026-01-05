'use client';

import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Mail, LogIn, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [isLogin, setIsLogin] = useState(true);
    const [isForgot, setIsForgot] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (isForgot) {
                const { error } = await supabase.auth.resetPasswordForEmail(email, {
                    redirectTo: `${location.origin}/auth/callback?next=/auth/update-password`,
                });
                if (error) {
                    alert(error.message);
                } else {
                    alert('Check your email for the password reset link!');
                    setIsForgot(false);
                    setIsLogin(true);
                }
            } else if (isLogin) {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });

                if (error) {
                    alert(error.message);
                } else {
                    router.push('/');
                    router.refresh(); // Important to refresh server components
                }
            } else {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        emailRedirectTo: `${location.origin}/auth/callback`,
                    },
                });
                if (error) {
                    alert(error.message);
                } else {
                    alert('Check your email for the confirmation link!');
                    setIsLogin(true);
                }
            }
        } catch (error) {
            console.error('Auth error', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOAuth = async (provider: 'google' | 'github') => {
        setLoading(true);
        const { error } = await supabase.auth.signInWithOAuth({
            provider,
            options: {
                redirectTo: `${location.origin}/auth/callback`,
            },
        });
        if (error) alert(error.message);
        setLoading(false);
    };

    return (
        <main className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl overflow-hidden border border-slate-200 dark:border-slate-800"
            >
                <div className="p-8 text-center space-y-4 bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="mx-auto w-12 h-12 bg-brand-100 dark:bg-brand-900/30 rounded-full flex items-center justify-center text-brand-600 dark:text-brand-400">
                        <ShieldCheck className="w-6 h-6" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                        {isForgot ? 'Reset Password' : (isLogin ? 'Welcome Back' : 'Create Account')}
                    </h1>
                    <p className="text-slate-500 text-sm">
                        {isForgot ? 'We will send you a reset link' : (isLogin ? 'Sign in to access Pro features' : 'Get started with Contract Checker')}
                    </p>
                </div>

                <div className="p-8 pt-0 space-y-6">
                    <form onSubmit={handleAuth} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
                            <div className="relative">
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                                    placeholder="you@example.com"
                                    required
                                />
                                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                            </div>
                        </div>
                        {!isForgot && (
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Password</label>
                                    {isLogin && (
                                        <button
                                            type="button"
                                            onClick={() => setIsForgot(true)}
                                            className="text-xs text-brand-600 hover:text-brand-700 font-medium"
                                        >
                                            Forgot password?
                                        </button>
                                    )}
                                </div>
                                <div className="relative">
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                                        placeholder="••••••••"
                                        required
                                        minLength={6}
                                    />
                                    <ShieldCheck className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                                </div>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {loading ? 'Thinking...' : (
                                isForgot ? 'Send Reset Link' : (isLogin ? <><LogIn className="w-4 h-4" /> Sign In</> : <><UserPlus className="w-4 h-4" /> Sign Up</>)
                            )}
                        </button>
                    </form>

                    <div className="text-center">
                        <button
                            onClick={() => {
                                if (isForgot) {
                                    setIsForgot(false);
                                    setIsLogin(true);
                                } else {
                                    setIsLogin(!isLogin);
                                }
                            }}
                            className="text-sm text-brand-600 hover:text-brand-700 font-medium outline-none"
                        >
                            {isForgot ? "Back to Sign In" : (isLogin ? "Don't have an account? Sign Up" : "Already have an account? Sign In")}
                        </button>
                    </div>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-slate-200 dark:border-slate-700" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-white dark:bg-slate-900 px-2 text-slate-500">Or continue with</span>
                        </div>
                    </div>

                    <button
                        onClick={() => handleOAuth('google')}
                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium py-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-750 transition-all flex items-center justify-center gap-2"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z" /><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                        Google
                    </button>
                </div>
            </motion.div>
        </main>
    );
}
