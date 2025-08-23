import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WebSocketProvider } from "./contexts/WebSocketContext";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Login from "@/pages/login";
import Events from "@/pages/events";
import EventManage from "@/pages/event-manage";
import Dashboard from "@/pages/dashboard";
import EventHost from "@/pages/event-host";
import EventJoin from "@/pages/event-join";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";

function Router() {
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1">
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/login" component={Login} />
          <Route path="/events" component={Events} />
          <Route path="/events/:id/manage" component={EventManage} />
          <Route path="/dashboard">
            <Header />
            <Dashboard />
            <Footer />
          </Route>
          <Route path="/event/:id">
            <Header />
            <EventHost />
            <Footer />
          </Route>
          <Route path="/join/:qrCode" component={EventJoin} />
          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WebSocketProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </WebSocketProvider>
    </QueryClientProvider>
  );
}

export default App;
