import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/button";
import { Edit3, Image as ImageIcon, Package } from "lucide-react";
import { usePageHeaderStore } from "@/store/usePageHeaderStore";

export default function ProductDetail() {
  const { id } = useParams();
  const { token, user } = useAuthStore();
  const { setHeader, resetHeader } = usePageHeaderStore();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [storageInfo, setStorageInfo] = useState<{used: number; limit: number} | null>(null);
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
    // Fetch storage info for the tenant
    if (user?.tenantId) {
      fetch(`/api/tenants/${user.tenantId}/storage`, { headers: { Authorization: `Bearer ${token}` } })
        .then((res) => res.json())
        .then((data) => {
          // Map API response (usedBytes/limitBytes) to component state (used/limit)
          if (data.usedBytes !== undefined && data.limitBytes !== undefined) {
            setStorageInfo({ 
              used: Number(data.usedBytes) || 0, 
              limit: Number(data.limitBytes) || 0 
            });
          }
        })
        .catch(() => {});
    }
  }, [user?.tenantId, token]);

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

    // Check storage limit before uploading
    if (storageInfo && storageInfo.limit > 0) {
      const usedBytes: number = Number(storageInfo.used) || 0;
      const limitBytes: number = Number(storageInfo.limit) || 0;
      let totalFileSize: number = 0;
      for (let i = 0; i < e.target.files.length; i++) {
        totalFileSize += e.target.files[i].size || 0;
      }
      const estimatedTotal: number = usedBytes + totalFileSize;
      
      if (estimatedTotal > limitBytes) {
        const usedGB = (usedBytes / (1024 * 1024 * 1024)).toFixed(2);
        const limitGB = (limitBytes / (1024 * 1024 * 1024)).toFixed(2);
        const remainingGB = ((limitBytes - usedBytes) / (1024 * 1024 * 1024)).toFixed(2);
        
        alert(`Yetersiz depolama alanı!\n\nKullanılan: ${usedGB} GB / ${limitGB} GB\nKalan: ${remainingGB} GB\n\nYüklemek istediğiniz dosyalar: ${(totalFileSize / (1024 * 1024)).toFixed(2)} MB\n\nLütfen önce mevcut görselleri silin veya depolama alanınızı yükseltin.`);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
    }

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

  if (loading) return <div className="p-4 text-muted-foreground">Yükleniyor...</div>;
  if (!product) return <div className="p-4 text-destructive">Ürün bulunamadı</div>;

  const images = (product.images || []).filter((img: any) => img.status === "active");

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

          {/* Storage Warning Banner */}
          {storageInfo && storageInfo.limit > 0 && (
            <div className={`mb-4 p-3 rounded-lg border ${
              (storageInfo.used / storageInfo.limit) > 0.9 
                ? "bg-destructive/10 border-destructive/30 text-destructive" 
                : (storageInfo.used / storageInfo.limit) > 0.7
                ? "bg-chart-3/10 border-chart-3/30 text-chart-3"
                : "bg-secondary/5 border-secondary/20 text-secondary"
            }`}>
              <div className="flex items-center justify-between text-xs font-medium mb-2">
                <span>Depolama Alanı</span>
                <span>{((storageInfo.used) / (1024 * 1024 * 1024)).toFixed(2)} GB / {((storageInfo.limit) / (1024 * 1024 * 1024)).toFixed(2)} GB</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden mb-2">
                <div 
                  className={`h-full rounded-full transition-all ${
                    (storageInfo.used / storageInfo.limit) > 0.9 ? "bg-destructive" :
                    (storageInfo.used / storageInfo.limit) > 0.7 ? "bg-chart-3" : "bg-secondary"
                  }`}
                  style={{ width: `${Math.min(100, (storageInfo.used / storageInfo.limit) * 100)}%` }}
                />
              </div>
              <div className="text-xs opacity-80">
                Kalan: {((Math.max(0, storageInfo.limit - storageInfo.used)) / (1024 * 1024 * 1024)).toFixed(2)} GB
              </div>
            </div>
          )}

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
    </div>
  );
}
