import React, { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { ArrowLeft, Edit3, Image as ImageIcon, GripVertical } from "lucide-react";

export default function ProductDetail() {
  const { id } = useParams();
  const { token, user } = useAuthStore();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    stock: "0",
    stockThreshold: "10",
    barcode: "",
    piecesPerBox: "",
    packagingType: "",
    categoryId: ""
  });
  const [categories, setCategories] = useState<any[]>([]);

  const loadData = () => {
    fetch(`/api/products/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => {
        setProduct(data);
        setFormData({
          name: data.name || "",
          price: data.price?.toString() || "",
          stock: data.stock?.toString() || "0",
          stockThreshold: data.stockThreshold?.toString() || "10",
          barcode: data.barcode || "",
          piecesPerBox: data.piecesPerBox?.toString() || "",
          packagingType: data.packagingType || "",
          categoryId: data.categoryId || ""
        });
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
    fetch("/api/categories", { headers: { Authorization: `Bearer ${token}` } })
       .then(r => r.json())
       .then(d => setCategories(d.categories || []));
  }, [id, token]);

  const onDragEnd = async (result: any) => {
    if (!result.destination) return;
    
    const items = Array.from(product.images);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setProduct({ ...product, images: items });

    try {
      await fetch(`/api/products/${id}/images/reorder`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          imageIds: items.map((img: any) => img.id)
        })
      });
    } catch (e) {
      alert("Sıralama kaydedilemedi.");
      loadData();
    }
  };

  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        try { data = await res.json(); } catch (_) {}

        if (!res.ok || !data.success) {
          // Sunucudan gelen tam hata detayını göster
          const detail = [
            data.message,
            data.error ? `Detay: ${data.error}` : null,
            data.code  ? `Kod: ${data.code}`    : null,
          ].filter(Boolean).join("\n");
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
      headers: { Authorization: `Bearer ${token}` }
    });
    if(res.ok) loadData();
  };

  const deleteImage = async (imageId: string) => {
    if(!confirm("Emin misiniz?")) return;
    const res = await fetch(`/api/products/${id}/images/${imageId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    });
    if(res.ok) loadData();
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(`/api/products/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(formData)
    });
    if (res.ok) {
      setIsEditOpen(false);
      loadData();
    } else {
      alert("Hata oluştu");
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

  if (loading) return <div className="p-4 text-muted-foreground">Yükleniyor...</div>;
  if (!product) return <div className="p-4 text-destructive">Ürün bulunamadı</div>;

  return (
    <div className="space-y-4 md:space-y-6 max-w-4xl animate-fade-in">
      <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 md:px-5 py-3 md:py-4 shadow-sm">
        <Link to="/admin/products" className="inline-flex items-center justify-center size-10 border border-border rounded-lg bg-card hover:bg-muted shadow-sm transition-all touch-target">
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </Link>
        {user?.role !== "SUPER_ADMIN" && (
          <Link to={`/admin/products/edit/${id}`}>
            <Button variant="outline" className="gap-2 border-secondary/30 text-secondary hover:bg-secondary/5 hover:text-secondary touch-target">
              <Edit3 className="w-4 h-4" /> Düzenle
            </Button>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <div className="space-y-4 md:space-y-6">
          <div className="bg-card p-5 md:p-6 rounded-xl border border-border shadow-sm space-y-4">
            <h3 className="font-bold text-foreground text-lg border-b border-border pb-3">Genel Bilgiler</h3>
            
            <div className="flex justify-between items-center py-2 border-b border-border/50">
              <span className="text-muted-foreground text-sm">Fiyat</span>
              <span className="font-bold text-foreground text-lg">₺{product.price.toFixed(2)}</span>
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
        </div>

        <div className="space-y-4 md:space-y-6">
          <div className="bg-card p-5 md:p-6 rounded-xl border border-border shadow-sm">
            <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
               <h3 className="font-bold text-foreground text-lg">Görseller</h3>
               <label className="cursor-pointer">
                 <input type="file" multiple accept="image/jpeg, image/png, image/webp" className="hidden" ref={fileInputRef} onChange={handleFileUpload} disabled={uploading}/>
                 <div className="flex items-center gap-1 text-sm font-medium text-secondary hover:text-secondary/80 transition-colors">
                    {uploading ? "Yükleniyor..." : <><ImageIcon className="w-4 h-4"/> Ekle</>}
                 </div>
               </label>
            </div>
            {product.images && product.images.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 md:gap-4">
                    {product.images.filter((img:any) => img.status === "active").map((img: any) => (
                        <div key={img.id} className={`relative rounded-lg overflow-hidden border border-border aspect-square bg-muted/30 flex flex-col group ${img.isMain ? 'ring-2 ring-secondary' : ''}`}>
                            <div className="flex-1 flex items-center justify-center relative inner-img overflow-hidden">
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
              <div className="h-40 flex flex-col items-center justify-center text-muted-foreground bg-muted/20 rounded-lg border border-dashed border-border">
                <ImageIcon className="w-8 h-8 mb-2 opacity-30" />
                <span className="text-sm">Görsel Eklenmemiş</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ürünü Düzenle</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2 sm:col-span-2">
              <Label>Ürün Adı</Label>
              <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Birim Fiyatı (TL)</Label>
              <Input required type="number" step="0.01" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Kategori</Label>
              <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                value={formData.categoryId} onChange={e => setFormData({...formData, categoryId: e.target.value})}>
                <option value="">Seçiniz</option>
                {flatCategories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Güncel Stok</Label>
              <Input required type="number" value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Kritik Stok Eşiği (Uyarı İçin)</Label>
              <Input required type="number" value={formData.stockThreshold} onChange={e => setFormData({...formData, stockThreshold: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Barkod (SKU / EAN)</Label>
              <Input value={formData.barcode} onChange={e => setFormData({...formData, barcode: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Kolideki Adet</Label>
              <Input type="number" value={formData.piecesPerBox} onChange={e => setFormData({...formData, piecesPerBox: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Ambalaj Türü</Label>
              <Input value={formData.packagingType} onChange={e => setFormData({...formData, packagingType: e.target.value})} />
            </div>
            <div className="sm:col-span-2 mt-4 flex justify-end gap-2">
              <Button type="button" variant="destructive" onClick={() => setIsEditOpen(false)} className="w-full sm:w-auto">İptal</Button>
              <Button type="submit" className="w-full sm:w-auto">Kaydet</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
