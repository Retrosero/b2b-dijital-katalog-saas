import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuthStore } from "@/store/useAuthStore";
import { usePageHeaderStore } from "@/store/usePageHeaderStore";
import { FileText, Building2, User, Calendar, Package, Truck } from "lucide-react";

const statusMap: Record<string, { label: string; className: string }> = {
  PENDING: { label: "Yeni Sipariş", className: "status-pending" },
  APPROVED: { label: "Onaylandı", className: "status-approved" },
  PROCESSING: { label: "Hazırlanıyor", className: "status-processing" },
  READY_FOR_SHIPMENT: { label: "Sevkiyata Hazır", className: "status-ready" },
  SHIPPED: { label: "Sevk Edildi", className: "status-shipped" },
  COMPLETED: { label: "Tamamlandı", className: "status-completed" },
  CANCELLED: { label: "İptal Edildi", className: "status-cancelled" },
};

export default function OrderDetail() {
  const { id } = useParams();
  const { token, user } = useAuthStore();
  const { setHeader, resetHeader } = usePageHeaderStore();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchOrder = async () => {
    setLoading(true);
    const res = await fetch(`/api/orders/${id}`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    setOrder(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchOrder();
  }, [id, token]);

  useEffect(() => {
    setHeader({
      title: order?.orderNumber || "Fatura Detayı",
      subtitle: order?.customer?.name || null,
      backTo: "/admin/orders",
      actions: []
    });
    return resetHeader;
  }, [order, setHeader, resetHeader]);

  if (loading && !order) return <div className="p-4 text-muted-foreground">Yükleniyor...</div>;
  if (!order) return <div className="p-4 text-destructive">Sipariş bulunamadı</div>;

  const st = statusMap[order.status] || { label: order.status, className: "status-pending" };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(price);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  };

  const subtotal = order.items?.reduce((sum: number, item: any) => {
    return sum + (Number(item.quantity) * Number(item.unitPrice));
  }, 0) || 0;

  const kdvRate = 20;
  const kdvAmount = subtotal * (kdvRate / 100);
  const totalAmount = subtotal + kdvAmount;

  return (
    <div className="space-y-4 w-full animate-fade-in">
      {/* Compact Invoice Container */}
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        {/* Slim Invoice Header */}
        <div className="brand-gradient px-4 py-3 md:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-card/10 flex items-center justify-center">
                <FileText className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-lg font-bold text-white">FATURA</h1>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/20 text-white">
              {st.label}
            </span>
          </div>
        </div>

        {/* Seller & Buyer & Date Info - Single Row */}
        <div className="px-4 py-3 md:px-6 bg-muted/30 border-b border-border">
          <div className="flex gap-3 md:gap-4">
            {/* Seller Info - 45% */}
            <div className="w-[45%] flex items-start gap-2">
              <Building2 className="w-4 h-4 text-muted-foreground/60 mt-0.5" />
              <div>
                <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wide">Satıcı</p>
                <p className="text-sm font-bold text-foreground">{user?.tenant?.name || "Firma Adı"}</p>
              </div>
            </div>

            {/* Buyer Info - 45% */}
            <div className="w-[45%] flex items-start gap-2">
              <User className="w-4 h-4 text-muted-foreground/60 mt-0.5" />
              <div>
                <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wide">Alıcı</p>
                <p className="text-sm font-bold text-foreground">{order.customer?.name || "-"}</p>
              </div>
            </div>

            {/* Date Info - 10% */}
            <div className="w-[10%] flex items-start gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground/60 mt-0.5" />
              <div>
                <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wide">Tarih</p>
                <p className="text-sm font-semibold text-foreground/80">{formatDate(order.createdAt)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Products Table */}
        <div className="px-4 py-3 md:px-6">
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="bg-muted px-3 py-2 border-b border-border">
              <div className="grid grid-cols-12 gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                <div className="col-span-5">Ürün</div>
                <div className="col-span-2 text-center">Birim Fiyat</div>
                <div className="col-span-2 text-center">Adet</div>
                <div className="col-span-3 text-right">Toplam</div>
              </div>
            </div>
            <div className="divide-y divide-border">
              {order.items?.map((item: any) => (
                <div key={item.id} className="grid grid-cols-12 gap-2 px-3 py-2 items-center hover:bg-muted/30 transition-colors">
                  <div className="col-span-5">
                    <p className="text-sm font-medium text-foreground line-clamp-1">{item.product?.name || "Bilinmeyen Ürün"}</p>
                  </div>
                  <div className="col-span-2 text-center">
                    <p className="text-sm font-medium text-foreground/80">{formatPrice(Number(item.unitPrice))}</p>
                  </div>
                  <div className="col-span-2 text-center">
                    <span className="inline-flex items-center justify-center min-w-[24px] h-5 rounded bg-muted text-xs font-semibold text-foreground/80">
                      {item.quantity}
                    </span>
                  </div>
                  <div className="col-span-3 text-right">
                    <p className="text-sm font-bold text-foreground">{formatPrice(Number(item.quantity) * Number(item.unitPrice))}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="flex justify-end mt-4">
            <div className="w-full sm:w-64 md:w-72 flex flex-col gap-1">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Ara Toplam</span>
                <span className="font-medium text-foreground/80">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">KDV (%{kdvRate})</span>
                <span className="font-medium text-foreground/80">{formatPrice(kdvAmount)}</span>
              </div>
              <div className="flex justify-between items-center py-2 px-3 bg-primary rounded-lg text-white mt-1">
                <span className="text-sm font-bold">Genel Toplam</span>
                <span className="text-base font-bold">{formatPrice(totalAmount)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {order.notes && (
            <div className="mt-4 rounded-lg border border-primary/20 bg-primary/10 p-3">
              <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">Sipariş Notu</p>
              <p className="text-xs text-foreground">{order.notes}</p>
            </div>
          )}

          {/* Shipment Info - shown when shipped */}
          {(order.status === "SHIPPED" || order.status === "COMPLETED") && (order.boxCount || order.logisticsCompany) && (
            <div className="mt-4 p-3 bg-secondary/10 border border-secondary/20 rounded-lg">
              <p className="text-[10px] font-semibold text-secondary uppercase tracking-wide mb-2">Sevk Bilgisi</p>
              <div className="flex gap-4">
                {order.logisticsCompany && (
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-secondary" />
                    <span className="text-sm text-foreground">{order.logisticsCompany}</span>
                  </div>
                )}
                {order.boxCount && (
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-secondary" />
                    <span className="text-sm text-foreground">{order.boxCount} Koli</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Invoice Footer */}
        <div className="bg-muted/40 px-4 py-2 border-t border-border">
          <p className="text-[10px] text-muted-foreground/60">Bu fatura dijital katalog sistemi tarafından oluşturulmuştur.</p>
        </div>
      </div>
    </div>
  );
}
