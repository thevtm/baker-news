import React from "react";
import cslx from "clsx";

import { sprinkles } from "../sprinkles.css";
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

export interface PageLayoutProps {
  userName: string;
}

const PageLayout: React.FC<React.PropsWithChildren<PageLayoutProps>> = ({
  userName,
  children,
}) => {
  const current_year = new Date().getFullYear();

  return (
    <>
      <header className={cslx(container, header_style)}>
        <nav className={sprinkles({ display: "flex", paddingY: 1 })}>
          <div className={sprinkles({ display: "flex", flexGrow: 1 })}>
            <a
              className="mx-1 font-bold"
              href="/"
              hx-get="/"
              hx-target="main"
              hx-push-url="true"
            >
              🥖
            </a>

            <a
              className="mx-1 font-bold"
              href="/"
              hx-get="/"
              hx-target="main"
              hx-push-url="true"
            >
              Backer News
            </a>
          </div>

          {userName}
        </nav>
      </header>

      <main id="main">{children}</main>

      <footer className={cslx(container, footer_style)}>
        &copy; {current_year} Baker News Ltda.
      </footer>
    </>
  );
};

export default PageLayout;
