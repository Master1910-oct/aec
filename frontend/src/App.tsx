import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import AdminDashboard from "@/pages/AdminDashboard";
import HospitalDashboard from "@/pages/HospitalDashboard";
import AmbulancePanel from "@/pages/AmbulancePanel";
import NotFound from "@/pages/NotFound";
import Login from "@/pages/Login";
import { useStore } from "@/store/useStore";

const queryClient = new QueryClient();

// ─── Role helpers ─────────────────────────────────────────────────────────────

/** The "home" route for each role after login */
function defaultRouteForRole(role: string) {
  if (role === 'hospital') return '/hospital';
  if (role === 'ambulance') return '/ambulance';
  return '/';          // admin + any other
}

// ─── Auth Guard ───────────────────────────────────────────────────────────────

const RequireAuth = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem("aes_auth_token");
  const { currentUser } = useStore();
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Token exists but user data not yet fetched — show spinner
  if (!currentUser) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return <>{children}</>;
};

/**
 * Guard a specific route to only the listed roles.
 * If the user's role is not in `allow`, redirect to their home route.
 */
const RequireRole = ({ allow, children }: { allow: string[]; children: React.ReactNode }) => {
  const { currentUser } = useStore();
  if (!currentUser) return null;
  if (!allow.includes(currentUser.role)) {
    return <Navigate to={defaultRouteForRole(currentUser.role)} replace />;
  }
  return <>{children}</>;
};

// ─── Redirect logged-in users away from /login ────────────────────────────────

const RedirectIfAuthed = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem("aes_auth_token");
  const { currentUser } = useStore();

  if (token && currentUser) {
    return <Navigate to={defaultRouteForRole(currentUser.role)} replace />;
  }
  return <>{children}</>;
};

// ─── On-boot fetchMe ──────────────────────────────────────────────────────────

const AuthInitializer = () => {
  const { fetchMe } = useStore();
  useEffect(() => {
    const token = localStorage.getItem("aes_auth_token");
    if (token) fetchMe();
  }, [fetchMe]);
  return null;
};

// ─── Routes ───────────────────────────────────────────────────────────────────

const AppRoutes = () => {
  return (
    <>
      <AuthInitializer />
      <Routes>
        {/* Public */}
        <Route
          path="/login"
          element={
            <RedirectIfAuthed>
              <Login />
            </RedirectIfAuthed>
          }
        />

        {/* Protected layout */}
        <Route
          element={
            <RequireAuth>
              <DashboardLayout />
            </RequireAuth>
          }
        >
          {/* Admin only — full Command Center */}
          <Route
            path="/"
            element={
              <RequireRole allow={['admin']}>
                <AdminDashboard />
              </RequireRole>
            }
          />

          {/* Hospital Panel:
              - admin    → full edit
              - hospital → full edit
              - ambulance → read-only view */}
          <Route
            path="/hospital"
            element={
              <RequireRole allow={['admin', 'hospital', 'ambulance']}>
                <HospitalDashboard />
              </RequireRole>
            }
          />

          {/* Ambulance Unit:
              - admin     → full control
              - ambulance → full control (dispatch + status)
              - hospital  → read-only view */}
          <Route
            path="/ambulance"
            element={
              <RequireRole allow={['admin', 'hospital', 'ambulance']}>
                <AmbulancePanel />
              </RequireRole>
            }
          />
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
