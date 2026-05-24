import { createRoot } from "react-dom/client";
import { setBaseUrl } from "@workspace/api-client-react";
import App from "./App";
import "./index.css";
import { installGlobalErrorHandlers } from "./lib/errorReporter";
import { ErrorBoundary } from "./components/error-boundary";

setBaseUrl("/ba7r-api");
installGlobalErrorHandlers();

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
