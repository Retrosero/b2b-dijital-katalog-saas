import { useAuthStore } from "@/store/useAuthStore";
import { TrendingUp, TrendingDown, Package, ShoppingCart, ShoppingBag, DollarSign, ArrowRight, Clock, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";

export default function Dashboard() {
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  const stats = isSuperAdmin ? [
    { label: "Toplam Firma", value: "12", change: "+2 bu ay", positive: true, icon: Package, variant: "stat-primary" },
    { label: "Aktif Kataloglar", value: "8", change: "4 adet süresi dolmak üzere", positive: false, icon: ShoppingBag, variant: "stat-warning" },
    { label: "Bekleyen Siparişler", value: "24", change: "Acil müdahale bekliyor", positive: false, icon: AlertTriangle, variant: "stat-danger" },
    { label: "Toplam Ciro", value: "₺452,850", change: "+8% hedef artışı", positive: true, icon: DollarSign, variant: "stat-success" },
  ] : [
    { label: "Toplam Sipariş", value: "1,284", change: "+12.5% geçen aya göre", positive: true, icon: ShoppingCart, variant: "stat-primary" },
    { label: "Aktif Kataloglar", value: "8", change: "4 adet süresi dolmak üzere", positive: false, icon: ShoppingBag, variant: "stat-warning" },
    { label: "Bekleyen Siparişler", value: "24", change: "Acil müdahale bekliyor", positive: false, icon: AlertTriangle, variant: "stat-danger" },
    { label: "Toplam Ciro", value: "₺452,850", change: "+8% hedef artışı", positive: true, icon: DollarSign, variant: "stat-success" },
  ];

  const recentOrders = [
    { customer: "Arda Marketler Zinciri", catalog: "Yaz Sezonu 2024", time: "10:45", amount: "₺14,250", status: "Beklemede", statusClass: "status-pending" },
    { customer: "Özlem Restoran Grubu", catalog: "Endüstriyel Gıda", time: "09:12", amount: "₺4,890", status: "Onaylandı", statusClass: "status-approved" },
    { customer: "Global Lojistik A.Ş.", catalog: "Yaz Sezonu 2024", time: "Dün", amount: "₺22,100", status: "Hazırlandı", statusClass: "status-completed" },
    { customer: "Zirve Kantin İşletmeleri", catalog: "Atıştırmalıklar", time: "Dün", amount: "₺1,450", status: "İptal", statusClass: "status-cancelled" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div key={idx} className={`stat-card ${stat.variant} card-hover`}>
              <div className="flex items-start justify-between mb-3">
                <div className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">{stat.label}</div>
                <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
              <div className="text-xl md:text-2xl font-bold text-foreground">{stat.value}</div>
              <div className={`mt-2 flex items-center gap-1 text-xs font-medium ${stat.positive ? 'text-chart-2' : 'text-muted-foreground'}`}>
                {stat.positive ? <TrendingUp className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                <span className="truncate">{stat.change}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 grid-cols-1 gap-4 md:gap-6 items-start">
        {/* Recent Orders */}
        <div className="col-span-1 lg:col-span-2 bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="p-4 md:p-5 border-b border-border flex items-center justify-between">
            <h3 className="font-bold text-foreground">Son Siparişler</h3>
            <Link to="/admin/orders" className="text-secondary text-xs font-semibold hover:underline flex items-center gap-1">
              Tümünü Gör <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-muted/30 border-b border-border">
                <tr>
                  <th className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Müşteri</th>
                  <th className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Katalog</th>
                  <th className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tarih</th>
                  <th className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tutar</th>
                  <th className="px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Durum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentOrders.map((order, idx) => (
                  <tr key={idx} className="hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-3.5 text-sm font-medium text-foreground">{order.customer}</td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground">{order.catalog}</td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground">{order.time}</td>
                    <td className="px-5 py-3.5 text-sm font-semibold">{order.amount}</td>
                    <td className="px-5 py-3.5 text-right">
                      <span className={`status-badge ${order.statusClass}`}>{order.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden divide-y divide-border">
            {recentOrders.map((order, idx) => (
              <div key={idx} className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold text-sm text-foreground">{order.customer}</div>
                    <div className="text-xs text-muted-foreground">{order.catalog} · {order.time}</div>
                  </div>
                  <span className={`status-badge ${order.statusClass}`}>{order.status}</span>
                </div>
                <div className="text-sm font-bold text-foreground">{order.amount}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar Widgets */}
        <div className="space-y-4">
          <div className="bg-[var(--sidebar)] rounded-xl p-5 text-white shadow-lg overflow-hidden relative">
            <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-secondary/10 blur-2xl" />
            <h4 className="font-bold mb-2 relative z-10">Hızlı Katalog Paylaşımı</h4>
            <p className="text-sidebar-foreground/50 text-xs mb-4 relative z-10 leading-relaxed">En çok tercih edilen kataloğunuzun linkini hemen kopyalayın.</p>
            <div className="flex gap-2 mb-4 relative z-10">
              <input type="text" readOnly value="ecatalog.com/tekno-gida/yaz24" className="flex-1 min-w-0 bg-white/10 border border-white/10 text-xs p-2.5 rounded-lg text-white/80 placeholder:text-white/30" />
              <button className="bg-secondary text-white px-4 rounded-lg font-bold text-xs shrink-0 hover:bg-secondary/90 transition-colors shadow-md">Kopyala</button>
            </div>
            <Link to="/admin/catalogs" className="w-full py-2.5 bg-white/10 rounded-lg font-medium text-sm hover:bg-white/15 transition-colors block text-center relative z-10">
              Katalog Ayarlarını Yönet
            </Link>
          </div>

          <div className="bg-card rounded-xl border border-border shadow-sm p-5">
            <h4 className="font-bold text-foreground mb-4">Sistem Limitleri</h4>
            <div className="space-y-4">
              {[
                { label: "Ürün Sayısı", current: 452, max: 1000, color: "bg-secondary" },
                { label: "Aktif Kataloglar", current: 8, max: 10, color: "bg-chart-3" },
                { label: "Kullanıcılar", current: 3, max: 5, color: "bg-secondary" },
              ].map((item, idx) => (
                <div key={idx}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-muted-foreground font-medium">{item.label}</span>
                    <span className="text-foreground font-semibold">{item.current} / {item.max}</span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full ${item.color} rounded-full transition-all duration-500`} style={{ width: `${(item.current / item.max) * 100}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
            <button className="w-full mt-5 text-center text-xs text-secondary font-semibold hover:underline flex items-center justify-center gap-1">
              Üst Pakete Geç <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
