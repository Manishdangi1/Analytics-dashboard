import Link from "next/link";

export default function Home() {
  return (
    <div className="h-screen page-gradient relative overflow-hidden flex flex-col">
      {/* Enhanced decorative gradient orbs with animations */}
      <div className="pointer-events-none absolute -top-32 -left-24 h-80 w-80 rounded-full bg-primary/20 blur-3xl floating" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-accent/20 blur-3xl floating" style={{ animationDelay: '1s' }} />
      <div className="pointer-events-none absolute top-1/4 right-1/4 h-60 w-60 rounded-full bg-success/10 blur-2xl floating" style={{ animationDelay: '2s' }} />
      
      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-primary/30 rounded-full floating"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${3 + Math.random() * 2}s`
            }}
          />
        ))}
      </div>

      <section className="flex-1 flex items-center justify-center w-full px-6 relative z-10">
        <div className="text-center space-y-8 max-w-6xl">
          {/* Enhanced badge with animation */}
          <div className="fade-in-up stagger-1">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-6 py-3 text-sm tracking-wide text-neutral-300 indus-border-glow hover-glow pressable">
              <div className="w-2 h-2 bg-primary rounded-full pulse-glow" />
              Next‑gen data insights
            </span>
          </div>
          
          {/* Enhanced main heading with staggered animation */}
          <div className="space-y-4">
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold leading-tight fade-in-up stagger-2">
              <span className="indus-text-gradient">
                Indus Analytics
              </span>
            </h1>
            <div className="fade-in-up stagger-3">
              <div className="w-24 h-1 bg-gradient-to-r from-primary to-accent mx-auto rounded-full" />
            </div>
          </div>
          
          {/* Enhanced description with animation */}
          <div className="fade-in-up stagger-4">
            <p className="mx-auto max-w-3xl text-neutral-300 text-base md:text-lg lg:text-xl leading-relaxed">
              Ask questions in natural language and instantly turn your data into interactive visuals.
              <br />
              <span className="text-primary/80 font-medium">Pin the best insights</span> to a personal dashboard and share with your team.
            </p>
          </div>
          
          {/* Enhanced CTA buttons with animations */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-4 fade-in-up stagger-5">
            <Link
              href="/login"
              className="pressable inline-flex items-center gap-3 rounded-full indus-button-primary px-8 py-4 text-lg font-medium text-white indus-glow hover-scale group"
            >
              <span>Get started</span>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 group-hover:translate-x-1 transition-transform">
                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </Link>
            <Link
              href="/register"
              className="pressable inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 hover:bg-white/10 px-8 py-4 text-lg font-medium transition-all hover:border-primary/30 hover-glow group"
            >
              <span>Create account</span>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 group-hover:rotate-12 transition-transform">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
            </Link>
          </div>
          
          {/* Feature highlights with animations */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 max-w-4xl mx-auto">
            <Link href="/login" className="fade-in-up stagger-1 glass-enhanced p-6 rounded-2xl hover-lift group pressable block">
              <div className="w-12 h-12 bg-gradient-to-r from-primary/20 to-accent/20 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6 text-primary">
                  <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-primary transition-colors">Smart Analytics</h3>
              <p className="text-sm text-neutral-400 group-hover:text-neutral-300 transition-colors">AI-powered insights from your data</p>
            </Link>
            
            <Link href="/login" className="fade-in-up stagger-2 glass-enhanced p-6 rounded-2xl hover-lift group pressable block">
              <div className="w-12 h-12 bg-gradient-to-r from-accent/20 to-primary/20 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6 text-accent">
                  <path fillRule="evenodd" d="M18 5.5a2.5 2.5 0 0 0-2.5-2.5h-11A2.5 2.5 0 0 0 2 5.5v6A2.5 2.5 0 0 0 4.5 14H6v2.25c0 .42.47.66.82.42L10.5 14H15.5A2.5 2.5 0 0 0 18 11.5v-6Z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-accent transition-colors">Natural Language</h3>
              <p className="text-sm text-neutral-400 group-hover:text-neutral-300 transition-colors">Ask questions in plain English</p>
            </Link>
            
            <Link href="/login" className="fade-in-up stagger-3 glass-enhanced p-6 rounded-2xl hover-lift group pressable block">
              <div className="w-12 h-12 bg-gradient-to-r from-success/20 to-primary/20 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6 text-success">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.236 4.53L7.53 10.53a.75.75 0 00-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-success transition-colors">Real-time Results</h3>
              <p className="text-sm text-neutral-400 group-hover:text-neutral-300 transition-colors">Instant visualizations and insights</p>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
