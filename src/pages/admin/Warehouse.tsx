import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuthStore } from "@/store/useAuthStore";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";

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

  if (loading) return <div className="p-4">Yükleniyor...</div>;

  return (
    <div className="space-y-6">
      <div className="border rounded-md bg-white overflow-hidden">
        <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sipariş No</TableHead>
                <TableHead>Müşteri</TableHead>
                <TableHead>Tarih</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead className="text-right">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map(o => (
                <TableRow key={o.id}>
                  <TableCell className="font-medium text-indigo-600">{o.orderNumber}</TableCell>
                  <TableCell>{o.customer?.name || "-"}</TableCell>
                  <TableCell>{new Date(o.createdAt).toLocaleString("tr-TR")}</TableCell>
                  <TableCell>
                    {o.status === "PROCESSING" && <span className="px-2 py-1 rounded bg-amber-100 text-amber-800 text-xs font-medium">Hazırlanıyor</span>}
                    {o.status === "READY_FOR_SHIPMENT" && <span className="px-2 py-1 rounded bg-blue-100 text-blue-800 text-xs font-medium">Sevkiyata Hazır</span>}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link to={`/admin/orders/${o.id}`} className="inline-flex items-center justify-center rounded-lg text-xs sm:text-[0.8rem] h-7 px-2.5 hover:bg-muted hover:text-foreground font-medium transition-colors border">
                      Topla / Hazırla
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
