import { NavLink } from "react-router-dom";
import { LayoutDashboard, Calendar as CalIcon, Sparkles, Settings as SettingsIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/", label: "Home", icon: LayoutDashboard, end: true },
  { to: "/calendar", label: "Calendar", icon: CalIcon },
  { to: "/tenka", label: "Tenka", icon: Sparkles },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
];

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 safe-bottom px-3 pb-2 pt-2">
      <div className="mx-auto max-w-md glass-card backdrop-blur-xl bg-card/80 border-border/60 px-2 py-1.5 flex items-center justify-around">
        {tabs.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                "relative flex flex-col items-center justify-center gap-0.5 px-3 py-2 rounded-2xl pressable min-w-[64px] transition-colors",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute inset-0 rounded-2xl bg-primary/10 animate-scale-in" aria-hidden />
                )}
                <Icon className="w-5 h-5 relative" strokeWidth={2.2} />
                <span className="text-[10px] font-medium relative tracking-wide">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
