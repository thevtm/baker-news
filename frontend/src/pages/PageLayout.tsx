import React from "react";
import cslx from "clsx";
import { useSnapshot } from "valtio";

import { sprinkles } from "../sprinkles.css";
import { useStore } from "../contexts/store";

import { container } from "../styles.css";

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

export type PageLayoutProps = void;

const PageLayout: React.FC<React.PropsWithChildren<PageLayoutProps>> = ({ children }) => {
  const store = useStore();
  const store_snap = useSnapshot(store);

  const username = store_snap.user?.username ?? "Loading...";

  const current_year = new Date().getFullYear();

  return (
    <>
      <header className={cslx(container, header_style)}>
        <nav className={sprinkles({ display: "flex", paddingY: 1 })}>
          <div className={sprinkles({ display: "flex", flexGrow: 1 })}>
            <a className="mx-1 font-bold" href="/" hx-get="/" hx-target="main" hx-push-url="true">
              🥖
            </a>

            <a className="mx-1 font-bold" href="/" hx-get="/" hx-target="main" hx-push-url="true">
              Backer News
            </a>
          </div>

          {username}
        </nav>
      </header>

      <main id="main">{children}</main>

      <footer className={cslx(container, footer_style)}>&copy; {current_year} Baker News Ltda.</footer>
    </>
  );
};

export default PageLayout;
