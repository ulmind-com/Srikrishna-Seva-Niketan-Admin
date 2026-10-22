import { useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface TagsInputProps {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  className?: string;
}

export function TagsInput({
  value = [],
  onChange,
  placeholder = "Type and press Enter…",
  className,
}: TagsInputProps) {
  const [draft, setDraft] = useState("");

  const add = () => {
    const trimmed = draft.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setDraft("");
  };

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add();
    } else if (e.key === "Backspace" && !draft && value.length) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <div
      className={cn(
        "flex min-h-10 flex-wrap items-center gap-1.5 rounded-lg border border-border bg-card px-2 py-1.5 shadow-soft focus-within:border-primary focus-within:ring-2 focus-within:ring-ring/40",
        className
      )}
    >
      {value.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-accent"
        >
          {tag}
          <button
            type="button"
            onClick={() => onChange(value.filter((t) => t !== tag))}
            className="text-accent/70 hover:text-accent"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKey}
        onBlur={add}
        placeholder={value.length ? "" : placeholder}
        className="flex-1 border-0 bg-transparent px-1 py-0.5 text-sm outline-none placeholder:text-muted-foreground/70"
      />
    </div>
  );
}
