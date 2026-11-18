import { lazy, Suspense } from "react";
import App from "./App";

// Perfil público (dex-lab.vercel.app/u/<nome>) carrega à parte.
const PublicProfilePage = lazy(() => import("./components/public-profile"));
const profileHandle = window.location.pathname.match(/^\/u\/([^/]+)\/?$/)?.[1];
const AdminPage = lazy(() => import("./components/admin-page"));
const isAdminPage = /^\/admin\/?$/.test(window.location.pathname);

// Link de time compartilhado (/t?time=...): o servidor já mandou a prévia; o app abre no endereço normal.
if (window.location.pathname === "/t") {
  window.history.replaceState(window.history.state, "", `/${window.location.search}${window.location.hash}`);
}

export default function Root() {
  if (isAdminPage) {
    return (
      <Suspense fallback={null}>
        <AdminPage />
      </Suspense>
    );
  }
  if (!profileHandle) return <App />;
  return (
    <Suspense fallback={null}>
      <PublicProfilePage handle={decodeURIComponent(profileHandle).toLowerCase()} />
    </Suspense>
  );
}
