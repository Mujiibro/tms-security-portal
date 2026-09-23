import { Navigate, Outlet } from "react-router-dom";
import { isAuthenticated } from "../auth";
import Sidebar from "./Sidebar";

export default function ProtectedLayout() {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
