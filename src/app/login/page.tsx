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
    <div className="min-h-screen page-gradient flex items-center justify-center p-6">
      <div className="w-full max-w-sm glass-fade-in fade-in-up rounded-xl border border-neutral-800/60 bg-neutral-900/60 backdrop-blur-md shadow-lg shadow-violet-900/10">
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-8 w-8 rounded bg-gradient-to-br from-violet-500 to-cyan-400" />
            <h1 className="text-xl font-semibold tracking-tight">Welcome back</h1>
          </div>
          <p className="text-sm text-neutral-400">Sign in to continue to your dashboard</p>
        </div>
        <form onSubmit={onSubmit} className="px-6 pb-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm text-neutral-300">Email</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-neutral-800 bg-neutral-950/70 px-3 py-2 outline-none focus:border-violet-600/70 focus:ring-2 focus:ring-violet-600/20"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-neutral-300">Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-neutral-800 bg-neutral-950/70 px-3 py-2 outline-none focus:border-violet-600/70 focus:ring-2 focus:ring-violet-600/20"
              required
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="pressable btn-gradient-animate w-full rounded-lg bg-gradient-to-r from-violet-600 via-fuchsia-500 to-cyan-400 hover:from-violet-500 hover:via-fuchsia-400 hover:to-cyan-300 px-3 py-2 font-medium text-black"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
        <div className="px-6 pb-3 text-xs text-neutral-500">By continuing you agree to our terms.</div>
        <div className="px-6 pb-6 text-sm text-neutral-300">
          Don't have an account? {" "}
          <Link href="/register" className="text-violet-400 hover:text-violet-300 underline underline-offset-2">Create one</Link>
        </div>
      </div>
    </div>
  );
}


