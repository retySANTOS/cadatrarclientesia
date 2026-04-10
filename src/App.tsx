import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Organizacoes from "./pages/Organizacoes";
import Equipe from "./pages/Equipe";
import Relatorios from "./pages/Relatorios";
import ConsumoDetalhado from "./pages/ConsumoDetalhado";
import Feedbacks from "./pages/Feedbacks";
import Campanhas from "./pages/Campanhas";
import GruposProdutos from "./pages/GruposProdutos";
import RelatorioProdutos from "./pages/RelatorioProdutos";
import DashboardPedidos from "./pages/DashboardPedidos";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/organizacoes" element={<ProtectedRoute><Organizacoes /></ProtectedRoute>} />
            <Route path="/equipe" element={<ProtectedRoute><Equipe /></ProtectedRoute>} />
            <Route path="/relatorios" element={<ProtectedRoute><Relatorios /></ProtectedRoute>} />
            <Route path="/consumo-detalhado" element={<ProtectedRoute><ConsumoDetalhado /></ProtectedRoute>} />
            <Route path="/feedbacks" element={<ProtectedRoute><Feedbacks /></ProtectedRoute>} />
            <Route path="/campanhas" element={<ProtectedRoute><Campanhas /></ProtectedRoute>} />
            <Route path="/grupos-produtos" element={<ProtectedRoute><GruposProdutos /></ProtectedRoute>} />
            <Route path="/relatorio-produtos" element={<ProtectedRoute><RelatorioProdutos /></ProtectedRoute>} />
            <Route path="/dashboard-pedidos" element={<ProtectedRoute><DashboardPedidos /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
