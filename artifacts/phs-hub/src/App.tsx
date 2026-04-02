import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import Home from "./pages/home";
import ThankYou from "./pages/thank-you";
import Dashboard from "./pages/admin/dashboard";
import SubmissionsList from "./pages/admin/submissions/index";
import SubmissionDetail from "./pages/admin/submissions/detail";
import AiEditor from "./pages/admin/submissions/ai-editor";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/thank-you" component={ThankYou} />
      <Route path="/admin" component={Dashboard} />
      <Route path="/admin/submissions" component={SubmissionsList} />
      <Route path="/admin/submissions/:id" component={SubmissionDetail} />
      <Route path="/admin/submissions/:id/ai" component={AiEditor} />
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
