import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { BookOpen, Layers, PlusCircle, Calendar, User, LogIn, Brain, BarChart3, Trophy, GraduationCap } from "lucide-react";
import { Show, useUser } from "@clerk/react";
import { cn } from "@/lib/utils";

function NavLink({ href, icon: Icon, children }: { href: string; icon: any; children: ReactNode }) {
  const [location] = useLocation();
  const isActive = location === href || (href !== "/" && location.startsWith(href));
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors hover-elevate",
        isActive
          ? "bg-primary text-primary-foreground no-default-hover-elevate"
          : "text-muted-foreground hover:text-foreground hover:bg-muted",
      )}
    >
      <Icon className="w-4 h-4" />
      {children}
    </Link>
  );
}

function AuthSlot() {
  const { user } = useUser();
  return (
    <>
      <Show when="signed-in">
        <Link
          href="/profile"
          className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm font-medium text-foreground hover:bg-muted"
        >
          {user?.imageUrl ? (
            <img src={user.imageUrl} alt="" className="w-7 h-7 rounded-full" />
          ) : (
            <User className="w-5 h-5" />
          )}
          <span className="hidden sm:inline">
            {user?.firstName || user?.username || "Profile"}
          </span>
        </Link>
      </Show>
      <Show when="signed-out">
        <Link
          href="/sign-in"
          className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90"
        >
          <LogIn className="w-4 h-4" />
          <span className="hidden sm:inline">Sign In</span>
        </Link>
      </Show>
    </>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-[100dvh] flex flex-col w-full bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 gap-2">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-xl leading-none">
              B
            </div>
            <span className="font-bold text-lg hidden md:inline-block text-foreground whitespace-nowrap">
              Ba7r DeutschKarten
            </span>
          </Link>

          <nav className="flex items-center gap-1 sm:gap-2 overflow-x-auto">
            <NavLink href="/" icon={BookOpen}>Dashboard</NavLink>
            <NavLink href="/daily" icon={Calendar}>Daily</NavLink>
            <NavLink href="/browse" icon={Layers}>Browse</NavLink>
            <NavLink href="/quiz" icon={Brain}>Quiz</NavLink>
            <NavLink href="/roadmap" icon={GraduationCap}>Roadmap</NavLink>
            <NavLink href="/stats" icon={BarChart3}>Stats</NavLink>
            <NavLink href="/leaderboard" icon={Trophy}>Leaderboard</NavLink>
            <NavLink href="/generate" icon={PlusCircle}>Generate</NavLink>
          </nav>

          <div className="shrink-0">
            <AuthSlot />
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
