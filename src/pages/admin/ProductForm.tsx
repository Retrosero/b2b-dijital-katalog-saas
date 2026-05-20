import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, Trash2, Image as ImageIcon } from "lucide-react";
import { usePageHeaderStore } from "@/store/usePageHeaderStore";

export default function ProductForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuthStore();
  const { setHeader, resetHeader } = usePageHeaderStore();
  const isEdit = !!id;

  const [loading, setLoading] = useState(isEdit);
  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    costPrice: "",
    stock: "0",
    stockThreshold: "10",
    sku: "",
    description: "",
    barcode: "",
    piecesPerBox: "",
    packagingType: "",
    categoryId: "",
    brandId: "",
    images: [] as string[],
  });
  const [newImageUrl, setNewImageUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = async () => {
    const [resCat, resBrand] = await Promise.all([
      fetch("/api/categories", { headers: { Authorization: `Bearer ${token}` } }),
      fetch("/api/brands", { headers: { Authorization: `Bearer ${token}` } }),
    ]);

    if (resCat.ok) {
      const data = await resCat.json();
      setCategories(data.categories || []);
    }

    if (resBrand.ok) {
      const data = await resBrand.json();
      setBrands(data || []);
    }

    if (isEdit) {
      const resProd = await fetch(`/api/products/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      if (resProd.ok) {
        const p = await resProd.json();
        setFormData({
          name: p.name || "",
          price: p.price?.toString() || "",
          costPrice: p.costPrice?.toString() || "",
          stock: p.stock?.toString() || "0",
          stockThreshold: p.stockThreshold?.toString() || "10",
          sku: p.sku || "",
          description: p.description || "",
          barcode: p.barcode || "",
          piecesPerBox: p.piecesPerBox?.toString() || "",
          packagingType: p.packagingType || "",
          categoryId: p.categoryId || "",
          brandId: p.brandId || "",
          images: p.images?.map((img: any) => img.originalUrl) || [],
        });
      }
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id, token]);

  const uploadProductImages = async (productId: string, images: string[]) => {
    const localImages = images.filter((img) => img.startsWith("data:image/"));
    if (localImages.length === 0) return;

    for (let i = 0; i < localImages.length; i += 1) {
      const dataUrl = localImages[i];
      const fileResponse = await fetch(dataUrl);
      const blob = await fileResponse.blob();
      const ext = (blob.type.split("/")[1] || "jpg").replace("jpeg", "jpg");
      const file = new File([blob], `product-image-${Date.now()}-${i}.${ext}`, { type: blob.type });

      const body = new FormData();
      body.append("image", file);
      const uploadRes = await fetch(`/api/products/${productId}/images`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body
      });

      if (!uploadRes.ok) {
        const err = await uploadRes.json().catch(() => ({}));
        throw new Error(err?.message || "Görsel yüklenemedi.");
      }
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const url = isEdit ? `/api/products/${id}` : "/api/products";
      const method = isEdit ? "PUT" : "POST";
      const payload = {
        name: formData.name,
        price: formData.price,
        costPrice: formData.costPrice,
        stock: formData.stock,
        stockThreshold: formData.stockThreshold,
        sku: formData.sku,
        description: formData.description,
        barcode: formData.barcode,
        piecesPerBox: formData.piecesPerBox,
        packagingType: formData.packagingType,
        categoryId: formData.categoryId,
        brandId: formData.brandId,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Hata oluştu");
        return;
      }

      const product = await res.json();
      const productId = isEdit ? id : product?.id;
      if (productId) {
        await uploadProductImages(productId, formData.images);
      }

      navigate("/admin/products");
    } catch (error: any) {
      alert(error?.message || "Ürün kaydedildi ancak görseller yüklenemedi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    setHeader({
      title: isEdit ? "Ürün Düzenle" : "Yeni Ürün",
      subtitle: isEdit ? "Ürün bilgilerini güncelle" : "Yeni ürün kaydı oluştur",
      backTo: "/admin/products",
      actions: [
        {
          key: "save-product",
          label: isEdit ? "Güncelle" : "Kaydet",
          onClick: () => void handleSubmit(),
          icon: <Save className="w-5 h-5" />,
          variant: "secondary",
          disabled: isSubmitting
        }
      ]
    });
    return resetHeader;
  }, [isEdit, formData, token, id, setHeader, resetHeader, isSubmitting]);

  const addImage = () => {
    if (newImageUrl) {
      setFormData({ ...formData, images: [...formData.images, newImageUrl] });
      setNewImageUrl("");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, images: [...formData.images, reader.result as string] });
      };
      reader.readAsDataURL(file);
    }
  };

  const flattenCategories = (cats: any[], prefix = ""): any[] => {
    let result: any[] = [];
    cats.forEach((c) => {
      result.push({ id: c.id, name: prefix + c.name });
      if (c.children && c.children.length > 0) {
        result = result.concat(flattenCategories(c.children, prefix + "-- "));
      }
    });
    return result;
  };
  const flatCategories = flattenCategories(categories.filter((c) => !c.parentId));

  if (loading) return <div className="p-8 text-muted-foreground">Yükleniyor...</div>;

  return (
    <div className="space-y-4 md:space-y-6 w-full animate-fade-in">
      <div className="grid lg:grid-cols-3 gap-4 md:gap-6">
        <div className="lg:col-span-2 space-y-4 md:space-y-6">
          <div className="bg-card p-5 md:p-8 rounded-xl border border-border shadow-sm space-y-5 md:space-y-6">
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2 border-b border-border pb-4">
              <span className="w-1.5 h-6 bg-secondary rounded-full"></span>
              Temel Bilgiler
            </h3>
            <div className="grid md:grid-cols-2 gap-4 md:gap-6">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-foreground">Ürün Adı *</Label>
                <Input required className="h-11 border-border" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
              </div>
<div className="space-y-2">
                <Label className="text-sm font-semibold text-foreground">Birim Fiyatı (TL) *</Label>
                <Input required type="number" step="0.01" className="h-11 border-border" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-foreground">Alış Fiyatı (TL)</Label>
                <Input type="number" step="0.01" className="h-11 border-border" value={formData.costPrice} onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })} placeholder="Maliyet fiyatı" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-foreground">Stok Miktarı</Label>
                <Input required type="number" className="h-11 border-border" value={formData.stock} onChange={(e) => setFormData({ ...formData, stock: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-foreground">Kritik Stok Uyarısı (Eşik)</Label>
                <Input required type="number" className="h-11 border-border" value={formData.stockThreshold} onChange={(e) => setFormData({ ...formData, stockThreshold: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-foreground">Stok Kodu (SKU)</Label>
                <Input className="h-11 border-border" value={formData.sku} onChange={(e) => setFormData({ ...formData, sku: e.target.value })} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label className="text-sm font-semibold text-foreground">Açıklama</Label>
                <textarea
                  className="flex min-h-[110px] w-full rounded-lg border border-border bg-card px-4 py-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Ürün açıklaması..."
                />
              </div>
            </div>
          </div>

          <div className="bg-card p-5 md:p-8 rounded-xl border border-border shadow-sm space-y-5 md:space-y-6">
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2 border-b border-border pb-4">
              <span className="w-1.5 h-6 bg-chart-3 rounded-full"></span>
              Detaylar & Lojistik
            </h3>
            <div className="grid md:grid-cols-2 gap-4 md:gap-6">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-foreground">Kategori</Label>
                <select className="flex h-11 w-full rounded-lg border border-border bg-card px-4 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring touch-target"
                  value={formData.categoryId} onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}>
                  <option value="">Seçiniz</option>
                  {flatCategories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-foreground">Marka</Label>
                <select
                  className="flex h-11 w-full rounded-lg border border-border bg-card px-4 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring touch-target"
                  value={formData.brandId}
                  onChange={(e) => setFormData({ ...formData, brandId: e.target.value })}
                >
                  <option value="">Seçiniz</option>
                  {brands.map((b: any) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-foreground">Barkod</Label>
                <Input className="h-11 border-border" value={formData.barcode} onChange={(e) => setFormData({ ...formData, barcode: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-foreground">Kolideki Ürün Adedi</Label>
                <Input type="number" className="h-11 border-border" value={formData.piecesPerBox} onChange={(e) => setFormData({ ...formData, piecesPerBox: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-foreground">Ambalaj / Paket Türü</Label>
                <Input className="h-11 border-border" value={formData.packagingType} onChange={(e) => setFormData({ ...formData, packagingType: e.target.value })} />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4 md:space-y-6">
          <div className="bg-card p-5 md:p-8 rounded-xl border border-border shadow-sm space-y-5 md:space-y-6">
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2 border-b border-border pb-4">
              <span className="w-1.5 h-6 bg-destructive rounded-full"></span>
              Görseller
            </h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-muted-foreground uppercase">Cihazdan Yükle</Label>
                <Input type="file" accept="image/*" onChange={handleFileUpload} className="cursor-pointer file:text-secondary p-2 h-11 border-dashed border-border" />
              </div>
              <div className="relative">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border"></span></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">veya</span></div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-muted-foreground uppercase">URL ile Ekle</Label>
                <div className="flex gap-2">
                  <Input value={newImageUrl} onChange={(e) => setNewImageUrl(e.target.value)} placeholder="https://..." className="h-11" />
                  <Button type="button" variant="secondary" onClick={addImage} className="h-11 px-4 shrink-0">Ekle</Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 md:gap-4 mt-6">
                {formData.images.map((img, idx) => (
                  <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-border bg-muted/30 group">
                    <img src={img} className="w-full h-full object-cover" alt="prev" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button size="icon" variant="destructive" className="size-8 rounded-full" onClick={() => setFormData({ ...formData, images: formData.images.filter((_, i) => i !== idx) })}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    {idx === 0 && (
                      <div className="absolute top-2 left-2 bg-secondary text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">KAPAK</div>
                    )}
                  </div>
                ))}
                {formData.images.length === 0 && (
                  <div className="col-span-2 h-32 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center text-muted-foreground bg-muted/20">
                    <ImageIcon className="w-8 h-8 mb-1 opacity-20" />
                    <span className="text-xs">Görsel yok</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
