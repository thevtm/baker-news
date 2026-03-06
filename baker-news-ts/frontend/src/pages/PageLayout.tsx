import React, { Suspense } from "react";
import cslx from "clsx";

import { useUser, useUserStore } from "../hooks";
import { useAPIClient } from "../hooks";

import { sprinkles } from "../css/sprinkles.css";
import { container } from "../css/styles.css";
import { userReset } from "../state/user-store";

// container mx-auto bg-orange-800 text-gray-200
const header_style = sprinkles({
  marginX: "auto",
  background: "orange-800",
  color: "gray-200",
});

const footer_style = sprinkles({
  display: "flex",
  justifyContent: "center",

  marginX: "auto",
  padding: 1,

  background: "orange-200",
});

function Username() {
  // It was necessary to extract this component for suspense to work
  const user_store = useUserStore();
  const api_client = useAPIClient();
  const user = useUser();

  const reset_user = () => userReset(user_store, api_client);

  return (
    <span className={sprinkles({ marginX: 1 })} onClick={() => reset_user()}>
      {user.username}
    </span>
  );
}

export type PageLayoutProps = React.PropsWithChildren<object>;

const PageLayout: React.FC<PageLayoutProps> = ({ children }) => {
  const current_year = new Date().getFullYear();

  return (
    <>
      <header className={cslx(container, header_style)}>
        <nav className={sprinkles({ display: "flex", paddingY: 1 })}>
          <div className={sprinkles({ display: "flex", flexGrow: 1 })}>
            <a
              className={sprinkles({ marginX: 1, fontWeight: "bold", textDecoration: "none" })}
              href="/"
              hx-get="/"
              hx-target="main"
              hx-push-url="true"
            >
              🥖
            </a>

            <a
              className={sprinkles({ marginX: 1, fontWeight: "bold", textDecoration: "none", color: "white" })}
              href="/"
              hx-get="/"
              hx-target="main"
              hx-push-url="true"
            >
              Backer News
            </a>
          </div>

          <Suspense fallback={<span>Loading...</span>}>
            <Username />
          </Suspense>
        </nav>
      </header>

      <main id="main">{children}</main>

      <footer className={cslx(container, footer_style)}>&copy; {current_year} Baker News Ltda.</footer>
    </>
  );
};

export default PageLayout;
