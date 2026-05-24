import { Component, type ErrorInfo, type ReactNode } from "react";
import { reportError } from "@/lib/errorReporter";

type Props = { children: ReactNode };
type State = { hasError: boolean; message: string };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(err: unknown): State {
    return {
      hasError: true,
      message: err instanceof Error ? err.message : "Unknown error",
    };
  }

  componentDidCatch(err: Error, info: ErrorInfo): void {
    reportError(err, { componentStack: info.componentStack ?? "" });
  }

  reset = (): void => {
    this.setState({ hasError: false, message: "" });
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-card border rounded-2xl p-6 text-center">
          <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
          <p className="text-sm text-muted-foreground mb-4">
            We've been notified and are looking into it.
          </p>
          <p className="text-xs text-muted-foreground font-mono mb-4 break-words">
            {this.state.message}
          </p>
          <button
            onClick={this.reset}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }
}
