import { Outlet } from "react-router-dom";

export function ProtectedRoute({ allowedRoles }: { allowedRoles?: string[] }) {
  // Geçici olarak giriş kontrolleri kaldırıldı.
  // Geliştirme aşamasında doğrudan Outlet'i döndürüyoruz.
  return <Outlet />;
}
