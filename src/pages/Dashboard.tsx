import { useStore } from "@/store/StoreProvider";
import { isTaskOnDate, todayStr } from "@/lib/storage";
import { TaskRow } from "@/components/TaskRow";
import { CategoryChips } from "@/components/CategoryChips";
import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TaskEditorSheet } from "@/components/TaskEditorSheet";

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "Good night";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 22) return "Good evening";
  return "Good night";
}

export default function Dashboard() {
  const { store } = useStore();
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const today = todayStr();

  const todayTasks = useMemo(
    () =>
      store.tasks
        .filter((t) => isTaskOnDate(t, today))
        .filter((t) => !activeCat || t.categoryId === activeCat)
        .sort((a, b) => (a.time || "99:99").localeCompare(b.time || "99:99")),
    [store.tasks, today, activeCat]
  );

  const completedCount = todayTasks.filter((t) => t.completions[today]).length;
  const total = todayTasks.length;
  const pct = total === 0 ? 0 : Math.round((completedCount / total) * 100);

  const dateLabel = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="space-y-1">
        <p className="text-sm text-muted-foreground">{dateLabel}</p>
        <h1 className="text-3xl font-bold tracking-tight">
          {greeting()}<span className="text-primary">.</span>
        </h1>
      </header>

      {/* Progress card */}
      <section className="glass-card p-5 relative overflow-hidden">
        <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-gradient-primary opacity-20 blur-2xl" />
        <div className="flex items-center gap-5">
          <ProgressRing pct={pct} />
          <div className="flex-1">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Today's progress</p>
            <p className="text-2xl font-semibold mt-0.5">
              {completedCount}<span className="text-muted-foreground">/{total || 0}</span>
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {total === 0 ? "Add your first task to begin." : pct === 100 ? "All done. Beautiful day. ✨" : "Keep going, you're flowing."}
            </p>
          </div>
        </div>
      </section>

      <CategoryChips activeId={activeCat} onChange={setActiveCat} />

      <section className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-base font-semibold">Today</h2>
          <Button
            size="sm"
            variant="ghost"
            className="rounded-full text-primary hover:text-primary hover:bg-primary/10"
            onClick={() => setEditorOpen(true)}
          >
            <Plus className="w-4 h-4 mr-1" /> Add
          </Button>
        </div>

        {todayTasks.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <p className="text-sm text-muted-foreground">No tasks yet.</p>
            <Button onClick={() => setEditorOpen(true)} className="mt-4 rounded-full bg-gradient-primary shadow-glow">
              <Plus className="w-4 h-4 mr-1" /> Create task
            </Button>
          </div>
        ) : (
          <ul className="space-y-2">
            {todayTasks.map((t, i) => (
              <li key={t.id} style={{ animationDelay: `${i * 30}ms` }} className="animate-slide-up">
                <TaskRow task={t} dateStr={today} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <TaskEditorSheet open={editorOpen} onOpenChange={setEditorOpen} />
    </div>
  );
}

function ProgressRing({ pct }: { pct: number }) {
  const r = 28;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  return (
    <div className="relative w-20 h-20">
      <svg viewBox="0 0 72 72" className="w-20 h-20 -rotate-90">
        <circle cx="36" cy="36" r={r} stroke="hsl(var(--muted))" strokeWidth="6" fill="none" />
        <circle
          cx="36" cy="36" r={r}
          stroke="url(#g)"
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 600ms cubic-bezier(0.16,1,0.3,1)" }}
        />
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" />
            <stop offset="100%" stopColor="hsl(var(--primary-glow))" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-semibold">{pct}%</span>
      </div>
    </div>
  );
}
