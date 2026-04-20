import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import AdminGuard from "@/components/admin-guard";

import Home from "./pages/home";
import ThankYou from "./pages/thank-you";
import EoiPage from "./pages/eoi";
import EoiThankYou from "./pages/eoi-thank-you";
import AdminLogin from "./pages/admin/login";
import Dashboard from "./pages/admin/dashboard";
import SubmissionsList from "./pages/admin/submissions/index";
import SubmissionDetail from "./pages/admin/submissions/detail";
import AiEditor from "./pages/admin/submissions/ai-editor";
import ReelTemplatesSettings from "./pages/admin/settings/reel-templates";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/thank-you" component={ThankYou} />
      <Route path="/eoi" component={EoiPage} />
      <Route path="/eoi-thank-you" component={EoiThankYou} />
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin">
        <AdminGuard>
          <Dashboard />
        </AdminGuard>
      </Route>
      <Route path="/admin/submissions">
        <AdminGuard>
          <SubmissionsList />
        </AdminGuard>
      </Route>
      <Route path="/admin/submissions/:id/ai">
        {(params) => (
          <AdminGuard>
            <AiEditor />
          </AdminGuard>
        )}
      </Route>
      <Route path="/admin/submissions/:id">
        {(params) => (
          <AdminGuard>
            <SubmissionDetail />
          </AdminGuard>
        )}
      </Route>
      <Route path="/admin/settings/reel-templates">
        <AdminGuard>
          <ReelTemplatesSettings />
        </AdminGuard>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
