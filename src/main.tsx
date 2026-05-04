import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

function UnsupportedWebShell() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
      <section className="w-full max-w-xl rounded-[2rem] border border-border/70 bg-card/90 p-10 text-center shadow-[0_30px_80px_-40px_rgba(15,23,42,0.45)]">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-primary">
          oneday desktop
        </p>
        <h1 className="mt-4 font-display text-4xl leading-tight">
          oneday 现在只支持 Electron 桌面版
        </h1>
        <p className="mt-4 text-sm leading-7 text-muted-foreground">
          请通过 <code>npm run dev</code> 或打包后的桌面应用启动，不再提供浏览器模式。
        </p>
      </section>
    </main>
  );
}

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element #root was not found.");
}

createRoot(rootElement).render(
  <StrictMode>
    {window.onedayDesktop ? <App /> : <UnsupportedWebShell />}
  </StrictMode>,
);
