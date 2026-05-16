import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, User, Calendar, Package, CheckCircle2, Truck, MessageCircle } from "lucide-react";
import { Input } from "@/components/ui/input";

const statusMap: Record<string, { label: string; className: string }> = {
  PENDING: { label: "YENİ SİPARİŞ", className: "status-pending" },
  APPROVED: { label: "ONAYLANDI", className: "status-approved" },
  PROCESSING: { label: "HAZIRLANIYOR", className: "status-processing" },
  READY_FOR_SHIPMENT: { label: "SEVKİYATA HAZIR", className: "status-ready" },
  SHIPPED: { label: "SEVK EDİLDİ", className: "status-shipped" },
  COMPLETED: { label: "TAMAMLANDI", className: "status-completed" },
  CANCELLED: { label: "İPTAL EDİLDİ", className: "status-cancelled" },
};

export default function OrderDetail() {
  const { id } = useParams();
  const { token, user } = useAuthStore();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [logisticsCompany, setLogisticsCompany] = useState("");
  const [boxCount, setBoxCount] = useState("");
  const [updating, setUpdating] = useState(false);

  const fetchOrder = () => {
    setLoading(true);
    fetch(`/api/orders/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setOrder(data);
        setLogisticsCompany(data.logisticsCompany || "");
        setBoxCount(data.boxCount?.toString() || "");
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchOrder();
  }, [id, token]);

  const updateStatus = async (status: string, extraData: any = {}) => {
    setUpdating(true);
    await fetch(`/api/orders/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status, ...extraData })
    });
    fetchOrder();
    setUpdating(false);
  };

  const shareOrderWhatsapp = () => {
    if (!order.customer?.phone) {
      alert("Müşterinin telefon numarası kayıtlı değil.");
      return;
    }
    const text = `Siparişiniz (${order.orderNumber}) ambara teslim edilmiştir. 
Firma: ${order.logisticsCompany || '-'}
Koli Adeti: ${order.boxCount || '-'}

Teşekkür ederiz!`;
    const cleanPhone = order.customer.phone.replace(/[^0-9]/g, "");
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  if (loading && !order) return <div className="p-4 text-muted-foreground">Yükleniyor...</div>;
  if (!order) return <div className="p-4 text-destructive">Sipariş bulunamadı</div>;

  const st = statusMap[order.status] || { label: order.status, className: "status-pending" };

  return (
    <div className="space-y-4 md:space-y-6 max-w-5xl animate-fade-in">
      <div className="flex items-center gap-3 md:gap-4">
        <Link to="/admin/orders" className="inline-flex items-center justify-center size-10 border border-border rounded-lg bg-card hover:bg-muted transition-colors touch-target">
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </Link>
        <div className="ml-auto flex items-center gap-2">
            <span className={`status-badge ${st.className}`}>{st.label}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
        <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 text-secondary mb-3 border-b border-border pb-3">
             <User className="w-4 h-4" />
             <h3 className="font-semibold text-sm text-foreground">Müşteri Bilgileri</h3>
          </div>
          {order.customer ? (
            <div className="text-sm space-y-1.5 text-muted-foreground">
               <p><strong className="text-foreground">İsim:</strong> {order.customer.name}</p>
               <p><strong className="text-foreground">Tel:</strong> {order.customer.phone || "-"}</p>
               <p className="line-clamp-1" title={order.customer.address}><strong className="text-foreground">Adres:</strong> {order.customer.address || "-"}</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Müşteri bilgisi eklenmemiş.</p>
          )}
        </div>

        <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-2 text-secondary mb-3 border-b border-border pb-3">
             <Calendar className="w-4 h-4" />
             <h3 className="font-semibold text-sm text-foreground">Sipariş Özeti</h3>
          </div>
          <div className="text-sm space-y-1.5 text-muted-foreground flex-1">
             <p><strong className="text-foreground">Tarih:</strong> {new Date(order.createdAt).toLocaleString("tr-TR")}</p>
             <p className="line-clamp-1" title={order.notes}><strong className="text-foreground">Not:</strong> {order.notes || "-"}</p>
          </div>
          <div className="pt-3 mt-3 border-t border-border font-semibold text-sm flex justify-between">
            <span className="text-foreground">Toplam Tutar:</span>
            <span className="text-secondary text-base">₺{order.totalAmount.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="p-3 md:p-4 border-b border-border bg-muted/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-foreground font-semibold text-sm">
           <div className="flex items-center gap-2">
             <Package className="w-4 h-4 text-secondary" />
             Sipariş İçeriği ({order.items?.length || 0} Çeşit)
           </div>
           
           <div className="flex items-center gap-2 flex-wrap">
             {order.status === "PENDING" && (
                <Button size="sm" className="touch-target" onClick={() => updateStatus("PROCESSING")} disabled={updating}>Hazırlanıyor Olarak İşaretle</Button>
             )}
             {order.status === "PROCESSING" && (
                <Button size="sm" className="bg-chart-3 hover:bg-chart-3/90 text-white touch-target" onClick={() => updateStatus("READY_FOR_SHIPMENT")} disabled={updating}>
                  Siparişi Bitir (Sevkiyata Hazır)
                </Button>
             )}
             {order.status === "SHIPPED" && (
                <Button size="sm" onClick={shareOrderWhatsapp} className="bg-[#25D366] hover:bg-[#20bd5a] text-white touch-target">
                  <MessageCircle className="w-4 h-4 mr-2" /> WhatsApp ile Bildir
                </Button>
             )}
           </div>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden divide-y divide-border">
          {order.items?.map((item: any) => (
            <div key={item.id} className="p-3 flex gap-3">
              <div className="w-12 h-12 bg-muted/50 rounded-lg overflow-hidden shrink-0 border border-border">
                {item.product?.images?.[0] ? (
                   <img src={item.product.images[0].thumbUrl || item.product.images[0].originalUrl} className="w-full h-full object-cover" alt="th" />
                ) : (
                   <span className="text-[10px] w-full h-full flex items-center justify-center text-muted-foreground/30">
                     <Package className="w-4 h-4" />
                   </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-foreground text-sm line-clamp-2">{item.product?.name || "Bilinmeyen Ürün"}</div>
                <div className="text-xs text-muted-foreground mt-1">₺{item.unitPrice.toFixed(2)} × {item.quantity}</div>
                <div className="font-bold text-foreground text-sm mt-1">₺{(item.unitPrice * item.quantity).toFixed(2)}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block">
          <Table>
              <TableHeader>
                <TableRow className="bg-muted/20">
                  <TableHead>Ürün</TableHead>
                  <TableHead>Birim Fiyat</TableHead>
                  <TableHead>Miktar</TableHead>
                  <TableHead className="text-right">Toplam</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.items?.map((item: any) => (
                  <TableRow key={item.id} className="hover:bg-muted/20">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-muted/50 rounded-lg overflow-hidden shrink-0 border border-border">
                          {item.product?.images?.[0] ? (
                             <img src={item.product.images[0].thumbUrl || item.product.images[0].originalUrl} className="w-full h-full object-cover" alt="th" />
                          ) : (
                             <span className="text-[10px] w-full h-full flex items-center justify-center text-muted-foreground/30">
                               <Package className="w-4 h-4" />
                             </span>
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-foreground line-clamp-2 text-sm">{item.product?.name || "Bilinmeyen Ürün"}</div>
                          <div className="text-xs text-muted-foreground">{item.product?.barcode || "-"}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">₺{item.unitPrice.toFixed(2)}</TableCell>
                    <TableCell className="font-medium text-sm">× {item.quantity}</TableCell>
                    <TableCell className="text-right font-semibold text-foreground">₺{(item.unitPrice * item.quantity).toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
        </div>
      </div>

      {order.status === "READY_FOR_SHIPMENT" && (
        <div className="bg-secondary/5 border border-secondary/20 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <Truck className="w-8 h-8 text-secondary shrink-0" />
          <div className="flex-1">
            <h4 className="font-semibold text-foreground">Ambara Teslim Et</h4>
            <p className="text-sm text-muted-foreground">Sipariş paketlendi, ambar bilgileriyle teslimatı tamamlayın.</p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
            <Input placeholder="Ambar Firması" className="w-full sm:w-40 bg-card h-11" value={logisticsCompany} onChange={e=>setLogisticsCompany(e.target.value)} />
            <Input placeholder="Koli Adeti" type="number" className="w-full sm:w-24 bg-card h-11" value={boxCount} onChange={e=>setBoxCount(e.target.value)} />
            <Button className="w-full sm:w-auto h-11 touch-target" onClick={() => updateStatus("SHIPPED", { logisticsCompany, boxCount })} disabled={updating || !logisticsCompany || !boxCount}>
               Sevk Edildi
            </Button>
          </div>
        </div>
      )}

      {order.status === "SHIPPED" && order.logisticsCompany && (
        <div className="bg-chart-2/5 border border-chart-2/20 p-4 rounded-xl flex items-center gap-4">
          <CheckCircle2 className="w-8 h-8 text-chart-2 shrink-0" />
          <div>
            <h4 className="font-semibold text-foreground">Sipariş Sevk Edildi</h4>
            <p className="text-sm text-muted-foreground">
              Ambar: <strong className="text-foreground">{order.logisticsCompany}</strong>, Koli Adeti: <strong className="text-foreground">{order.boxCount}</strong>
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
