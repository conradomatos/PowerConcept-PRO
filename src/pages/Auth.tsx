import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import logoConcept from '@/assets/logo-concept.png';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export default function Auth() {
  const navigate = useNavigate();
  const { user, loading, signIn } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [pin, setPin] = useState('');

  // Esqueci minha senha
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedId = identifier.trim();
    if (!trimmedId) {
      toast.error('Informe seu email, usuário ou CPF');
      return;
    }
    if (!/^\d{6}$/.test(pin)) {
      toast.error('PIN deve ter 6 dígitos numéricos');
      return;
    }

    setIsLoading(true);

    try {
      // Se parece email (@), login direto via Supabase Auth
      if (trimmedId.includes('@')) {
        const { error } = await signIn(trimmedId, pin);
        if (error) {
          toast.error('Credenciais inválidas');
        } else {
          toast.success('Login realizado!');
          navigate('/');
        }
      } else {
        // Username ou CPF → resolver via Edge Function
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/resolve-and-login`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier: trimmedId, pin }),
          }
        );

        const result = await response.json();

        if (!response.ok) {
          toast.error(result.error || 'Credenciais inválidas');
          setIsLoading(false);
          return;
        }

        // Setar sessão com tokens retornados pela Edge Function
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: result.access_token,
          refresh_token: result.refresh_token,
        });

        if (sessionError) {
          toast.error('Erro ao estabelecer sessão');
        } else {
          toast.success('Login realizado!');
          navigate('/');
        }
      }
    } catch {
      toast.error('Erro ao conectar. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const email = forgotEmail.trim();
    if (!email || !email.includes('@')) {
      toast.error('Informe um email válido');
      return;
    }

    setForgotLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth`,
    });
    setForgotLoading(false);

    if (error) {
      toast.error('Erro ao enviar email de redefinição');
      return;
    }

    toast.success('Se este email estiver cadastrado, enviaremos instruções para redefinição.');
    setShowForgotPassword(false);
    setForgotEmail('');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex flex-col items-center gap-2">
            <img src={logoConcept} alt="Concept" className="h-12 w-auto" />
          </div>
          <CardDescription>Gestão de Projetos e Portfólio</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Identificação */}
            <div className="space-y-2">
              <Label htmlFor="identifier">Usuário</Label>
              <Input
                id="identifier"
                type="text"
                placeholder="Email, nome de usuário ou CPF"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                autoComplete="username"
                required
              />
            </div>

            {/* PIN */}
            <div className="space-y-2">
              <Label htmlFor="pin">PIN de Acesso</Label>
              <Input
                id="pin"
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="••••••"
                value={pin}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, '');
                  setPin(v.slice(0, 6));
                }}
                autoComplete="current-password"
                required
              />
            </div>

            {/* Botão Entrar */}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                'Entrar'
              )}
            </Button>

            {/* Esqueci minha senha */}
            <div className="text-center">
              <Button
                type="button"
                variant="link"
                className="text-sm text-muted-foreground"
                onClick={() => setShowForgotPassword(true)}
              >
                Esqueci meu PIN
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Dialog: Esqueci meu PIN */}
      <Dialog open={showForgotPassword} onOpenChange={setShowForgotPassword}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Redefinir PIN</DialogTitle>
            <DialogDescription>
              Informe seu email cadastrado. Enviaremos um link para redefinir seu PIN de acesso.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="forgot-email">Email</Label>
              <Input
                id="forgot-email"
                type="email"
                placeholder="seu@email.com"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowForgotPassword(false)}
              disabled={forgotLoading}
            >
              Cancelar
            </Button>
            <Button onClick={handleForgotPassword} disabled={forgotLoading}>
              {forgotLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                'Enviar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
