import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Trash2, ArrowUp, ArrowDown, Image as ImageIcon } from "lucide-react";

export default function ProductForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuthStore();
  const isEdit = !!id;

  const [loading, setLoading] = useState(isEdit);
  const [categories, setCategories] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    stock: "0",
    stockThreshold: "10",
    barcode: "",
    piecesPerBox: "",
    packagingType: "",
    categoryId: "",
    images: [] as string[]
  });
  const [newImageUrl, setNewImageUrl] = useState("");

  const fetchData = async () => {
    // Categories
    const resCat = await fetch("/api/categories", { headers: { Authorization: `Bearer ${token}` } });
    if (resCat.ok) {
      const data = await resCat.json();
      setCategories(data.categories || []);
    }

    if (isEdit) {
      const resProd = await fetch(`/api/products/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      if (resProd.ok) {
        const p = await resProd.json();
        setFormData({
          name: p.name || "",
          price: p.price?.toString() || "",
          stock: p.stock?.toString() || "0",
          stockThreshold: p.stockThreshold?.toString() || "10",
          barcode: p.barcode || "",
          piecesPerBox: p.piecesPerBox?.toString() || "",
          packagingType: p.packagingType || "",
          categoryId: p.categoryId || "",
          images: p.images?.map((img: any) => img.originalUrl) || []
        });
      }
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id, token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = isEdit ? `/api/products/${id}` : "/api/products";
    const method = isEdit ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(formData)
    });

    if (res.ok) {
      navigate("/admin/products");
    } else {
      alert("Hata oluştu");
    }
  };

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
    cats.forEach(c => {
      result.push({ id: c.id, name: prefix + c.name });
      if (c.children && c.children.length > 0) {
        result = result.concat(flattenCategories(c.children, prefix + "-- "));
      }
    });
    return result;
  };
  const flatCategories = flattenCategories(categories.filter(c => !c.parentId));

  if (loading) return <div className="p-8 text-muted-foreground">Yükleniyor...</div>;

  return (
    <div className="space-y-4 md:space-y-6 max-w-5xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 md:px-5 py-3 md:py-4 shadow-sm">
        <Link to="/admin/products" className="inline-flex items-center justify-center size-10 border border-border rounded-lg bg-card hover:bg-muted shadow-sm transition-all touch-target">
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </Link>
        <Button onClick={handleSubmit} className="brand-gradient border-0 shadow-md hover:opacity-90 px-6 md:px-8 h-10 md:h-11 text-sm md:text-base font-semibold">
          {isEdit ? "Güncelle" : "Kaydet"}
        </Button>
      </div>

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
                <Input required className="h-11 border-border" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-foreground">Birim Fiyatı Lira (₺) *</Label>
                <Input required type="number" step="0.01" className="h-11 border-border" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-foreground">Stok Miktarı</Label>
                <Input required type="number" className="h-11 border-border" value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-foreground">Kritik Stok Uyarısı (Eşik)</Label>
                <Input required type="number" className="h-11 border-border" value={formData.stockThreshold} onChange={e => setFormData({...formData, stockThreshold: e.target.value})} />
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
                  value={formData.categoryId} onChange={e => setFormData({...formData, categoryId: e.target.value})}>
                  <option value="">Seçiniz</option>
                  {flatCategories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-foreground">Barkod / SKU</Label>
                <Input className="h-11 border-border" value={formData.barcode} onChange={e => setFormData({...formData, barcode: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-foreground">Kolideki Ürün Adedi</Label>
                <Input type="number" className="h-11 border-border" value={formData.piecesPerBox} onChange={e => setFormData({...formData, piecesPerBox: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-foreground">Ambalaj / Paket Türü</Label>
                <Input className="h-11 border-border" value={formData.packagingType} onChange={e => setFormData({...formData, packagingType: e.target.value})} />
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
                  <Label className="text-xs font-bold text-muted-foreground uppercase">URL İle Ekle</Label>
                  <div className="flex gap-2">
                    <Input value={newImageUrl} onChange={e => setNewImageUrl(e.target.value)} placeholder="https://..." className="h-11" />
                    <Button type="button" variant="secondary" onClick={addImage} className="h-11 px-4 shrink-0">Ekle</Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 md:gap-4 mt-6">
                   {formData.images.map((img, idx) => (
                      <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-border bg-muted/30 group">
                         <img src={img} className="w-full h-full object-cover" alt="prev" />
                         <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                           <Button size="icon" variant="destructive" className="size-8 rounded-full" onClick={() => setFormData({...formData, images: formData.images.filter((_, i)=>i!==idx)})}>
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
