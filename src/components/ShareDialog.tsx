import { useState, useEffect } from "react";
import { X, UserPlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { duplicateQuiz } from "@/lib/quiz-api";
import { toast } from "@/hooks/use-toast";

interface ShareDialogProps {
  quizId: string;
  quizTitle: string;
  open: boolean;
  onClose: () => void;
}

interface ShareEntry {
  id: string;
  shared_with_user_id: string;
  permission: string;
  email: string;
}

export default function ShareDialog({ quizId, quizTitle, open, onClose }: ShareDialogProps) {
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [mode, setMode] = useState<"edit" | "copy">("copy");
  const [shares, setShares] = useState<ShareEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (open) {
      loadShares();
      setEmail("");
    }
  }, [open, quizId]);

  const loadShares = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("quiz_shares")
        .select("id, shared_with_user_id, permission")
        .eq("quiz_id", quizId);
      if (error) throw error;

      // Look up emails from profiles
      const userIds = (data ?? []).map((s: any) => s.shared_with_user_id);
      let emailMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, email")
          .in("id", userIds);
        (profiles ?? []).forEach((p: any) => { emailMap[p.id] = p.email; });
      }

      setShares((data ?? []).map((s: any) => ({
        ...s,
        email: emailMap[s.shared_with_user_id] || "—",
      })));
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!email.trim() || !user) return;
    setAdding(true);
    try {
      // Find user by email
      const { data: profile, error: pErr } = await supabase
        .from("profiles")
        .select("id, email")
        .eq("email", email.trim().toLowerCase())
        .maybeSingle();

      if (pErr) throw pErr;
      if (!profile) {
        toast({ title: "Usuário não encontrado", description: "Esse email não está cadastrado na plataforma.", variant: "destructive" });
        setAdding(false);
        return;
      }

      if (profile.id === user.id) {
        toast({ title: "Erro", description: "Você não pode compartilhar com você mesmo.", variant: "destructive" });
        setAdding(false);
        return;
      }

      if (mode === "copy") {
        // Duplicate the quiz for the target user
        await duplicateQuiz(quizId, profile.id);
        // Also record the share for tracking
        await supabase.from("quiz_shares").upsert({
          quiz_id: quizId,
          owner_id: user.id,
          shared_with_user_id: profile.id,
          permission: "copy",
        }, { onConflict: "quiz_id,shared_with_user_id" });
        toast({ title: "Cópia enviada!", description: `Uma cópia do funil foi criada para ${profile.email}.` });
      } else {
        // Share with edit permission
        const { error } = await supabase.from("quiz_shares").upsert({
          quiz_id: quizId,
          owner_id: user.id,
          shared_with_user_id: profile.id,
          permission: "edit",
        }, { onConflict: "quiz_id,shared_with_user_id" });
        if (error) throw error;
        toast({ title: "Compartilhado!", description: `${profile.email} agora pode editar este funil.` });
      }

      setEmail("");
      loadShares();
    } catch (err: any) {
      toast({ title: "Erro ao compartilhar", description: err.message, variant: "destructive" });
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (shareId: string) => {
    try {
      await supabase.from("quiz_shares").delete().eq("id", shareId);
      setShares((prev) => prev.filter((s) => s.id !== shareId));
      toast({ title: "Acesso removido" });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md rounded-card bg-card p-6 shadow-card-hover animate-message-in">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-foreground">Compartilhar funil</h3>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Email input */}
        <div className="flex gap-2 mb-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="Ex: rafael@gmail.com, sergio@outlook.com, ..."
            className="flex-1 rounded-inner border-none bg-secondary px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary"
          />
          <Button variant="ghost" size="sm" onClick={handleAdd} disabled={!email.trim() || adding} className="shrink-0">
            {adding ? "..." : "add"}
          </Button>
        </div>

        {/* Mode toggle */}
        <div className="flex gap-2 mb-4">
          <Button
            variant={mode === "edit" ? "default" : "outline"}
            size="sm"
            className="flex-1"
            onClick={() => setMode("edit")}
          >
            Modo edição
          </Button>
          <Button
            variant={mode === "copy" ? "default" : "outline"}
            size="sm"
            className="flex-1"
            onClick={() => setMode("copy")}
          >
            Enviar cópia
          </Button>
        </div>

        <p className="text-xs text-muted-foreground mb-4">
          {mode === "edit"
            ? "* Usuários adicionados no modo edição poderão editar o seu funil, permitindo que colaboradores trabalhem em um mesmo funil, mesmo que estejam usando contas diferentes. Você terá controle total sobre quem pode realizar essas edições."
            : "* Uma cópia completa do funil será criada na conta do usuário. Ele poderá editar livremente a cópia sem afetar o seu funil original."}
        </p>

        {/* Users with access */}
        <h4 className="text-sm font-medium text-foreground mb-2">Usuários com acesso</h4>
        <div className="rounded-inner bg-secondary p-3 min-h-[48px]">
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : shares.filter((s) => s.permission === "edit").length === 0 ? (
            <p className="text-sm text-muted-foreground">Ainda sem usuários</p>
          ) : (
            <div className="space-y-2">
              {shares
                .filter((s) => s.permission === "edit")
                .map((s) => (
                  <div key={s.id} className="flex items-center justify-between">
                    <span className="text-sm text-foreground">{s.email}</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleRemove(s.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
            </div>
          )}
        </div>

        <Button className="w-full mt-4" onClick={onClose}>
          Salvar
        </Button>
      </div>
    </div>
  );
}
