import { useMemo, useState } from "react";
import { useStore } from "@/store/StoreProvider";
import { isTaskOnDate, todayStr } from "@/lib/storage";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TaskRow } from "@/components/TaskRow";
import { TaskEditorSheet } from "@/components/TaskEditorSheet";
import { cn } from "@/lib/utils";

function startOfWeek(d: Date) {
  const day = d.getDay(); // 0..6
  const s = new Date(d);
  s.setHours(0, 0, 0, 0);
  s.setDate(d.getDate() - day);
  return s;
}

function fmt(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function CalendarPage() {
  const { store } = useStore();
  const [anchor, setAnchor] = useState(() => startOfWeek(new Date()));
  const [selected, setSelected] = useState(todayStr());
  const [open, setOpen] = useState(false);

  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(anchor);
      d.setDate(anchor.getDate() + i);
      return d;
    });
  }, [anchor]);

  const tasks = useMemo(
    () =>
      store.tasks
        .filter((t) => isTaskOnDate(t, selected))
        .sort((a, b) => (a.time || "99:99").localeCompare(b.time || "99:99")),
    [store.tasks, selected]
  );

  const monthLabel = anchor.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  const shift = (delta: number) => {
    const n = new Date(anchor);
    n.setDate(anchor.getDate() + delta * 7);
    setAnchor(startOfWeek(n));
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Calendar</p>
          <h1 className="text-2xl font-bold tracking-tight">{monthLabel}</h1>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={() => shift(-1)} className="rounded-full">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => shift(1)} className="rounded-full">
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-7 gap-1.5">
        {days.map((d) => {
          const ds = fmt(d);
          const isSel = ds === selected;
          const isToday = ds === todayStr();
          const dayTasks = store.tasks.filter((t) => isTaskOnDate(t, ds));
          return (
            <button
              key={ds}
              onClick={() => setSelected(ds)}
              className={cn(
                "pressable rounded-2xl p-2 flex flex-col items-center gap-1 border transition-colors",
                isSel
                  ? "bg-primary text-primary-foreground border-transparent shadow-glow"
                  : "bg-card/40 border-border/60 text-foreground"
              )}
            >
              <span className={cn("text-[10px] uppercase tracking-wide", isSel ? "opacity-90" : "text-muted-foreground")}>
                {d.toLocaleDateString(undefined, { weekday: "short" }).slice(0, 2)}
              </span>
              <span className={cn("text-base font-semibold", isToday && !isSel && "text-primary")}>{d.getDate()}</span>
              <div className="flex gap-0.5 h-1">
                {dayTasks.slice(0, 3).map((t) => {
                  const cat = store.categories.find((c) => c.id === t.categoryId);
                  return (
                    <span
                      key={t.id}
                      className="w-1 h-1 rounded-full"
                      style={{ backgroundColor: `hsl(${cat?.color || "250 84% 65%"})` }}
                    />
                  );
                })}
              </div>
            </button>
          );
        })}
      </div>

      <section className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-base font-semibold">
            {new Date(selected + "T00:00:00").toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
          </h2>
          <Button size="sm" variant="ghost" onClick={() => setOpen(true)} className="rounded-full text-primary hover:bg-primary/10">
            <Plus className="w-4 h-4 mr-1" /> Add
          </Button>
        </div>

        {tasks.length === 0 ? (
          <div className="glass-card p-8 text-center text-sm text-muted-foreground">
            Nothing scheduled. Tap + to plan something.
          </div>
        ) : (
          <ul className="space-y-2">
            {tasks.map((t, i) => (
              <li key={t.id} className="animate-slide-up" style={{ animationDelay: `${i * 30}ms` }}>
                <TaskRow task={t} dateStr={selected} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <TaskEditorSheet open={open} onOpenChange={setOpen} defaultDate={selected} />
    </div>
  );
}
