import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import chatFunnelLogo from "@/assets/logo-chatfunnel.png";
import { toast } from "@/hooks/use-toast";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { resetPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    const { error } = await resetPassword(email);
    setLoading(false);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      setSent(true);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <img src={chatFunnelLogo} alt="ChatFunnel" className="mx-auto mb-4 h-12" />
          <h1 className="text-2xl font-semibold text-foreground">Recuperar Senha</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {sent ? "Verifique seu email" : "Enviaremos um link de recuperação"}
          </p>
        </div>

        {sent ? (
          <div className="rounded-card bg-card p-6 text-center shadow-card">
            <p className="text-sm text-foreground">
              Se o email <strong>{email}</strong> estiver cadastrado, você receberá um link para redefinir sua senha.
            </p>
            <Link to="/login" className="mt-4 inline-block text-sm text-primary hover:underline">
              Voltar ao login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                className="w-full rounded-inner bg-card px-4 py-3 text-sm text-foreground shadow-card outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary"
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Enviando..." : "Enviar link"}
            </Button>
            <div className="text-center">
              <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground">
                Voltar ao login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
