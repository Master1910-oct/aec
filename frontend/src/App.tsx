import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import AdminDashboard from "@/pages/AdminDashboard";
import HospitalDashboard from "@/pages/HospitalDashboard";
import AmbulancePanel from "@/pages/AmbulancePanel";
import NotFound from "@/pages/NotFound";
import Login from "@/pages/Login";
import { useStore } from "@/store/useStore";
import { useSocketEvents } from "@/hooks/useSocketEvents";

const queryClient = new QueryClient();

function defaultRouteForRole(role: string) {
  if (role === 'hospital') return '/hospital';
  if (role === 'ambulance') return '/ambulance';
  return '/';
}

const RequireAuth = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem("aes_auth_token");
  const { currentUser } = useStore();
  const location = useLocation();

  if (!token) return <Navigate to="/login" replace state={{ from: location }} />;

  if (!currentUser) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return <>{children}</>;
};

const RequireRole = ({ allow, children }: { allow: string[]; children: React.ReactNode }) => {
  const { currentUser } = useStore();
  if (!currentUser) return null;
  if (!allow.includes(currentUser.role)) {
    return <Navigate to={defaultRouteForRole(currentUser.role)} replace />;
  }
  return <>{children}</>;
};

const RedirectIfAuthed = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem("aes_auth_token");
  const { currentUser } = useStore();
  if (token && currentUser) return <Navigate to={defaultRouteForRole(currentUser.role)} replace />;
  return <>{children}</>;
};

const AuthInitializer = () => {
  const { fetchMe } = useStore();
  useEffect(() => {
    const token = localStorage.getItem("aes_auth_token");
    if (token) fetchMe();
  }, [fetchMe]);
  return null;
};

// ✅ Fix 1: Mount socket listener once here, inside BrowserRouter context
// so it's active for ALL pages as long as user is logged in
const SocketInitializer = () => {
  useSocketEvents();
  return null;
};

const AppRoutes = () => {
  return (
    <>
      <AuthInitializer />
      <SocketInitializer />  {/* ✅ Socket events now active globally */}
      <Routes>
        <Route
          path="/login"
          element={
            <RedirectIfAuthed>
              <Login />
            </RedirectIfAuthed>
          }
        />

        <Route
          element={
            <RequireAuth>
              <DashboardLayout />
            </RequireAuth>
          }
        >
          <Route path="/" element={<RequireRole allow={['admin']}><AdminDashboard /></RequireRole>} />
          <Route path="/hospital" element={<RequireRole allow={['admin', 'hospital', 'ambulance']}><HospitalDashboard /></RequireRole>} />
          <Route path="/ambulance" element={<RequireRole allow={['admin', 'ambulance']}><AmbulancePanel /></RequireRole>} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;