import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

export default function Login() {
  const { session, loading, signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { toast.error('Digite seu e-mail primeiro.'); return; }
    setResetLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/dashboard',
    });
    if (error) {
      toast.error('Erro: ' + error.message);
    } else {
      setResetSent(true);
    }
    setResetLoading(false);
  };

  if (loading) return null;
  if (resetMode) return (
    <div className="dark min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Redefinir senha</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {resetSent ? 'Verifique seu e-mail.' : 'Informe seu e-mail cadastrado.'}
          </p>
        </CardHeader>
        <CardContent>
          {resetSent ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Enviamos um link de redefinição para {email}. Verifique sua caixa de entrada.
              </p>
              <Button
                type="button"
                className="w-full"
                onClick={() => { setResetMode(false); setResetSent(false); }}
              >
                Voltar ao login
              </Button>
            </div>
          ) : (
            <form onSubmit={handleReset} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email">E-mail</Label>
                <Input id="reset-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
              </div>
              <Button type="submit" className="w-full" disabled={resetLoading}>
                {resetLoading ? 'Enviando...' : 'Enviar link'}
              </Button>
              <button
                type="button"
                onClick={() => setResetMode(false)}
                className="w-full text-xs text-muted-foreground hover:underline"
              >
                Voltar ao login
              </button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
  if (session) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    const { error } = await signIn(email, password);
    if (error) setError(error.message);
    setSubmitting(false);
  };

  return (
    <div className="dark min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Proj Sistemas</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">Faça login para continuar</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Entrando...' : 'Entrar'}
            </Button>
            <button
              type="button"
              onClick={() => { setResetMode(true); setError(''); }}
              className="w-full text-xs text-muted-foreground hover:underline mt-1"
            >
              Esqueci minha senha
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
