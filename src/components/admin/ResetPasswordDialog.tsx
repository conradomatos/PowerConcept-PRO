import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { RefreshCw, Copy, Loader2, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface UserInfo {
  id: string;
  email: string;
  full_name: string | null;
}

interface ResetPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserInfo | null;
  onSuccess: () => void;
}

function generatePin(): string {
  return Array.from({length: 6}, () => Math.floor(Math.random() * 10)).join('');
}

export function ResetPasswordDialog({ open, onOpenChange, user, onSuccess }: ResetPasswordDialogProps) {
  const [pin, setPin] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailSending, setEmailSending] = useState(false);

  useEffect(() => {
    if (open) {
      setPin(generatePin());
    } else {
      setPin('');
    }
  }, [open]);

  const handleResetDirect = async () => {
    if (!user) return;

    if (pin.length < 6 || !/^\d+$/.test(pin)) {
      toast.error('PIN deve ter 6 dígitos numéricos');
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('reset-user-password', {
        body: { userId: user.id, newPassword: pin },
      });

      let result: any = data;
      if (typeof data === 'string') {
        try { result = JSON.parse(data); } catch { result = data; }
      }

      if (invokeError || result?.error) {
        toast.error(result?.error || 'Erro ao redefinir PIN');
        return;
      }

      toast.success('PIN redefinido com sucesso!');
      onSuccess();
      onOpenChange(false);
    } catch {
      toast.error('Erro ao redefinir PIN');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendEmail = async () => {
    if (!user) return;

    setEmailSending(true);
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/auth`,
    });
    setEmailSending(false);

    if (error) {
      toast.error('Erro ao enviar email de redefinição');
      return;
    }

    toast.success('Email de redefinição enviado!');
  };

  const handleCopyPin = () => {
    if (!pin) return;
    navigator.clipboard.writeText(pin);
    toast.success('PIN copiado!');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Redefinir PIN de Acesso</DialogTitle>
          <DialogDescription>
            Redefina o PIN de {user?.full_name || user?.email}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Novo PIN</Label>
            <div className="flex gap-2">
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={pin}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, '');
                  setPin(v.slice(0, 6));
                }}
                placeholder="000000"
                className="font-mono text-lg tracking-[0.5em] text-center"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setPin(generatePin())}
                title="Gerar PIN"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleCopyPin}
                disabled={!pin}
                title="Copiar PIN"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              6 dígitos numéricos. Copie e compartilhe com o usuário.
            </p>
          </div>

          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={handleSendEmail}
            disabled={emailSending}
          >
            {emailSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Mail className="h-4 w-4" />
            )}
            Enviar link por email
          </Button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleResetDirect} disabled={isSubmitting || pin.length < 6}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Redefinir Agora
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
