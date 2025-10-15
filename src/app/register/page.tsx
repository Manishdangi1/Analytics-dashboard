"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setOk(null);
    setLoading(true);
    try {
      await api.post("/auth/register", { email, password, name, mobile });
      setOk("Registered. You can login now.");
      setTimeout(() => router.replace("/login"), 800);
    } catch (err) {
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        (err as Error).message ||
        "Registration failed";
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
                  <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                </svg>
              </div>
              <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-gray-100 via-blue-200 to-purple-200 bg-clip-text text-transparent mb-3">Create Account</h1>
              <p className="text-slate-400 text-[15px]">Join us and start exploring data insights</p>
            </div>

            {/* Form */}
            <form onSubmit={onSubmit} className="space-y-5">
              <div className="grid grid-cols-1 gap-5">
                <div className="space-y-2.5">
                  <label className="text-[14px] font-semibold text-slate-300">Full Name</label>
                  <input
                    placeholder="Enter your full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3.5 bg-slate-800/60 border border-slate-700/60 rounded-xl text-gray-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 text-[15px]"
                    required
                  />
                </div>

                <div className="space-y-2.5">
                  <label className="text-[14px] font-semibold text-slate-300">Email Address</label>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3.5 bg-slate-800/60 border border-slate-700/60 rounded-xl text-gray-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 text-[15px]"
                    required
                  />
                </div>

                <div className="space-y-2.5">
                  <label className="text-[14px] font-semibold text-slate-300">Mobile Number</label>
                  <input
                    type="tel"
                    placeholder="+1 (555) 123-4567"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    className="w-full px-4 py-3.5 bg-slate-800/60 border border-slate-700/60 rounded-xl text-gray-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 text-[15px]"
                    required
                  />
                </div>

                <div className="space-y-2.5">
                  <label className="text-[14px] font-semibold text-slate-300">Password</label>
                  <input
                    type="password"
                    placeholder="Create a strong password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3.5 bg-slate-800/60 border border-slate-700/60 rounded-xl text-gray-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 text-[15px]"
                    required
                  />
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

              {ok && (
                <div className="p-4 bg-gradient-to-r from-emerald-500/15 to-teal-500/15 border border-emerald-500/30 rounded-xl backdrop-blur-sm">
                  <div className="flex items-center gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-emerald-400 flex-shrink-0">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.236 4.53L8.53 10.53a.75.75 0 00-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                    </svg>
                    <p className="text-[14px] text-emerald-300 font-medium">{ok}</p>
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
                    Creating account...
                  </div>
                ) : (
                  "Create Account"
                )}
              </button>
            </form>

            {/* Footer */}
            <div className="mt-10 text-center space-y-4">
              <p className="text-[13px] text-slate-500">
                By creating an account, you agree to our{" "}
                <a href="#" className="text-blue-400 hover:text-purple-400 underline underline-offset-2 transition-colors">
                  Terms of Service
                </a>{" "}
                and{" "}
                <a href="#" className="text-blue-400 hover:text-purple-400 underline underline-offset-2 transition-colors">
                  Privacy Policy
                </a>
              </p>
              <p className="text-slate-300 text-[15px]">
                Already have an account?{" "}
                <a href="/login" className="text-blue-400 hover:text-purple-400 underline underline-offset-2 font-semibold transition-colors">
                  Sign in
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


