import Link from "next/link";

export default function Home() {
  return (
    <div className="h-screen page-gradient relative overflow-hidden flex flex-col">
      {/* Decorative gradient orbs */}
      <div className="pointer-events-none absolute -top-32 -left-24 h-80 w-80 rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-accent/20 blur-3xl" />

      <section className="flex-1 flex items-center justify-center w-full px-6">
        <div className="text-center space-y-6 max-w-6xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-4 py-2 text-sm tracking-wide text-neutral-300 indus-border-glow">
             Next‑gen data insights
          </span>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold leading-tight">
            <span className="indus-text-gradient">
              Indus Analytics
            </span>
          </h1>
          <p className="mx-auto max-w-3xl text-neutral-300 text-base md:text-lg lg:text-xl leading-relaxed">
            Ask questions in natural language and instantly turn your data into interactive visuals.
            <br />
            Pin the best insights to a personal dashboard and share with your team.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Link
              href="/login"
              className="pressable inline-flex items-center gap-3 rounded-full indus-button-primary px-8 py-4 text-lg font-medium text-white indus-glow"
            >
              Get started
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </Link>
            <Link
              href="/register"
              className="pressable inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 hover:bg-white/10 px-8 py-4 text-lg font-medium transition-all hover:border-primary/30"
            >
              Create account
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
