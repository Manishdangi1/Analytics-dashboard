"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { setAccessToken } from "@/lib/auth";

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
    <div className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-semibold">Login</h1>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
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
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-violet-600 hover:bg-violet-500 px-3 py-2 font-medium"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}


