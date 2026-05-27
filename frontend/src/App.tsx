import { Outlet } from "react-router-dom";
import { NavBar } from "./components/NavBar";
import { Footer } from "./components/landing/Footer";

export function App() {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-cream)]">
      <NavBar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
