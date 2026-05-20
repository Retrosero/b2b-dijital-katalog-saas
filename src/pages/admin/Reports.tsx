import React, { useEffect, useState, useMemo } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { usePageHeaderStore } from "@/store/usePageHeaderStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TrendingUp, TrendingDown, Package, ShoppingCart, DollarSign, Users, Calendar, BarChart3, PieChart, ArrowUpRight, ArrowDownRight, Activity, Archive } from "lucide-react";
import { cn } from "@/lib/utils";

const formatPrice = (price: number) => {
  return price.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " TL";
};

const formatNumber = (num: number) => {
  return num.toLocaleString("tr-TR");
};

type DateRange = "today" | "week" | "month" | "quarter" | "year" | "custom";
type ReportTab = "overview" | "sales" | "stock" | "products" | "customers";

interface KPICardProps {
  title: string;
  value: string;
  change?: number;
  icon: React.ReactNode;
  color: "primary" | "secondary" | "chart-2" | "chart-3" | "destructive";
  subtitle?: string;
}

function KPICard({ title, value, change, icon, color, subtitle }: KPICardProps) {
  const colorClasses = {
    primary: "bg-primary/10 text-primary border-primary/20",
    secondary: "bg-secondary/10 text-secondary border-secondary/20",
    "chart-2": "bg-chart-2/10 text-chart-2 border-chart-2/20",
    "chart-3": "bg-chart-3/10 text-chart-3 border-chart-3/20",
    destructive: "bg-destructive/10 text-destructive border-destructive/20"
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-6 shadow-sm hover:shadow-md transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center border", colorClasses[color])}>
          {icon}
        </div>
        {change !== undefined && (
          <div className={cn(
            "flex items-center gap-1 text-sm font-semibold px-2 py-1 rounded-full",
            change >= 0 ? "bg-chart-2/10 text-chart-2" : "bg-destructive/10 text-destructive"
          )}>
            {change >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
            {Math.abs(change).toFixed(1)}%
          </div>
        )}
      </div>
      <p className="text-sm text-muted-foreground font-medium mb-1">{title}</p>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
    </div>
  );
}

function SimpleBarChart({ data, height = 200 }: { data: { label: string; value: number; color?: string }[], height?: number }) {
  const maxValue = Math.max(...data.map(d => d.value), 1);
  
  return (
    <div className="flex items-end gap-2 h-full min-h-[200px]">
      {data.map((item, idx) => (
        <div key={idx} className="flex-1 flex flex-col items-center gap-2">
          <div className="w-full flex flex-col items-center justify-end" style={{ height: `${height}px` }}>
            <div 
              className={cn("w-full rounded-t-lg transition-all hover:opacity-80", item.color || "bg-primary")}
              style={{ height: `${(item.value / maxValue) * height}px` }}
              title={formatPrice(item.value)}
            />
          </div>
          <span className="text-xs text-muted-foreground truncate max-w-full">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

function PieChartComponent({ data }: { data: { label: string; value: number; color: string }[] }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  let cumulativePercent = 0;
  
  return (
    <div className="flex items-center gap-6">
      <div className="relative w-32 h-32">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          {data.map((item, idx) => {
            const percent = total > 0 ? (item.value / total) * 100 : 0;
            const startPercent = cumulativePercent;
            cumulativePercent += percent;
            
            const startAngle = (startPercent / 100) * 360;
            const endAngle = (cumulativePercent / 100) * 360;
            
            const x1 = 50 + 40 * Math.cos((startAngle * Math.PI) / 180);
            const y1 = 50 + 40 * Math.sin((startAngle * Math.PI) / 180);
            const x2 = 50 + 40 * Math.cos((endAngle * Math.PI) / 180);
            const y2 = 50 + 40 * Math.sin((endAngle * Math.PI) / 180);
            
            const largeArc = percent > 50 ? 1 : 0;
            
            const path = `M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`;
            
            return <path key={idx} d={path} fill={item.color} className="hover:opacity-80 transition-opacity cursor-pointer" />;
          })}
        </svg>
      </div>
      <div className="flex-1 space-y-2">
        {data.map((item, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="text-sm text-muted-foreground flex-1">{item.label}</span>
            <span className="text-sm font-semibold">{total > 0 ? ((item.value / total) * 100).toFixed(1) : 0}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Reports() {
  const { token, user } = useAuthStore();
  const { setHeader, resetHeader } = usePageHeaderStore();
  
  const [dateRange, setDateRange] = useState<DateRange>("month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [activeTab, setActiveTab] = useState<ReportTab>("overview");
  const [loading, setLoading] = useState(true);
  
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);

  useEffect(() => {
    setHeader({
      title: "Raporlar",
      subtitle: "İşletmenizin performansını analiz edin",
      actions: []
    });
    return resetHeader;
  }, [setHeader, resetHeader]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ordersRes, productsRes, customersRes] = await Promise.all([
        fetch("/api/orders", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/products", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/customers", { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (ordersRes.ok) setOrders(await ordersRes.json());
      if (productsRes.ok) setProducts(await productsRes.json());
      if (customersRes.ok) setCustomers(await customersRes.json());
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (token) fetchData();
  }, [token]);

  const dateRangeFilter = useMemo(() => {
    const now = new Date();
    let start: Date;
    let end = new Date(now);
    end.setHours(23, 59, 59, 999);

    switch (dateRange) {
      case "today":
        start = new Date(now);
        start.setHours(0, 0, 0, 0);
        break;
      case "week":
        start = new Date(now);
        start.setDate(start.getDate() - 7);
        break;
      case "month":
        start = new Date(now);
        start.setDate(start.getDate() - 30);
        break;
      case "quarter":
        start = new Date(now);
        start.setMonth(start.getMonth() - 3);
        break;
      case "year":
        start = new Date(now);
        start.setFullYear(start.getFullYear() - 1);
        break;
      case "custom":
        start = customStart ? new Date(customStart) : new Date(now.getFullYear(), now.getMonth(), 1);
        end = customEnd ? new Date(customEnd) : new Date(now);
        end.setHours(23, 59, 59, 999);
        break;
      default:
        start = new Date(now);
        start.setDate(start.getDate() - 30);
    }

    return { start, end };
  }, [dateRange, customStart, customEnd]);

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const orderDate = new Date(order.createdAt);
      return orderDate >= dateRangeFilter.start && orderDate <= dateRangeFilter.end;
    });
  }, [orders, dateRangeFilter]);

  const kpis = useMemo(() => {
    const totalSales = filteredOrders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
    const orderCount = filteredOrders.length;
    const avgOrderValue = orderCount > 0 ? totalSales / orderCount : 0;
    
    const completedOrders = filteredOrders.filter(o => ["SHIPPED", "DELIVERED", "COMPLETED"].includes(o.status));
    const completedSales = completedOrders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
    
    // Stock value calculation
    const totalStockValue = products.reduce((sum, p) => {
      const stock = Number(p.stock) || 0;
      const price = Number(p.price) || 0;
      return sum + (stock * price);
    }, 0);
    
    const totalCostValue = products.reduce((sum, p) => {
      const stock = Number(p.stock) || 0;
      const cost = Number(p.costPrice) || 0;
      return sum + (stock * cost);
    }, 0);
    
    const totalProducts = products.length;
    const lowStockProducts = products.filter(p => (Number(p.stock) || 0) <= (Number(p.stockThreshold) || 10)).length;
    const outOfStockProducts = products.filter(p => (Number(p.stock) || 0) === 0).length;
    
    const totalCustomers = customers.length;
    const activeCustomers = new Set(filteredOrders.map(o => o.customerId).filter(Boolean)).size;

    return {
      totalSales,
      orderCount,
      avgOrderValue,
      completedSales,
      totalStockValue,
      totalCostValue,
      potentialProfit: totalStockValue - totalCostValue,
      totalProducts,
      lowStockProducts,
      outOfStockProducts,
      totalCustomers,
      activeCustomers
    };
  }, [filteredOrders, products, customers]);

  const salesByDay = useMemo(() => {
    const days: { [key: string]: number } = {};
    const dayCount = dateRange === "today" ? 1 : dateRange === "week" ? 7 : dateRange === "month" ? 30 : dateRange === "quarter" ? 90 : dateRange === "year" ? 365 : 30;
    
    for (let i = dayCount - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const key = date.toISOString().split("T")[0];
      days[key] = 0;
    }
    
    filteredOrders.forEach(order => {
      const key = new Date(order.createdAt).toISOString().split("T")[0];
      if (days[key] !== undefined) {
        days[key] += Number(order.totalAmount) || 0;
      }
    });
    
    return Object.entries(days).map(([date, value]) => ({
      label: new Date(date).toLocaleDateString("tr-TR", { day: "numeric", month: dateRange === "year" ? "short" : undefined }),
      value
    }));
  }, [filteredOrders, dateRange]);

  const salesByCategory = useMemo(() => {
    const categoryMap: { [key: string]: number } = {};
    
    filteredOrders.forEach(order => {
      (order.items || []).forEach((item: any) => {
        const category = item.product?.category?.name || "Diğer";
        categoryMap[category] = (categoryMap[category] || 0) + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
      });
    });
    
    const colors = ["#1f45d6", "#1bcabf", "#ff6b6b", "#feca57", "#48dbfb", "#ff9ff3", "#54a0ff", "#5f27cd"];
    return Object.entries(categoryMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([label, value], idx) => ({
        label,
        value,
        color: colors[idx % colors.length]
      }));
  }, [filteredOrders]);

  const topProducts = useMemo(() => {
    const productMap: { [key: string]: { name: string; quantity: number; revenue: number; stock: number } } = {};
    
    filteredOrders.forEach(order => {
      (order.items || []).forEach((item: any) => {
        const id = item.productId;
        if (!productMap[id]) {
          productMap[id] = {
            name: item.product?.name || "Bilinmeyen",
            quantity: 0,
            revenue: 0,
            stock: item.product?.stock || 0
          };
        }
        productMap[id].quantity += Number(item.quantity) || 0;
        productMap[id].revenue += (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
      });
    });
    
    return Object.entries(productMap)
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .slice(0, 10)
      .map(([id, data]) => ({ id, ...data }));
  }, [filteredOrders]);

  const topCustomers = useMemo(() => {
    const customerMap: { [key: string]: { name: string; orderCount: number; total: number } } = {};
    
    filteredOrders.forEach(order => {
      if (!order.customerId) return;
      const name = order.customer?.name || "Bilinmeyen Müşteri";
      if (!customerMap[order.customerId]) {
        customerMap[order.customerId] = { name, orderCount: 0, total: 0 };
      }
      customerMap[order.customerId].orderCount += 1;
      customerMap[order.customerId].total += Number(order.totalAmount) || 0;
    });
    
    return Object.entries(customerMap)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 10)
      .map(([id, data]) => ({ id, ...data }));
  }, [filteredOrders]);

  const stockAnalysis = useMemo(() => {
    return products.map(p => ({
      id: p.id,
      name: p.name,
      stock: Number(p.stock) || 0,
      price: Number(p.price) || 0,
      costPrice: Number(p.costPrice) || 0,
      stockValue: (Number(p.stock) || 0) * (Number(p.price) || 0),
      costValue: (Number(p.stock) || 0) * (Number(p.costPrice) || 0),
      profitMargin: p.costPrice && p.costPrice > 0 ? (((p.price - p.costPrice) / p.costPrice) * 100) : null,
      status: (Number(p.stock) || 0) === 0 ? "out" : (Number(p.stock) || 0) <= (Number(p.stockThreshold) || 10) ? "low" : "ok"
    })).sort((a, b) => b.stockValue - a.stockValue);
  }, [products]);

  const ordersByStatus = useMemo(() => {
    const statusMap: { [key: string]: number } = {};
    orders.forEach(order => {
      const status = order.status || "UNKNOWN";
      statusMap[status] = (statusMap[status] || 0) + 1;
    });
    const colors: { [key: string]: string } = {
      PENDING: "#feca57",
      CONFIRMED: "#54a0ff",
      PROCESSING: "#48dbfb",
      SHIPPED: "#1bcabf",
      DELIVERED: "#1f45d6",
      COMPLETED: "#26de81",
      CANCELLED: "#ff6b6b"
    };
    return Object.entries(statusMap).map(([status, count]) => ({
      label: status,
      value: count,
      color: colors[status] || "#888"
    }));
  }, [orders]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Raporlar yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Date Range Selector */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-card p-4 rounded-xl border border-border">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-muted-foreground" />
          <span className="text-sm font-semibold">Tarih Aralığı:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { key: "today", label: "Bugün" },
            { key: "week", label: "Bu Hafta" },
            { key: "month", label: "Bu Ay" },
            { key: "quarter", label: "Çeyrek" },
            { key: "year", label: "Yıl" },
            { key: "custom", label: "Özel" }
          ].map(range => (
            <button
              key={range.key}
              onClick={() => setDateRange(range.key as DateRange)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                dateRange === range.key
                  ? "bg-primary text-white shadow-md"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              )}
            >
              {range.label}
            </button>
          ))}
        </div>
        {dateRange === "custom" && (
          <div className="flex items-center gap-2 mt-2 sm:mt-0">
            <Input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="h-9 w-40"
            />
            <span className="text-muted-foreground">-</span>
            <Input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="h-9 w-40"
            />
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[
          { key: "overview", label: "Özet", icon: BarChart3 },
          { key: "sales", label: "Satışlar", icon: TrendingUp },
          { key: "stock", label: "Stok", icon: Package },
          { key: "products", label: "Ürünler", icon: Archive },
          { key: "customers", label: "Müşteriler", icon: Users }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as ReportTab)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap",
              activeTab === tab.key
                ? "bg-secondary text-white shadow-md"
                : "bg-card text-muted-foreground border border-border hover:bg-muted"
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              title="Toplam Satış"
              value={formatPrice(kpis.totalSales)}
              icon={<DollarSign className="w-6 h-6" />}
              color="primary"
              subtitle={`${kpis.orderCount} sipariş`}
            />
            <KPICard
              title="Tamamlanan Satış"
              value={formatPrice(kpis.completedSales)}
              icon={<ShoppingCart className="w-6 h-6" />}
              color="secondary"
              subtitle="Sevk edilen siparişler"
            />
            <KPICard
              title="Ortalama Sipariş"
              value={formatPrice(kpis.avgOrderValue)}
              icon={<Activity className="w-6 h-6" />}
              color="chart-2"
            />
            <KPICard
              title="Stok Değeri"
              value={formatPrice(kpis.totalStockValue)}
              icon={<Package className="w-6 h-6" />}
              color="chart-3"
              subtitle={`${formatNumber(kpis.totalProducts)} ürün`}
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Daily Sales Chart */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                Satış Grafiği
              </h3>
              <SimpleBarChart data={salesByDay} height={180} />
            </div>

            {/* Category Breakdown */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                <PieChart className="w-5 h-5 text-secondary" />
                Kategori Dağılımı
              </h3>
              {salesByCategory.length > 0 ? (
                <PieChartComponent data={salesByCategory} />
              ) : (
                <div className="text-center py-10 text-muted-foreground">Bu dönemde satış verisi yok</div>
              )}
            </div>
          </div>

          {/* Second Row KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              title="Potansiyel Kar"
              value={formatPrice(kpis.potentialProfit)}
              icon={<TrendingUp className="w-6 h-6" />}
              color="chart-2"
              subtitle="Stok - Maliyet"
            />
            <KPICard
              title="Kritik Stok"
              value={formatNumber(kpis.lowStockProducts)}
              icon={<Package className="w-6 h-6" />}
              color="destructive"
              subtitle={`${kpis.outOfStockProducts} ürün stokta yok`}
            />
            <KPICard
              title="Toplam Müşteri"
              value={formatNumber(kpis.totalCustomers)}
              icon={<Users className="w-6 h-6" />}
              color="primary"
            />
            <KPICard
              title="Aktif Müşteriler"
              value={formatNumber(kpis.activeCustomers)}
              icon={<Activity className="w-6 h-6" />}
              color="secondary"
              subtitle="Bu dönemde sipariş veren"
            />
          </div>

          {/* Order Status Distribution */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-foreground mb-4">Sipariş Durumları</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
              {ordersByStatus.map((status, idx) => (
                <div key={idx} className="bg-muted/30 rounded-xl p-4 text-center">
                  <div 
                    className="w-3 h-3 rounded-full mx-auto mb-2"
                    style={{ backgroundColor: status.color }}
                  />
                  <p className="text-2xl font-bold text-foreground">{status.value}</p>
                  <p className="text-xs text-muted-foreground capitalize">{status.label}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Sales Tab */}
      {activeTab === "sales" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sales Chart */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <h3 className="text-lg font-bold text-foreground mb-4">Günlük Satış Trendi</h3>
              <SimpleBarChart data={salesByDay} height={250} />
            </div>

            {/* Top Products */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <h3 className="text-lg font-bold text-foreground mb-4">En Çok Satan Ürünler</h3>
              <div className="space-y-3 max-h-[320px] overflow-y-auto">
                {topProducts.length > 0 ? topProducts.map((product, idx) => (
                  <div key={product.id} className="flex items-center gap-4 p-3 bg-muted/30 rounded-xl">
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm",
                      idx === 0 ? "bg-secondary text-white" : "bg-muted text-muted-foreground"
                    )}>
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground truncate">{product.name}</p>
                      <p className="text-xs text-muted-foreground">{formatNumber(product.quantity)} adet satıldı</p>
                    </div>
                    <p className="font-bold text-secondary">{formatPrice(product.revenue)}</p>
                  </div>
                )) : (
                  <div className="text-center py-8 text-muted-foreground">Henüz satış verisi yok</div>
                )}
              </div>
            </div>
          </div>

          {/* Category Sales */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-foreground mb-4">Kategori Bazında Satış</h3>
            <div className="space-y-4">
              {salesByCategory.map((cat, idx) => {
                const maxVal = Math.max(...salesByCategory.map(c => c.value), 1);
                const percent = (cat.value / maxVal) * 100;
                return (
                  <div key={idx} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{cat.label}</span>
                      <span className="font-bold text-secondary">{formatPrice(cat.value)}</span>
                    </div>
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${percent}%`, backgroundColor: cat.color }}
                      />
                    </div>
                  </div>
                );
              })}
              {salesByCategory.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">Henüz satış verisi yok</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Stock Tab */}
      {activeTab === "stock" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <KPICard
              title="Toplam Stok Değeri"
              value={formatPrice(kpis.totalStockValue)}
              icon={<Package className="w-6 h-6" />}
              color="primary"
              subtitle={`${formatNumber(kpis.totalProducts)} ürün`}
            />
            <KPICard
              title="Toplam Maliyet"
              value={formatPrice(kpis.totalCostValue)}
              icon={<DollarSign className="w-6 h-6" />}
              color="chart-3"
              subtitle="Alış fiyatı toplamı"
            />
            <KPICard
              title="Potansiyel Kar"
              value={formatPrice(kpis.potentialProfit)}
              icon={<TrendingUp className="w-6 h-6" />}
              color="chart-2"
              subtitle="Satış - Maliyet farkı"
            />
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-foreground mb-4">Stok Durumu</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">Ürün</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-muted-foreground">Stok</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-muted-foreground">Satış Fiyatı</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-muted-foreground">Alış Fiyatı</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-muted-foreground">Stok Değeri</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-muted-foreground">Kar Marjı</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-muted-foreground">Durum</th>
                  </tr>
                </thead>
                <tbody>
                  {stockAnalysis.slice(0, 20).map((product, idx) => (
                    <tr key={product.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4 font-medium">{product.name}</td>
                      <td className="py-3 px-4 text-right">{formatNumber(product.stock)}</td>
                      <td className="py-3 px-4 text-right">{formatPrice(product.price)}</td>
                      <td className="py-3 px-4 text-right">{product.costPrice ? formatPrice(product.costPrice) : "-"}</td>
                      <td className="py-3 px-4 text-right font-semibold text-secondary">{formatPrice(product.stockValue)}</td>
                      <td className="py-3 px-4 text-right">
                        {product.profitMargin !== null ? (
                          <span className={product.profitMargin > 20 ? "text-chart-2" : product.profitMargin > 0 ? "text-chart-3" : "text-destructive"}>
                            {product.profitMargin.toFixed(1)}%
                          </span>
                        ) : "-"}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={cn(
                          "px-2 py-1 rounded-full text-xs font-semibold",
                          product.status === "out" ? "bg-destructive/10 text-destructive" :
                          product.status === "low" ? "bg-chart-3/10 text-chart-3" :
                          "bg-chart-2/10 text-chart-2"
                        )}>
                          {product.status === "out" ? "Stokta Yok" : product.status === "low" ? "Kritik" : "Normal"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {stockAnalysis.length > 20 && (
                <p className="text-center py-4 text-sm text-muted-foreground">
                  ... ve {stockAnalysis.length - 20} ürün daha
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Products Tab */}
      {activeTab === "products" && (
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-foreground mb-4">Tüm Ürünler</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map(product => (
                <div key={product.id} className="bg-muted/30 rounded-xl p-4 flex flex-col gap-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-foreground line-clamp-1">{product.name}</p>
                      <p className="text-xs text-muted-foreground">{product.category?.name || "Kategorisiz"}</p>
                    </div>
                    {(Number(product.stock) || 0) <= (Number(product.stockThreshold) || 10) && (
                      <span className={cn(
                        "px-2 py-1 rounded-full text-xs font-semibold shrink-0",
                        (Number(product.stock) || 0) === 0 ? "bg-destructive/10 text-destructive" : "bg-chart-3/10 text-chart-3"
                      )}>
                        {(Number(product.stock) || 0) === 0 ? "Stok yok" : "Kritik"}
                      </span>
                    )}
                  </div>
                  <div className="flex justify-between text-sm">
                    <div>
                      <p className="text-muted-foreground">Stok</p>
                      <p className="font-semibold">{formatNumber(product.stock || 0)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-muted-foreground">Satış</p>
                      <p className="font-semibold text-secondary">{formatPrice(product.price || 0)}</p>
                    </div>
                    {product.costPrice && (
                      <div className="text-right">
                        <p className="text-muted-foreground">Alış</p>
                        <p className="font-semibold text-chart-3">{formatPrice(product.costPrice)}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {products.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">Henüz ürün eklenmemiş</div>
            )}
          </div>
        </div>
      )}

      {/* Customers Tab */}
      {activeTab === "customers" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <KPICard
              title="Toplam Müşteri"
              value={formatNumber(kpis.totalCustomers)}
              icon={<Users className="w-6 h-6" />}
              color="primary"
            />
            <KPICard
              title="Aktif Müşteriler"
              value={formatNumber(kpis.activeCustomers)}
              icon={<Activity className="w-6 h-6" />}
              color="secondary"
              subtitle="Bu dönemde sipariş veren"
            />
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-foreground mb-4">En Çok Sipariş Veren Müşteriler</h3>
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {topCustomers.length > 0 ? topCustomers.map((customer, idx) => (
                <div key={customer.id} className="flex items-center gap-4 p-4 bg-muted/30 rounded-xl">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg",
                    idx === 0 ? "bg-secondary text-white" : idx === 1 ? "bg-chart-3 text-white" : idx === 2 ? "bg-chart-2 text-white" : "bg-muted text-muted-foreground"
                  )}>
                    {customer.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground">{customer.name}</p>
                    <p className="text-xs text-muted-foreground">{customer.orderCount} sipariş</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-secondary">{formatPrice(customer.total)}</p>
                    <p className="text-xs text-muted-foreground">toplam</p>
                  </div>
                </div>
              )) : (
                <div className="text-center py-8 text-muted-foreground">Henüz müşteri siparişi yok</div>
              )}
            </div>
          </div>

          {/* All Customers */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-foreground mb-4">Tüm Müşteriler</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {customers.map(customer => (
                <div key={customer.id} className="bg-muted/30 rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                      {customer.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground truncate">{customer.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{customer.email || "E-posta yok"}</p>
                    </div>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>{customer.phone || "Tel yok"}</span>
                    <span className="font-semibold text-secondary">{formatPrice(customer.balance || 0)}</span>
                  </div>
                </div>
              ))}
            </div>
            {customers.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">Henüz müşteri eklenmemiş</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}