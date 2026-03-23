import { useAuth } from '@/contexts/AuthContext';

export function usePermissions() {
  const { perfil, isAdmin } = useAuth();

  return {
    podeCriar: isAdmin || !!perfil?.pode_criar,
    podeEditar: isAdmin || !!perfil?.pode_editar,
    podeExcluir: isAdmin || !!perfil?.pode_excluir,
    isAdmin,
  };
}
