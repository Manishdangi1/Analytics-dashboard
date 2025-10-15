"use client";
import Link from "next/link";
import { useState, useEffect } from "react";

// Particle System
function ParticleSystem() {
  const [particles, setParticles] = useState<Array<{
    id: number;
    left: number;
    top: number;
    animationDelay: number;
    animationDuration: number;
  }>>([]);

  useEffect(() => {
    const generatedParticles = [...Array(20)].map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      animationDelay: Math.random() * 3,
      animationDuration: 3 + Math.random() * 2
    }));
    setParticles(generatedParticles);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute w-1 h-1 bg-blue-400/30 rounded-full floating"
          style={{
            left: `${particle.left}%`,
            top: `${particle.top}%`,
            animationDelay: `${particle.animationDelay}s`,
            animationDuration: `${particle.animationDuration}s`
          }}
        />
      ))}
    </div>
  );
}

export default function Home() {
  return (
    <div className="h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden flex flex-col">
      {/* Modern gradient orbs */}
      <div className="pointer-events-none absolute -top-32 -left-24 h-80 w-80 rounded-full bg-gradient-to-br from-blue-600/20 to-purple-600/20 blur-3xl animate-pulse" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-gradient-to-br from-purple-600/20 to-blue-600/20 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      <div className="pointer-events-none absolute top-1/4 right-1/4 h-60 w-60 rounded-full bg-gradient-to-br from-emerald-500/10 to-teal-500/10 blur-2xl animate-pulse" style={{ animationDelay: '2s' }} />
      
      {/* Animated background particles */}
      <ParticleSystem />

      <section className="flex-1 flex items-center justify-center w-full px-6 relative z-10">
        <div className="text-center space-y-10 max-w-6xl">
          {/* Modern badge */}
          <div className="fade-in-up stagger-1">
            <span className="inline-flex items-center gap-2.5 rounded-full border border-slate-700/60 bg-slate-800/40 backdrop-blur-sm px-6 py-3 text-[13px] tracking-wide text-slate-300 hover:border-blue-500/30 transition-all duration-300 shadow-lg">
              <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-pulse" />
              Next-generation data intelligence
            </span>
          </div>
          
          {/* Modern main heading */}
          <div className="space-y-5">
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold leading-tight fade-in-up stagger-2">
              <span className="bg-gradient-to-r from-gray-100 via-blue-200 to-purple-200 bg-clip-text text-transparent">
                Indus Analytics
              </span>
            </h1>
            <div className="fade-in-up stagger-3">
              <div className="w-32 h-1 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 mx-auto rounded-full shadow-lg shadow-blue-500/50" />
            </div>
          </div>
          
          {/* Modern description */}
          <div className="fade-in-up stagger-4">
            <p className="mx-auto max-w-3xl text-slate-300 text-base md:text-lg lg:text-xl leading-relaxed">
              Ask questions in natural language and instantly turn your data into interactive visualizations.
              <br />
              <span className="text-blue-400 font-semibold">Pin the best insights</span> to your personal dashboard and collaborate with your team.
            </p>
          </div>
          
          {/* Modern CTA buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-5 pt-6 fade-in-up stagger-5">
            <Link
              href="/login"
              className="pressable inline-flex items-center gap-3 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 px-10 py-4 text-lg font-semibold text-white shadow-xl shadow-blue-500/30 hover:shadow-2xl hover:shadow-blue-500/40 transition-all duration-300 hover:scale-105 group"
            >
              <span>Get Started</span>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300">
                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </Link>
            <Link
              href="/register"
              className="pressable inline-flex items-center gap-3 rounded-2xl border border-slate-700/60 bg-slate-800/40 backdrop-blur-sm px-10 py-4 text-lg font-semibold text-slate-200 hover:bg-slate-800/60 hover:border-blue-500/40 transition-all duration-300 hover:scale-105 group"
            >
              <span>Create Account</span>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 group-hover:rotate-12 transition-transform duration-300">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
            </Link>
          </div>
          
          {/* Modern feature cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 max-w-5xl mx-auto">
            <Link href="/login" className="fade-in-up stagger-1 bg-gradient-to-br from-slate-800/60 to-slate-900/60 border border-slate-700/50 p-7 rounded-2xl hover:border-blue-500/40 hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300 group pressable block backdrop-blur-sm">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl flex items-center justify-center mx-auto mb-5 group-hover:scale-110 transition-transform duration-300 border border-blue-500/30">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-7 h-7 text-blue-400">
                  <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-100 mb-2.5 group-hover:text-blue-400 transition-colors">Smart Analytics</h3>
              <p className="text-[14px] text-slate-400 group-hover:text-slate-300 transition-colors leading-relaxed">AI-powered insights that transform your data</p>
            </Link>
            
            <Link href="/login" className="fade-in-up stagger-2 bg-gradient-to-br from-slate-800/60 to-slate-900/60 border border-slate-700/50 p-7 rounded-2xl hover:border-purple-500/40 hover:shadow-xl hover:shadow-purple-500/10 transition-all duration-300 group pressable block backdrop-blur-sm">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-xl flex items-center justify-center mx-auto mb-5 group-hover:scale-110 transition-transform duration-300 border border-purple-500/30">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-7 h-7 text-purple-400">
                  <path fillRule="evenodd" d="M18 5.5a2.5 2.5 0 0 0-2.5-2.5h-11A2.5 2.5 0 0 0 2 5.5v6A2.5 2.5 0 0 0 4.5 14H6v2.25c0 .42.47.66.82.42L10.5 14H15.5A2.5 2.5 0 0 0 18 11.5v-6Z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-100 mb-2.5 group-hover:text-purple-400 transition-colors">Natural Language</h3>
              <p className="text-[14px] text-slate-400 group-hover:text-slate-300 transition-colors leading-relaxed">Ask questions in plain English, get instant answers</p>
            </Link>
            
            <Link href="/login" className="fade-in-up stagger-3 bg-gradient-to-br from-slate-800/60 to-slate-900/60 border border-slate-700/50 p-7 rounded-2xl hover:border-emerald-500/40 hover:shadow-xl hover:shadow-emerald-500/10 transition-all duration-300 group pressable block backdrop-blur-sm">
              <div className="w-14 h-14 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-xl flex items-center justify-center mx-auto mb-5 group-hover:scale-110 transition-transform duration-300 border border-emerald-500/30">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-7 h-7 text-emerald-400">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.236 4.53L7.53 10.53a.75.75 0 00-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-100 mb-2.5 group-hover:text-emerald-400 transition-colors">Real-time Results</h3>
              <p className="text-[14px] text-slate-400 group-hover:text-slate-300 transition-colors leading-relaxed">Instant visualizations that update in real-time</p>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
