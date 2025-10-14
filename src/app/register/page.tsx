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
    <div className="h-screen page-gradient">
      <div className="h-full w-full glass-fade-in fade-in-up border border-neutral-800/60 bg-neutral-900/60 backdrop-blur-md shadow-lg shadow-cyan-900/10 flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-md px-8">
        <div className="px-8 pt-8 pb-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded indus-button-primary indus-glow" />
            <h1 className="text-2xl font-semibold tracking-tight indus-text-gradient">Create your account</h1>
          </div>
          <p className="text-base text-neutral-400">Join and start exploring insights</p>
        </div>
        <form onSubmit={onSubmit} className="px-8 pb-8 space-y-6">
          <div className="space-y-3">
            <label className="text-base font-medium text-neutral-300">Name</label>
            <input
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-neutral-800 bg-neutral-950/70 px-4 py-3 text-base outline-none focus:border-primary/70 focus:ring-2 focus:ring-primary/20 indus-border-glow"
              required
            />
          </div>
          <div className="space-y-3">
            <label className="text-base font-medium text-neutral-300">Email</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-neutral-800 bg-neutral-950/70 px-4 py-3 text-base outline-none focus:border-primary/70 focus:ring-2 focus:ring-primary/20 indus-border-glow"
              required
            />
          </div>
          <div className="space-y-3">
            <label className="text-base font-medium text-neutral-300">Mobile</label>
            <input
              placeholder="Enter mobile number"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              className="w-full rounded-lg border border-neutral-800 bg-neutral-950/70 px-4 py-3 text-base outline-none focus:border-primary/70 focus:ring-2 focus:ring-primary/20 indus-border-glow"
              required
            />
          </div>
          <div className="space-y-3">
            <label className="text-base font-medium text-neutral-300">Password</label>
            <input
              type="password"
              placeholder="Create a strong password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-neutral-800 bg-neutral-950/70 px-4 py-3 text-base outline-none focus:border-primary/70 focus:ring-2 focus:ring-primary/20 indus-border-glow"
              required
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          {ok && <p className="text-green-500 text-sm">{ok}</p>}
          <button
            type="submit"
            disabled={loading}
            className="pressable w-full rounded-lg indus-button-primary disabled:opacity-60 disabled:cursor-not-allowed px-6 py-4 text-lg font-medium text-white indus-glow"
          >
            {loading ? "Submitting..." : "Create account"}
          </button>
        </form>
            <div className="px-8 pb-8 text-sm text-neutral-500">By signing up you agree to our terms.</div>
          </div>
        </div>
      </div>
    </div>
  );
}


