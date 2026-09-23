import { Routes, Route } from "react-router-dom";
import ProtectedLayout from "./components/ProtectedLayout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import EJMainview from "./pages/EJMainview";
import Anomalies from "./pages/Anomalies";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/ej-mainview" element={<EJMainview />} />
        <Route path="/anomalies" element={<Anomalies />} />
      </Route>
    </Routes>
  );
}
