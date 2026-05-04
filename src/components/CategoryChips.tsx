import { useStore } from "@/store/StoreProvider";
import { cn } from "@/lib/utils";

export function CategoryChips({
  activeId,
  onChange,
}: {
  activeId: string | null;
  onChange: (id: string | null) => void;
}) {
  const { store } = useStore();
  return (
    <div className="-mx-5 px-5 overflow-x-auto no-scrollbar">
      <div className="flex gap-2 w-max">
        <Chip active={activeId === null} onClick={() => onChange(null)} color="250 84% 65%">
          All
        </Chip>
        {store.categories.map((c) => (
          <Chip
            key={c.id}
            active={activeId === c.id}
            onClick={() => onChange(c.id)}
            color={c.color}
          >
            {c.name}
          </Chip>
        ))}
      </div>
    </div>
  );
}

function Chip({
  children,
  active,
  onClick,
  color,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  color: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "pressable shrink-0 px-4 py-2 rounded-full text-xs font-medium border transition-colors",
        active ? "text-foreground border-transparent" : "text-muted-foreground border-border bg-card/40"
      )}
      style={
        active
          ? {
              backgroundColor: `hsl(${color} / 0.18)`,
              color: `hsl(${color})`,
              borderColor: `hsl(${color} / 0.4)`,
            }
          : undefined
      }
    >
      {children}
    </button>
  );
}
