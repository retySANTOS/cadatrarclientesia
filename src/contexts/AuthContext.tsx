import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export interface Perfil {
  id: string;
  nome: string;
  email: string;
  pode_criar: boolean;
  pode_editar: boolean;
  pode_excluir: boolean;
  organizacao_id?: string | null;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  perfil: Perfil | null;
  isAdmin: boolean;
  organizacaoId: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [organizacaoId, setOrganizacaoId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPerfilAndAdmin = async (userId: string) => {
    try {
      const [perfilRes, adminRes] = await Promise.all([
        supabase.from('perfis').select('*').eq('id', userId).single(),
        supabase.rpc('is_admin'),
      ]);

      if (perfilRes.data) {
        const p = perfilRes.data as Perfil;
        setPerfil(p);
        setOrganizacaoId(p.organizacao_id ?? null);
      }
      if (adminRes.data !== null) {
        setIsAdmin(!!adminRes.data);
      }
    } catch (err) {
      console.error('Error fetching perfil/admin:', err);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          setTimeout(() => fetchPerfilAndAdmin(session.user.id), 0);
        } else {
          setPerfil(null);
          setIsAdmin(false);
          setOrganizacaoId(null);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchPerfilAndAdmin(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setPerfil(null);
    setIsAdmin(false);
    setOrganizacaoId(null);
  };

  return (
    <AuthContext.Provider value={{ session, user, perfil, isAdmin, organizacaoId, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
