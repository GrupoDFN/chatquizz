import { useState, useEffect } from "react";
import { X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

interface ShareDialogProps {
  quizId: string;
  quizTitle: string;
  open: boolean;
  onClose: () => void;
}

interface PendingUser {
  userId: string;
  email: string;
  permission: "edit" | "copy";
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
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [savedShares, setSavedShares] = useState<ShareEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      loadShares();
      setEmail("");
      setPendingUsers([]);
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

      const userIds = (data ?? []).map((s: any) => s.shared_with_user_id);
      let emailMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, email")
          .in("id", userIds);
        (profiles ?? []).forEach((p: any) => { emailMap[p.id] = p.email; });
      }

      setSavedShares((data ?? []).map((s: any) => ({
        ...s,
        email: emailMap[s.shared_with_user_id] || "—",
      })));
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const resolvePendingUser = async (targetEmail: string, targetPermission: "edit" | "copy"): Promise<PendingUser | null> => {
    if (!user) return null;

    const trimmedEmail = targetEmail.trim().toLowerCase();
    if (!trimmedEmail) return null;

    // Already in pending
    if (pendingUsers.some((p) => p.email === trimmedEmail)) {
      return null;
    }

    // Already shared
    if (savedShares.some((s) => s.email.toLowerCase() === trimmedEmail)) {
      toast({ title: "Já compartilhado", description: "Esse usuário já tem acesso.", variant: "destructive" });
      return null;
    }

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("id, email")
      .ilike("email", trimmedEmail)
      .maybeSingle();

    if (error || !profile) {
      toast({ title: "Usuário não encontrado", description: "Esse email não está cadastrado na plataforma.", variant: "destructive" });
      return null;
    }

    if (profile.id === user.id) {
      toast({ title: "Erro", description: "Você não pode compartilhar com você mesmo.", variant: "destructive" });
      return null;
    }

    return { userId: profile.id, email: profile.email.toLowerCase(), permission: targetPermission };
  };

  const handleAddToList = async () => {
    if (!email.trim() || !user) return;

    const pending = await resolvePendingUser(email, mode);
    if (!pending) return;

    setPendingUsers((prev) => [...prev, pending]);
    setEmail("");
  };

  const handleRemovePending = (email: string) => {
    setPendingUsers((prev) => prev.filter((p) => p.email !== email));
  };

  const handleRemoveSaved = async (shareId: string) => {
    try {
      await supabase.from("quiz_shares").delete().eq("id", shareId);
      setSavedShares((prev) => prev.filter((s) => s.id !== shareId));
      toast({ title: "Acesso removido" });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const handleSave = async () => {
    if (!user) return;

    const usersToSave = [...pendingUsers];

    // UX fallback: if user typed an email but forgot to click "add", include it on save
    if (email.trim()) {
      const pending = await resolvePendingUser(email, mode);
      if (pending && !usersToSave.some((u) => u.email === pending.email)) {
        usersToSave.push(pending);
      }
    }

    if (usersToSave.length === 0) {
      toast({ title: "Nenhum usuário", description: "Adicione pelo menos um email para compartilhar.", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      for (const p of usersToSave) {
        const { error } = await supabase.from("quiz_shares").upsert({
          quiz_id: quizId,
          owner_id: user.id,
          shared_with_user_id: p.userId,
          permission: p.permission,
          fulfilled: false,
        } as any, { onConflict: "quiz_id,shared_with_user_id" });
        if (error) throw error;
      }
      toast({ title: "Compartilhado!", description: `${usersToSave.length} usuário(s) adicionado(s).` });
      setPendingUsers([]);
      setEmail("");
      onClose();
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const allUsers = [
    ...savedShares.map((s) => ({ key: s.id, email: s.email, permission: s.permission, saved: true as const })),
    ...pendingUsers.map((p) => ({ key: p.email, email: p.email, permission: p.permission, saved: false as const })),
  ];

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
            onKeyDown={(e) => e.key === "Enter" && handleAddToList()}
            placeholder="Ex: rafael@gmail.com, sergio@outlook.com, ..."
            className="flex-1 rounded-inner border-none bg-secondary px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary"
          />
          <Button variant="ghost" size="sm" onClick={handleAddToList} disabled={!email.trim()} className="shrink-0">
            add
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
        <div className="rounded-inner bg-secondary p-3 min-h-[48px] max-h-[200px] overflow-y-auto">
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : allUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ainda sem usuários</p>
          ) : (
            <div className="space-y-2">
              {allUsers.map((u) => (
                <div key={u.key} className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <span className="text-sm text-foreground truncate block">{u.email}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {u.permission === "edit" ? "Edição" : "Cópia"}
                      {!u.saved && " • pendente"}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive shrink-0"
                    onClick={() => u.saved ? handleRemoveSaved(u.key) : handleRemovePending(u.email)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <Button className="w-full mt-4" onClick={handleSave} disabled={saving}>
          {saving ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </div>
  );
}
