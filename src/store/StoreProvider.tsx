import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { Category, ChatMessage, LogEntry, Task } from "@/lib/types";
import { defaultStore, loadStore, saveStore, Store, uid } from "@/lib/storage";

type Ctx = {
  store: Store;
  // categories
  addCategory: (c: Omit<Category, "id">) => Category;
  updateCategory: (id: string, patch: Partial<Category>) => void;
  deleteCategory: (id: string) => void;
  // tasks
  addTask: (t: Omit<Task, "id" | "completions" | "createdAt">) => Task;
  updateTask: (id: string, patch: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  toggleTask: (id: string, dateStr: string) => void;
  // logs
  addLog: (l: Omit<LogEntry, "id" | "createdAt">) => LogEntry;
  // chat
  addMessage: (m: Omit<ChatMessage, "id" | "createdAt">) => ChatMessage;
  clearChat: () => void;
  // settings
  setTheme: (t: "dark" | "light") => void;
  setVoiceEnabled: (v: boolean) => void;
};

const StoreCtx = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useState<Store>(() => loadStore());

  useEffect(() => {
    saveStore(store);
  }, [store]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", store.theme === "dark");
    root.classList.toggle("light", store.theme === "light");
  }, [store.theme]);

  const addCategory = useCallback((c: Omit<Category, "id">) => {
    const cat: Category = { ...c, id: uid("cat") };
    setStore((s) => ({ ...s, categories: [...s.categories, cat] }));
    return cat;
  }, []);

  const updateCategory = useCallback((id: string, patch: Partial<Category>) => {
    setStore((s) => ({ ...s, categories: s.categories.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
  }, []);

  const deleteCategory = useCallback((id: string) => {
    setStore((s) => ({
      ...s,
      categories: s.categories.filter((c) => c.id !== id),
      tasks: s.tasks.filter((t) => t.categoryId !== id),
    }));
  }, []);

  const addTask = useCallback((t: Omit<Task, "id" | "completions" | "createdAt">) => {
    const task: Task = { ...t, id: uid("task"), completions: {}, createdAt: Date.now() };
    setStore((s) => ({ ...s, tasks: [...s.tasks, task] }));
    return task;
  }, []);

  const updateTask = useCallback((id: string, patch: Partial<Task>) => {
    setStore((s) => ({ ...s, tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) }));
  }, []);

  const deleteTask = useCallback((id: string) => {
    setStore((s) => ({ ...s, tasks: s.tasks.filter((t) => t.id !== id) }));
  }, []);

  const toggleTask = useCallback((id: string, dateStr: string) => {
    setStore((s) => ({
      ...s,
      tasks: s.tasks.map((t) =>
        t.id === id ? { ...t, completions: { ...t.completions, [dateStr]: !t.completions[dateStr] } } : t
      ),
    }));
  }, []);

  const addLog = useCallback((l: Omit<LogEntry, "id" | "createdAt">) => {
    const log: LogEntry = { ...l, id: uid("log"), createdAt: Date.now() };
    setStore((s) => ({ ...s, logs: [log, ...s.logs] }));
    return log;
  }, []);

  const addMessage = useCallback((m: Omit<ChatMessage, "id" | "createdAt">) => {
    const msg: ChatMessage = { ...m, id: uid("msg"), createdAt: Date.now() };
    setStore((s) => ({ ...s, chat: [...s.chat, msg] }));
    return msg;
  }, []);

  const clearChat = useCallback(() => setStore((s) => ({ ...s, chat: [] })), []);

  const setTheme = useCallback((t: "dark" | "light") => setStore((s) => ({ ...s, theme: t })), []);
  const setVoiceEnabled = useCallback((v: boolean) => setStore((s) => ({ ...s, voiceEnabled: v })), []);

  const value = useMemo<Ctx>(
    () => ({
      store,
      addCategory, updateCategory, deleteCategory,
      addTask, updateTask, deleteTask, toggleTask,
      addLog,
      addMessage, clearChat,
      setTheme, setVoiceEnabled,
    }),
    [store, addCategory, updateCategory, deleteCategory, addTask, updateTask, deleteTask, toggleTask, addLog, addMessage, clearChat, setTheme, setVoiceEnabled]
  );

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}

// Use defaultStore to silence unused warning if needed
void defaultStore;
