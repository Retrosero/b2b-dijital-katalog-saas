import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/button";
import { Edit3, Image as ImageIcon, Package } from "lucide-react";
import { usePageHeaderStore } from "@/store/usePageHeaderStore";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function ProductDetail() {
  const { id } = useParams();
  const { token, user } = useAuthStore();
  const { setHeader, resetHeader } = usePageHeaderStore();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedYear, setSelectedYear] = useState<string>("ALL");
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = () => {
    fetch(`/api/products/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then((data) => {
        setProduct(data);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, [id, token]);

  useEffect(() => {
    setHeader({
      title: product?.name || "Ürün Detayı",
      subtitle: product ? "Ürün detayları, stok bilgisi ve görsel yönetimi" : null,
      backTo: "/admin/products",
      actions: user?.role !== "SUPER_ADMIN" && id ? [
        {
          key: "edit-product",
          label: "Düzenle",
          to: `/admin/products/edit/${id}`,
          icon: <Edit3 className="w-5 h-5" />,
          variant: "secondary"
        }
      ] : []
    });
    return resetHeader;
  }, [id, product, user?.role, setHeader, resetHeader]);

  const handleFileUpload = async (e: any) => {
    if (!e.target.files || e.target.files.length === 0) return;

    setUploading(true);
    for (let i = 0; i < e.target.files.length; i++) {
      const file = e.target.files[i];
      const fd = new FormData();
      fd.append("image", file);

      try {
        const res = await fetch(`/api/products/${id}/images`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        });

        let data: any = {};
        try {
          data = await res.json();
        } catch (_) {}

        if (!res.ok || !data.success) {
          const detail = [
            data.message,
            data.error ? `Detay: ${data.error}` : null,
            data.code ? `Kod: ${data.code}` : null,
          ]
            .filter(Boolean)
            .join("\n");
          console.error("[Upload Error] HTTP", res.status, data);
          alert(`Resim yüklenemedi (HTTP ${res.status})\n\n${detail || "Bilinmeyen hata"}`);
        }
      } catch (err: any) {
        console.error("[Upload Fetch Error]", err);
        alert(`Ağ hatası: ${err?.message || err}`);
      }
    }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    loadData();
  };

  const setMainImage = async (imageId: string) => {
    const res = await fetch(`/api/products/${id}/images/${imageId}/main`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) loadData();
  };

  const deleteImage = async (imageId: string) => {
    if (!confirm("Emin misiniz?")) return;
    const res = await fetch(`/api/products/${id}/images/${imageId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) loadData();
  };

  const openInvoicePopup = async (orderId: string) => {
    setInvoiceOpen(true);
    setInvoiceLoading(true);
    setSelectedInvoice(null);
    try {
      const res = await fetch(`/api/orders/${orderId}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) setSelectedInvoice(data);
    } finally {
      setInvoiceLoading(false);
    }
  };

  if (loading) return <div className="p-4 text-muted-foreground">Yükleniyor...</div>;
  if (!product) return <div className="p-4 text-destructive">Ürün bulunamadı</div>;

  const images = (product.images || []).filter((img: any) => img.status === "active");
  const salesHistory = Array.isArray(product.salesHistory) ? product.salesHistory : [];
  const availableYears = Array.from(
    new Set(
      salesHistory
        .map((sale: any) => new Date(sale.orderDate).getFullYear())
        .filter((year: number) => Number.isFinite(year))
    )
  ).sort((a, b) => Number(b) - Number(a));
  const filteredSales = salesHistory.filter((sale: any) => {
    if (selectedYear === "ALL") return true;
    return String(new Date(sale.orderDate).getFullYear()) === selectedYear;
  });

  return (
    <div className="space-y-5 md:space-y-6 w-full max-w-none animate-fade-in">
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-5 md:gap-6">
        <section className="bg-card p-5 md:p-6 rounded-xl border border-border shadow-sm space-y-4">
          <h3 className="font-bold text-foreground text-lg border-b border-border pb-3">Genel Bilgiler</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
            <div className="flex justify-between items-center py-2 border-b border-border/50">
              <span className="text-muted-foreground text-sm">Fiyat</span>
              <span className="font-bold text-foreground text-lg">₺{Number(product.price || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border/50">
              <span className="text-muted-foreground text-sm">Güncel Stok</span>
              <span className="font-medium text-foreground">{product.stock || "0"}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border/50">
              <span className="text-muted-foreground text-sm">Kritik Stok Eşiği</span>
              <span className="font-medium text-foreground">{product.stockThreshold || "0"}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border/50">
              <span className="text-muted-foreground text-sm">Barkod (SKU/EAN)</span>
              <span className="font-medium text-foreground">{product.barcode || "-"}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border/50">
              <span className="text-muted-foreground text-sm">Kolideki Adet</span>
              <span className="font-medium text-foreground">{product.piecesPerBox || "-"}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border/50">
              <span className="text-muted-foreground text-sm">Ambalaj Türü</span>
              <span className="font-medium text-foreground">{product.packagingType || "-"}</span>
            </div>
          </div>

          <div className="pt-1">
            <span className="text-muted-foreground text-sm block mb-2">Açıklama</span>
            <div className="rounded-lg border border-border bg-muted/20 p-3 text-sm text-foreground whitespace-pre-wrap min-h-[110px]">
              {product.description?.trim() || "Açıklama girilmemiş."}
            </div>
          </div>
        </section>

        <section className="bg-card p-5 md:p-6 rounded-xl border border-border shadow-sm">
          <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
            <h3 className="font-bold text-foreground text-lg">Görseller</h3>
            <label className="cursor-pointer">
              <input
                type="file"
                multiple
                accept="image/jpeg, image/png, image/webp"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileUpload}
                disabled={uploading}
              />
              <div className="flex items-center gap-1 text-sm font-medium text-secondary hover:text-secondary/80 transition-colors">
                {uploading ? "Yükleniyor..." : <><ImageIcon className="w-4 h-4" /> Ekle</>}
              </div>
            </label>
          </div>

          {images.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
              {images.map((img: any) => (
                <div key={img.id} className={`relative rounded-lg overflow-hidden border border-border aspect-square bg-muted/30 flex flex-col group ${img.isMain ? "ring-2 ring-secondary" : ""}`}>
                  <div className="flex-1 flex items-center justify-center relative overflow-hidden">
                    <img src={img.thumbUrl || img.originalUrl} className="w-full h-full object-cover transition-transform group-hover:scale-105" alt="product" />
                    {img.isMain && (
                      <div className="absolute top-2 left-2 bg-secondary text-white p-1 rounded-full shadow-sm">
                        <span className="text-[10px] font-bold">ANA</span>
                      </div>
                    )}
                  </div>
                  {user?.role !== "SUPER_ADMIN" && (
                    <div className="absolute bottom-0 left-0 right-0 p-1 opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0 bg-gradient-to-t from-black/80 to-transparent flex justify-center gap-2 pb-2">
                      {!img.isMain && (
                        <Button size="icon" variant="secondary" className="w-7 h-7 bg-white/20 hover:bg-white/40 text-white border-0" onClick={() => setMainImage(img.id)} title="Ana Görsel Yap">
                          <span className="text-[10px] font-bold">A</span>
                        </Button>
                      )}
                      <Button size="icon" variant="secondary" className="w-7 h-7 bg-white/20 hover:bg-white/40 text-red-300 hover:text-red-400 border-0" onClick={() => deleteImage(img.id)} title="Sil">
                        X
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="h-48 flex flex-col items-center justify-center text-muted-foreground bg-muted/20 rounded-lg border border-dashed border-border">
              <Package className="w-8 h-8 mb-2 opacity-30" />
              <span className="text-sm">Görsel eklenmemiş</span>
            </div>
          )}
        </section>
      </div>

      <section className="bg-card p-5 md:p-6 rounded-xl border border-border shadow-sm space-y-4">
        <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
          <h3 className="font-bold text-foreground text-lg">Satış Geçmişi</h3>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="h-9 rounded-md border border-border bg-background px-3 text-sm"
          >
            <option value="ALL">Tüm Yıllar</option>
            {availableYears.map((year) => (
              <option key={year} value={String(year)}>{year}</option>
            ))}
          </select>
        </div>

        {filteredSales.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="text-left py-2 pr-3 font-medium">Tarih</th>
                  <th className="text-left py-2 pr-3 font-medium">Müşteri</th>
                  <th className="text-left py-2 pr-3 font-medium">Sipariş No</th>
                  <th className="text-right py-2 pr-3 font-medium">Adet</th>
                  <th className="text-right py-2 font-medium">Tutar</th>
                </tr>
              </thead>
              <tbody>
                {filteredSales.map((sale: any) => (
                  <tr key={`${sale.orderId}-${sale.orderNumber}`} className="border-b border-border/50">
                    <td className="py-2 pr-3">{new Date(sale.orderDate).toLocaleDateString("tr-TR")}</td>
                    <td className="py-2 pr-3">{sale.customerName || "-"}</td>
                    <td className="py-2 pr-3">
                      <button
                        type="button"
                        onClick={() => openInvoicePopup(sale.orderId)}
                        className="text-secondary hover:underline font-medium"
                      >
                        {sale.orderNumber || "-"}
                      </button>
                    </td>
                    <td className="py-2 pr-3 text-right">{sale.quantity || 0}</td>
                    <td className="py-2 text-right font-medium">₺{Number(sale.lineTotal || 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border bg-muted/20 p-6 text-sm text-muted-foreground">
            Seçili yıl için satış kaydı bulunamadı.
          </div>
        )}
      </section>

      <Dialog open={invoiceOpen} onOpenChange={setInvoiceOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Fatura Detayı</DialogTitle>
          </DialogHeader>

          {invoiceLoading ? (
            <div className="text-sm text-muted-foreground py-4">Yükleniyor...</div>
          ) : !selectedInvoice ? (
            <div className="text-sm text-destructive py-4">Fatura detayı alınamadı.</div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                <div className="rounded-lg border border-border p-3">
                  <div className="text-muted-foreground text-xs">Fatura No</div>
                  <div className="font-semibold">{selectedInvoice.orderNumber || "-"}</div>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <div className="text-muted-foreground text-xs">Tarih</div>
                  <div className="font-semibold">{new Date(selectedInvoice.createdAt).toLocaleDateString("tr-TR")}</div>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <div className="text-muted-foreground text-xs">Müşteri</div>
                  <div className="font-semibold">{selectedInvoice.customer?.name || "-"}</div>
                </div>
              </div>

              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full min-w-[560px] text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="text-left py-2 px-3 font-medium">Ürün</th>
                      <th className="text-right py-2 px-3 font-medium">Adet</th>
                      <th className="text-right py-2 px-3 font-medium">Birim</th>
                      <th className="text-right py-2 px-3 font-medium">Tutar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedInvoice.items || []).map((item: any) => (
                      <tr key={item.id} className="border-b border-border/50">
                        <td className="py-2 px-3">{item.product?.name || "-"}</td>
                        <td className="py-2 px-3 text-right">{item.quantity}</td>
                        <td className="py-2 px-3 text-right">₺{Number(item.unitPrice || 0).toFixed(2)}</td>
                        <td className="py-2 px-3 text-right font-medium">₺{(Number(item.quantity || 0) * Number(item.unitPrice || 0)).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="text-right text-base font-bold">
                Toplam: ₺{Number(selectedInvoice.totalAmount || 0).toFixed(2)}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
