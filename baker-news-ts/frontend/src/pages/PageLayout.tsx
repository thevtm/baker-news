import clsx from "clsx";
import React, { Suspense } from "react";
import { Link } from "@tanstack/react-router";

import { useUser, useUserStore, useAPIClient } from "../hooks";

import { sprinkles } from "../css/sprinkles.css";
import { container } from "../css/styles.css";
import { userReset } from "../state/user-store";

// container mx-auto bg-orange-800 text-gray-200
const header_style = sprinkles({
  background: "orange-800",
  color: "gray-200",
});

const main_style = sprinkles({
  minHeight: "32rem",

  display: "flex",
  flexDirection: "column",
});

const footer_style = sprinkles({
  display: "flex",
  justifyContent: "center",

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
      <header className={clsx(container, header_style)}>
        <nav className={sprinkles({ display: "flex", paddingY: 1 })}>
          <div className={sprinkles({ display: "flex", flexGrow: 1 })}>
            <Link className={sprinkles({ marginX: 1, fontWeight: "bold", textDecoration: "none" })} to="/">
              🥖
            </Link>

            <Link
              className={sprinkles({ marginX: 1, fontWeight: "bold", textDecoration: "none", color: "white" })}
              to="/"
            >
              Backer News
            </Link>
          </div>

          <Suspense fallback={<span>Loading...</span>}>
            <Username />
          </Suspense>
        </nav>
      </header>

      <main id="main" className={clsx(container, main_style)}>
        {children}
      </main>

      <footer className={clsx(container, footer_style)}>&copy; {current_year} Baker News Ltda.</footer>
    </>
  );
};

export default PageLayout;
