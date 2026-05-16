import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, User, Calendar, Tag, Package, CheckCircle2, Truck, MessageCircle } from "lucide-react";
import { Input } from "@/components/ui/input";

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

  if (loading && !order) return <div className="p-4">Yükleniyor...</div>;
  if (!order) return <div className="p-4 text-red-500">Sipariş bulunamadı</div>;

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-4">
        <Link to="/admin/orders" className="inline-flex items-center justify-center size-8 border rounded-lg bg-background hover:bg-muted hover:text-foreground font-medium transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="ml-auto flex items-center gap-2">
            {order.status === "PENDING" && <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-800 font-medium text-xs">YENİ SİPARİŞ</span>}
            {order.status === "PROCESSING" && <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 font-medium text-xs">HAZIRLANIYOR</span>}
            {order.status === "READY_FOR_SHIPMENT" && <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-800 font-medium text-xs">SEVKİYATA HAZIR</span>}
            {order.status === "SHIPPED" && <span className="px-3 py-1 rounded-full bg-green-100 text-green-800 font-medium text-xs">SEVK EDİLDİ</span>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border rounded-lg p-3 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-2 text-indigo-600 mb-2 border-b pb-2">
             <User className="w-4 h-4" />
             <h3 className="font-semibold text-sm text-slate-800">Müşteri Bilgileri</h3>
          </div>
          {order.customer ? (
            <div className="text-xs space-y-1 text-slate-600">
               <p><strong className="text-slate-800">İsim:</strong> {order.customer.name}</p>
               <p><strong className="text-slate-800">Tel:</strong> {order.customer.phone || "-"}</p>
               <p className="line-clamp-1" title={order.customer.address}><strong className="text-slate-800">Adres:</strong> {order.customer.address || "-"}</p>
            </div>
          ) : (
            <p className="text-xs text-slate-500">Müşteri bilgisi eklenmemiş.</p>
          )}
        </div>

        <div className="bg-white border rounded-lg p-3 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-2 text-indigo-600 mb-2 border-b pb-2">
             <Calendar className="w-4 h-4" />
             <h3 className="font-semibold text-sm text-slate-800">Sipariş Özeti</h3>
          </div>
          <div className="text-xs space-y-1 text-slate-600 flex-1">
             <p><strong className="text-slate-800">Tarih:</strong> {new Date(order.createdAt).toLocaleString("tr-TR")}</p>
             <p className="line-clamp-1" title={order.notes}><strong className="text-slate-800">Not:</strong> {order.notes || "-"}</p>
          </div>
          <div className="pt-2 mt-2 border-t font-semibold text-sm flex justify-between">
            <span className="text-slate-800">Toplam Tutar:</span>
            <span className="text-indigo-700">₺{order.totalAmount.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="bg-white border rounded-xl shadow-sm overflow-hidden flex-1 flex flex-col">
        <div className="p-3 border-b bg-slate-50 flex items-center justify-between text-slate-800 font-semibold text-sm">
           <div className="flex items-center gap-2">
             <Package className="w-4 h-4 text-indigo-600" />
             Sipariş İçeriği ({order.items?.length || 0} Çeşit)
           </div>
           
           <div className="flex items-center gap-2">
             {order.status === "PENDING" && (
                <Button size="sm" onClick={() => updateStatus("PROCESSING")} disabled={updating}>Hazırlanıyor Olarak İşaretle</Button>
             )}
             {order.status === "PROCESSING" && (
                <Button size="sm" className="bg-amber-600 hover:bg-amber-700" onClick={() => updateStatus("READY_FOR_SHIPMENT")} disabled={updating}>
                  Siparişi Bitir (Sevkiyata Hazır)
                </Button>
             )}
             {order.status === "SHIPPED" && (
                <Button size="sm" onClick={shareOrderWhatsapp} className="bg-[#25D366] hover:bg-[#20bd5a] text-white">
                  <MessageCircle className="w-4 h-4 mr-2" /> Siparişi WhatsApp ile Bildir
                </Button>
             )}
           </div>
        </div>
        <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="">Ürün</TableHead>
                <TableHead>Birim Fiyat</TableHead>
                <TableHead>Miktar</TableHead>
                <TableHead className="text-right">Toplam</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.items?.map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-100 rounded overflow-hidden shrink-0">
                        {item.product?.images?.[0] ? (
                           <img src={item.product.images[0].thumbUrl || item.product.images[0].originalUrl} className="w-full h-full object-cover" alt="th" />
                        ) : (
                           <span className="text-[10px] w-full h-full flex items-center justify-center text-slate-400">Görsel Yok</span>
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-slate-800 line-clamp-2 text-sm sm:text-base">{item.product?.name || "Bilinmeyen Ürün"}</div>
                        <div className="text-xs text-muted-foreground">{item.product?.barcode || "-"}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>₺{item.unitPrice.toFixed(2)}</TableCell>
                  <TableCell className="font-medium">x {item.quantity}</TableCell>
                  <TableCell className="text-right font-semibold text-slate-900">₺{(item.unitPrice * item.quantity).toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
      </div>

      {order.status === "READY_FOR_SHIPMENT" && (
        <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex flex-col sm:flex-row items-center gap-4">
          <Truck className="w-8 h-8 text-blue-600 shrink-0" />
          <div className="flex-1">
            <h4 className="font-semibold text-blue-900">Ambara Teslim Et</h4>
            <p className="text-sm text-blue-700">Sipariş paketlendi, ambar bilgileriyle teslimatı tamamlayın.</p>
          </div>
          <div className="flex items-center gap-2">
            <Input placeholder="Ambar Firması" className="w-40 bg-white" value={logisticsCompany} onChange={e=>setLogisticsCompany(e.target.value)} />
            <Input placeholder="Koli Adeti" type="number" className="w-24 bg-white" value={boxCount} onChange={e=>setBoxCount(e.target.value)} />
            <Button onClick={() => updateStatus("SHIPPED", { logisticsCompany, boxCount })} disabled={updating || !logisticsCompany || !boxCount}>
               Sevk Edildi
            </Button>
          </div>
        </div>
      )}

      {order.status === "SHIPPED" && order.logisticsCompany && (
        <div className="bg-green-50 border border-green-200 p-4 rounded-xl flex items-center gap-4">
          <CheckCircle2 className="w-8 h-8 text-green-600 shrink-0" />
          <div>
            <h4 className="font-semibold text-green-900">Sipariş Sevk Edildi</h4>
            <p className="text-sm text-green-800">
              Ambar: <strong>{order.logisticsCompany}</strong>, Koli Adeti: <strong>{order.boxCount}</strong>
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
