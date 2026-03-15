import { useState, useRef, useEffect } from "react";
import { Smile } from "lucide-react";
import { Button } from "@/components/ui/button";
import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";

interface EmojiButtonProps {
  onSelect: (emoji: string) => void;
}

const EmojiButton = ({ onSelect }: EmojiButtonProps) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => setOpen(!open)}
        className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
      >
        <Smile className="h-3.5 w-3.5" />
      </Button>
      {open && (
        <div className="absolute right-0 bottom-8 z-50">
          <Picker
            data={data}
            onEmojiSelect={(e: any) => {
              onSelect(e.native);
              setOpen(false);
            }}
            theme="dark"
            locale="pt"
            previewPosition="none"
            skinTonePosition="none"
            perLine={7}
            maxFrequentRows={1}
          />
        </div>
      )}
    </div>
  );
};

export default EmojiButton;
