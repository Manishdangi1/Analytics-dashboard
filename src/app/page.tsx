import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen p-6 flex items-center justify-center">
      <div className="max-w-2xl w-full text-center space-y-6">
        <h1 className="text-4xl font-semibold">Indus Analytics Dashboard</h1>
        <p className="text-neutral-300">
          Login to explore your data, ask questions in natural language, and view beautiful insights.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link href="/login" className="rounded bg-violet-600 hover:bg-violet-500 px-4 py-2 font-medium">Login</Link>
          <Link href="/register" className="rounded border border-neutral-700 hover:border-neutral-600 px-4 py-2 font-medium">Register</Link>
          {/* Dashboard link intentionally removed to enforce login-first flow */}
        </div>
      </div>
    </div>
  );
}
