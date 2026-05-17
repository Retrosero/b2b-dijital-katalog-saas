import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuthStore } from "@/store/useAuthStore";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShoppingCart, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const statusMap: Record<string, { label: string; className: string }> = {
  PENDING: { label: "Yeni Sipariş", className: "status-pending" },
  APPROVED: { label: "Onaylandı", className: "status-approved" },
  PROCESSING: { label: "Hazırlanıyor", className: "status-processing" },
  READY_FOR_SHIPMENT: { label: "Sevkiyata Hazır", className: "status-ready" },
  SHIPPED: { label: "Sevk Edildi", className: "status-shipped" },
  COMPLETED: { label: "Tamamlandı", className: "status-completed" },
  CANCELLED: { label: "İptal Edildi", className: "status-cancelled" },
};

const statusBgMap: Record<string, string> = {
  PENDING: "bg-yellow-100 border-yellow-300",
  APPROVED: "bg-green-100 border-green-300",
  PROCESSING: "bg-blue-100 border-blue-300",
  READY_FOR_SHIPMENT: "bg-cyan-100 border-cyan-300",
  SHIPPED: "bg-purple-100 border-purple-300",
  COMPLETED: "bg-lime-100 border-lime-300",
  CANCELLED: "bg-red-100 border-red-300",
};

const filterOptions = [
  { key: "PENDING", label: "Yeni" },
  { key: "APPROVED", label: "Onaylandı" },
  { key: "PROCESSING", label: "Hazırlanıyor" },
  { key: "READY_FOR_SHIPMENT", label: "Sevkiyata Hazır" },
  { key: "SHIPPED", label: "Sevk Edildi" },
  { key: "COMPLETED", label: "Tamamlandı" },
  { key: "CANCELLED", label: "İptal" },
  { key: "ALL", label: "Tümü" },
];

export default function Orders() {
  const { token, user } = useAuthStore();
  const [orders, setOrders] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("PENDING");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));

  const fetchOrders = async () => {
    const res = await fetch("/api/orders", { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setOrders(await res.json());
  };

  const updateStatus = async (id: string, status: string) => {
    const res = await fetch(`/api/orders/${id}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status })
    });
    if (res.ok) fetchOrders();
    else alert("Durum güncellenirken hata oluştu.");
  };

  useEffect(() => {
    fetchOrders();
  }, [token]);

  if (user?.role === "SUPER_ADMIN") {
    return <div className="p-4 text-center text-muted-foreground">Super Admin siparişleri yönetemez.</div>;
  }

  const filteredOrders = orders
    .filter((o) => (statusFilter === "ALL" ? true : o.status === statusFilter))
    .filter((o) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const customerName = (o.customer?.name || "").toLowerCase();
      const orderNumber = (o.orderNumber || "").toLowerCase();
      const productNames = Array.isArray(o.items)
        ? o.items.map((i: any) => (i.product?.name || "")).join(" ").toLowerCase()
        : "";
      return customerName.includes(q) || orderNumber.includes(q) || productNames.includes(q);
    })
    .filter((o) => {
      const created = new Date(o.createdAt);
      if (dateFrom) {
        const from = new Date(`${dateFrom}T00:00:00`);
        if (created < from) return false;
      }
      if (dateTo) {
        const to = new Date(`${dateTo}T23:59:59`);
        if (created > to) return false;
      }
      return true;
    });

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Müşteri, sipariş no veya ürün ara..."
          className="lg:col-span-2 h-11 px-3 rounded-lg border border-border bg-card text-sm touch-target"
        />
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="h-11 px-3 rounded-lg border border-border bg-card text-sm touch-target"
          title="Başlangıç Tarihi"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="h-11 px-3 rounded-lg border border-border bg-card text-sm touch-target"
          title="Bitiş Tarihi"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {filterOptions.map((f) => (
          <button
            key={f.key}
            onClick={() => setStatusFilter(f.key)}
            className={cn(
              "px-3 py-2 min-h-[44px] rounded-lg text-xs font-semibold border transition-colors touch-target",
              statusFilter === f.key ? (statusBgMap[f.key] || "bg-muted border-border text-foreground") : "bg-card border-border text-muted-foreground hover:bg-muted/30"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="md:hidden space-y-3">
        {filteredOrders.map((o) => {
          const st = statusMap[o.status] || { label: o.status, className: "status-pending" };
          const statusBgClass = statusBgMap[o.status] || "bg-card border-border";
          return (
            <Link to={`/admin/orders/${o.id}`} key={o.id} className={cn("block rounded-xl border p-4 shadow-sm card-hover", statusBgClass)}>
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <div className="text-xs text-secondary font-bold">{o.orderNumber}</div>
                  <div className="font-semibold text-foreground mt-0.5">{o.customer?.name || "-"}</div>
                </div>
                <span className={`status-badge ${st.className}`}>{st.label}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-xs text-muted-foreground">{new Date(o.createdAt).toLocaleString("tr-TR")}</div>
                <div className="font-bold text-foreground">₺{o.totalAmount.toFixed(2)}</div>
              </div>
            </Link>
          );
        })}
        {filteredOrders.length === 0 && (
          <div className="text-center py-16">
            <ShoppingCart className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">Seçili filtreye uygun sipariş bulunamadı.</p>
          </div>
        )}
      </div>

      <div className="hidden md:block border rounded-xl bg-card overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead>Sipariş No</TableHead>
              <TableHead>Müşteri</TableHead>
              <TableHead>Tarih</TableHead>
              <TableHead>Tutar</TableHead>
              <TableHead>Durum</TableHead>
              <TableHead className="text-right">İşlemler</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOrders.map((o) => {
              const st = statusMap[o.status] || { label: o.status, className: "status-pending" };
              const statusBgClass = statusBgMap[o.status] || "bg-card border-border";
              return (
                <TableRow key={o.id} className={cn(statusBgClass, "hover:brightness-[0.98] transition-colors")}>
                  <TableCell className="font-semibold text-secondary">{o.orderNumber}</TableCell>
                  <TableCell className="font-medium">{o.customer?.name || "-"}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{new Date(o.createdAt).toLocaleString("tr-TR")}</TableCell>
                  <TableCell className="font-bold">₺{o.totalAmount.toFixed(2)}</TableCell>
                  <TableCell>
                    <select
                      className="text-xs font-semibold py-1.5 px-2.5 border border-border rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors touch-target cursor-pointer"
                      value={o.status}
                      onChange={(e) => updateStatus(o.id, e.target.value)}
                    >
                      <option value="PENDING">Yeni Sipariş</option>
                      <option value="APPROVED">Onaylandı</option>
                      <option value="PROCESSING">Hazırlanıyor</option>
                      <option value="READY_FOR_SHIPMENT">Sevkiyata Hazır</option>
                      <option value="SHIPPED">Sevk Edildi</option>
                      <option value="COMPLETED">Tamamlandı</option>
                      <option value="CANCELLED">İptal Edildi</option>
                    </select>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link to={`/admin/orders/${o.id}`} className="inline-flex items-center gap-1 rounded-lg text-sm h-9 px-3 hover:bg-muted font-medium transition-colors border border-border touch-target">
                      Detay <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </TableCell>
                </TableRow>
              );
            })}
            {filteredOrders.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground h-24">
                  Seçili filtreye uygun sipariş bulunamadı.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
