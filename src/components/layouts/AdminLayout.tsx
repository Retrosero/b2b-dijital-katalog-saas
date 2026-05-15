import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { 
  Building2, 
  LayoutDashboard, 
  LogOut, 
  Package, 
  Settings, 
  ShoppingBag, 
  ShoppingCart, 
  Tags, 
  Users,
  PanelLeftClose,
  PanelLeftOpen,
  Bell,
  Menu,
  X,
  Warehouse as WarehouseIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function AdminLayout() {
  const { user, token, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const fetchNotifications = async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/notifications", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch(e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, [token]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const markAsRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}/read`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchNotifications();
    } catch(e) {
       console.error("Failed to mark read");
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/auth/login");
  };

  const baseLinks = [
    ...(user?.role === "SUPER_ADMIN" ? [
      { divider: "SÜPER ADMİN" },
      { to: "/admin/tenants", icon: Building2, label: "Firmalar / Tenantlar", showAlways: true }
    ] : []),
    { divider: "GENEL" },
    { to: "/admin", icon: LayoutDashboard, label: "Panel (Özet)", showAlways: true },
    { to: "/admin/products", icon: Package, label: "Ürün Yönetimi" },
    { to: "/admin/categories", icon: Tags, label: "Kategoriler" },
    { to: "/admin/catalogs", icon: ShoppingBag, label: "Kataloglar" },
    { divider: "SATIŞ & OPERASYON" },
    { to: "/admin/fast-sales", icon: ShoppingCart, label: "Hızlı Satış" },
    { to: "/admin/orders", icon: ShoppingCart, label: "Siparişler", badge: "Yeni" },
    { to: "/admin/warehouse", icon: WarehouseIcon, label: "Depo" },
    { to: "/admin/customers", icon: Users, label: "Müşteriler" },
    ...(user?.role !== "SALES_USER" ? [
      { divider: "AYARLAR" },
      { to: "/admin/users", icon: Users, label: "Kullanıcılar" },
      { to: "/admin/settings", icon: Settings, label: "Firma Ayarları" },
    ] : [])
  ];

  let allowedPagesArr: string[] | null = null;
  if (user?.allowedPages) {
     try { allowedPagesArr = JSON.parse(user.allowedPages); } catch(e){}
  }

  const navLinks = baseLinks.filter((link: any) => {
    if (link.showAlways || link.divider) return true;
    if (allowedPagesArr && !allowedPagesArr.includes(link.to)) return false;
    return true;
  });

  return (
    <div className="flex bg-slate-50 font-sans text-slate-900 overflow-hidden h-[100dvh] w-full">
      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={cn(
        "bg-slate-900 flex flex-col shrink-0 transition-all duration-300 relative z-50",
        "fixed inset-y-0 left-0 transform lg:static lg:translate-x-0 h-full",
        mobileMenuOpen ? "translate-x-0 w-64" : "-translate-x-full lg:w-64",
        !mobileMenuOpen && collapsed && "lg:w-20"
      )}>
        <button 
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex absolute -right-3 top-6 bg-white border shadow items-center justify-center w-6 h-6 rounded-full text-slate-600 hover:text-slate-900 z-10"
        >
          {collapsed ? <PanelLeftOpen className="w-3 h-3" /> : <PanelLeftClose className="w-3 h-3" />}
        </button>
        
        <div className="lg:hidden absolute top-4 right-4 text-white">
          <button onClick={() => setMobileMenuOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className={cn("p-6 flex items-center gap-3 border-b border-slate-800 shrink-0 h-20", collapsed && "lg:px-4 lg:justify-center")}>
          <div className="w-8 h-8 flex-shrink-0 bg-indigo-500 rounded flex items-center justify-center shrink-0">
            <span className="font-bold text-white text-lg">K</span>
          </div>
          {(!collapsed || mobileMenuOpen) && <span className="text-white font-bold text-lg tracking-tight truncate">KatalogSaaS</span>}
        </div>
        
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto w-full overflow-x-hidden">
          {navLinks.map((link, idx) => {
            if (link.divider) {
              return (
                <div key={`div-${idx}`} className={cn("pt-4 mb-2", (!collapsed || mobileMenuOpen) && "px-2")}>
                  {(!collapsed || mobileMenuOpen) && <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{link.divider}</div>}
                </div>
              );
            }
            
            const Icon = link.icon!;
            const isActive = location.pathname === link.to;

            return (
              <Link 
                key={link.to}
                title={link.label} 
                to={link.to!} 
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md transition-colors",
                  isActive ? "bg-indigo-600 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {(!collapsed || mobileMenuOpen) && <span className="text-sm font-medium truncate">{link.label}</span>}
                {link.badge && (!collapsed || mobileMenuOpen) && <span className="ml-auto bg-rose-500 text-white text-[10px] px-1.5 py-0.5 rounded-full shrink-0">{link.badge}</span>}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-slate-800 shrink-0 flex flex-col gap-4">
          <div className={cn("flex items-center gap-3", (!collapsed || mobileMenuOpen) && "px-2")}>
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs uppercase shrink-0">
              {user?.name?.slice(0, 2) || "TK"}
            </div>
            {(!collapsed || mobileMenuOpen) && (
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-sm text-white font-medium truncate">{user?.name || "Kullanıcı"}</span>
                <span className="text-[10px] text-slate-500 truncate">{user?.role === "SUPER_ADMIN" ? "Super Admin" : "Tenant Admin"}</span>
              </div>
            )}
          </div>
          <button 
            title="Çıkış Yap"
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 w-full py-2 bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 rounded-md text-sm transition-colors"
          >
            <LogOut className="w-4 h-4 shrink-0" /> 
            {(!collapsed || mobileMenuOpen) && <span>Çıkış Yap</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-[100dvh] overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 px-4 md:px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 md:gap-4 truncate">
            <button 
              className="lg:hidden p-2 -ml-2 text-slate-600 hover:text-slate-900"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="text-lg md:text-xl font-semibold text-slate-800 truncate">
              {user?.role === "SUPER_ADMIN" ? "Platform" : user?.tenant?.name || "Panel"}
            </h2>
          </div>
          <div className="flex items-center gap-2 md:gap-4 shrink-0">
            <button 
               onClick={() => setIsNotificationsOpen(true)}
               className="relative p-2 text-slate-500 hover:text-slate-700 transition-colors"
            >
               <Bell className="w-5 h-5" />
               {unreadCount > 0 && (
                 <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white">
                   {unreadCount}
                 </span>
               )}
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 md:p-8">
          <Outlet />
        </div>
      </main>

      <Dialog open={isNotificationsOpen} onOpenChange={setIsNotificationsOpen}>
        <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bildirimler</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            {notifications.length === 0 ? (
              <p className="text-center text-sm text-slate-500">Bildiriminiz bulunmuyor.</p>
            ) : (
              notifications.map((n: any) => (
                <div key={n.id} className={cn("p-3 rounded-lg border text-sm flex justify-between gap-3 items-start cursor-pointer transition-colors", !n.isRead ? "bg-indigo-50 border-indigo-100" : "bg-white border-slate-100")} onClick={() => markAsRead(n.id)}>
                  <div>
                    <p className={cn("font-medium", !n.isRead ? "text-indigo-900" : "text-slate-700")}>{n.message}</p>
                    <p className="text-xs text-slate-400 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                  </div>
                  {!n.isRead && (
                    <div className="w-2 h-2 rounded-full bg-indigo-500 shrink-0 mt-1.5" />
                  )}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
