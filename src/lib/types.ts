// Core data types
export type Category = {
  id: string;
  name: string;
  color: string; // hsl string, e.g. "250 84% 65%"
  icon?: string; // lucide icon name
};

export type TaskType = "prayer" | "habit" | "task";

export type Task = {
  id: string;
  title: string;
  categoryId: string;
  type: TaskType;
  time?: string; // "HH:MM"
  date?: string; // "YYYY-MM-DD" specific date
  days?: number[]; // 0-6 (Sun-Sat) recurring weekdays
  duration?: number; // minutes
  notes?: string;
  // completion stored as a map of YYYY-MM-DD -> boolean
  completions: Record<string, boolean>;
  createdAt: number;
};

export type LogEntry = {
  id: string;
  date: string;
  text: string;
  mood?: "great" | "good" | "ok" | "low";
  createdAt: number;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
};
