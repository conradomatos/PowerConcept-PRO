/**
 * Componente wrapper que renderiza children APENAS se o usuário
 * tem a permissão especificada.
 *
 * @example
 * <PermissionGate permission="projetos.os.criar">
 *   <Button>Nova OS</Button>
 * </PermissionGate>
 *
 * <PermissionGate permissions={['financeiro.dre.visualizar', 'financeiro.dre.exportar']} requireAll={false}>
 *   <DREPage />
 * </PermissionGate>
 */

import { ReactNode } from 'react';
import { usePermissions } from '@/hooks/usePermissions';

interface PermissionGateProps {
  /** Permissão única */
  permission?: string;
  /** Múltiplas permissões */
  permissions?: string[];
  /** Se true, exige TODAS as permissões. Default: false (qualquer uma) */
  requireAll?: boolean;
  /** Módulo inteiro (qualquer permissão no módulo) */
  module?: string;
  /** Conteúdo a renderizar se tem permissão */
  children: ReactNode;
  /** Conteúdo alternativo se NÃO tem permissão. Default: null (esconde) */
  fallback?: ReactNode;
}

export function PermissionGate({
  permission,
  permissions,
  requireAll = false,
  module,
  children,
  fallback = null,
}: PermissionGateProps) {
  const { can, canAny, canAll, canModule } = usePermissions();

  let hasPermission = false;

  if (module) {
    hasPermission = canModule(module);
  } else if (permission) {
    hasPermission = can(permission);
  } else if (permissions && permissions.length > 0) {
    hasPermission = requireAll ? canAll(permissions) : canAny(permissions);
  }

  if (!hasPermission) return <>{fallback}</>;
  return <>{children}</>;
}
