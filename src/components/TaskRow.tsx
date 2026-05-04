import { Task } from "@/lib/types";
import { useStore } from "@/store/StoreProvider";
import { Check, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { TaskEditorSheet } from "./TaskEditorSheet";

export function TaskRow({ task, dateStr }: { task: Task; dateStr: string }) {
  const { store, toggleTask } = useStore();
  const cat = store.categories.find((c) => c.id === task.categoryId);
  const done = !!task.completions[dateStr];
  const [editing, setEditing] = useState(false);

  return (
    <>
      <div
        className={cn(
          "glass-card flex items-center gap-3 p-3 pressable transition-all",
          done && "opacity-70"
        )}
      >
        <button
          aria-label={done ? "Mark incomplete" : "Mark complete"}
          onClick={() => toggleTask(task.id, dateStr)}
          className={cn(
            "shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all",
            done
              ? "bg-success border-success text-success-foreground"
              : "border-muted-foreground/40 hover:border-primary"
          )}
          style={!done ? { borderColor: `hsl(${cat?.color || "var(--primary)"})` } : undefined}
        >
          {done && <Check className="w-4 h-4 animate-check" strokeWidth={3} />}
        </button>

        <button onClick={() => setEditing(true)} className="flex-1 text-left min-w-0">
          <p className={cn("text-sm font-medium truncate", done && "line-through text-muted-foreground")}>
            {task.title}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <span
              className="text-[10px] font-medium px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: `hsl(${cat?.color || "250 84% 65%"} / 0.15)`,
                color: `hsl(${cat?.color || "250 84% 65%"})`,
              }}
            >
              {cat?.name || "—"}
            </span>
            {task.time && (
              <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                <Clock className="w-3 h-3" /> {task.time}
              </span>
            )}
            {task.type === "prayer" && (
              <span className="text-[10px] text-primary">Prayer</span>
            )}
          </div>
        </button>
      </div>
      <TaskEditorSheet open={editing} onOpenChange={setEditing} task={task} />
    </>
  );
}
