// One shared QueryClient for the whole app. main.tsx wraps the routed app in
// a QueryClientProvider using this instance; screens that fetch with
// react-query also wrap their own output with it so they work standalone in
// tests and previews that render a screen without going through main.tsx.
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});
