import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen page-gradient relative overflow-hidden">
      {/* Decorative gradient orbs */}
      <div className="pointer-events-none absolute -top-32 -left-24 h-80 w-80 rounded-full bg-violet-600/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-cyan-400/20 blur-3xl" />

      <section className="mx-auto max-w-6xl px-6 pt-28 pb-16 md:pt-36 md:pb-24">
        <div className="text-center space-y-6">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-3 py-1 text-xs tracking-wide text-neutral-300">
            Next‑gen data insights
          </span>
          <h1 className="text-4xl md:text-6xl font-extrabold leading-tight">
            <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-300 bg-clip-text text-transparent">
              Indus Analytics
            </span>
          </h1>
          <p className="mx-auto max-w-3xl text-neutral-300 text-base md:text-lg">
            Ask questions in natural language and instantly turn your data into interactive visuals.
            Pin the best insights to a personal dashboard and share with your team.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link
              href="/login"
              className="pressable btn-gradient-animate inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 via-fuchsia-500 to-cyan-400 hover:from-violet-500 hover:via-fuchsia-400 hover:to-cyan-300 px-5 py-3 font-medium text-black"
            >
              Get started
            </Link>
            <Link
              href="/register"
              className="pressable inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 hover:bg-white/10 px-5 py-3 font-medium"
            >
              Create account
            </Link>
          </div>
        </div>
      </section>

      {/* Feature Highlights */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-3">
          <FeatureCard
            title="Ask anything"
            description="Natural‑language queries with smart context to surface exactly what matters."
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <path d="M18 5.5A2.5 2.5 0 0 0 15.5 3h-11A2.5 2.5 0 0 0 2 5.5v6A2.5 2.5 0 0 0 4.5 14H6v2.25c0 .42.47.66.82.42L10.5 14h5A2.5 2.5 0 0 0 18 11.5v-6Z" />
              </svg>
            }
            accent="from-violet-500 to-fuchsia-500"
          />
          <FeatureCard
            title="Instant visuals"
            description="Auto‑generated charts, tables, and narratives—ready to pin and share."
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <path d="M3 4.75A1.75 1.75 0 0 1 4.75 3h10.5C16.44 3 17 3.56 17 4.25v10.5c0 .69-.56 1.25-1.25 1.25H4.25C3.56 16 3 15.44 3 14.75V4.75Zm3 7.5c0 .41.34.75.75.75h.5a.75.75 0 0 0 .75-.75V7.75A.75.75 0 0 0 7.25 7h-.5a.75.75 0 0 0-.75.75v4.5Zm4 0c0 .41.34.75.75.75h.5a.75.75 0 0 0 .75-.75V5.75A.75.75 0 0 0 12.25 5h-.5a.75.75 0 0 0-.75.75v6.5Zm-6 0c0 .41.34.75.75.75h.5A.75.75 0 0 0 6.75 12V9.75A.75.75 0 0 0 6 9h-.5a.75.75 0 0 0-.75.75v2.5Z" />
              </svg>
            }
            accent="from-cyan-400 to-violet-500"
          />
          <FeatureCard
            title="Personal dashboard"
            description="Pin favorite insights, organize your layout, and revisit in one place."
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <path d="M3.5 5A1.5 1.5 0 0 1 5 3.5h10A1.5 1.5 0 0 1 16.5 5v10A1.5 1.5 0 0 1 15 16.5H5A1.5 1.5 0 0 1 3.5 15V5Zm3 1a.5.5 0 0 0-.5.5V14h8V6.5a.5.5 0 0 0-.5-.5H6.5Z" />
              </svg>
            }
            accent="from-emerald-400 to-cyan-400"
          />
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ title, description, icon, accent }: { title: string; description: string; icon: React.ReactNode; accent: string }) {
  return (
    <div className="glass-fade-in rounded-2xl border border-white/10 bg-white/5 p-4 md:p-5 hover:bg-white/8 transition">
      <div className="flex items-start gap-3">
        <span className={`inline-flex items-center justify-center w-9 h-9 rounded-lg text-white bg-gradient-to-br ${accent} ring-1 ring-white/20 shadow`}>{icon}</span>
        <div className="space-y-1">
          <h3 className="font-medium tracking-tight">{title}</h3>
          <p className="text-sm text-neutral-300">{description}</p>
        </div>
      </div>
    </div>
  );
}
