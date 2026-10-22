import { Toaster as Sonner } from "sonner";
import { useTheme } from "@/contexts/ThemeContext";

export function Toaster() {
  const { theme } = useTheme();
  return (
    <Sonner
      theme={theme}
      position="top-right"
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast:
            "group rounded-xl border border-border bg-card text-foreground shadow-pop",
          description: "text-muted-foreground",
        },
      }}
    />
  );
}
