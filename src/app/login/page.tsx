"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { setAccessToken } from "@/lib/auth";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data } = await api.post<Record<string, unknown>>("/auth/login", { email, password });
      const token =
        (data as { access_token?: string })?.access_token ||
        (data as { token?: string })?.token ||
        (data as { jwt?: string })?.jwt;
      if (!token) throw new Error("No token in response");
      setAccessToken(token);
      
      // Store user email in localStorage for immediate use
      localStorage.setItem("user_email", email);
      
      router.replace("/dashboard");
    } catch (err) {
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        (err as Error).message ||
        "Login failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden">
      {/* Modern gradient orbs */}
      <div className="pointer-events-none absolute -top-32 -left-24 h-80 w-80 rounded-full bg-gradient-to-br from-blue-600/20 to-purple-600/20 blur-3xl animate-pulse" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-gradient-to-br from-purple-600/20 to-blue-600/20 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      
      <div className="h-full w-full flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 border border-slate-700/50 p-10 rounded-3xl backdrop-blur-xl shadow-2xl glass-fade-in fade-in-up">
            {/* Header */}
            <div className="text-center mb-10">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center mx-auto mb-5 shadow-xl shadow-blue-500/30">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-8 h-8 text-white">
                  <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                </svg>
              </div>
              <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-gray-100 via-blue-200 to-purple-200 bg-clip-text text-transparent mb-3">Welcome Back</h1>
              <p className="text-slate-400 text-[15px]">Sign in to access your analytics dashboard</p>
            </div>

            {/* Form */}
            <form onSubmit={onSubmit} className="space-y-6">
              <div className="space-y-2.5">
                <label className="text-[14px] font-semibold text-slate-300">Email Address</label>
                <div className="relative">
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3.5 bg-slate-800/60 border border-slate-700/60 rounded-xl text-gray-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 text-[15px]"
                    required
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-slate-500">
                      <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                    </svg>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2.5">
                <label className="text-[14px] font-semibold text-slate-300">Password</label>
                <div className="relative">
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3.5 bg-slate-800/60 border border-slate-700/60 rounded-xl text-gray-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 text-[15px]"
                    required
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-slate-500">
                      <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-4 bg-gradient-to-r from-red-500/15 to-red-600/15 border border-red-500/30 rounded-xl backdrop-blur-sm">
                  <div className="flex items-center gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-red-400 flex-shrink-0">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <p className="text-[14px] text-red-300 font-medium">{error}</p>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full px-6 py-4 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 disabled:opacity-40 disabled:cursor-not-allowed hover:from-blue-500 hover:to-purple-500 transition-all duration-200 pressable shadow-xl shadow-blue-500/30 text-white font-semibold text-[16px]"
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/50 border-t-transparent rounded-full animate-spin" />
                    Signing in...
                  </div>
                ) : (
                  "Sign In"
                )}
              </button>
            </form>

            {/* Footer */}
            <div className="mt-10 text-center space-y-4">
              <p className="text-[13px] text-slate-500">
                By continuing, you agree to our{" "}
                <a href="#" className="text-blue-400 hover:text-purple-400 underline underline-offset-2 transition-colors">
                  Terms of Service
                </a>{" "}
                and{" "}
                <a href="#" className="text-blue-400 hover:text-purple-400 underline underline-offset-2 transition-colors">
                  Privacy Policy
                </a>
              </p>
              <p className="text-slate-300 text-[15px]">
                Don't have an account?{" "}
                <Link href="/register" className="text-blue-400 hover:text-purple-400 underline underline-offset-2 font-semibold transition-colors">
                  Create one
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


