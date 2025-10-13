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
    <div className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-semibold">Register</h1>
        <input
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2"
          required
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2"
          required
        />
        <input
          placeholder="Mobile"
          value={mobile}
          onChange={(e) => setMobile(e.target.value)}
          className="w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2"
          required
        />
        {error && <p className="text-red-500 text-sm">{error}</p>}
        {ok && <p className="text-green-500 text-sm">{ok}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-violet-600 hover:bg-violet-500 px-3 py-2 font-medium"
        >
          {loading ? "Submitting..." : "Create account"}
        </button>
      </form>
    </div>
  );
}


