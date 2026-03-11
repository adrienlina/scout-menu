import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import Index from "./pages/Index";
import AuthPage from "./pages/AuthPage";
import MenusPage from "./pages/MenusPage";
import CampsPage from "./pages/CampsPage";
import CampDetailPage from "./pages/CampDetailPage";
import ShoppingListPage from "./pages/ShoppingListPage";
import StockPage from "./pages/StockPage";
import MenuDetailPage from "./pages/MenuDetailPage";
import AgribalysePage from "./pages/AgribalysePage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Chargement...</div>;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/" element={<AppLayout><Index /></AppLayout>} />
      <Route path="/auth" element={user ? <Navigate to="/menus" replace /> : <AuthPage />} />
      <Route path="/menus" element={<ProtectedRoute><AppLayout><MenusPage /></AppLayout></ProtectedRoute>} />
      <Route path="/menus/:menuId" element={<ProtectedRoute><AppLayout><MenuDetailPage /></AppLayout></ProtectedRoute>} />
      <Route path="/camps" element={<ProtectedRoute><AppLayout><CampsPage /></AppLayout></ProtectedRoute>} />
      <Route path="/camps/:campId" element={<ProtectedRoute><AppLayout><CampDetailPage /></AppLayout></ProtectedRoute>} />
      <Route path="/camps/:campId/liste/:listId" element={<ProtectedRoute><AppLayout><ShoppingListPage /></AppLayout></ProtectedRoute>} />
      <Route path="/camps/:campId/stock" element={<ProtectedRoute><AppLayout><StockPage /></AppLayout></ProtectedRoute>} />
      <Route path="/agribalyse" element={<ProtectedRoute><AppLayout><AgribalysePage /></AppLayout></ProtectedRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
