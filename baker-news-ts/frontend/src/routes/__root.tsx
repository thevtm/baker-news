import { Outlet, createRootRoute } from "@tanstack/react-router";
import PageLayout from "../pages/PageLayout";
import { useUser } from "../queries";

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  const user = useUser();

  return (
    <PageLayout user={user!}>
      <Outlet />
    </PageLayout>
  );
}
