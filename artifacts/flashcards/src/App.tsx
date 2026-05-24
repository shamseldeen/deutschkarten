import { Switch, Route, useLocation, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { ClerkProvider, Show } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { useClerk } from "@clerk/react";
import { useEffect, useRef } from "react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import Home from "@/pages/home";
import Browse from "@/pages/browse";
import Daily from "@/pages/daily";
import Study from "@/pages/study";
import Generate from "@/pages/generate";
import SignInPage from "@/pages/sign-in";
import SignUpPage from "@/pages/sign-up";
import ProfilePage from "@/pages/profile";
import QuizPage from "@/pages/quiz";
import StatsPage from "@/pages/stats";
import LeaderboardPage from "@/pages/leaderboard";
import RoadmapPage from "@/pages/roadmap";

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath) ? path.slice(basePath.length) || "/" : path;
}

if (!clerkPubKey) throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY");

const queryClient = new QueryClient();

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) qc.clear();
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, qc]);
  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/sign-in/*?" component={SignInPage} />
      <Route path="/sign-up/*?" component={SignUpPage} />
      <Route path="/profile" component={ProfilePage} />
      <Route path="/" component={Home} />
      <Route path="/browse" component={Browse} />
      <Route path="/daily" component={Daily} />
      <Route path="/study/:level" component={Study} />
      <Route path="/generate" component={Generate} />
      <Route path="/quiz" component={QuizPage} />
      <Route path="/stats" component={StatsPage} />
      <Route path="/leaderboard" component={LeaderboardPage} />
      <Route path="/roadmap" component={RoadmapPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();
  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      appearance={{
        variables: {
          colorPrimary: "#0d8a4e",
          fontFamily: "system-ui, -apple-system, sans-serif",
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <TooltipProvider>
          <Router />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export { Show };
export default App;
