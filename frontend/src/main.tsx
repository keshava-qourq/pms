import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";

import App from "@/App";
import { queryClient } from "@/lib/queryClient";
import "@/index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {/* `BASE_URL` is Vite's own build-time constant, reflecting whatever `base`
        the build was run with (e.g. a live preview served behind
        `/preview/{run_id}/*`, not the app's normal root) -- "/" the rest of the
        time, so this is a no-op for a plain `npm run dev`/`build` and any
        already-deployed app. */}
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
