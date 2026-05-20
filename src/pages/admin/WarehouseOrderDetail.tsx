import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/button";
import { Package, Truck, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { usePageHeaderStore } from "@/store/usePageHeaderStore";

export default function WarehouseOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuthStore();
  const { setHeader, resetHeader } = usePageHeaderStore();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [logisticsCompany, setLogisticsCompany] = useState("");
  const [boxCount, setBoxCount] = useState("");
  const [pickedQuantities, setPickedQuantities] = useState<Record<string, number | "">>({});

  const fetchOrder = async () => {
    setLoading(true);
    const res = await fetch(`/api/orders/${id}`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    setOrder(data);
    setLogisticsCompany(data?.logisticsCompany || "");
    setBoxCount(data?.boxCount?.toString() || "");

    const initialPicked: Record<string, number | ""> = {};
    (data?.items || []).forEach((item: any) => {
      initialPicked[item.id] = "";
    });
    setPickedQuantities(initialPicked);
    setLoading(false);
  };

  useEffect(() => {
    fetchOrder();
  }, [id, token]);

  useEffect(() => {
    setHeader({
      title: order?.orderNumber || "Sipariş Toplama",
      subtitle: order?.customer?.name || null,
      backTo: "/admin/warehouse",
      actions: []
    });
    return resetHeader;
  }, [order, setHeader, resetHeader]);

  const isPickingStage = order?.status === "PROCESSING" || order?.status === "READY_FOR_SHIPMENT" || order?.status === "PENDING";

  const pickedTotalAmount = useMemo(() => {
    if (!order?.items) return 0;
    return order.items.reduce((sum: number, item: any) => {
      const qty = Number(pickedQuantities[item.id] ?? 0) || 0;
      return sum + qty * Number(item.unitPrice || 0);
    }, 0);
  }, [order, pickedQuantities]);

  const setItemQty = (itemId: string, next: number, max: number) => {
    const clamped = Math.max(0, Math.min(max, next));
    setPickedQuantities((prev) => ({ ...prev, [itemId]: clamped }));
  };

  const completePicking = async () => {
    if (!order?.items?.length) return;
    setUpdating(true);
    const pickedItems = order.items.map((item: any) => ({
      itemId: item.id,
      pickedQuantity: Number(pickedQuantities[item.id] ?? 0),
    }));
    const res = await fetch(`/api/orders/${id}/pick-complete`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        pickedItems,
        logisticsCompany,
        boxCount,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.error || "Toplama tamamlama sırasında hata oluştu.");
    }
    await fetchOrder();
    setUpdating(false);
  };

  if (loading && !order) return <div className="p-4 text-muted-foreground">Yükleniyor...</div>;
  if (!order) return <div className="p-4 text-destructive">Sipariş bulunamadı</div>;

  return (
    <div className="space-y-4 w-full animate-fade-in">
      <button
        onClick={() => navigate("/admin/warehouse")}
        className="lg:hidden flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Depo'ya Dön
      </button>

      <div className="bg-card border-0 md:border md:border-border rounded-xl p-3 md:p-4">
        <div className="flex items-center gap-2 font-semibold text-sm mb-3">
          <Package className="w-4 h-4 text-secondary" />
          Sipariş Toplama
        </div>

        {order.notes && (
          <div className="mb-3 rounded-lg border border-border bg-muted/20 px-3 py-2">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Fatura Açıklaması</div>
            <div className="mt-1 text-xs text-foreground">{order.notes}</div>
          </div>
        )}

        <div className="space-y-3">
          {order.items?.map((item: any) => {
            const maxQty = Number(item.quantity) || 0;
            const picked = Number(pickedQuantities[item.id] ?? 0);
            const productImage =
              item.product?.images?.[0]?.thumbUrl ||
              item.product?.images?.[0]?.originalUrl ||
              item.product?.imageUrl ||
              null;

            return (
              <div key={item.id} className="rounded-xl border border-border p-3 bg-card shadow-sm ring-1 ring-border/60">
                <div className="flex gap-3">
                  <div className="w-14 h-14 rounded-lg overflow-hidden bg-card border-0 md:border md:border-border shrink-0 flex items-center justify-center">
                    {productImage ? (
                      <img src={productImage} alt={item.product?.name || "Ürün"} className="w-full h-full object-cover" />
                    ) : (
                      <Package className="w-5 h-5 text-muted-foreground/40" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm text-foreground line-clamp-2">{item.product?.name || "Bilinmeyen Ürün"}</div>
                    <div className="text-xs text-muted-foreground mt-1">Sipariş: {maxQty} adet • Birim: ₺{Number(item.unitPrice).toFixed(2)}</div>
                    {item.note && (
                      <div className="mt-1.5">
                        <span className="inline-flex items-center rounded-md border border-secondary/30 bg-secondary/10 px-2 py-0.5 text-[11px] font-semibold text-secondary">
                          Not: {item.note}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {isPickingStage ? (
                  <div className="mt-3 space-y-2">
                    <div className="text-xs font-bold uppercase tracking-wide text-secondary">Toplanacak Adet</div>
                    <div className="flex items-center gap-2 w-full">
                      <button type="button" className="h-11 w-11 rounded-lg border border-border bg-card text-xl font-bold shrink-0" onClick={() => setItemQty(item.id, picked - 1, maxQty)}>-</button>
                      <Input
                        type="number"
                        className="h-11 flex-1 text-center text-2xl font-extrabold border-secondary/40 focus-visible:ring-secondary"
                        value={pickedQuantities[item.id] ?? ""}
                        min={0}
                        max={maxQty}
                        onChange={(e) => {
                          const raw = e.target.value;
                          if (raw === "") {
                            setPickedQuantities((prev) => ({ ...prev, [item.id]: "" }));
                            return;
                          }
                          const parsed = Number(raw);
                          if (!Number.isNaN(parsed)) setItemQty(item.id, parsed, maxQty);
                        }}
                      />
                      <button type="button" className="h-11 w-11 rounded-lg border border-border bg-card text-xl font-bold shrink-0" onClick={() => setItemQty(item.id, picked + 1, maxQty)}>+</button>
                      <div className="ml-1 text-sm md:text-xs font-bold text-foreground min-w-[72px] text-right">/ {maxQty}</div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 text-sm font-semibold">Sevk edilen: {maxQty} adet</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {isPickingStage && (
        <div className="bg-card border border-border rounded-xl p-3 md:p-4 space-y-3">
          <div className="flex items-center gap-2 font-semibold text-sm">
            <Truck className="w-4 h-4 text-secondary" />
            Sevk Bilgisi
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <Input placeholder="Ambar firması" value={logisticsCompany} onChange={(e) => setLogisticsCompany(e.target.value)} className="h-11" />
            <Input placeholder="Koli adedi" type="number" value={boxCount} onChange={(e) => setBoxCount(e.target.value)} className="h-11" />
            <div className="h-11 px-3 rounded-lg border border-border bg-muted/20 flex items-center text-sm font-semibold">
              Toplam: ₺{pickedTotalAmount.toFixed(2)}
            </div>
          </div>
          <Button className="w-full h-11 font-semibold" onClick={completePicking} disabled={updating}>
            {updating ? "Güncelleniyor..." : "Toplamayı Tamamla ve Sevk Et"}
          </Button>
          <p className="text-xs text-muted-foreground">
            Eksik toplama yaparsanız sipariş adetleri ve toplam tutar sevk edilen miktara göre güncellenir.
          </p>
        </div>
      )}
    </div>
  );
}
