import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuthStore } from "@/store/useAuthStore";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";

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
    return <div className="p-4 text-center">Super Admin siparişleri yönetemez.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Siparişler</h2>
          <p className="text-muted-foreground">Müşterilerden gelen siparişleri listeleyin.</p>
        </div>
      </div>

      <div className="border rounded-md bg-white overflow-hidden">
        <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="">Sipariş No</TableHead>
                <TableHead className="">Müşteri</TableHead>
                <TableHead className="">Tarih</TableHead>
                <TableHead>Tutar</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead className="text-right ">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map(o => (
                <TableRow key={o.id}>
                  <TableCell className="font-medium text-indigo-600">{o.orderNumber}</TableCell>
                  <TableCell>{o.customer?.name || "-"}</TableCell>
                  <TableCell>{new Date(o.createdAt).toLocaleString("tr-TR")}</TableCell>
                  <TableCell className="font-semibold">₺{o.totalAmount.toFixed(2)}</TableCell>
                  <TableCell>
                    <select
                      className="text-xs font-semibold py-1 px-2 border rounded-md"
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
                    <Link to={`/admin/orders/${o.id}`} className="inline-flex items-center justify-center rounded-lg text-xs sm:text-[0.8rem] h-7 px-2.5 hover:bg-muted hover:text-foreground font-medium transition-colors border">
                      Detay
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
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
