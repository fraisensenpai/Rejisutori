import { Category, ChatMessage, LogEntry, Task } from "./types";

const KEY = "rejisutori.v1";

export type Store = {
  categories: Category[];
  tasks: Task[];
  logs: LogEntry[];
  chat: ChatMessage[];
  theme: "dark" | "light";
  voiceEnabled: boolean;
};

export const defaultCategories: Category[] = [
  { id: "cat-prayer", name: "Prayer", color: "260 80% 70%", icon: "Sparkles" },
  { id: "cat-health", name: "Health", color: "152 70% 55%", icon: "HeartPulse" },
  { id: "cat-learn", name: "Learning", color: "200 90% 60%", icon: "BookOpen" },
  { id: "cat-work", name: "Work", color: "38 95% 60%", icon: "Briefcase" },
  { id: "cat-personal", name: "Personal", color: "330 80% 65%", icon: "Smile" },
];

export const defaultStore: Store = {
  categories: defaultCategories,
  tasks: [],
  logs: [],
  chat: [],
  theme: "dark",
  voiceEnabled: true,
};

export function loadStore(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultStore;
    const parsed = JSON.parse(raw);
    return { ...defaultStore, ...parsed };
  } catch {
    return defaultStore;
  }
}

export function saveStore(store: Store) {
  try {
    localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    // ignore
  }
}

export function uid(prefix = "id") {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}-${Date.now().toString(36)}`;
}

export function todayStr(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function isTaskOnDate(t: Task, dateStr: string) {
  if (t.date && t.date === dateStr) return true;
  if (t.days && t.days.length > 0) {
    const d = new Date(dateStr + "T00:00:00");
    return t.days.includes(d.getDay());
  }
  return !t.date && (!t.days || t.days.length === 0); // any-day task
}
