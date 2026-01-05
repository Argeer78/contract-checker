'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Scale, FileText, AlertTriangle, CheckCircle, ShieldAlert, Sparkles, Lock, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
  const [contractText, setContractText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [isPricingOpen, setIsPricingOpen] = useState(false);
  const [currency, setCurrency] = useState<'usd' | 'eur'>('usd');
  const [interval, setInterval] = useState<'monthly' | 'yearly'>('monthly');
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, [supabase]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    router.refresh();
  };

  const isPro = user?.app_metadata?.plan === 'pro' || user?.app_metadata?.role === 'admin';
  const charLimit = isPro ? 100000 : 2000;

  const handleAnalyze = async () => {
    if (!user) {
      router.push('/login');
      return;
    }
    if (!contractText.trim()) return;
    setIsAnalyzing(true);
    setResult(null);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: JSON.stringify({ text: contractText }),
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        if (response.status === 401) router.push('/login');
        throw new Error(`Analysis failed with status ${response.status}`);
      }

      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error("API Call Failed", error);
      alert("Analysis failed. Please try again or check your API key.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!user) {
      router.push('/login');
      return;
    }

    if (!isPro) {
      setIsPricingOpen(true);
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/parse-pdf', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to parse PDF');
      }

      const data = await response.json();
      setContractText(data.text);
    } catch (error: any) {
      console.error('Upload failed:', error);
      alert(`Upload failed: ${error.message}`);
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleCheckout = async () => {
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        body: JSON.stringify({ currency, interval }),
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error('No URL returned from checkout session creation', data);
        alert('Failed to start checkout. Please try again.');
      }
    } catch (error) {
      console.error('Checkout failed:', error);
      alert('Checkout failed. Please check your connection.');
    }
  };

  const openPricing = () => {
    setIsPricingOpen(true);
  };

  return (
    <main className="min-h-screen bg-linear-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex flex-col items-center p-6 md:p-24 relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-96 bg-brand-500/10 rounded-full blur-3xl -translate-y-1/2 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="z-10 w-full max-w-4xl flex flex-col items-center text-center space-y-6"
      >
        <div className="flex items-center justify-center space-x-2 bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 px-4 py-1.5 rounded-full text-sm font-medium border border-brand-200 dark:border-brand-800">
          <Scale className="w-4 h-4" />
          <span>AI Contract Clause Explainer</span>
        </div>

        {user ? (
          <div className="absolute top-6 right-6 md:top-10 md:right-10 flex items-center gap-4">
            <div className="flex flex-col items-end">
              <span className="text-xs text-slate-500 hidden md:block">{user.email}</span>
              {isPro && <span className="text-[10px] font-bold text-brand-600 dark:text-brand-400 bg-brand-100 dark:bg-brand-900/50 px-1.5 rounded-full">PRO MEMBER</span>}
            </div>
            <button onClick={handleSignOut} className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
              Sign Out
            </button>
            {!isPro && (
              <button onClick={openPricing} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-400 to-amber-600 text-white rounded-full font-bold shadow-lg hover:scale-105 transition-transform">
                <Sparkles className="w-4 h-4" /> Go Pro
              </button>
            )}
          </div>
        ) : (
          <button onClick={() => router.push('/login')} className="absolute top-6 right-6 md:top-10 md:right-10 text-sm font-medium text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 transition-colors">
            Sign In
          </button>
        )}

        <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-slate-900 dark:text-white">
          Understand what you <br />
          <span className="text-transparent bg-clip-text bg-linear-to-r from-brand-600 to-brand-400">are signing.</span>
        </h1>

        <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl">
          Don't let legal jargon confuse you. Paste your contract clause below and get a plain English explanation and risk assessment instantly.
        </p>

        <div className="flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
          <span className="flex h-2 w-2 rounded-full bg-green-500"></span>
          Supports contracts in any language
        </div>

        {/* Input Zone */}
        <div className="w-full mt-8 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-2 overflow-hidden ring-1 ring-slate-900/5 transition-all focus-within:ring-brand-500 focus-within:border-brand-500">
          <textarea
            value={contractText}
            onChange={(e) => setContractText(e.target.value)}
            maxLength={charLimit}
            placeholder={user ? "Paste a contract clause here..." : "Sign in to analyze contract clauses..."}
            className="w-full h-40 md:h-56 p-4 resize-none outline-none text-slate-700 dark:text-slate-200 bg-transparent text-base md:text-lg placeholder:text-slate-400"
          />
          <div className="flex justify-between items-center px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-700 rounded-b-xl">
            <div className="flex items-center gap-4">
              <span className={cn("text-xs font-medium", contractText.length >= charLimit ? "text-red-500" : "text-slate-500")}>
                {contractText.length} / {isPro ? 'Unlimited' : charLimit} characters
              </span>
              <label
                onClick={(e) => {
                  if (!user) { e.preventDefault(); router.push('/login'); }
                  else if (!isPro) { e.preventDefault(); openPricing(); }
                }}
                className={cn(
                  "text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer",
                  !isPro && user
                    ? "text-slate-400 hover:text-slate-600"
                    : isUploading
                      ? "text-slate-400 cursor-wait"
                      : "text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
                )}>
                {!user ? (
                  <span className="flex items-center gap-1" title="Sign in to upload PDFs">
                    <Lock className="w-3 h-3" />
                    <span>Sign in to Upload PDF</span>
                  </span>
                ) : !isPro ? (
                  <span className="flex items-center gap-1" title="Upgrade to Pro to upload PDFs">
                    <Lock className="w-3 h-3 text-amber-500" />
                    <span className="text-amber-600">Upgrade to Upload PDF</span>
                  </span>
                ) : isUploading ? (
                  <span>Uploading...</span>
                ) : (
                  <>
                    <input type="file" accept=".pdf" className="hidden" onChange={handleFileUpload} />
                    <span>Upload PDF</span>
                  </>
                )}
              </label>
            </div>
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className={cn(
                "rounded-lg px-6 py-2.5 font-semibold text-white shadow-xs transition-all flex items-center gap-2",
                isAnalyzing || (!contractText && user)
                  ? "bg-slate-300 dark:bg-slate-700 cursor-not-allowed"
                  : "bg-brand-600 hover:bg-brand-500 shadow-brand-500/25 active:scale-95"
              )}
            >
              {isAnalyzing ? (
                <>Analyzing...</>
              ) : !user ? (
                <>Sign In to Analyze</>
              ) : (
                <>Analyze Clause <FileText className="w-4 h-4" /></>
              )}
            </button>
          </div>
        </div>

        {/* Results Area */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full mt-8 text-left"
            >
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
                  <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    Result Analysis
                  </h3>
                  <div className={cn(
                    "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5",
                    result.riskLevel === 'High' ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                      result.riskLevel === 'Medium' ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" :
                        "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  )}>
                    {result.riskLevel === 'High' && <ShieldAlert className="w-3.5 h-3.5" />}
                    {result.riskLevel === 'Medium' && <AlertTriangle className="w-3.5 h-3.5" />}
                    {result.riskLevel === 'Low' && <CheckCircle className="w-3.5 h-3.5" />}
                    {result.riskLevel} Risk
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-slate-500 uppercase tracking-wider">Plain English Summary</h4>
                    <p className="text-slate-800 dark:text-slate-200 leading-relaxed">
                      {result.summary}
                    </p>
                  </div>

                  <div className="space-y-3">
                    {result.clauses && result.clauses.length > 0 && (
                      <>
                        <h4 className="text-sm font-medium text-slate-500 uppercase tracking-wider">Risky Clauses Found</h4>
                        {result.clauses.map((clause: any, i: number) => (
                          <div key={i} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700/50">
                            <div className="flex gap-4">
                              <div className="shrink-0 pt-0.5">
                                <AlertTriangle className={cn(
                                  "w-5 h-5",
                                  clause.risk === 'High' ? "text-red-500" : "text-orange-500"
                                )} />
                              </div>
                              <div>
                                <p className="font-mono text-sm text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 p-2 rounded mb-2">
                                  "{clause.text}"
                                </p>
                                <p className="text-slate-800 dark:text-slate-200 text-sm">
                                  <span className="font-medium text-slate-900 dark:text-white">Why it's risky:</span> {clause.explanation}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </div>

              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isPricingOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800"
              >
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Select Your Plan</h2>
                  <button onClick={() => setIsPricingOpen(false)} className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-6 space-y-6">
                  {/* Currency Toggle */}
                  <div className="flex justify-center">
                    <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-lg inline-flex">
                      <button
                        onClick={() => setCurrency('usd')}
                        className={cn(
                          "px-4 py-1.5 rounded-md text-sm font-medium transition-all",
                          currency === 'usd' ? "bg-white dark:bg-slate-700 shadow-sm text-brand-600 dark:text-brand-400" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                        )}
                      >
                        USD ($)
                      </button>
                      <button
                        onClick={() => setCurrency('eur')}
                        className={cn(
                          "px-4 py-1.5 rounded-md text-sm font-medium transition-all",
                          currency === 'eur' ? "bg-white dark:bg-slate-700 shadow-sm text-brand-600 dark:text-brand-400" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                        )}
                      >
                        EUR (€)
                      </button>
                    </div>
                  </div>

                  {/* Interval Toggle */}
                  <div className="flex justify-center">
                    <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-lg inline-flex">
                      <button
                        onClick={() => setInterval('monthly')}
                        className={cn(
                          "px-4 py-1.5 rounded-md text-sm font-medium transition-all",
                          interval === 'monthly' ? "bg-white dark:bg-slate-700 shadow-sm text-brand-600 dark:text-brand-400" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                        )}
                      >
                        Monthly
                      </button>
                      <button
                        onClick={() => setInterval('yearly')}
                        className={cn(
                          "px-4 py-1.5 rounded-md text-sm font-medium transition-all",
                          interval === 'yearly' ? "bg-white dark:bg-slate-700 shadow-sm text-brand-600 dark:text-brand-400" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                        )}
                      >
                        Yearly <span className="ml-1 text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-bold uppercase">-26%</span>
                      </button>
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="text-center space-y-2 py-4">
                    <div className="text-4xl font-bold text-slate-900 dark:text-white">
                      {currency === 'usd' ? '$' : '€'}
                      {interval === 'monthly' ? (currency === 'usd' ? '9.99' : '9.00') : (currency === 'usd' ? '89.00' : '79.00')}
                      <span className="text-lg text-slate-500 font-normal">/{interval === 'monthly' ? 'mo' : 'yr'}</span>
                    </div>
                    {interval === 'yearly' && (
                      <div className="text-sm text-green-600 dark:text-green-400 font-medium">
                        Save ~26% compared to monthly
                      </div>
                    )}
                    <p className="text-slate-500 text-sm">Cancel anytime. Secure checkout via Stripe.</p>
                  </div>

                  <button
                    onClick={handleCheckout}
                    className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-brand-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    Continue to Checkout <Check className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </motion.div>
    </main>
  );
}
