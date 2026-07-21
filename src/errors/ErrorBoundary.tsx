import React, { Component, ErrorInfo, ReactNode } from "react";
import { IconAlertCircle as AlertCircle, IconRefresh as RefreshCw } from '@tabler/icons-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught exception in Study Workspace:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F4F5F8] text-slate-800 font-sans flex flex-col items-center justify-center p-6 text-center">
          <div className="w-full max-w-md bg-white border border-slate-100 p-8 rounded-[32px] shadow-[0_12px_40px_rgba(0,0,0,0.03)] flex flex-col items-center">
            <div className="bg-rose-50 p-4 text-rose-600 rounded-full mb-4">
              <AlertCircle className="w-10 h-10" />
            </div>
            
            <h2 className="text-xl font-extrabold text-slate-800 uppercase tracking-tight">
              Syllabus Runtime Crash
            </h2>
            
            <p className="text-slate-500 text-xs mt-2 leading-relaxed">
              An unexpected layout crash occurred inside the active session frame. Our automatic memory cleanup guard captured the stack trace.
            </p>

            {this.state.error && (
              <pre className="w-full mt-4 p-3 bg-rose-50/50 border border-rose-100 text-[10px] text-rose-800 font-mono rounded-xl text-left overflow-x-auto whitespace-pre-wrap max-h-40">
                {this.state.error.toString()}
              </pre>
            )}

            <button
              onClick={this.handleReset}
              className="mt-6 w-full flex items-center justify-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase rounded-xl shadow-sm transition-all cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              Re-initialize Workspace
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
