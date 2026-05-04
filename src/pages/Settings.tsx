import { useState } from "react";
import { useStore } from "@/store/StoreProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Moon, Sun, Mic } from "lucide-react";

const PALETTE = [
  "250 84% 65%", "270 90% 70%", "200 90% 60%", "152 70% 55%",
  "38 95% 60%", "0 75% 65%", "330 80% 65%", "180 70% 55%",
  "20 90% 60%", "100 60% 55%",
];

export default function Settings() {
  const { store, addCategory, deleteCategory, setTheme, setVoiceEnabled, clearChat } = useStore();
  const [name, setName] = useState("");
  const [color, setColor] = useState(PALETTE[0]);

  const create = () => {
    if (!name.trim()) return;
    addCategory({ name: name.trim(), color });
    setName("");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <header>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Settings</p>
        <h1 className="text-2xl font-bold tracking-tight">Tune your experience</h1>
      </header>

      <section className="glass-card p-4 space-y-4">
        <h2 className="text-sm font-semibold">Appearance</h2>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {store.theme === "dark" ? <Moon className="w-4 h-4 text-primary" /> : <Sun className="w-4 h-4 text-primary" />}
            <div>
              <p className="text-sm font-medium">Dark mode</p>
              <p className="text-xs text-muted-foreground">Easy on the eyes</p>
            </div>
          </div>
          <Switch checked={store.theme === "dark"} onCheckedChange={(v) => setTheme(v ? "dark" : "light")} />
        </div>
      </section>

      <section className="glass-card p-4 space-y-4">
        <h2 className="text-sm font-semibold">Voice</h2>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Mic className="w-4 h-4 text-primary" />
            <div>
              <p className="text-sm font-medium">Tenka voice</p>
              <p className="text-xs text-muted-foreground">Speak responses aloud</p>
            </div>
          </div>
          <Switch checked={store.voiceEnabled} onCheckedChange={setVoiceEnabled} />
        </div>
      </section>

      <section className="glass-card p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Categories</h2>
          <span className="text-xs text-muted-foreground">{store.categories.length}</span>
        </div>

        <ul className="space-y-2">
          {store.categories.map((c) => (
            <li key={c.id} className="flex items-center gap-3 rounded-2xl bg-secondary/40 px-3 py-2">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: `hsl(${c.color})` }} />
              <span className="text-sm flex-1">{c.name}</span>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-muted-foreground hover:text-destructive" onClick={() => deleteCategory(c.id)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </li>
          ))}
        </ul>

        <div className="space-y-2 pt-2">
          <Label htmlFor="cat-name">New category</Label>
          <div className="flex gap-2">
            <Input id="cat-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Reading" className="rounded-xl" />
            <Button onClick={create} className="rounded-xl bg-gradient-primary shadow-glow">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex gap-2 flex-wrap pt-1">
            {PALETTE.map((p) => (
              <button
                key={p}
                onClick={() => setColor(p)}
                className="w-7 h-7 rounded-full border-2 transition-transform pressable"
                style={{
                  backgroundColor: `hsl(${p})`,
                  borderColor: color === p ? `hsl(${p})` : "transparent",
                  boxShadow: color === p ? `0 0 0 2px hsl(var(--background)), 0 0 0 4px hsl(${p} / 0.6)` : undefined,
                }}
                aria-label={`color ${p}`}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="glass-card p-4 space-y-3">
        <h2 className="text-sm font-semibold">Data</h2>
        <Button variant="outline" onClick={clearChat} className="rounded-xl w-full">
          Clear Tenka chat history
        </Button>
      </section>

      <p className="text-center text-[11px] text-muted-foreground">Rejisutori · v1</p>
    </div>
  );
}
