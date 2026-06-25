"use client";

import { Component, type ReactNode } from "react";

interface State {
  hasError: boolean;
  error: Error | null;
}

export class GlobalErrorBoundary extends Component<
  { children: ReactNode },
  State
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-gray-950 p-8">
          <div className="max-w-md rounded-xl border border-red-800 bg-red-900/20 p-8 text-center">
            <h1 className="mb-2 text-xl font-bold text-red-300">
              Something went wrong
            </h1>
            <p className="mb-6 text-sm text-red-400">
              {this.state.error?.message || "An unexpected error occurred."}
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium hover:bg-blue-500"
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
