import React, { Suspense } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WebSocketProvider } from "./contexts/WebSocketContext";

// Lazy load pages to prevent loading all components on initial load
const Home = React.lazy(() => import("@/pages/home"));
const NotFound = React.lazy(() => import("@/pages/not-found"));
const Login = React.lazy(() => import("@/pages/login"));
const Events = React.lazy(() => import("@/pages/events"));
const EventManage = React.lazy(() => import("@/pages/event-manage"));
const Dashboard = React.lazy(() => import("@/pages/dashboard"));
const EventHost = React.lazy(() => import("@/pages/event-host"));
const EventJoin = React.lazy(() => import("@/pages/event-join"));
const Profile = React.lazy(() => import("@/pages/profile"));
const ApiDocs = React.lazy(() => import("@/pages/api-docs"));
const PresenterView = React.lazy(() => import("@/pages/presenter"));
const PresenterDemo = React.lazy(() => import("@/pages/presenter-demo"));
const StaticPresenterDemo = React.lazy(() => import("@/pages/presenter-demo-static"));
const Insights = React.lazy(() => import("@/pages/insights"));

// Lazy load layout components only when needed
const Header = React.lazy(() => import("@/components/layout/header"));
const Footer = React.lazy(() => import("@/components/layout/footer"));

// Loading component
const Loading = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-wine-600">Loading...</div>
  </div>
);

// Separate router for home page to prevent unnecessary providers
function HomeRouter() {
  // For static builds (GitHub Pages), redirect to demo
  if (import.meta.env.PROD && window.location.hostname.includes('github.io')) {
    return (
      <Suspense fallback={<Loading />}>
        <StaticPresenterDemo />
      </Suspense>
    );
  }
  
  return (
    <Suspense fallback={<Loading />}>
      <Home />
    </Suspense>
  );
}

// Router for application pages that need full context
function AppRouter() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen flex flex-col">
        <main className="flex-1">
          <Suspense fallback={<Loading />}>
            <Switch>
              <Route path="/login" component={Login} />
              <Route path="/events" component={() => <Dashboard />} />
              <Route path="/events/:id/manage">
                {(params) => (
                  <WebSocketProvider>
                    <EventManage />
                  </WebSocketProvider>
                )}
              </Route>
              <Route path="/dashboard">
                <TooltipProvider>
                  <Header />
                  <Dashboard />
                  <Footer />
                </TooltipProvider>
              </Route>
              <Route path="/insights">
                <TooltipProvider>
                  <Header />
                  <Insights />
                  <Footer />
                </TooltipProvider>
              </Route>
              <Route path="/event/:id">
                {(params) => (
                  <WebSocketProvider>
                    <Header />
                    <EventHost />
                    <Footer />
                  </WebSocketProvider>
                )}
              </Route>
              <Route path="/join/:qrCode">
                {(params) => (
                  <WebSocketProvider>
                    <EventJoin />
                  </WebSocketProvider>
                )}
              </Route>
              <Route path="/profile" component={Profile} />
              <Route path="/api-docs" component={ApiDocs} />
              <Route path="/presenter/:id">
                {(params) => (
                  <WebSocketProvider>
                    <PresenterView />
                  </WebSocketProvider>
                )}
              </Route>
              <Route path="/demo">
                {() => (
                  <StaticPresenterDemo />
                )}
              </Route>
              <Route path="/presenter-demo/:id">
                {(params) => (
                  <StaticPresenterDemo />
                )}
              </Route>
              <Route component={NotFound} />
            </Switch>
          </Suspense>
        </main>
      </div>
    </QueryClientProvider>
  );
}

function App() {
  return (
    <Switch>
      {/* Home page without any heavy providers to prevent reload loops */}
      <Route path="/" component={HomeRouter} />
      {/* All other routes with full context */}
      <Route path="/.*" component={AppRouter} />
    </Switch>
  );
}

export default App;
