import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { usePageHeaderStore } from "@/store/usePageHeaderStore";
import { 
  ArrowLeft,
  Building2, 
  LayoutDashboard, 
  LogOut, 
  Package, 
  Settings, 
  ShoppingBag, 
  ShoppingCart, 
  Tags, 
  Users,
  Bell,
  Menu,
  X,
  Warehouse as WarehouseIcon,
  Zap,
  ChevronRight,
  FileText,
  BarChart3,
  Wallet
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function AdminLayout() {
  const { user, token, logout } = useAuthStore();
  const { title: headerTitle, subtitle: headerSubtitle, backTo, onBack, actions: headerActions } = usePageHeaderStore();
  const navigate = useNavigate();
  const location = useLocation();
  const isFastSalesPage = location.pathname === "/admin/fast-sales";
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // Persist last visited page and restore on mount
  useEffect(() => {
    // Don't redirect to /admin immediately - restore last visited page
    const lastVisited = sessionStorage.getItem("adminLastPath");
    if (lastVisited && lastVisited !== location.pathname && lastVisited !== "/admin") {
      // Let the component render first, then navigate to saved path after a tick
      const timer = setTimeout(() => {
        if (location.pathname === "/admin" && lastVisited !== "/admin") {
          navigate(lastVisited, { replace: true });
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, []);

  // Save current path on change (but not on initial render)
  const [initialized, setInitialized] = useState(false);
  useEffect(() => {
    if (!initialized) {
      setInitialized(true);
      return;
    }
    sessionStorage.setItem("adminLastPath", location.pathname);
  }, [location.pathname, initialized]);

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

  const fetchPendingOrdersCount = async () => {
    if (!token || user?.role === "SUPER_ADMIN") {
      setPendingOrdersCount(0);
      return;
    }
    try {
      const res = await fetch("/api/orders", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const orders = await res.json();
        const pendingCount = Array.isArray(orders)
          ? orders.filter((order: any) => order.status === "PENDING").length
          : 0;
        setPendingOrdersCount(pendingCount);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchNotifications();
    fetchPendingOrdersCount();
    const interval = setInterval(fetchNotifications, 30000); // refresh every 30s
    const ordersInterval = setInterval(fetchPendingOrdersCount, 30000);
    return () => {
      clearInterval(interval);
      clearInterval(ordersInterval);
    };
  }, [token, user?.role]);

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

  const openNotificationsPage = () => {
    setIsNotificationsOpen(false);
    navigate("/admin/notifications");
  };

  const handleLogout = () => {
    logout();
    navigate("/auth/login");
  };

  const baseLinks = [
    ...(user?.role === "SUPER_ADMIN" ? [
      { divider: "SÜPER ADMIN" },
      { to: "/admin/tenants", icon: Building2, label: "Firmalar / Tenantlar", showAlways: true },
      { to: "/admin/audit-logs", icon: FileText, label: "Audit Loglar", showAlways: true }
    ] : []),
    { divider: "GENEL" },
    { to: "/admin", icon: LayoutDashboard, label: "Panel", showAlways: true },
    { to: "/admin/products", icon: Package, label: "Ürün Yönetimi" },
    { to: "/admin/categories", icon: Tags, label: "Kategoriler" },
    { to: "/admin/catalogs", icon: ShoppingBag, label: "Kataloglar" },
    { divider: "SATIŞ & OPERASYON" },
    { to: "/admin/fast-sales", icon: Zap, label: "Hızlı Satış" },
    { to: "/admin/orders", icon: ShoppingCart, label: "Siparişler" },
    { to: "/admin/collections", icon: Wallet, label: "Tahsilatlar" },
    { to: "/admin/purchase-invoices", icon: FileText, label: "Alış Faturaları" },
    { to: "/admin/warehouse", icon: WarehouseIcon, label: "Depo" },
    { to: "/admin/customers", icon: Users, label: "Müşteriler" },
    { to: "/admin/reports", icon: BarChart3, label: "Raporlar" },
    ...(user?.role !== "SALES_USER" ? [
      { divider: "AYARLAR" },
      { to: "/admin/users", icon: Users, label: "Kullanıcılar" },
      { to: "/admin/settings", icon: Settings, label: "Firma Ayarları" },
      { to: "/admin/notifications", icon: Bell, label: "Bildirimler", showAlways: true },
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

  // Bottom nav links for mobile
  const bottomNavLinks = navLinks
    .filter((link: any) => !link.divider && link.to)
    .slice(0, 5);

  const getPageTitle = () => {
    if (headerTitle) return headerTitle;
    const currentLink = navLinks.find((link: any) => link.to === location.pathname);
    if (currentLink && 'label' in currentLink) return currentLink.label;
    if (location.pathname.includes("/products/")) return "Ürün Detayı";
    if (location.pathname.includes("/orders/")) return "Sipariş Detayı";
    if (location.pathname.includes("/customers/")) return "Müşteri Detayı";
    if (location.pathname.includes("/catalogs/")) return "Katalog Detayı";
    return user?.role === "SUPER_ADMIN" ? "Platform" : user?.tenant?.name || "Panel";
  };

  return (
    <div className="flex bg-background font-sans text-foreground overflow-hidden h-[100dvh] w-full">
      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={cn(
        "no-print",
        "bg-[var(--sidebar)] flex flex-col shrink-0 transition-all duration-300 relative z-50 overflow-visible",
        "fixed inset-y-0 left-0 transform lg:static lg:translate-x-0 h-full",
        mobileMenuOpen ? "translate-x-0 w-72" : "-translate-x-full lg:w-64",
        !mobileMenuOpen && collapsed && "lg:w-[72px]"
      )}>
        <div className="pointer-events-none absolute inset-0 z-0 sidebar-wave-base">
          <div className="sidebar-wave-layer sidebar-wave-layer-white" />
          <div className="sidebar-wave-layer sidebar-wave-layer-turquoise" />
        </div>

        <div className="lg:hidden absolute top-4 right-4 text-sidebar-foreground z-10">
          <button onClick={() => setMobileMenuOpen(false)} className="p-2 hover:bg-sidebar-accent rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Logo */}
        <div className={cn("px-4 flex items-center border-b border-sidebar-border shrink-0 h-[74px] bg-card relative z-10", collapsed && "lg:px-3 lg:justify-center")}>
          <Link to="/admin" className="flex items-center justify-start w-full min-w-0 gap-1.5">
            <img src="/satsatma-logo.png" alt="SatSatma S Logo" className="h-12 w-12 object-contain shrink-0" />
            {(!collapsed || mobileMenuOpen) && (
              <img src="/logo-265-60.png" alt="SatSatma Logo" className="h-11 w-auto max-w-full object-contain min-w-0" />
            )}
          </Link>
          {!mobileMenuOpen && (
            <button
              type="button"
              onClick={() => setCollapsed((value) => !value)}
              className="hidden lg:inline-flex absolute -right-3 top-[84px] h-9 w-7 items-center justify-center rounded-r-md bg-[var(--sidebar)] text-sidebar-foreground cursor-pointer z-[70]"
              aria-label={collapsed ? "Menüyü aç" : "Menüyü kapat"}
              title={collapsed ? "Menüyü aç" : "Menüyü kapat"}
            >
              <Menu className="w-3.5 h-3.5 text-white/90" />
            </button>
          )}
        </div>
        
        <nav className="flex-1 overflow-y-auto w-full overflow-x-hidden custom-scrollbar sidebar-scroll-left relative z-10">
          <div className="px-3 py-4 space-y-0.5 sidebar-scroll-content">
          {navLinks.map((link, idx) => {
            if (link.divider) {
              return (
                <div key={`div-${idx}`} className={cn("pt-5 mb-2", (!collapsed || mobileMenuOpen) && "px-2")}>
                  {(!collapsed || mobileMenuOpen) && <div className="text-[10px] font-semibold text-white/70 uppercase tracking-[0.12em]">{link.divider}</div>}
                  {(collapsed && !mobileMenuOpen) && <div className="border-t border-sidebar-border/30 mx-1"></div>}
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
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 touch-target",
                  isActive 
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md shadow-sidebar-primary/20" 
                    : "text-white hover:bg-sidebar-accent hover:text-white"
                )}
              >
                <Icon className="w-[18px] h-[18px] shrink-0" />
                {(!collapsed || mobileMenuOpen) && <span className="text-sm font-medium truncate">{link.label}</span>}
                {link.to === "/admin/orders" && pendingOrdersCount > 0 && (!collapsed || mobileMenuOpen) && (
                  <span className="ml-auto bg-destructive text-white text-[10px] px-2 py-0.5 rounded-full shrink-0 font-semibold pulse-dot">
                    {pendingOrdersCount}
                  </span>
                )}
              </Link>
            )
          })}
          </div>
        </nav>

        <div className="p-3 border-t border-sidebar-border shrink-0 flex flex-col gap-3 relative z-10">
          <div className={cn("flex items-center gap-3", (!collapsed || mobileMenuOpen) && "px-2")}>
            <div className="flex-shrink-0 w-9 h-9 rounded-full brand-gradient flex items-center justify-center text-white font-bold text-xs uppercase shrink-0 shadow-sm">
              {user?.name?.slice(0, 2) || "SS"}
            </div>
            {(!collapsed || mobileMenuOpen) && (
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-sm text-white font-medium truncate">{user?.name || "Kullanıcı"}</span>
                <span className="text-[11px] text-white/70 truncate">{user?.role === "SUPER_ADMIN" ? "Super Admin" : user?.role === "TENANT_ADMIN" ? "Yönetici" : "Satış Temsilcisi"}</span>
              </div>
            )}
          </div>
          <button 
            title="Çıkış Yap"
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 w-full py-2.5 bg-sidebar-accent text-white hover:text-white hover:bg-destructive/20 rounded-lg text-sm transition-all touch-target"
          >
            <LogOut className="w-4 h-4 shrink-0" /> 
            {(!collapsed || mobileMenuOpen) && <span className="font-medium">Çıkış Yap</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-[100dvh] overflow-hidden bg-card">
        {/* Header */}
        <header className="no-print h-14 md:h-16 bg-card border-b border-border px-4 md:px-6 flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-3 truncate">
            <button 
              className="lg:hidden p-2 -ml-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors touch-target"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>
            {(backTo || onBack) && (
              <button
                type="button"
                aria-label="Geri"
                onClick={() => onBack ? onBack() : backTo && navigate(backTo)}
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors touch-target"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <h2 className="text-base md:text-lg font-bold text-foreground truncate leading-tight">
                {getPageTitle()}
              </h2>
              <p className="text-[11px] text-muted-foreground hidden sm:block">
                {headerSubtitle ?? (user?.tenant?.name || "Platform Yönetimi")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 md:gap-2 shrink-0">
            {headerActions.map((action) => {
              const className = cn(
                "relative p-2.5 rounded-lg transition-colors touch-target",
                action.variant === "destructive"
                  ? "text-destructive hover:bg-destructive/10"
                  : action.variant === "secondary"
                    ? "text-secondary hover:bg-secondary/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent",
                action.disabled && "pointer-events-none opacity-50"
              );
              const content = (
                <>
                  {action.icon}
                  <span className="sr-only">{action.label}</span>
                </>
              );

              if (action.to) {
                return (
                  <Link key={action.key} to={action.to} aria-label={action.label} title={action.label} className={className}>
                    {content}
                  </Link>
                );
              }

              return (
                <button key={action.key} type="button" aria-label={action.label} title={action.label} onClick={action.onClick} className={className}>
                  {content}
                </button>
              );
            })}
            <button 
               onClick={() => setIsNotificationsOpen(true)}
               aria-label="Bildirimler"
               title="Bildirimler"
               className={cn(
                 "relative p-2.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors touch-target",
                 isFastSalesPage && "hidden md:inline-flex"
               )}
            >
               <Bell className="w-5 h-5" />
               {unreadCount > 0 && (
                 <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-white pulse-dot">
                   {unreadCount}
                 </span>
               )}
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-0 md:p-6 pb-24 lg:pb-6 bg-card">
          <div className="flex min-h-full flex-col">
            <div className="flex-1">
              <Outlet />
            </div>
            <div className="no-print mt-auto pt-8 pb-2 mb-16 lg:mb-0 flex justify-center">
              <div className="h-11 rounded-full border border-border bg-card/95 px-4 shadow-sm w-[calc(100%-1.5rem)] lg:w-1/2 flex items-center justify-center">
                <p className="text-xs text-muted-foreground/60 truncate">
                  <span className="text-[#1f45d6] font-semibold">Sat</span>
                  <span className="text-[#1bcabf] font-semibold">Sat</span>
                  <span className="text-[#1f45d6] font-semibold">ma</span>
                  <span className="text-muted-foreground/60">.com tarafından hazırlanmıştır</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="no-print lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border safe-bottom shadow-[0_-2px_12px_-2px_rgba(0,0,0,0.08)]">
        <div className="flex items-center justify-around h-16 px-1">
          {bottomNavLinks.map((link: any) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 flex-1 py-1 rounded-lg transition-colors touch-target relative",
                  isActive 
                    ? "text-secondary" 
                    : "text-muted-foreground"
                )}
              >
                {isActive && (
                  <div className="absolute -top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-secondary" />
                )}
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium leading-none">{link.label?.split(" ")[0]}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <Dialog open={isNotificationsOpen} onOpenChange={setIsNotificationsOpen}>
        <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Bildirimler</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            {notifications.length === 0 ? (
              <div className="text-center py-10">
                <Bell className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Bildiriminiz bulunmuyor.</p>
              </div>
            ) : (
              notifications.map((n: any) => (
                <div key={n.id} className={cn(
                  "p-3.5 rounded-xl border text-sm flex justify-between gap-3 items-start cursor-pointer transition-all card-hover",
                  !n.isRead ? "bg-secondary/5 border-secondary/20" : "bg-card border-border"
                )} onClick={() => markAsRead(n.id)}>
                  <div className="min-w-0">
                    <p className={cn("font-medium leading-snug", !n.isRead ? "text-foreground" : "text-muted-foreground")}>{n.message}</p>
                    <p className="text-xs text-muted-foreground/60 mt-1.5">{new Date(n.createdAt).toLocaleString("tr-TR")}</p>
                  </div>
                  {!n.isRead && (
                    <div className="w-2.5 h-2.5 rounded-full bg-secondary shrink-0 mt-1 pulse-dot" />
                  )}
                </div>
              ))
            )}
          </div>
          <div className="border-t border-border pt-3 mt-3">
            <button
              type="button"
              onClick={openNotificationsPage}
              className="w-full h-11 rounded-lg bg-secondary/10 text-secondary hover:bg-secondary/15 text-sm font-semibold transition-colors touch-target"
            >
              Tümünü Gör
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
