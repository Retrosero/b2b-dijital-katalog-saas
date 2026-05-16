import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuthStore } from "@/store/useAuthStore";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ShoppingCart, ChevronRight } from "lucide-react";

const statusMap: Record<string, { label: string; className: string }> = {
  PENDING: { label: "Yeni Sipariş", className: "status-pending" },
  APPROVED: { label: "Onaylandı", className: "status-approved" },
  PROCESSING: { label: "Hazırlanıyor", className: "status-processing" },
  READY_FOR_SHIPMENT: { label: "Sevkiyata Hazır", className: "status-ready" },
  SHIPPED: { label: "Sevk Edildi", className: "status-shipped" },
  COMPLETED: { label: "Tamamlandı", className: "status-completed" },
  CANCELLED: { label: "İptal Edildi", className: "status-cancelled" },
};

export default function Orders() {
  const { token, user } = useAuthStore();
  const [orders, setOrders] = useState<any[]>([]);

  const fetchOrders = async () => {
    const res = await fetch("/api/orders", {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) setOrders(await res.json());
  };

  const updateStatus = async (id: string, status: string) => {
    const res = await fetch(`/api/orders/${id}/status`, {
      method: "PUT",
      headers: { 
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}` 
      },
      body: JSON.stringify({ status })
    });
    if (res.ok) {
      fetchOrders();
    } else {
      alert("Durum güncellenirken hata oluştu.");
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [token]);

  if (user?.role === "SUPER_ADMIN") {
    return <div className="p-4 text-center text-muted-foreground">Super Admin siparişleri yönetemez.</div>;
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {orders.map(o => {
          const st = statusMap[o.status] || { label: o.status, className: "status-pending" };
          return (
            <Link to={`/admin/orders/${o.id}`} key={o.id} className="block bg-card rounded-xl border border-border p-4 shadow-sm card-hover">
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
        {orders.length === 0 && (
          <div className="text-center py-16">
            <ShoppingCart className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">Kayıtlı sipariş bulunamadı.</p>
          </div>
        )}
      </div>

      {/* Desktop Table */}
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
              {orders.map(o => {
                const st = statusMap[o.status] || { label: o.status, className: "status-pending" };
                return (
                  <TableRow key={o.id} className="hover:bg-muted/20">
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
              {orders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground h-24">
                    Kayıtlı sipariş bulunamadı.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
      </div>
    </div>
  );
}
