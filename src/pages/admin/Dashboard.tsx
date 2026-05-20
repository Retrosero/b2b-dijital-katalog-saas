import { useEffect, useMemo, useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { Package, ShoppingCart, ShoppingBag, DollarSign, ArrowRight, AlertTriangle, HardDrive } from "lucide-react";
import { Link } from "react-router-dom";

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
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [catalogs, setCatalogs] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [storageInfo, setStorageInfo] = useState<any>(null);

  useEffect(() => {
    if (!token || isSuperAdmin) return;
    const headers = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch("/api/orders", { headers }),
      fetch("/api/products", { headers }),
      fetch("/api/catalogs", { headers }),
      fetch("/api/customers", { headers }),
      user?.tenantId ? fetch(`/api/tenants/${user.tenantId}/storage`, { headers }) : null,
    ]).then(async ([o, p, c, cu, s]) => {
      if (o.ok) setOrders(await o.json());
      if (p.ok) setProducts(await p.json());
      if (c.ok) setCatalogs(await c.json());
      if (cu.ok) setCustomers(await cu.json());
      if (s?.ok) setStorageInfo(await s.json());
    }).catch(() => {});
  }, [token, isSuperAdmin, user?.tenantId]);

  const pendingOrders = useMemo(() => orders.filter((o) => o.status === "PENDING").length, [orders]);
  const totalRevenue = useMemo(() => orders.reduce((s, o) => s + (Number(o.totalAmount) || 0), 0), [orders]);
  const recentOrders = useMemo(() => orders.slice(0, 6), [orders]);
  const topCatalog = catalogs[0];

  const stats = [
    { label: "Toplam Sipariş", value: String(orders.length), icon: ShoppingCart },
    { label: "Aktif Kataloglar", value: String(catalogs.length), icon: ShoppingBag },
    { label: "Bekleyen Siparişler", value: String(pendingOrders), icon: AlertTriangle },
    { label: "Toplam Ciro", value: `₺${totalRevenue.toFixed(2)}`, icon: DollarSign },
  ];

  const storagePercent = storageInfo?.limitBytes > 0 
    ? (storageInfo.usedBytes / storageInfo.limitBytes) * 100 
    : 0;

  if (isSuperAdmin) {
    return <div className="p-4 text-center text-muted-foreground">Super Admin için bu panelde özet veri gösterilmez.</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div key={idx} className="stat-card stat-primary card-hover">
              <div className="flex items-start justify-between mb-3">
                <div className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">{stat.label}</div>
                <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
              <div className="text-xl md:text-2xl font-bold text-foreground">{stat.value}</div>
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
                      <td className="px-5 py-3.5 text-right"><span className={`status-badge ${st.className}`}>{st.label}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

<div className="space-y-4">
          <div className="bg-card rounded-xl border border-border shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <HardDrive className="w-4 h-4 text-secondary" />
              <h4 className="font-bold text-foreground">Depolama Alanı</h4>
            </div>
            {storageInfo?.limitBytes > 0 ? (
              <div className="space-y-3">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Kullanılan</span>
                  <span className="font-semibold text-foreground">
                    {((storageInfo?.usedBytes || 0) / (1024 * 1024 * 1024)).toFixed(2)} GB / 
                    {((storageInfo?.limitBytes || 0) / (1024 * 1024 * 1024)).toFixed(2)} GB
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all ${
                      storagePercent > 90 ? "bg-destructive" :
                      storagePercent > 70 ? "bg-chart-3" : "bg-secondary"
                    }`}
                    style={{ width: `${Math.min(100, storagePercent)}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Kalan</span>
                  <span className={`font-semibold ${
                    storagePercent > 90 ? "text-destructive" :
                    storagePercent > 70 ? "text-chart-3" : "text-secondary"
                  }`}>
                    {((Math.max(0, (storageInfo?.limitBytes || 0) - (storageInfo?.usedBytes || 0))) / (1024 * 1024 * 1024)).toFixed(2)} GB
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Depolama bilgisi yükleniyor...</p>
            )}
          </div>

          <div className="bg-card rounded-xl border border-border shadow-sm p-5">
            <h4 className="font-bold text-foreground mb-4">Sistem Limitleri</h4>
            <div className="space-y-4">
              {[
                { label: "Ürün Sayısı", current: products.length, max: 1000, color: "bg-secondary" },
                { label: "Aktif Kataloglar", current: catalogs.length, max: 100, color: "bg-chart-3" },
                { label: "Müşteriler", current: customers.length, max: 10000, color: "bg-secondary" },
              ].map((item, idx) => (
                <div key={idx}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-muted-foreground font-medium">{item.label}</span>
                    <span className="text-foreground font-semibold">{item.current} / {item.max}</span>
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
