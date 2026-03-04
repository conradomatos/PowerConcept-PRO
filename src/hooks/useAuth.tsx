import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type AppRole = 'admin' | 'rh' | 'financeiro' | 'super_admin' | 'catalog_manager';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  roles: AppRole[];
  rbacRoleCodes: string[];
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  hasRole: (role: AppRole) => boolean;
  hasAnyRole: () => boolean;
  isGodMode: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [rbacRoleCodes, setRbacRoleCodes] = useState<string[]>([]);

  const fetchRoles = async (userId: string) => {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);

    if (!error && data) {
      setRoles(data.map((r) => r.role as AppRole));
    } else {
      setRoles([]);
    }
  };

  const fetchRbacRoles = async (userId: string) => {
    const { data, error } = await supabase
      .from('rbac_user_roles')
      .select('role_id, rbac_roles(code)')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (!error && data) {
      const codes = data
        .map((r: any) => r.rbac_roles?.code)
        .filter(Boolean) as string[];
      setRbacRoleCodes(codes);
    } else {
      setRbacRoleCodes([]);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        if (session?.user) {
          setTimeout(() => {
            fetchRoles(session.user.id);
            fetchRbacRoles(session.user.id);
          }, 0);
        } else {
          setRoles([]);
          setRbacRoleCodes([]);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      if (session?.user) {
        fetchRoles(session.user.id);
        fetchRbacRoles(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setRoles([]);
    setRbacRoleCodes([]);
  };

  const hasRole = (role: AppRole) => roles.includes(role);
  const hasAnyRole = () => roles.length > 0 || rbacRoleCodes.length > 0;
  const isGodMode = () => rbacRoleCodes.includes('god_mode') || roles.includes('super_admin');

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        roles,
        rbacRoleCodes,
        signIn,
        signOut,
        hasRole,
        hasAnyRole,
        isGodMode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
