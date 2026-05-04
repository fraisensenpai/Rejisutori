import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useStore } from "@/store/StoreProvider";
import { Task, TaskType } from "@/lib/types";
import { Trash2 } from "lucide-react";
import { todayStr } from "@/lib/storage";
import { cn } from "@/lib/utils";

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

export function TaskEditorSheet({
  open,
  onOpenChange,
  task,
  defaultDate,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  task?: Task;
  defaultDate?: string;
}) {
  const { store, addTask, updateTask, deleteTask } = useStore();
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState(store.categories[0]?.id || "");
  const [type, setType] = useState<TaskType>("habit");
  const [time, setTime] = useState("");
  const [date, setDate] = useState<string | undefined>(undefined);
  const [days, setDays] = useState<number[]>([]);
  const [duration, setDuration] = useState<number | "">("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open) {
      if (task) {
        setTitle(task.title);
        setCategoryId(task.categoryId);
        setType(task.type);
        setTime(task.time || "");
        setDate(task.date);
        setDays(task.days || []);
        setDuration(task.duration ?? "");
        setNotes(task.notes || "");
      } else {
        setTitle("");
        setCategoryId(store.categories[0]?.id || "");
        setType("habit");
        setTime("");
        setDate(defaultDate);
        setDays([]);
        setDuration("");
        setNotes("");
      }
    }
  }, [open, task, defaultDate, store.categories]);

  const toggleDay = (d: number) =>
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));

  const save = () => {
    if (!title.trim() || !categoryId) return;
    const payload = {
      title: title.trim(),
      categoryId,
      type,
      time: time || undefined,
      date: date || undefined,
      days: days.length ? days : undefined,
      duration: duration === "" ? undefined : Number(duration),
      notes: notes || undefined,
    };
    if (task) updateTask(task.id, payload);
    else addTask(payload);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl border-border/60 bg-card/95 backdrop-blur-xl max-h-[92vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{task ? "Edit task" : "New task"}</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Morning prayer" autoFocus className="mt-1.5 rounded-xl" />
          </div>

          <div>
            <Label>Category</Label>
            <div className="mt-1.5 flex gap-2 flex-wrap">
              {store.categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategoryId(c.id)}
                  className={cn(
                    "pressable px-3 py-1.5 rounded-full text-xs border transition-colors",
                    categoryId === c.id ? "border-transparent" : "border-border text-muted-foreground"
                  )}
                  style={
                    categoryId === c.id
                      ? { backgroundColor: `hsl(${c.color} / 0.2)`, color: `hsl(${c.color})`, borderColor: `hsl(${c.color} / 0.4)` }
                      : undefined
                  }
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label>Type</Label>
            <div className="mt-1.5 grid grid-cols-3 gap-2">
              {(["habit", "prayer", "task"] as TaskType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={cn(
                    "pressable rounded-xl py-2 text-xs font-medium border transition-colors capitalize",
                    type === t ? "bg-primary/15 border-primary/40 text-primary" : "border-border text-muted-foreground"
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="time">Time</Label>
              <Input id="time" type="time" value={time} onChange={(e) => setTime(e.target.value)} className="mt-1.5 rounded-xl" />
            </div>
            <div>
              <Label htmlFor="dur">Duration (min)</Label>
              <Input id="dur" type="number" min={0} value={duration} onChange={(e) => setDuration(e.target.value === "" ? "" : Number(e.target.value))} className="mt-1.5 rounded-xl" />
            </div>
          </div>

          <div>
            <Label>Repeat days</Label>
            <div className="mt-1.5 flex gap-1.5">
              {DAY_LABELS.map((lbl, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggleDay(i)}
                  className={cn(
                    "pressable w-9 h-9 rounded-full text-xs font-semibold border transition-colors",
                    days.includes(i) ? "bg-primary text-primary-foreground border-transparent" : "border-border text-muted-foreground"
                  )}
                >
                  {lbl}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1.5">Leave empty for a one-time or anyday task.</p>
          </div>

          <div>
            <Label htmlFor="date">Specific date (optional)</Label>
            <Input id="date" type="date" value={date || ""} onChange={(e) => setDate(e.target.value || undefined)} className="mt-1.5 rounded-xl" />
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1.5 rounded-xl" rows={2} />
          </div>

          <div className="flex gap-2 pt-2">
            {task && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  deleteTask(task.id);
                  onOpenChange(false);
                }}
                className="rounded-xl border-destructive/40 text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
            <Button onClick={save} className="flex-1 rounded-xl bg-gradient-primary shadow-glow">
              {task ? "Save changes" : "Create task"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// silence unused
void todayStr;
