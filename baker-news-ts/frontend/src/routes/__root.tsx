import { Outlet, createRootRoute } from "@tanstack/react-router";
import PageLayout from "../pages/PageLayout";

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  return (
    <PageLayout>
      <Outlet />
    </PageLayout>
  );
}
