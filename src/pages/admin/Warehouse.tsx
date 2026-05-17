import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuthStore } from "@/store/useAuthStore";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Warehouse as WarehouseIcon, ChevronRight, Package } from "lucide-react";

export default function Warehouse() {
  const { token } = useAuthStore();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    const res = await fetch("/api/orders", {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      const data = await res.json();
      // Yalnızca Hazırlanıyor ve Sevkiyata Hazır olanları göster
      const filtered = data.filter((o: any) => o.status === "PROCESSING" || o.status === "READY_FOR_SHIPMENT");
      setOrders(filtered);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();
  }, [token]);

  if (loading) return <div className="p-4 text-muted-foreground">Yükleniyor...</div>;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {orders.map(o => (
          <Link to={`/admin/warehouse/${o.id}`} key={o.id} className="block bg-card rounded-xl border border-border p-4 shadow-sm card-hover">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <div className="text-xs text-secondary font-bold">{o.orderNumber}</div>
                <div className="font-semibold text-foreground mt-0.5">{o.customer?.name || "-"}</div>
              </div>
              {o.status === "PROCESSING" && <span className="status-badge status-processing">Hazırlanıyor</span>}
              {o.status === "READY_FOR_SHIPMENT" && <span className="status-badge status-ready">Sevkiyata Hazır</span>}
            </div>
            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground">{new Date(o.createdAt).toLocaleString("tr-TR")}</div>
              <span className="inline-flex items-center gap-1 rounded-lg brand-gradient px-2.5 py-1 text-xs font-semibold text-white">Topla / Hazırla <ChevronRight className="w-3 h-3" /></span>
            </div>
          </Link>
        ))}
        {orders.length === 0 && (
          <div className="text-center py-16">
            <Package className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">Bekleyen depo işlemi bulunamadı.</p>
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
                <TableHead>Durum</TableHead>
                <TableHead className="text-right">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map(o => (
                <TableRow key={o.id} className="hover:bg-muted/20">
                  <TableCell className="font-semibold text-secondary">{o.orderNumber}</TableCell>
                  <TableCell className="font-medium">{o.customer?.name || "-"}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{new Date(o.createdAt).toLocaleString("tr-TR")}</TableCell>
                  <TableCell>
                    {o.status === "PROCESSING" && <span className="status-badge status-processing">Hazırlanıyor</span>}
                    {o.status === "READY_FOR_SHIPMENT" && <span className="status-badge status-ready">Sevkiyata Hazır</span>}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link to={`/admin/warehouse/${o.id}`} className="inline-flex items-center gap-1 rounded-lg text-sm h-9 px-4 brand-gradient text-white hover:opacity-90 font-medium transition-opacity touch-target">
                      Topla / Hazırla <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
              {orders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground h-24">
                    Bekleyen depo işlemi bulunamadı.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
      </div>
    </div>
  );
}
