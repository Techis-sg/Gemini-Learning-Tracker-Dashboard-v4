import React from "react";
import { AppRouter } from "./routing";
import { ErrorBoundary } from "./errors";

export default function App() {
  return (
    <ErrorBoundary>
      <AppRouter />
    </ErrorBoundary>
  );
}
