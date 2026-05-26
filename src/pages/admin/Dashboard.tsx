import { useEffect, useMemo, useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { ShoppingCart, ShoppingBag, DollarSign, ArrowRight, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";

const PLAN_LIMITS: Record<string, { products: number; catalogs: number; customers: number }> = {
  Starter: { products: 250, catalogs: 10, customers: 100 },
  Premium: { products: 1000, catalogs: 100, customers: 10000 },
  Pro: { products: 2500, catalogs: 250, customers: 25000 },
  Enterprise: { products: 10000, catalogs: 1000, customers: 100000 },
};

const getTenantLimits = (planName?: string | null) => {
  return PLAN_LIMITS[planName || "Starter"] || PLAN_LIMITS["Starter"];
};

const statusMap: Record<string, { label: string; className: string }> = {
  PENDING: { label: "Beklemede", className: "status-pending" },
  APPROVED: { label: "Onaylandı", className: "status-approved" },
  PROCESSING: { label: "Hazırlanıyor", className: "status-processing" },
  READY_FOR_SHIPMENT: { label: "Sevkiyata Hazır", className: "status-ready" },
  SHIPPED: { label: "Sevk Edildi", className: "status-shipped" },
  COMPLETED: { label: "Tamamlandı", className: "status-completed" },
  CANCELLED: { label: "İptal", className: "status-cancelled" },
};

export default function Dashboard() {
  const { user, token } = useAuthStore();
  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const limits = useMemo(() => getTenantLimits(user?.tenant?.planName), [user?.tenant?.planName]);
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [catalogs, setCatalogs] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);

  useEffect(() => {
    if (!token || isSuperAdmin) return;
    const headers = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch("/api/orders", { headers }),
      fetch("/api/products", { headers }),
      fetch("/api/catalogs", { headers }),
      fetch("/api/customers", { headers }),
    ])
      .then(async ([o, p, c, cu]) => {
        if (o.ok) setOrders(await o.json());
        if (p.ok) setProducts(await p.json());
        if (c.ok) setCatalogs(await c.json());
        if (cu.ok) setCustomers(await cu.json());
      })
      .catch(() => {});
  }, [token, isSuperAdmin]);

  const pendingOrders = useMemo(() => orders.filter((o) => o.status === "PENDING").length, [orders]);
  const approvedOrders = useMemo(() => orders.filter((o) => o.status === "APPROVED").length, [orders]);
  const processingOrders = useMemo(() => orders.filter((o) => o.status === "PROCESSING").length, [orders]);
  const todayOrders = useMemo(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const day = today.getDate();

    return orders.filter((o) => {
      const createdAt = new Date(o.createdAt);
      return createdAt.getFullYear() === year && createdAt.getMonth() === month && createdAt.getDate() === day;
    }).length;
  }, [orders]);

  const todayRevenue = useMemo(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const day = today.getDate();

    return orders.reduce((sum, o) => {
      const createdAt = new Date(o.createdAt);
      const isToday = createdAt.getFullYear() === year && createdAt.getMonth() === month && createdAt.getDate() === day;
      return isToday ? sum + (Number(o.totalAmount) || 0) : sum;
    }, 0);
  }, [orders]);
  const recentOrders = useMemo(() => orders.slice(0, 6), [orders]);
  const topCatalog = catalogs[0];

  const stats = [
    { label: "Sipariş", value: String(todayOrders), icon: ShoppingCart },
    { label: "Bekleyen Siparişler", value: String(pendingOrders + approvedOrders + processingOrders), icon: AlertTriangle, type: "pending" },
    { label: "Aktif Kataloglar", value: String(catalogs.length), icon: ShoppingBag },
    { label: "Ciro", value: `₺${todayRevenue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: DollarSign },
  ];

  if (isSuperAdmin) {
    return <div className="p-4 text-center text-muted-foreground">Super Admin için bu panelde özet veri gösterilmez.</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div
              key={idx}
              className="relative overflow-hidden rounded-2xl border border-cyan-100 bg-gradient-to-br from-white via-cyan-50/35 to-blue-50/35 p-4 md:p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-cyan-200/20" />
              <div className="pointer-events-none absolute -bottom-10 -left-10 h-24 w-24 rounded-full bg-blue-200/20" />
              <div className="relative flex items-start justify-between mb-3">
                <div className="text-slate-500 text-[11px] md:text-xs font-semibold uppercase tracking-[0.12em]">{stat.label}</div>
                <div className="h-9 w-9 rounded-xl bg-white/90 border border-cyan-100 flex items-center justify-center shrink-0 shadow-sm">
                  <Icon className="w-4 h-4 text-cyan-700" />
                </div>
              </div>
              <div className="relative text-2xl md:text-[2rem] leading-none font-extrabold text-slate-900 tracking-tight">{stat.value}</div>
              {stat.type === "pending" ? (
                <div className="relative mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] md:text-[11px] text-slate-500 font-normal leading-none">
                  <span>Yeni: <span className="font-medium text-slate-800">{pendingOrders}</span></span>
                  <span>Onaylanan: <span className="font-medium text-slate-800">{approvedOrders}</span></span>
                  <span>Hazırlanan: <span className="font-medium text-slate-800">{processingOrders}</span></span>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-3 grid-cols-1 gap-4 md:gap-6 items-start">
        <div className="col-span-1 lg:col-span-2 bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="p-4 md:p-5 border-b border-border flex items-center justify-between">
            <h3 className="font-bold text-foreground">Son Siparişler</h3>
            <Link to="/admin/orders" className="text-secondary text-xs font-semibold hover:underline flex items-center gap-1">
              Tümünü Gör <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="md:hidden divide-y divide-border">
            {recentOrders.map((order) => {
              const st = statusMap[order.status] || { label: order.status, className: "status-pending" };
              return (
                <div key={order.id} className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold text-sm text-foreground">{order.customer?.name || "-"}</div>
                      <div className="text-xs text-muted-foreground">{order.orderNumber}</div>
                    </div>
                    <span className={`status-badge ${st.className}`}>{st.label}</span>
                  </div>
                  <div className="text-sm font-bold text-foreground">₺{Number(order.totalAmount || 0).toFixed(2)}</div>
                </div>
              );
            })}
          </div>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-muted/30 border-b border-border">
                <tr>
                  <th className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Müşteri</th>
                  <th className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sipariş No</th>
                  <th className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tarih</th>
                  <th className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tutar</th>
                  <th className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Durum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentOrders.map((order) => {
                  const st = statusMap[order.status] || { label: order.status, className: "status-pending" };
                  return (
                    <tr key={order.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-5 py-3.5 text-sm font-medium text-foreground">{order.customer?.name || "-"}</td>
                      <td className="px-5 py-3.5 text-sm text-muted-foreground">{order.orderNumber}</td>
                      <td className="px-5 py-3.5 text-sm text-muted-foreground">{new Date(order.createdAt).toLocaleString("tr-TR")}</td>
                      <td className="px-5 py-3.5 text-sm font-semibold">₺{Number(order.totalAmount || 0).toFixed(2)}</td>
                      <td className="px-5 py-3.5 text-right">
                        <span className={`status-badge ${st.className}`}>{st.label}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-sky-100 rounded-xl p-5 text-sky-900 shadow-sm overflow-hidden relative border border-sky-200">
            <h4 className="font-bold mb-2 relative z-10">Hızlı Katalog Paylaşımı</h4>
            <p className="text-sky-800/80 text-xs mb-4 relative z-10 leading-relaxed">Katalog linkinizi hızlıca kopyalayın.</p>
            <div className="flex gap-2 mb-4 relative z-10">
              <input
                type="text"
                readOnly
                value={topCatalog ? `${window.location.origin}/c/${topCatalog.slug}` : "-"}
                className="flex-1 min-w-0 bg-white/70 border border-sky-300 text-xs p-2.5 rounded-lg text-sky-900"
              />
            </div>
            <Link to="/admin/catalogs" className="w-full py-2.5 bg-white/80 rounded-lg font-medium text-sm hover:bg-white transition-colors block text-center relative z-10">
              Katalog Ayarlarını Yönet
            </Link>
          </div>

          <div className="bg-card rounded-xl border border-border shadow-sm p-5">
            <h4 className="font-bold text-foreground mb-4">Sistem Limitleri</h4>
            <div className="space-y-4">
              {[
                { label: "Ürün Sayısı", current: products.length, max: limits.products, color: "bg-secondary" },
                { label: "Aktif Kataloglar", current: catalogs.length, max: limits.catalogs, color: "bg-chart-3" },
                { label: "Müşteriler", current: customers.length, max: limits.customers, color: "bg-secondary" },
              ].map((item, idx) => (
                <div key={idx}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-muted-foreground font-medium">{item.label}</span>
                    <span className="text-foreground font-semibold">
                      {item.current} / {item.max}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full ${item.color} rounded-full`} style={{ width: `${Math.min((item.current / item.max) * 100, 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
