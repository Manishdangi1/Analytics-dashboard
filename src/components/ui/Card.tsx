import { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={
        "rounded-xl border border-white/10 bg-white/5 backdrop-blur-md shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition hover:shadow-[0_8px_40px_rgb(0,0,0,0.2)] dark:border-white/10 dark:bg-white/5 dark:shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:hover:shadow-[0_8px_40px_rgb(0,0,0,0.2)] light:border-gray-200/60 light:bg-white/90 light:shadow-[0_8px_30px_rgb(0,0,0,0.08)] light:hover:shadow-[0_8px_40px_rgb(0,0,0,0.12)] " +
        className
      }
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={"px-4 py-3 border-b border-white/10 flex items-center justify-between dark:border-white/10 light:border-gray-200/60 " + className}>{children}</div>;
}

export function CardContent({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={"p-4 " + className}>{children}</div>;
}


