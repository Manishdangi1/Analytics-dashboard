"use client";
import { Theme } from "@radix-ui/themes";
import { useState } from "react";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Theme appearance="dark" accentColor="violet" grayColor="slate">
      {children}
    </Theme>
  );
}


