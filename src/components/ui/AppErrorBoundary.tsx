import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export default class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[CHIMERA] UI crash", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-[#0a0a14] px-6 text-center text-white">
          <p className="font-[family-name:var(--font-hud)] text-[10px] tracking-[0.35em] text-[rgba(0,229,255,0.6)] uppercase">
            CHIMERA recovered from an error
          </p>
          <h1 className="mt-4 font-[family-name:var(--font-display)] text-2xl text-gold-glow">
            Something went wrong
          </h1>
          <p className="mt-4 max-w-md text-sm text-[rgba(255,255,255,0.55)]">
            This can happen on phones when memory is tight. Reload the page to
            continue — your saved games in this browser are usually still there.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-8 rounded-sm border border-[rgba(232,197,71,0.35)] bg-[rgba(232,197,71,0.1)] px-6 py-3 font-[family-name:var(--font-hud)] text-[10px] tracking-[0.25em] text-gold-glow uppercase"
          >
            Reload app
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
