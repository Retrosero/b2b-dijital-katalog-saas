import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { useCustomerAuthStore } from "@/store/useCustomerAuthStore";
import { ProtectedRoute } from "@/components/ProtectedRoute";

import Login from "./pages/auth/Login";
import AdminLayout from "./components/layouts/AdminLayout";
import Dashboard from "./pages/admin/Dashboard";
import Tenants from "./pages/admin/Tenants";
import Products from "./pages/admin/Products";
import Catalogs from "./pages/admin/Catalogs";
import CatalogDetail from "./pages/admin/CatalogDetail";
import Categories from "./pages/admin/Categories";
import Orders from "./pages/admin/Orders";
import OrderDetail from "./pages/admin/OrderDetail";
import Customers from "./pages/admin/Customers";
import CustomerDetail from "./pages/admin/CustomerDetail";
import Users from "./pages/admin/Users";
import Settings from "./pages/admin/Settings";
import ProductDetail from "./pages/admin/ProductDetail";
import ProductForm from "./pages/admin/ProductForm";
import Warehouse from "./pages/admin/Warehouse";
import FastSales from "./pages/admin/FastSales";
import CustomerForm from "./pages/admin/CustomerForm";
import Notifications from "./pages/admin/Notifications";
import AuditLogs from "./pages/admin/AuditLogs";

import CatalogView from "./pages/public/CatalogView";
import CustomerLogin from "./pages/public/CustomerLogin";
import CustomerPortal from "./pages/public/CustomerPortal";

export default function App() {
  const { initAuth } = useAuthStore();
  const { initAuth: initCustomerAuth } = useCustomerAuthStore();

  useEffect(() => {
    initAuth();
    initCustomerAuth();
  }, [initAuth, initCustomerAuth]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth/login" element={<Login />} />

        <Route element={<ProtectedRoute allowedRoles={["SUPER_ADMIN", "TENANT_ADMIN", "SALES_USER"]} />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="tenants" element={<Tenants />} />
            <Route path="products" element={<Products />} />
            <Route path="products/new" element={<ProductForm />} />
            <Route path="products/edit/:id" element={<ProductForm />} />
            <Route path="products/:id" element={<ProductDetail />} />
            <Route path="catalogs" element={<Catalogs />} />
            <Route path="catalogs/:id" element={<CatalogDetail />} />
            <Route path="categories" element={<Categories />} />
            <Route path="orders" element={<Orders />} />
            <Route path="orders/:id" element={<OrderDetail />} />
            <Route path="customers" element={<Customers />} />
            <Route path="customers/new" element={<CustomerForm />} />
            <Route path="customers/edit/:id" element={<CustomerForm />} />
            <Route path="customers/:id" element={<CustomerDetail />} />
            <Route path="users" element={<Users />} />
            <Route path="settings" element={<Settings />} />
            <Route path="warehouse" element={<Warehouse />} />
            <Route path="fast-sales" element={<FastSales />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="audit-logs" element={<AuditLogs />} />
          </Route>
        </Route>

        <Route path="/c/:slug" element={<CatalogView />} />
        <Route path="/musteri-girisi" element={<CustomerLogin />} />
        <Route path="/musteri/portal" element={<CustomerPortal />} />
        
        <Route path="/" element={<Navigate to="/admin" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
