import { useEffect, useRef, useState } from "react";
import { useStore } from "@/store/StoreProvider";
import { Mic, Send, Sparkles, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { todayStr } from "@/lib/storage";

type Action =
  | { type: "create_task"; title: string; categoryName?: string; time?: string; date?: string; days?: number[]; taskType?: "habit" | "prayer" | "task" }
  | { type: "update_task"; id: string; title?: string; categoryName?: string; time?: string; date?: string; days?: number[]; taskType?: "habit" | "prayer" | "task" }
  | { type: "delete_task"; id: string }
  | { type: "create_category"; name: string; color?: string }
  | { type: "complete_task"; title: string }
  | { type: "log"; text: string; mood?: "great" | "good" | "ok" | "low" };

export default function Tenka() {
  const { store, addMessage, addTask, addCategory, addLog, toggleTask } = useStore();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [store.chat.length, loading]);

  const speak = (text: string) => {
    if (!store.voiceEnabled) return;
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1.02;
      u.pitch = 1;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch {}
  };

  const applyActions = (actions: Action[]) => {
    let applied = 0;
    for (const a of actions) {
      try {
        if (a.type === "create_category") {
          addCategory({ name: a.name, color: a.color || "250 84% 65%" });
          applied++;
        } else if (a.type === "create_task") {
          let cat = store.categories.find((c) => c.name.toLowerCase() === (a.categoryName || "").toLowerCase());
          if (!cat) cat = store.categories[0];
          addTask({
            title: a.title,
            categoryId: cat.id,
            type: a.taskType || (a.title.toLowerCase().includes("pray") ? "prayer" : "habit"),
            time: a.time,
            date: a.date,
            days: a.days,
          });
          applied++;
        } else if (a.type === "update_task") {
          const patch: any = {};
          if (a.title) patch.title = a.title;
          if (a.time) patch.time = a.time;
          if (a.date) patch.date = a.date;
          if (a.days) patch.days = a.days;
          if (a.taskType) patch.type = a.taskType;
          if (a.categoryName) {
            const cat = store.categories.find((c) => c.name.toLowerCase() === a.categoryName?.toLowerCase());
            if (cat) patch.categoryId = cat.id;
          }
          updateTask(a.id, patch);
          applied++;
        } else if (a.type === "delete_task") {
          deleteTask(a.id);
          applied++;
        } else if (a.type === "complete_task") {
          const today = todayStr();
          const t = store.tasks.find((tt) => tt.title.toLowerCase().includes(a.title.toLowerCase()));
          if (t && !t.completions[today]) {
            toggleTask(t.id, today);
            applied++;
          }
        } else if (a.type === "log") {
          addLog({ date: todayStr(), text: a.text, mood: a.mood });
          applied++;
        }
      } catch (e) {
        console.error("action failed", a, e);
      }
    }
    if (applied > 0) toast.success(`Tenka updated ${applied} item${applied > 1 ? "s" : ""}`);
  };

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    setInput("");
    addMessage({ role: "user", content });
    setLoading(true);

    try {
      const history = [...store.chat, { role: "user" as const, content }].slice(-12);
      const { data, error } = await supabase.functions.invoke("tenka-chat", {
        body: {
          messages: history.map((m) => ({ role: m.role, content: m.content })),
          context: {
            today: todayStr(),
            categories: store.categories.map((c) => ({ name: c.name })),
            tasks: store.tasks.slice(-30).map((t) => ({ id: t.id, title: t.title, time: t.time })),
          },
        },
      });

      if (error) throw error;

      const speech = data?.speech || "Done.";
      const actions: Action[] = Array.isArray(data?.data?.actions) ? data.data.actions : [];
      const log = data?.data?.log;

      addMessage({ role: "assistant", content: speech });
      applyActions(actions);
      if (log?.text) addLog({ date: todayStr(), text: log.text, mood: log.mood });
      speak(speech);
    } catch (e: any) {
      console.error(e);
      const msg = e?.message?.includes("429")
        ? "I'm getting a lot of questions right now. Try again in a moment."
        : e?.message?.includes("402")
        ? "AI credits are exhausted. Add credits in your workspace."
        : "I couldn't respond right now.";
      addMessage({ role: "assistant", content: msg });
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const startListening = () => {
    const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      toast.error("Voice input isn't supported in this browser.");
      return;
    }
    const rec = new SR();
    rec.lang = navigator.language || "en-US";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e: any) => {
      const t = e.results[0][0].transcript;
      setListening(false);
      send(t);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    rec.start();
    recognitionRef.current = rec;
    setListening(true);
  };

  const stopListening = () => {
    try {
      recognitionRef.current?.stop();
    } catch {}
    setListening(false);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-9rem)] animate-fade-in">
      <header className="mb-3">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Tenka</p>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          Your AI companion <Sparkles className="w-5 h-5 text-primary" />
        </h1>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto -mx-1 px-1 space-y-3 pb-4">
        {store.chat.length === 0 && (
          <div className="glass-card p-5 mt-4">
            <p className="text-sm font-medium mb-2">Hi, I'm Tenka.</p>
            <p className="text-sm text-muted-foreground mb-3">Ask me to plan your day, log a habit, or set a prayer reminder.</p>
            <div className="flex flex-wrap gap-2">
              {[
                "Plan a calm Monday morning",
                "Add a habit: drink water at 10:00",
                "Log: felt focused today",
              ].map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="pressable text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {store.chat.map((m) => (
          <div
            key={m.id}
            className={cn(
              "max-w-[82%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed animate-slide-up",
              m.role === "user"
                ? "ml-auto bg-gradient-primary text-primary-foreground rounded-br-md shadow-glow"
                : "mr-auto glass-card rounded-bl-md"
            )}
          >
            {m.content}
          </div>
        ))}

        {loading && (
          <div className="mr-auto glass-card rounded-2xl rounded-bl-md px-4 py-2.5 flex gap-1">
            <Dot delay={0} /> <Dot delay={150} /> <Dot delay={300} />
          </div>
        )}
      </div>

      <div className="sticky bottom-0">
        <div className="glass-card flex items-center gap-2 p-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Message Tenka…"
            className="flex-1 bg-transparent outline-none px-3 text-sm placeholder:text-muted-foreground"
          />
          {input.trim() ? (
            <Button onClick={() => send()} disabled={loading} size="icon" className="rounded-full bg-gradient-primary shadow-glow">
              <Send className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              onClick={listening ? stopListening : startListening}
              size="icon"
              className={cn(
                "rounded-full",
                listening ? "bg-destructive mic-pulse" : "bg-gradient-primary shadow-glow"
              )}
            >
              {listening ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </Button>
          )}
        </div>
        <p className="text-center text-[10px] text-muted-foreground mt-2">
          {listening ? "Listening…" : "Tap the mic to talk to Tenka"}
        </p>
      </div>
    </div>
  );
}

function Dot({ delay }: { delay: number }) {
  return (
    <span
      className="w-1.5 h-1.5 rounded-full bg-muted-foreground/70 animate-pulse"
      style={{ animationDelay: `${delay}ms` }}
    />
  );
}
