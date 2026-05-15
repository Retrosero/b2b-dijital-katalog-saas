import { useEffect, useState } from "react";
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

  if (loading) return <div className="p-8">Yükleniyor...</div>;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/admin/products" className="inline-flex items-center justify-center size-9 border rounded-xl bg-white hover:bg-slate-50 shadow-sm transition-all">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Link>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{isEdit ? "Ürünü Düzenle" : "Yeni Ürün Ekle"}</h2>
            <p className="text-muted-foreground">{isEdit ? "Ürün bilgilerini güncelleyin." : "Kataloğa yeni bir ürün tanımlayın."}</p>
          </div>
        </div>
        <Button onClick={handleSubmit} className="bg-emerald-500 hover:bg-emerald-600 shadow-md transform active:scale-95 transition-all px-8 h-11 text-base font-semibold">
          {isEdit ? "Güncelle" : "Kaydet"}
        </Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white p-8 rounded-2xl border shadow-sm space-y-6">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 border-b pb-4">
              <span className="w-1.5 h-6 bg-indigo-500 rounded-full"></span>
              Temel Bilgiler
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-sm font-bold text-slate-700">Ürün Adı *</Label>
                <Input required className="h-12 border-slate-200 focus:ring-indigo-500" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-bold text-slate-700">Birim Fiyatı Lira (₺) *</Label>
                <Input required type="number" step="0.01" className="h-12 border-slate-200" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-bold text-slate-700">Stok Miktarı</Label>
                <Input required type="number" className="h-12 border-slate-200" value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-bold text-slate-700">Kritik Stok Uyarısı (Eşik)</Label>
                <Input required type="number" className="h-12 border-slate-200" value={formData.stockThreshold} onChange={e => setFormData({...formData, stockThreshold: e.target.value})} />
              </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-2xl border shadow-sm space-y-6">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 border-b pb-4">
              <span className="w-1.5 h-6 bg-amber-500 rounded-full"></span>
              Detaylar & Lojistik
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-sm font-bold text-slate-700">Kategori</Label>
                <select className="flex h-12 w-full rounded-md border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm focus:ring-2 ring-indigo-500/20 outline-none"
                  value={formData.categoryId} onChange={e => setFormData({...formData, categoryId: e.target.value})}>
                  <option value="">Seçiniz</option>
                  {flatCategories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-bold text-slate-700">Barkod / SKU</Label>
                <Input className="h-12 border-slate-200" value={formData.barcode} onChange={e => setFormData({...formData, barcode: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-bold text-slate-700">Kolideki Ürün Adedi</Label>
                <Input type="number" className="h-12 border-slate-200" value={formData.piecesPerBox} onChange={e => setFormData({...formData, piecesPerBox: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-bold text-slate-700">Ambalaj / Paket Türü</Label>
                <Input className="h-12 border-slate-200" value={formData.packagingType} onChange={e => setFormData({...formData, packagingType: e.target.value})} />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-white p-8 rounded-2xl border shadow-sm space-y-6">
             <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 border-b pb-4">
                <span className="w-1.5 h-6 bg-pink-500 rounded-full"></span>
                Görseller
             </h3>
             <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-500 uppercase">Cihazdan Yükle</Label>
                  <Input type="file" accept="image/*" onChange={handleFileUpload} className="cursor-pointer file:text-indigo-600 p-2 h-11 border-dashed" />
                </div>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center"><span className="w-full border-t"></span></div>
                  <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-slate-400">veya</span></div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-500 uppercase">URL İle Ekle</Label>
                  <div className="flex gap-2">
                    <Input value={newImageUrl} onChange={e => setNewImageUrl(e.target.value)} placeholder="https://..." className="h-11" />
                    <Button type="button" variant="secondary" onClick={addImage} className="h-11 px-4 shrink-0">Ekle</Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-6">
                   {formData.images.map((img, idx) => (
                      <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border bg-slate-50 group">
                         <img src={img} className="w-full h-full object-cover" alt="prev" />
                         <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                           <Button size="icon" variant="destructive" className="size-8 rounded-full" onClick={() => setFormData({...formData, images: formData.images.filter((_, i)=>i!==idx)})}>
                             <Trash2 className="w-4 h-4" />
                           </Button>
                         </div>
                         {idx === 0 && (
                            <div className="absolute top-2 left-2 bg-indigo-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">KAPAK</div>
                         )}
                      </div>
                   ))}
                   {formData.images.length === 0 && (
                      <div className="col-span-2 h-32 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-slate-400 bg-slate-50/50">
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
