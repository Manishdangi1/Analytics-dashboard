"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { clearAccessToken, getAccessToken } from "@/lib/auth";

const links = [
  { href: "/dashboard", label: "Dashboard" },
];

export default function TopNav() {
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = getAccessToken();
    setIsAuthenticated(!!token);
    setIsLoading(false);
  }, []);

  if (pathname === "/login" || pathname === "/register") return null;
  
  // Don't render anything while checking authentication
  if (isLoading) return null;
  
  // Only show navigation if user is authenticated
  if (!isAuthenticated) return null;

  return (
    <div className="sticky top-0 z-40 backdrop-blur supports-[backdrop-filter]:bg-white/5 border-b border-white/10">
      <div className="mx-auto max-w-7xl px-4 h-14 flex items-center justify-between">
        <Link href="/dashboard" className="font-semibold">Indus</Link>
        <nav className="flex items-center gap-4 text-sm">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={
                "px-2 py-1 rounded hover:bg-white/10 transition " +
                (pathname === l.href ? "bg-white/10" : "")
              }
            >
              {l.label}
            </Link>
          ))}
          <button
            onClick={() => {
              clearAccessToken();
              if (typeof window !== "undefined") window.location.href = "/login";
            }}
            className="px-2 py-1 rounded hover:bg-white/10 transition"
          >
            Logout
          </button>
        </nav>
      </div>
    </div>
  );
}


