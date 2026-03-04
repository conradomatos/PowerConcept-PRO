import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Copy } from 'lucide-react';
import { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

interface UserWithRole {
  id: string;
  email: string;
  full_name: string | null;
  username?: string | null;
  roles: AppRole[];
  rbacProfile?: { name: string; code: string } | null;
  created_at?: string;
  is_active?: boolean;
}

interface EditUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserWithRole | null;
  onSuccess: () => void;
}

export function EditUserDialog({ open, onOpenChange, user, onSuccess }: EditUserDialogProps) {
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || '');
      setUsername(user.username || '');
    }
  }, [user]);

  const { data: linkedCollaborator } = useQuery({
    queryKey: ['linked-collaborator', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('collaborators')
        .select('id, full_name, cpf')
        .eq('user_id', user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id && open,
  });

  const handleCopyEmail = async () => {
    if (!user?.email) return;
    await navigator.clipboard.writeText(user.email);
    toast.success('Email copiado');
  };

  const formatCpf = (cpf: string) => {
    const digits = cpf.replace(/\D/g, '');
    if (digits.length !== 11) return cpf;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  };

  const handleSubmit = async () => {
    if (!user) return;
    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName, username: username.trim() || null })
        .eq('user_id', user.id);

      if (error) {
        toast.error(`Erro ao atualizar usuário: ${error.message}`);
        return;
      }

      toast.success('Usuário atualizado com sucesso');
      onSuccess();
      onOpenChange(false);
    } catch {
      toast.error('Erro ao atualizar usuário');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar Usuário</DialogTitle>
          <DialogDescription>
            Altere as informações de {user?.full_name || user?.email}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Email — readonly + copy */}
          <div className="space-y-2">
            <Label>Email</Label>
            <div className="flex gap-2">
              <Input
                type="email"
                value={user?.email || ''}
                disabled
                className="bg-muted flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleCopyEmail}
                title="Copiar email"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Nome Completo */}
          <div className="space-y-2">
            <Label>Nome Completo</Label>
            <Input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nome do usuário"
            />
          </div>

          {/* Username */}
          <div className="space-y-2">
            <Label>Username</Label>
            <Input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="ex: joao.silva"
              className="font-mono"
            />
          </div>

          {/* Perfil RBAC — readonly */}
          <div className="space-y-2">
            <Label>Perfil de Acesso</Label>
            <div>
              {user?.rbacProfile ? (
                <Badge variant={user.rbacProfile.code === 'god_mode' ? 'destructive' : 'outline'}>
                  {user.rbacProfile.code === 'god_mode' ? '\u2605 ' : ''}{user.rbacProfile.name}
                </Badge>
              ) : (
                <Badge variant="secondary">Sem perfil</Badge>
              )}
            </div>
          </div>

          {/* Colaborador vinculado — readonly */}
          <div className="space-y-2">
            <Label>Colaborador Vinculado</Label>
            <p className="text-sm">
              {linkedCollaborator ? (
                <span>{linkedCollaborator.full_name} — {formatCpf(linkedCollaborator.cpf)}</span>
              ) : (
                <span className="text-muted-foreground">Não vinculado</span>
              )}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
