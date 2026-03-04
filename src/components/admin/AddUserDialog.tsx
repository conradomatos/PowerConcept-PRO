import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { RefreshCw, Loader2 } from 'lucide-react';
import { useRbacRoles } from '@/hooks/useRbacAdmin';

interface AddUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  isGodMode: boolean;
}

function generatePin(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function generateUsername(fullName: string): string {
  const clean = fullName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
  const parts = clean.split(/\s+/);
  if (parts.length < 2) return parts[0] || 'usuario';
  return `${parts[0]}.${parts[parts.length - 1]}`;
}

export function AddUserDialog({ open, onOpenChange, onSuccess, isGodMode }: AddUserDialogProps) {
  const [selectedColaborador, setSelectedColaborador] = useState<string>('');
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [selectedRbacRoleId, setSelectedRbacRoleId] = useState<string>('');
  const [createNewCollaborator, setCreateNewCollaborator] = useState(false);
  const [newCollaboratorData, setNewCollaboratorData] = useState({ full_name: '', cpf: '', phone: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: rbacRoles = [] } = useRbacRoles();

  // Fetch collaborators that don't have a linked user
  const { data: colaboradores } = useQuery({
    queryKey: ['colaboradores-sem-usuario'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('collaborators')
        .select('id, full_name, cpf, email, user_id')
        .eq('status', 'ativo')
        .is('user_id', null)
        .order('full_name');
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setSelectedColaborador('');
      setEmail('');
      setPin('');
      setSelectedRbacRoleId('');
      setCreateNewCollaborator(false);
      setNewCollaboratorData({ full_name: '', cpf: '', phone: '' });
    }
  }, [open]);

  // Auto-fill email when collaborator is selected
  useEffect(() => {
    if (selectedColaborador && colaboradores) {
      const colab = colaboradores.find(c => c.id === selectedColaborador);
      if (colab?.email) {
        setEmail(colab.email);
      }
    }
  }, [selectedColaborador, colaboradores]);

  const handleSubmit = async () => {
    // Validations
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Email inválido');
      return;
    }
    if (!/^\d{6}$/.test(pin)) {
      toast.error('PIN deve ter exatamente 6 dígitos numéricos');
      return;
    }
    if (!selectedRbacRoleId) {
      toast.error('Selecione um perfil de acesso');
      return;
    }

    // Determine collaboratorId and fullName
    let collaboratorId = selectedColaborador;
    let fullName = '';

    if (createNewCollaborator) {
      if (!newCollaboratorData.full_name.trim()) {
        toast.error('Nome completo é obrigatório');
        return;
      }
      if (!newCollaboratorData.cpf.trim()) {
        toast.error('CPF é obrigatório');
        return;
      }

      setIsSubmitting(true);

      // Create collaborator inline
      const { data: newCollab, error: collabError } = await supabase
        .from('collaborators')
        .insert({
          full_name: newCollaboratorData.full_name.trim(),
          cpf: newCollaboratorData.cpf.replace(/\D/g, ''),
          phone: newCollaboratorData.phone.trim() || null,
          status: 'ativo',
        })
        .select('id')
        .single();

      if (collabError) {
        toast.error(collabError.message.includes('duplicate')
          ? 'CPF já cadastrado'
          : 'Erro ao criar colaborador');
        setIsSubmitting(false);
        return;
      }
      collaboratorId = newCollab.id;
      fullName = newCollaboratorData.full_name.trim();
    } else {
      if (!selectedColaborador) {
        toast.error('Selecione um colaborador ou crie um novo');
        return;
      }
      fullName = colaboradores?.find(c => c.id === selectedColaborador)?.full_name || '';
      setIsSubmitting(true);
    }

    try {
      const username = generateUsername(fullName);

      const { data, error: invokeError } = await supabase.functions.invoke('create-user', {
        body: {
          email,
          password: pin,
          fullName,
          rbacRoleId: selectedRbacRoleId,
          collaboratorId,
          username,
        },
      });

      if (invokeError) {
        toast.error('Erro ao chamar a função de criação de usuário');
        return;
      }

      // Verificar resposta da Edge Function
      if (data?.error) {
        toast.error(data.error);
        return;
      }

      toast.success('Usuário criado com sucesso');
      onSuccess();
      onOpenChange(false);
    } catch {
      toast.error('Erro ao criar usuário');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Usuário</DialogTitle>
          <DialogDescription>
            Crie um novo usuário vinculado a um colaborador
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Colaborador */}
          <div className="space-y-2">
            <Label>Colaborador *</Label>
            {!createNewCollaborator ? (
              <>
                <Select value={selectedColaborador} onValueChange={setSelectedColaborador}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um colaborador" />
                  </SelectTrigger>
                  <SelectContent>
                    {colaboradores?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.full_name} - {c.cpf}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <button
                  type="button"
                  className="text-xs text-primary hover:underline"
                  onClick={() => { setCreateNewCollaborator(true); setSelectedColaborador(''); }}
                >
                  + Criar novo colaborador
                </button>
              </>
            ) : (
              <div className="space-y-3 rounded-md border p-3">
                <div className="space-y-1">
                  <Label className="text-xs">Nome completo *</Label>
                  <Input
                    value={newCollaboratorData.full_name}
                    onChange={(e) => setNewCollaboratorData(prev => ({ ...prev, full_name: e.target.value }))}
                    placeholder="Nome completo"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">CPF *</Label>
                  <Input
                    value={newCollaboratorData.cpf}
                    onChange={(e) => setNewCollaboratorData(prev => ({ ...prev, cpf: e.target.value }))}
                    placeholder="000.000.000-00"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Celular</Label>
                  <Input
                    value={newCollaboratorData.phone}
                    onChange={(e) => setNewCollaboratorData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="(00) 00000-0000"
                  />
                </div>
                <button
                  type="button"
                  className="text-xs text-primary hover:underline"
                  onClick={() => { setCreateNewCollaborator(false); setNewCollaboratorData({ full_name: '', cpf: '', phone: '' }); }}
                >
                  &larr; Selecionar existente
                </button>
              </div>
            )}
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label>Email *</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@exemplo.com"
            />
          </div>

          {/* PIN */}
          <div className="space-y-2">
            <Label>PIN de Acesso *</Label>
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
            </div>
            <p className="text-xs text-muted-foreground">
              6 dígitos numéricos. O usuário usará este PIN para fazer login.
            </p>
          </div>

          {/* Perfil RBAC */}
          <div className="space-y-2">
            <Label>Perfil de Acesso *</Label>
            <Select value={selectedRbacRoleId} onValueChange={setSelectedRbacRoleId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o perfil" />
              </SelectTrigger>
              <SelectContent>
                {rbacRoles.filter(r => r.is_active).map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.code === 'god_mode' ? '\u2605 ' : ''}{role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Criar Usuário
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
