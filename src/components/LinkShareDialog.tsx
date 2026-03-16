import { useState, useEffect } from "react";
import { X, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface LinkShareDialogProps {
  quizId: string;
  quizTitle: string;
  open: boolean;
  onClose: () => void;
}

const SOCIAL_ICONS = [
  { name: "Facebook", icon: "f", getUrl: (link: string) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}` },
  { name: "Twitter", icon: "𝕏", getUrl: (link: string) => `https://twitter.com/intent/tweet?url=${encodeURIComponent(link)}` },
  { name: "LinkedIn", icon: "in", getUrl: (link: string) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(link)}` },
  { name: "WhatsApp", icon: "💬", getUrl: (link: string) => `https://wa.me/?text=${encodeURIComponent(link)}` },
  { name: "Telegram", icon: "✈", getUrl: (link: string) => `https://t.me/share/url?url=${encodeURIComponent(link)}` },
  { name: "Email", icon: "✉", getUrl: (link: string) => `mailto:?body=${encodeURIComponent(link)}` },
];

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function LinkShareDialog({ quizId, quizTitle, open, onClose }: LinkShareDialogProps) {
  const [slug, setSlug] = useState("");
  const [originalSlug, setOriginalSlug] = useState("");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);

  const baseUrl = window.location.origin;
  const fullLink = `${baseUrl}/quiz/${slug || quizId}`;

  useEffect(() => {
    if (!open) return;
    setCopied(false);
    setEditing(false);
    // Load current slug
    (async () => {
      const { data } = await supabase
        .from("quizzes")
        .select("slug")
        .eq("id", quizId)
        .maybeSingle();
      const currentSlug = (data as any)?.slug || slugify(quizTitle);
      setSlug(currentSlug);
      setOriginalSlug(currentSlug);
    })();
  }, [open, quizId, quizTitle]);

  const handleCopy = () => {
    navigator.clipboard.writeText(fullLink);
    setCopied(true);
    toast({ title: "Link copiado!" });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveSlug = async () => {
    const cleanSlug = slugify(slug);
    if (!cleanSlug) {
      toast({ title: "Slug inválido", description: "Use apenas letras, números e hifens.", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("quizzes")
        .update({ slug: cleanSlug } as any)
        .eq("id", quizId);

      if (error) {
        if (error.code === "23505") {
          toast({ title: "Link já em uso", description: "Escolha outro nome para o link.", variant: "destructive" });
        } else {
          throw error;
        }
        return;
      }

      setSlug(cleanSlug);
      setOriginalSlug(cleanSlug);
      setEditing(false);
      toast({ title: "Link atualizado!" });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md rounded-card bg-card p-6 shadow-card-hover animate-message-in">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-medium text-foreground">Compartilhar</h3>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Link field */}
        <label className="text-sm font-medium text-muted-foreground mb-2 block">Link do funil</label>
        <div className="flex items-center gap-2 mb-2">
          <div className="flex-1 flex items-center rounded-md border border-input bg-secondary px-3 py-2.5 text-sm overflow-hidden">
            {editing ? (
              <div className="flex items-center w-full gap-1">
                <span className="text-muted-foreground whitespace-nowrap">{baseUrl}/quiz/</span>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.replace(/\s/g, "-"))}
                  className="flex-1 bg-transparent outline-none text-foreground min-w-0"
                  autoFocus
                />
              </div>
            ) : (
              <span className="text-foreground truncate">{fullLink}</span>
            )}
          </div>
          <Button variant="outline" size="icon" className="shrink-0 h-10 w-10" onClick={handleCopy}>
            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>

        {/* Edit / Save slug */}
        <div className="flex gap-2 mb-5">
          {editing ? (
            <>
              <Button variant="ghost" size="sm" onClick={() => { setSlug(originalSlug); setEditing(false); }}>
                Cancelar
              </Button>
              <Button size="sm" onClick={handleSaveSlug} disabled={saving || !slug.trim()}>
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            </>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
              Editar link
            </Button>
          )}
        </div>

        {/* Social share */}
        <label className="text-sm font-medium text-muted-foreground mb-3 block">Redes sociais</label>
        <div className="flex gap-2 flex-wrap">
          {SOCIAL_ICONS.map((s) => (
            <Button
              key={s.name}
              variant="outline"
              size="icon"
              className="h-11 w-11 text-base"
              title={s.name}
              onClick={() => window.open(s.getUrl(fullLink), "_blank", "noopener")}
            >
              {s.icon}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
