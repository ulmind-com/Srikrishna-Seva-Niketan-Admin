import { AppProviders } from "@/providers/AppProviders";
import { AppRoutes } from "@/routes";

export default function App() {
  return (
    <AppProviders>
      <AppRoutes />
    </AppProviders>
  );
}
