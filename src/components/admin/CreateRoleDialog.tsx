/**
 * Dialog para criar ou editar um perfil RBAC.
 * Suporta clonagem de permissões de outro perfil existente.
 */

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { useRbacRoles, useCreateRole, useUpdateRole, type RbacRole } from '@/hooks/useRbacAdmin';

const formSchema = z.object({
  name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  code: z.string().min(2, 'Código deve ter pelo menos 2 caracteres'),
  description: z.string().optional(),
  cloneFrom: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface CreateRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingRole?: RbacRole | null;
  onSuccess: () => void;
}

/** Gera slug a partir de um nome: "Gerente Regional" → "gerente_regional" */
function slugify(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

export function CreateRoleDialog({ open, onOpenChange, editingRole, onSuccess }: CreateRoleDialogProps) {
  const { data: roles = [] } = useRbacRoles();
  const createRole = useCreateRole();
  const updateRole = useUpdateRole();
  const isEditing = !!editingRole;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      code: '',
      description: '',
      cloneFrom: '',
    },
  });

  const nameValue = watch('name');
  const cloneFromValue = watch('cloneFrom');
  const cloneSourceRole = roles.find((r) => r.id === cloneFromValue);

  // Auto-gerar code a partir do name ao criar
  useEffect(() => {
    if (!isEditing && nameValue) {
      setValue('code', slugify(nameValue));
    }
  }, [nameValue, isEditing, setValue]);

  // Popular form ao editar
  useEffect(() => {
    if (open && editingRole) {
      reset({
        name: editingRole.name,
        code: editingRole.code,
        description: editingRole.description || '',
        cloneFrom: '',
      });
    } else if (open && !editingRole) {
      reset({ name: '', code: '', description: '', cloneFrom: '' });
    }
  }, [open, editingRole, reset]);

  const onSubmit = async (data: FormData) => {
    if (isEditing && editingRole) {
      await updateRole.mutateAsync({
        id: editingRole.id,
        name: data.name,
        description: data.description,
      });
    } else {
      await createRole.mutateAsync({
        name: data.name,
        code: data.code,
        description: data.description,
        cloneFromId: data.cloneFrom || undefined,
      });
    }
    onSuccess();
    onOpenChange(false);
  };

  const isPending = createRole.isPending || updateRole.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Perfil' : 'Novo Perfil'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Altere o nome e descrição do perfil.'
              : 'Crie um novo perfil de acesso. Opcionalmente, clone permissões de um existente.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
          {/* Nome */}
          <div className="space-y-2">
            <Label htmlFor="role-name">Nome do Perfil *</Label>
            <Input
              id="role-name"
              placeholder="Ex: Gerente Regional"
              {...register('name')}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Code */}
          <div className="space-y-2">
            <Label htmlFor="role-code">Código</Label>
            <Input
              id="role-code"
              placeholder="gerente_regional"
              {...register('code')}
              disabled={isEditing}
              className={isEditing ? 'bg-muted' : ''}
            />
            {errors.code && (
              <p className="text-xs text-destructive">{errors.code.message}</p>
            )}
            {!isEditing && (
              <p className="text-xs text-muted-foreground">
                Gerado automaticamente a partir do nome.
              </p>
            )}
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="role-desc">Descrição</Label>
            <Textarea
              id="role-desc"
              placeholder="Descreva as responsabilidades deste perfil..."
              rows={3}
              {...register('description')}
            />
          </div>

          {/* Clonar de (apenas ao criar) */}
          {!isEditing && (
            <div className="space-y-2">
              <Label>Clonar permissões de</Label>
              <Select
                value={cloneFromValue || ''}
                onValueChange={(val) => setValue('cloneFrom', val === 'none' ? '' : val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Nenhum (perfil vazio)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum (perfil vazio)</SelectItem>
                  {roles.filter(r => r.code !== 'god_mode').map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {cloneSourceRole && (
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    As permissões de "{cloneSourceRole.name}" serão copiadas
                  </Badge>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Salvar' : 'Criar Perfil'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
