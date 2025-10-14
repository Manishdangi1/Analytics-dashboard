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
    <div className="min-h-screen page-gradient flex items-center justify-center p-6">
      <div className="w-full max-w-sm glass-fade-in fade-in-up rounded-xl border border-neutral-800/60 bg-neutral-900/60 backdrop-blur-md shadow-lg shadow-cyan-900/10">
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-8 w-8 rounded bg-gradient-to-br from-cyan-400 to-violet-500" />
            <h1 className="text-xl font-semibold tracking-tight">Create your account</h1>
          </div>
          <p className="text-sm text-neutral-400">Join and start exploring insights</p>
        </div>
        <form onSubmit={onSubmit} className="px-6 pb-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm text-neutral-300">Name</label>
            <input
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-neutral-800 bg-neutral-950/70 px-3 py-2 outline-none focus:border-cyan-500/70 focus:ring-2 focus:ring-cyan-500/20"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-neutral-300">Email</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-neutral-800 bg-neutral-950/70 px-3 py-2 outline-none focus:border-cyan-500/70 focus:ring-2 focus:ring-cyan-500/20"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-neutral-300">Mobile</label>
            <input
              placeholder="Enter mobile number"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              className="w-full rounded-lg border border-neutral-800 bg-neutral-950/70 px-3 py-2 outline-none focus:border-cyan-500/70 focus:ring-2 focus:ring-cyan-500/20"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-neutral-300">Password</label>
            <input
              type="password"
              placeholder="Create a strong password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-neutral-800 bg-neutral-950/70 px-3 py-2 outline-none focus:border-cyan-500/70 focus:ring-2 focus:ring-cyan-500/20"
              required
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          {ok && <p className="text-green-500 text-sm">{ok}</p>}
          <button
            type="submit"
            disabled={loading}
            className="pressable btn-gradient-animate w-full rounded-lg bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-violet-600 hover:from-cyan-300 hover:via-fuchsia-400 hover:to-violet-500 px-3 py-2 font-medium text-black"
          >
            {loading ? "Submitting..." : "Create account"}
          </button>
        </form>
        <div className="px-6 pb-6 text-xs text-neutral-500">By signing up you agree to our terms.</div>
      </div>
    </div>
  );
}


