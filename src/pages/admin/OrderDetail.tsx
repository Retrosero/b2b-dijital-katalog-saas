import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuthStore } from "@/store/useAuthStore";
import { usePageHeaderStore } from "@/store/usePageHeaderStore";
import { Package, Printer, Truck } from "lucide-react";

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
      actions: [
        {
          key: "print-invoice",
          label: "Yazdır",
          icon: <Printer className="w-5 h-5" />,
          onClick: () => window.print()
        }
      ]
    });
    return resetHeader;
  }, [order, setHeader, resetHeader]);

  if (loading && !order) return <div className="p-4 text-muted-foreground">Yükleniyor...</div>;
  if (!order) return <div className="p-4 text-destructive">Sipariş bulunamadı</div>;

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
    <div className="invoice-print-page w-full animate-fade-in">
      <div className="invoice-paper bg-card border border-border shadow-sm overflow-hidden">
        <div className="border-b-2 border-primary px-4 py-4 md:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-extrabold tracking-normal text-primary">FATURA</h1>
              <p className="mt-1 text-xs font-medium text-muted-foreground">{order.orderNumber}</p>
            </div>
            <div className="flex items-start sm:items-end">
              <p className="border border-primary/25 bg-primary/5 px-3 py-1.5 text-sm font-bold text-primary">
                {formatDate(order.createdAt)}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 border-b border-border bg-card px-4 py-3 md:grid-cols-2 md:px-6">
          <div className="border border-border">
            <div className="border-b border-border bg-muted px-3 py-1.5">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Satıcı Bilgileri</p>
            </div>
            <div className="min-h-20 px-3 py-2.5">
              <p className="text-sm font-bold text-foreground">{user?.tenant?.name || "Firma Adı"}</p>
              <p className="mt-1 text-xs text-muted-foreground">Satıcı firma</p>
            </div>
          </div>

          <div className="border border-border">
            <div className="border-b border-border bg-muted px-3 py-1.5">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Alıcı Bilgileri</p>
            </div>
            <div className="min-h-20 px-3 py-2.5">
              <p className="text-sm font-bold text-foreground">{order.customer?.name || "-"}</p>
              <p className="mt-1 text-xs text-muted-foreground">Müşteri</p>
            </div>
          </div>
        </div>

        <div className="px-4 py-4 md:px-6">
          <div className="border border-border overflow-hidden">
            <div className="brand-gradient px-3 py-2 text-white">
              <div className="grid grid-cols-12 gap-2 text-[10px] font-bold uppercase tracking-[0.12em]">
                <div className="col-span-6 md:col-span-7">Ürün Açıklaması</div>
                <div className="col-span-2 text-center">Adet</div>
                <div className="hidden text-right md:col-span-1 md:block">Birim</div>
                <div className="col-span-4 text-right md:col-span-2">Tutar</div>
              </div>
            </div>
            <div className="divide-y divide-border">
              {order.items?.map((item: any) => (
                <div key={item.id} className="invoice-print-break-avoid grid min-h-12 grid-cols-12 gap-2 px-3 py-3 items-center transition-colors hover:bg-muted/20">
                  <div className="col-span-6 min-w-0 md:col-span-7">
                    <p className="text-sm font-semibold text-foreground">{item.product?.name || "Bilinmeyen Ürün"}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground md:hidden">{formatPrice(Number(item.unitPrice))} / birim</p>
                    {item.note && <p className="mt-1 text-xs text-muted-foreground">Not: {item.note}</p>}
                  </div>
                  <div className="col-span-2 text-center">
                    <span className="inline-flex min-w-8 items-center justify-center border border-border bg-card px-2 py-1 text-xs font-bold text-foreground">
                      {item.quantity}
                    </span>
                  </div>
                  <div className="hidden text-right md:col-span-1 md:block">
                    <p className="text-xs font-medium text-foreground/80">{formatPrice(Number(item.unitPrice))}</p>
                  </div>
                  <div className="col-span-4 text-right md:col-span-2">
                    <p className="text-sm font-bold text-foreground">{formatPrice(Number(item.quantity) * Number(item.unitPrice))}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="invoice-print-break-avoid flex justify-end mt-4">
            <div className="w-full border border-border sm:w-72">
              <div className="flex justify-between items-center border-b border-border px-3 py-2 text-xs">
                <span className="text-muted-foreground">Ara Toplam</span>
                <span className="font-medium text-foreground/80">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between items-center border-b border-border px-3 py-2 text-xs">
                <span className="text-muted-foreground">KDV (%{kdvRate})</span>
                <span className="font-medium text-foreground/80">{formatPrice(kdvAmount)}</span>
              </div>
              <div className="flex justify-between items-center bg-muted px-3 py-2.5">
                <span className="text-sm font-extrabold text-foreground">Genel Toplam</span>
                <span className="text-base font-extrabold text-foreground">{formatPrice(totalAmount)}</span>
              </div>
            </div>
          </div>

          {order.notes && (
            <div className="invoice-print-break-avoid mt-4 border border-border bg-card p-3">
              <p className="mb-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Sipariş Notu</p>
              <p className="text-xs text-foreground">{order.notes}</p>
            </div>
          )}

          {(order.status === "SHIPPED" || order.status === "COMPLETED") && (order.boxCount || order.logisticsCompany) && (
            <div className="invoice-print-break-avoid mt-4 border border-border bg-card p-3">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.12em] mb-2">Sevk Bilgisi</p>
              <div className="flex flex-wrap gap-4">
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

        <div className="bg-muted/40 px-4 py-2 border-t border-border md:px-6">
          <p className="text-center text-[10px] text-muted-foreground/60">Bu fatura satSatma Dijital Katalog sistemi tarafından oluşturulmuştur.</p>
        </div>
      </div>
    </div>
  );
}
