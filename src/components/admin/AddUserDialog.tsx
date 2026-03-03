import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Eye, EyeOff, RefreshCw, Loader2 } from 'lucide-react';
import { Database } from '@/integrations/supabase/types';
import { useRbacRoles, useAssignRoleToUser } from '@/hooks/useRbacAdmin';

type AppRole = Database['public']['Enums']['app_role'];

interface AddUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  isSuperAdmin: boolean;
}

const ALL_ROLES: { value: AppRole; label: string }[] = [
  { value: 'super_admin', label: 'SUPER ADMIN' },
  { value: 'admin', label: 'ADMIN' },
  { value: 'rh', label: 'RH' },
  { value: 'financeiro', label: 'FINANCEIRO' },
];

function generatePassword(): string {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const symbols = '!@#$%&*';
  const all = lowercase + uppercase + numbers + symbols;
  
  let password = '';
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];
  
  for (let i = 4; i < 8; i++) {
    password += all[Math.floor(Math.random() * all.length)];
  }
  
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

function getPasswordStrength(password: string): { label: string; color: string; width: string } {
  if (!password) return { label: '', color: 'bg-muted', width: '0%' };
  
  let score = 0;
  if (password.length >= 8) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;
  
  if (score <= 2) return { label: 'Fraca', color: 'bg-red-500', width: '33%' };
  if (score <= 4) return { label: 'Média', color: 'bg-amber-500', width: '66%' };
  return { label: 'Forte', color: 'bg-green-500', width: '100%' };
}

export function AddUserDialog({ open, onOpenChange, onSuccess, isSuperAdmin }: AddUserDialogProps) {
  const [selectedColaborador, setSelectedColaborador] = useState<string>('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<AppRole[]>([]);
  const [selectedRbacRoles, setSelectedRbacRoles] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: rbacRoles = [] } = useRbacRoles();
  const assignRbacRole = useAssignRoleToUser();

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
      setPassword('');
      setSelectedRoles([]);
      setSelectedRbacRoles([]);
      setShowPassword(false);
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

  const handleRoleToggle = (role: AppRole) => {
    setSelectedRoles(prev =>
      prev.includes(role)
        ? prev.filter(r => r !== role)
        : [...prev, role]
    );
  };

  const toggleRbacRole = (roleId: string) => {
    setSelectedRbacRoles(prev =>
      prev.includes(roleId)
        ? prev.filter(id => id !== roleId)
        : [...prev, roleId]
    );
  };

  const handleSubmit = async () => {
    // Validations
    if (!selectedColaborador) {
      toast.error('Selecione um funcionário');
      return;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Email inválido');
      return;
    }
    if (password.length < 8) {
      toast.error('A senha deve ter no mínimo 8 caracteres');
      return;
    }
    if (selectedRoles.length === 0) {
      toast.error('Selecione pelo menos um papel');
      return;
    }

    setIsSubmitting(true);

    try {
      // Get current session to pass auth token
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        toast.error('Sessão expirada. Faça login novamente.');
        return;
      }

      // Call edge function to create user securely
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            email,
            password,
            fullName: colaboradores?.find(c => c.id === selectedColaborador)?.full_name || '',
            roles: selectedRoles,
            collaboratorId: selectedColaborador,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        if (result.error?.includes('already registered') || result.error?.includes('already been registered')) {
          toast.error('Este email já está cadastrado');
        } else {
          toast.error(result.error || 'Erro ao criar usuário');
        }
        return;
      }

      // Atribuir perfis RBAC se selecionados
      if (selectedRbacRoles.length > 0 && result.userId) {
        for (const roleId of selectedRbacRoles) {
          try {
            await assignRbacRole.mutateAsync({ userId: result.userId, roleId });
          } catch {
            // Erros individuais já tratados pelo mutation
          }
        }
      }

      toast.success('Usuário criado com sucesso');
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast.error('Erro ao criar usuário');
    } finally {
      setIsSubmitting(false);
    }
  };

  const passwordStrength = getPasswordStrength(password);
  const availableRoles = isSuperAdmin ? ALL_ROLES : ALL_ROLES.filter(r => r.value !== 'super_admin');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar Novo Usuário</DialogTitle>
          <DialogDescription>
            Crie um novo usuário vinculado a um funcionário existente
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Funcionário */}
          <div className="space-y-2">
            <Label htmlFor="colaborador">Funcionário *</Label>
            <Select value={selectedColaborador} onValueChange={setSelectedColaborador}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um funcionário" />
              </SelectTrigger>
              <SelectContent>
                {colaboradores?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.full_name} - {c.cpf}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@exemplo.com"
            />
          </div>

          {/* Senha */}
          <div className="space-y-2">
            <Label htmlFor="password">Senha *</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setPassword(generatePassword())}
                title="Gerar senha"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            {password && (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full transition-all ${passwordStrength.color}`}
                      style={{ width: passwordStrength.width }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">{passwordStrength.label}</span>
                </div>
              </div>
            )}
          </div>

          {/* Papéis (legado) */}
          <div className="space-y-2">
            <Label>Papéis *</Label>
            <div className="grid grid-cols-2 gap-2">
              {availableRoles.map((role) => (
                <div key={role.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`role-${role.value}`}
                    checked={selectedRoles.includes(role.value)}
                    onCheckedChange={() => handleRoleToggle(role.value)}
                  />
                  <Label htmlFor={`role-${role.value}`} className="text-sm font-normal cursor-pointer">
                    {role.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Perfis RBAC */}
          <div className="space-y-3 pt-4 border-t">
            <Label className="text-sm font-medium">Perfis de Acesso (RBAC)</Label>
            <p className="text-xs text-muted-foreground">
              Perfis granulares que controlam o acesso por módulo e ação.
            </p>
            {rbacRoles.filter(r => r.is_active).map((role) => (
              <div key={role.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`rbac-role-${role.id}`}
                  checked={selectedRbacRoles.includes(role.id)}
                  onCheckedChange={() => toggleRbacRole(role.id)}
                />
                <Label htmlFor={`rbac-role-${role.id}`} className="text-sm cursor-pointer">
                  {role.name}
                  {role.is_system && <Badge variant="outline" className="ml-2 text-[10px]">Sistema</Badge>}
                </Label>
              </div>
            ))}
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
