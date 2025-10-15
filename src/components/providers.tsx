"use client";
import { Theme } from "@radix-ui/themes";
import { ThemeProvider } from "@/contexts/ThemeContext";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <Theme appearance="dark" accentColor="violet" grayColor="slate">
        {children}
      </Theme>
    </ThemeProvider>
  );
}


