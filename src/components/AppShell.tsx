import { ReactNode } from "react";
import { BottomNav } from "./BottomNav";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen bg-background">
      {/* ambient glow */}
      <div className="pointer-events-none fixed inset-x-0 top-0 h-[420px] bg-gradient-glow" aria-hidden />
      <div className="relative mx-auto max-w-md px-5 pt-6 pb-32 safe-top">
        {children}
      </div>
      <BottomNav />
    </div>
  );
}
