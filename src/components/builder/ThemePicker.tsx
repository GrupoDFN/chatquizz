import { chatThemes } from "@/lib/chat-themes";
import { Check } from "lucide-react";

interface ThemePickerProps {
  selectedTheme: string;
  onSelectTheme: (themeId: string) => void;
}

const ThemePicker = ({ selectedTheme, onSelectTheme }: ThemePickerProps) => {
  return (
    <div className="grid grid-cols-5 gap-2">
      {chatThemes.map((theme) => {
        const isSelected = selectedTheme === theme.id;
        return (
          <button
            key={theme.id}
            onClick={() => onSelectTheme(theme.id)}
            className={`group relative flex flex-col items-center gap-1.5 rounded-lg p-2 transition-all ${
              isSelected
                ? "ring-2 ring-primary bg-primary/5"
                : "hover:bg-secondary"
            }`}
          >
            {/* Mini preview */}
            <div
              className="relative h-14 w-full rounded-md overflow-hidden"
              style={{ backgroundColor: theme.preview.bg }}
            >
              {/* Bot bubble */}
              <div
                className="absolute left-1 top-2 h-2.5 w-8 rounded-full"
                style={{ backgroundColor: theme.preview.bot }}
              />
              {/* User bubble */}
              <div
                className="absolute right-1 top-6 h-2.5 w-6 rounded-full"
                style={{ backgroundColor: theme.preview.user }}
              />
              {/* Option */}
              <div
                className="absolute left-1 right-1 bottom-1.5 h-2 rounded"
                style={{ backgroundColor: theme.preview.option, border: "1px solid rgba(255,255,255,0.1)" }}
              />
              {isSelected && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <Check className="h-4 w-4 text-white" />
                </div>
              )}
            </div>
            <span className="text-[10px] font-medium text-muted-foreground truncate w-full text-center">
              {theme.name}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default ThemePicker;
