import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, Trash2, Image as ImageIcon } from "lucide-react";
import { usePageHeaderStore } from "@/store/usePageHeaderStore";
import { useToastActions } from "@/components/ui/toast";

function FormRow({ label, children, required = false }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[200px_minmax(0,1fr)] items-start gap-1 md:gap-3 py-0.5">
      <Label className="text-xs font-semibold text-foreground/80 pt-1.5">
        {label}{required ? " *" : ""}
      </Label>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export default function ProductForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuthStore();
  const { setHeader, resetHeader } = usePageHeaderStore();
  const toast = useToastActions();
  const isEdit = !!id;

  const [loading, setLoading] = useState(isEdit);
  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [priceLists, setPriceLists] = useState<any[]>([]);
  const [productPrices, setProductPrices] = useState<Record<string, string>>({});
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
    const [resCat, resBrand, resPriceLists] = await Promise.all([
      fetch("/api/categories", { headers: { Authorization: `Bearer ${token}` } }),
      fetch("/api/brands", { headers: { Authorization: `Bearer ${token}` } }),
      fetch("/api/price-lists", { headers: { Authorization: `Bearer ${token}` } }),
    ]);

    if (resCat.ok) {
      const data = await resCat.json();
      setCategories(data.categories || []);
    }

    if (resBrand.ok) {
      const data = await resBrand.json();
      setBrands(data || []);
    }

    if (resPriceLists.ok) {
      setPriceLists(await resPriceLists.json());
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
        // Ürünün fiyat listesi fiyatlarını yükle
        if (p.prices && p.prices.length > 0) {
          const prices: Record<string, string> = {};
          p.prices.forEach((pp: any) => {
            prices[pp.priceListId] = pp.price !== null && pp.price !== undefined ? String(pp.price) : "";
          });
          setProductPrices(prices);
        }
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
        body,
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
        prices: productPrices,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Hata oluştu");
        return;
      }

      const product = await res.json();
      const productId = isEdit ? id : product?.id;
      if (productId) {
        await uploadProductImages(productId, formData.images);
        await saveProductPrices(productId);
      }

      toast.success(isEdit ? "Ürün başarıyla güncellendi." : "Ürün başarıyla oluşturuldu.");
      navigate("/admin/products");
    } catch (error: any) {
      toast.error(error?.message || "Ürün kaydedildi ancak görseller yüklenemedi.");
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
          disabled: isSubmitting,
        },
      ],
    });
    return resetHeader;
  }, [isEdit, formData, productPrices, priceLists, token, id, setHeader, resetHeader, isSubmitting]);

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

  const saveProductPrices = async (productId: string) => {
    const normalizedPrices: Record<string, string> = {};
    for (const pl of priceLists) {
      normalizedPrices[pl.id] = String(productPrices[pl.id] ?? "").trim();
    }

    let primarySaveOk = false;
    const primaryRes = await fetch(`/api/products/${productId}/prices`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ prices: normalizedPrices }),
    });
    if (primaryRes.ok) {
      primarySaveOk = true;
    }

    // Backward-compatible fallback: write per price-list endpoint
    if (!primarySaveOk) {
      for (const pl of priceLists) {
        const value = normalizedPrices[pl.id];
        if (value === "") {
          await fetch(`/api/price-lists/${pl.id}/prices/${productId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          });
          continue;
        }

        const numeric = Number(String(value).replace(",", "."));
        if (!Number.isFinite(numeric) || numeric < 0) {
          throw new Error(`${pl.name} için geçerli bir fiyat giriniz.`);
        }
        const legacyRes = await fetch(`/api/price-lists/${pl.id}/prices`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ productId, price: numeric }),
        });
        if (!legacyRes.ok) {
          const err = await legacyRes.json().catch(() => ({}));
          throw new Error(err?.error || `${pl.name} fiyatı kaydedilemedi.`);
        }
      }
    }

    // Verify persistence to avoid false-positive success UX.
    const verifyRes = await fetch(`/api/products/${productId}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!verifyRes.ok) throw new Error("Fiyat kaydı doğrulanamadı.");
    const verifyProduct = await verifyRes.json();
    const persisted = new Map<string, string>(
      (verifyProduct.prices || []).map((p: any) => [p.priceListId, String(Number(p.price))])
    );

    for (const pl of priceLists) {
      const expected = normalizedPrices[pl.id];
      if (expected === "") continue;
      const expectedNum = Number(String(expected).replace(",", "."));
      const actualNum = Number(persisted.get(pl.id));
      if (!Number.isFinite(actualNum) || Math.abs(actualNum - expectedNum) > 0.0001) {
        throw new Error(`Fiyat kaydı doğrulanamadı (${pl.name}). Lütfen tekrar deneyin.`);
      }
    }
  };

  const handlePriceChange = (priceListId: string, value: string) => {
    setProductPrices((prev) => ({ ...prev, [priceListId]: value }));
  };

  const flatCategories = flattenCategories(categories.filter((c) => !c.parentId));

  if (loading) return <div className="p-8 text-muted-foreground">Yükleniyor...</div>;

  return (
    <div className="w-full animate-fade-in">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
        <div className="xl:col-span-2 space-y-3">
          <div className="bg-card p-4 md:p-5 rounded-xl border border-border shadow-sm space-y-2.5">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2 border-b border-border pb-2">
          <span className="w-1 h-4 bg-secondary rounded-full"></span>
          Temel Bilgiler
        </h3>
        <FormRow label="Ürün Adı" required>
          <Input required className="h-9 text-sm border-border" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
        </FormRow>
        <FormRow label="Birim Fiyatı (TL)" required>
          <Input required type="number" step="0.01" className="h-9 text-sm border-border" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} />
        </FormRow>
        <FormRow label="Alış Fiyatı (TL)">
          <Input type="number" step="0.01" className="h-9 text-sm border-border" value={formData.costPrice} onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })} placeholder="Maliyet fiyatı" />
        </FormRow>
        <FormRow label="Kritik Stok Uyarısı (Eşik)" required>
          <Input required type="number" className="h-9 text-sm border-border" value={formData.stockThreshold} onChange={(e) => setFormData({ ...formData, stockThreshold: e.target.value })} />
        </FormRow>
        <FormRow label="Stok Kodu (SKU)">
          <Input className="h-9 text-sm border-border" value={formData.sku} onChange={(e) => setFormData({ ...formData, sku: e.target.value })} />
        </FormRow>
        <FormRow label="Açıklama">
          <textarea
            className="flex min-h-[84px] w-full rounded-lg border border-border bg-card px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Ürün açıklaması..."
          />
        </FormRow>
          </div>

          <div className="bg-card p-4 md:p-5 rounded-xl border border-border shadow-sm space-y-2.5">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2 border-b border-border pb-2">
              <span className="w-1 h-4 bg-secondary rounded-full"></span>
              Fiyatlar
            </h3>
            <p className="text-xs text-muted-foreground">
              Her fiyat listesi için ürün fiyatı tanımlayabilirsiniz. Boş bırakılanlar varsayılan fiyatı kullanır.
            </p>
            <div className="space-y-2">
              {priceLists.map((pl: any) => (
                <div key={pl.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border border-border">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground">{pl.name}</div>
                    {pl.isDefault && <span className="text-xs text-blue-600">Varsayılan</span>}
                  </div>
                  <div className="flex items-center gap-2 w-[150px]">
                    <Input
                      type="number"
                      step="0.01"
                      className="h-8 text-sm text-right"
                      placeholder={formData.price || "0.00"}
                      value={productPrices[pl.id] ?? ""}
                      onChange={(e) => handlePriceChange(pl.id, e.target.value)}
                    />
                    <span className="text-xs text-muted-foreground">TL</span>
                  </div>
                </div>
              ))}
              {priceLists.length === 0 && (
                <div className="text-sm text-muted-foreground text-center py-4 border border-dashed border-border rounded-lg">
                  Henüz fiyat listesi yok. Ayarlar sayfasından oluşturabilirsiniz.
                </div>
              )}
            </div>
          </div>

          <div className="bg-card p-4 md:p-5 rounded-xl border border-border shadow-sm space-y-2.5">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2 border-b border-border pb-2">
          <span className="w-1 h-4 bg-chart-3 rounded-full"></span>
          Detaylar ve Lojistik
        </h3>
        <FormRow label="Kategori">
          <select
            className="flex h-9 w-full rounded-lg border border-border bg-card px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={formData.categoryId}
            onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
          >
            <option value="">Seçiniz</option>
            {flatCategories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </FormRow>
        <FormRow label="Marka">
          <select
            className="flex h-9 w-full rounded-lg border border-border bg-card px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={formData.brandId}
            onChange={(e) => setFormData({ ...formData, brandId: e.target.value })}
          >
            <option value="">Seçiniz</option>
            {brands.map((b: any) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </FormRow>
        <FormRow label="Barkod">
          <Input className="h-9 text-sm border-border" value={formData.barcode} onChange={(e) => setFormData({ ...formData, barcode: e.target.value })} />
        </FormRow>
        <FormRow label="Kolideki Ürün Adedi">
          <Input type="number" className="h-9 text-sm border-border" value={formData.piecesPerBox} onChange={(e) => setFormData({ ...formData, piecesPerBox: e.target.value })} />
        </FormRow>
        <FormRow label="Ambalaj / Paket Türü">
          <Input className="h-9 text-sm border-border" value={formData.packagingType} onChange={(e) => setFormData({ ...formData, packagingType: e.target.value })} />
        </FormRow>
          </div>
        </div>

        <div className="space-y-3">
          <div className="bg-card p-4 md:p-5 rounded-xl border border-border shadow-sm space-y-2.5">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2 border-b border-border pb-2">
              <span className="w-1 h-4 bg-destructive rounded-full"></span>
              Görseller
            </h3>

            <FormRow label="Cihazdan Yükle">
              <Input type="file" accept="image/*" onChange={handleFileUpload} className="cursor-pointer file:text-secondary p-1 h-9 text-xs border-dashed border-border" />
            </FormRow>

            <FormRow label="URL ile Ekle">
              <div className="flex gap-2">
                <Input value={newImageUrl} onChange={(e) => setNewImageUrl(e.target.value)} placeholder="https://..." className="h-9 text-sm" />
                <Button type="button" variant="secondary" onClick={addImage} className="h-9 px-3 text-xs shrink-0">Ekle</Button>
              </div>
            </FormRow>

            <FormRow label="Yüklenen Görseller">
              <div className="grid grid-cols-2 gap-2.5">
                {formData.images.map((img, idx) => (
                  <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-border bg-muted/30 group">
                    <img src={img} className="w-full h-full object-cover" alt="prev" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button size="icon" variant="destructive" className="size-8 rounded-full" onClick={() => setFormData({ ...formData, images: formData.images.filter((_, i) => i !== idx) })}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    {idx === 0 && <div className="absolute top-1.5 left-1.5 bg-secondary text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">KAPAK</div>}
                  </div>
                ))}
                {formData.images.length === 0 && (
                  <div className="col-span-2 h-24 border border-dashed border-border rounded-lg flex flex-col items-center justify-center text-muted-foreground bg-muted/20">
                    <ImageIcon className="w-6 h-6 mb-0.5 opacity-20" />
                    <span className="text-[11px]">Görsel yok</span>
                  </div>
                )}
              </div>
            </FormRow>
          </div>
        </div>
      </div>
    </div>
  );
}
