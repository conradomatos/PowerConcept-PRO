/**
 * Matrix editor de permissões por perfil RBAC.
 * Exibe uma grid: linhas = módulos/recursos, colunas = ações.
 * Permite toggle individual e em massa (por módulo).
 */

import { useState, useMemo, useCallback } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, Search, Loader2, ShieldCheck } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  useRbacModules,
  useRbacResources,
  useRbacActions,
  useRbacPermissions,
  useRolePermissions,
  useToggleRolePermission,
  useBulkTogglePermissions,
} from '@/hooks/useRbacAdmin';

interface RolePermissionMatrixProps {
  roleId: string;
  roleName: string;
  isSystem: boolean;
  onClose: () => void;
}

/** Nomes abreviados para as colunas de ações */
const ACTION_SHORT_NAMES: Record<string, string> = {
  visualizar: 'Ver',
  criar: 'Criar',
  editar: 'Editar',
  excluir: 'Excl.',
  aprovar: 'Aprov.',
  exportar: 'Export.',
  importar: 'Import.',
  configurar: 'Config.',
};

export function RolePermissionMatrix({ roleId, roleName, isSystem, onClose }: RolePermissionMatrixProps) {
  const [search, setSearch] = useState('');
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  const { data: modules = [] } = useRbacModules();
  const { data: resources = [] } = useRbacResources();
  const { data: actions = [] } = useRbacActions();
  const { data: allPermissions = [] } = useRbacPermissions();
  const { data: rolePermissions = [], isLoading: loadingRolePerms } = useRolePermissions(roleId);

  const togglePermission = useToggleRolePermission();
  const bulkToggle = useBulkTogglePermissions();

  // Set de permission_ids que este role tem
  const grantedPermissionIds = useMemo(
    () => new Set(rolePermissions.filter((rp) => rp.granted).map((rp) => rp.permission_id)),
    [rolePermissions]
  );

  // Recursos agrupados por módulo
  const resourcesByModule = useMemo(() => {
    const map = new Map<string, typeof resources>();
    resources.forEach((r) => {
      const list = map.get(r.module_id) || [];
      list.push(r);
      map.set(r.module_id, list);
    });
    return map;
  }, [resources]);

  // Filtrar módulos pela busca
  const filteredModules = useMemo(() => {
    if (!search.trim()) return modules;
    const term = search.toLowerCase();
    return modules.filter((m) => {
      if (m.name.toLowerCase().includes(term)) return true;
      const modResources = resourcesByModule.get(m.id) || [];
      return modResources.some((r) => r.name.toLowerCase().includes(term));
    });
  }, [modules, search, resourcesByModule]);

  // Buscar permission para uma combinação resource+action
  const findPermission = useCallback(
    (resourceId: string, actionId: string) => {
      return allPermissions.find(
        (p) => p.resource_id === resourceId && p.action_id === actionId
      );
    },
    [allPermissions]
  );

  // Verificar se uma célula está marcada
  const isChecked = useCallback(
    (resourceId: string, actionId: string): boolean => {
      const permission = findPermission(resourceId, actionId);
      if (!permission) return false;
      return grantedPermissionIds.has(permission.id);
    },
    [findPermission, grantedPermissionIds]
  );

  // Toggle individual
  const handleToggle = useCallback(
    (resourceId: string, actionId: string) => {
      if (isSystem) return;
      const permission = findPermission(resourceId, actionId);
      if (!permission) return;
      togglePermission.mutate({ roleId, permissionId: permission.id });
    },
    [isSystem, findPermission, roleId, togglePermission]
  );

  // Verificar se TODAS as permissões do módulo estão marcadas
  const isModuleFullyGranted = useCallback(
    (moduleId: string): boolean => {
      const modResources = resourcesByModule.get(moduleId) || [];
      if (modResources.length === 0) return false;
      return modResources.every((r) =>
        actions.every((a) => {
          const perm = allPermissions.find(
            (p) => p.resource_id === r.id && p.action_id === a.id
          );
          return perm ? grantedPermissionIds.has(perm.id) : true;
        })
      );
    },
    [resourcesByModule, actions, allPermissions, grantedPermissionIds]
  );

  // Verificar se ALGUMA permissão do módulo está marcada (indeterminate)
  const isModulePartiallyGranted = useCallback(
    (moduleId: string): boolean => {
      const modResources = resourcesByModule.get(moduleId) || [];
      return modResources.some((r) =>
        actions.some((a) => {
          const perm = allPermissions.find(
            (p) => p.resource_id === r.id && p.action_id === a.id
          );
          return perm ? grantedPermissionIds.has(perm.id) : false;
        })
      );
    },
    [resourcesByModule, actions, allPermissions, grantedPermissionIds]
  );

  // Toggle todas as permissões de um módulo
  const handleModuleToggle = useCallback(
    (moduleId: string) => {
      if (isSystem) return;
      const modResources = resourcesByModule.get(moduleId) || [];
      const permissionIds: string[] = [];

      modResources.forEach((r) => {
        actions.forEach((a) => {
          const perm = allPermissions.find(
            (p) => p.resource_id === r.id && p.action_id === a.id
          );
          if (perm) permissionIds.push(perm.id);
        });
      });

      const fullyGranted = isModuleFullyGranted(moduleId);
      bulkToggle.mutate({
        roleId,
        permissionIds,
        granted: !fullyGranted,
      });
    },
    [isSystem, resourcesByModule, actions, allPermissions, isModuleFullyGranted, bulkToggle, roleId]
  );

  // Toggle expandir módulo
  const toggleExpanded = (moduleId: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(moduleId)) {
        next.delete(moduleId);
      } else {
        next.add(moduleId);
      }
      return next;
    });
  };

  // Expandir todos
  const expandAll = () => {
    setExpandedModules(new Set(filteredModules.map((m) => m.id)));
  };

  const isMutating = togglePermission.isPending || bulkToggle.isPending;

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-3xl lg:max-w-4xl overflow-hidden flex flex-col">
        <SheetHeader className="flex-shrink-0">
          <SheetTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Permissões: {roleName}
            {isSystem && (
              <Badge variant="secondary" className="ml-2">
                Sistema
              </Badge>
            )}
          </SheetTitle>
          <SheetDescription>
            {isSystem
              ? 'Perfil de sistema — permissões não podem ser alteradas.'
              : 'Marque as permissões que este perfil deve ter em cada módulo e recurso.'}
          </SheetDescription>
        </SheetHeader>

        {/* Toolbar */}
        <div className="flex items-center gap-2 py-3 flex-shrink-0">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filtrar módulos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          <Button variant="outline" size="sm" onClick={expandAll}>
            Expandir Todos
          </Button>
          {isMutating && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>

        {/* Matrix */}
        <ScrollArea className="flex-1 -mx-6 px-6">
          {loadingRolePerms ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="border rounded-md overflow-hidden">
              {/* Header */}
              <div className="grid bg-muted/50 border-b sticky top-0 z-10" style={{
                gridTemplateColumns: `minmax(200px, 1fr) ${actions.map(() => 'minmax(56px, 72px)').join(' ')}`,
              }}>
                <div className="px-3 py-2 font-medium text-sm">Módulo / Recurso</div>
                {actions.map((action) => (
                  <div key={action.id} className="px-1 py-2 text-center text-xs font-medium truncate">
                    {ACTION_SHORT_NAMES[action.code] || action.name}
                  </div>
                ))}
              </div>

              {/* Body */}
              {filteredModules.map((module) => {
                const modResources = resourcesByModule.get(module.id) || [];
                const isExpanded = expandedModules.has(module.id);
                const fullyGranted = isModuleFullyGranted(module.id);
                const partiallyGranted = isModulePartiallyGranted(module.id);

                if (modResources.length === 0) return null;

                return (
                  <Collapsible key={module.id} open={isExpanded} onOpenChange={() => toggleExpanded(module.id)}>
                    {/* Module row */}
                    <div
                      className="grid border-b bg-muted/30 hover:bg-muted/50 transition-colors"
                      style={{
                        gridTemplateColumns: `minmax(200px, 1fr) ${actions.map(() => 'minmax(56px, 72px)').join(' ')}`,
                      }}
                    >
                      <CollapsibleTrigger asChild>
                        <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-left w-full">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 flex-shrink-0" />
                          ) : (
                            <ChevronRight className="h-4 w-4 flex-shrink-0" />
                          )}
                          {module.name}
                        </button>
                      </CollapsibleTrigger>
                      {/* Module-level toggle checkbox (spans one cell, centered) */}
                      <div className="flex items-center justify-center col-span-1">
                        <Checkbox
                          checked={fullyGranted ? true : partiallyGranted ? 'indeterminate' : false}
                          onCheckedChange={() => handleModuleToggle(module.id)}
                          disabled={isSystem}
                          aria-label={`Toggle todas as permissões de ${module.name}`}
                        />
                      </div>
                      {/* Empty cells for remaining action columns */}
                      {actions.slice(1).map((a) => (
                        <div key={a.id} />
                      ))}
                    </div>

                    {/* Resource rows */}
                    <CollapsibleContent>
                      {modResources.map((resource) => (
                        <div
                          key={resource.id}
                          className="grid border-b hover:bg-muted/20 transition-colors"
                          style={{
                            gridTemplateColumns: `minmax(200px, 1fr) ${actions.map(() => 'minmax(56px, 72px)').join(' ')}`,
                          }}
                        >
                          <div className="px-3 py-2 pl-10 text-sm text-muted-foreground">
                            {resource.name}
                          </div>
                          {actions.map((action) => {
                            const perm = findPermission(resource.id, action.id);
                            const checked = perm ? grantedPermissionIds.has(perm.id) : false;

                            return (
                              <div key={action.id} className="flex items-center justify-center">
                                {perm ? (
                                  <Checkbox
                                    checked={checked}
                                    onCheckedChange={() => handleToggle(resource.id, action.id)}
                                    disabled={isSystem}
                                    aria-label={`${resource.name} - ${action.name}`}
                                  />
                                ) : (
                                  <span className="text-muted-foreground/30">—</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
