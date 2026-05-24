import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { BookOpen, Layers, PlusCircle, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

function NavLink({ href, icon: Icon, children }: { href: string; icon: any; children: ReactNode }) {
  const [location] = useLocation();
  const isActive = location === href || (href !== "/" && location.startsWith(href));

  return (
    <Link href={href} className={cn(
      "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors hover-elevate",
      isActive 
        ? "bg-primary text-primary-foreground no-default-hover-elevate" 
        : "text-muted-foreground hover:text-foreground hover:bg-muted"
    )}>
      <Icon className="w-4 h-4" />
      {children}
    </Link>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-[100dvh] flex flex-col w-full bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-xl leading-none">
              D
            </div>
            <span className="font-bold text-lg hidden sm:inline-block text-foreground">
              DeutschKarten
            </span>
          </Link>

          <nav className="flex items-center gap-1 sm:gap-2">
            <NavLink href="/" icon={BookOpen}>Dashboard</NavLink>
            <NavLink href="/daily" icon={Calendar}>Daily</NavLink>
            <NavLink href="/browse" icon={Layers}>Browse</NavLink>
            <NavLink href="/generate" icon={PlusCircle}>Generate</NavLink>
          </nav>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}
