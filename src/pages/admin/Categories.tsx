import React, { useEffect, useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FolderTree, Folder, Tag, Plus, Upload, Pencil, Trash2 } from "lucide-react";

export default function Categories() {
  const { token, user } = useAuthStore();
  const [data, setData] = useState({ categories: [] as any[], brands: [] as any[] });
  const [open, setOpen] = useState(false);
  const [openBrand, setOpenBrand] = useState(false);
  const [formData, setFormData] = useState({ name: "", parentId: "" });
  const [brandFormData, setBrandFormData] = useState({ name: "", imageUrl: "" });
  const [brandImageFile, setBrandImageFile] = useState<File | null>(null);
  const [categoryEditId, setCategoryEditId] = useState<string | null>(null);
  const [brandEditId, setBrandEditId] = useState<string | null>(null);

  const fetchData = async () => {
    const res = await fetch("/api/categories", { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setData(await res.json());
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(categoryEditId ? `/api/categories/${categoryEditId}` : "/api/categories", {
      method: categoryEditId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: formData.name, parentId: formData.parentId || null })
    });
    if (res.ok) {
      setOpen(false);
      setCategoryEditId(null);
      setFormData({ name: "", parentId: "" });
      fetchData();
    } else {
      const err = await res.json().catch(() => ({}));
      alert(err.error || "İşlem başarısız.");
    }
  };

  const handleBrandSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let imageUrl = brandFormData.imageUrl;
    if (brandImageFile) {
      const fd = new FormData();
      fd.append("file", brandImageFile);
      fd.append("type", "brand");
      try {
        const uploadRes = await fetch("/api/upload/brand-image", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: fd
        });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          imageUrl = uploadData.url;
        }
      } catch {
        imageUrl = "";
      }
    }

    const res = await fetch(brandEditId ? `/api/brands/${brandEditId}` : "/api/brands", {
      method: brandEditId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: brandFormData.name, imageUrl: imageUrl || null })
    });
    if (res.ok) {
      setOpenBrand(false);
      setBrandEditId(null);
      setBrandImageFile(null);
      setBrandFormData({ name: "", imageUrl: "" });
      fetchData();
    } else {
      const err = await res.json().catch(() => ({}));
      alert(err.error || "İşlem başarısız.");
    }
  };

  const deleteCategory = async (id: string) => {
    if (!confirm("Kategori silinsin mi?")) return;
    const res = await fetch(`/api/categories/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) fetchData();
    else alert("Kategori silinemedi.");
  };

  const deleteBrand = async (id: string) => {
    if (!confirm("Marka silinsin mi?")) return;
    const res = await fetch(`/api/brands/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) fetchData();
    else alert("Marka silinemedi.");
  };

  if (user?.role === "SUPER_ADMIN") {
    return <div className="p-4 text-center text-muted-foreground">Super Admin yönetemez.</div>;
  }

  const renderCategoryNode = (cat: any, depth = 0): any => (
    <div key={cat.id} className="relative">
      <div className={`flex items-center gap-3 p-3 rounded-xl mb-2 ${depth === 0 ? "bg-secondary/5 border border-secondary/15" : "bg-card border border-border shadow-sm"}`}>
        {depth === 0 ? (
          <div className="w-8 h-8 rounded-lg bg-secondary/10 text-secondary flex items-center justify-center shrink-0"><FolderTree className="w-4 h-4" /></div>
        ) : (
          <div className="w-8 h-8 rounded-lg bg-muted text-muted-foreground border border-border flex items-center justify-center shrink-0"><Folder className="w-4 h-4" /></div>
        )}
        <div className="flex-1 min-w-0"><h4 className="font-semibold truncate text-foreground">{cat.name}</h4></div>
        <button onClick={() => { setCategoryEditId(cat.id); setFormData({ name: cat.name, parentId: cat.parentId || "" }); setOpen(true); }} className="p-2 rounded-md hover:bg-muted"><Pencil className="w-4 h-4 text-muted-foreground" /></button>
        <button onClick={() => deleteCategory(cat.id)} className="p-2 rounded-md hover:bg-destructive/10"><Trash2 className="w-4 h-4 text-destructive" /></button>
      </div>
      {cat.children && cat.children.length > 0 && (
        <div className="pl-6 md:pl-10 relative">
          <div className="absolute top-0 bottom-6 left-[1.125rem] md:left-[2.125rem] w-px bg-secondary/15" />
          {cat.children.map((child: any) => (
            <div key={child.id} className="relative">
              <div className="absolute top-6 -left-[1.125rem] md:-left-[2.125rem] w-4 h-px bg-secondary/15" />
              {renderCategoryNode(child, depth + 1)}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const flattenCategories = (cats: any[], prefix = ""): any[] => {
    let result: any[] = [];
    cats.forEach((c) => {
      result.push({ id: c.id, name: prefix + c.name });
      if (c.children?.length) result = result.concat(flattenCategories(c.children, prefix + "-- "));
    });
    return result;
  };
  const parentCandidates = flattenCategories(data.categories);

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-end gap-3">
        <Button onClick={() => { setOpenBrand(true); setBrandEditId(null); setBrandFormData({ name: "", imageUrl: "" }); setBrandImageFile(null); }} variant="outline" className="h-11 px-5 font-semibold gap-2"><Plus className="w-4 h-4" /> Yeni Marka Ekle</Button>
        <Button onClick={() => { setOpen(true); setCategoryEditId(null); setFormData({ name: "", parentId: "" }); }} className="brand-gradient border-0 shadow-md shadow-secondary/20 hover:opacity-90 h-11 px-5 font-semibold gap-2"><Plus className="w-4 h-4" /> Yeni Kategori Ekle</Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="text-lg font-bold">{categoryEditId ? "Kategori Düzenle" : "Yeni Kategori Ekle"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Kategori Adı</Label>
              <Input required className="h-11" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Ana Kategori (Opsiyonel)</Label>
              <select className="flex h-11 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm shadow-sm" value={formData.parentId} onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}>
                <option value="">(Ana Kategori)</option>
                {parentCandidates.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <Button type="submit" className="w-full h-11 font-semibold">{categoryEditId ? "Güncelle" : "Oluştur"}</Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={openBrand} onOpenChange={setOpenBrand}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="text-lg font-bold">{brandEditId ? "Marka Düzenle" : "Yeni Marka Ekle"}</DialogTitle></DialogHeader>
          <form onSubmit={handleBrandSubmit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Marka Adı</Label>
              <Input required className="h-11" value={brandFormData.name} onChange={(e) => setBrandFormData({ ...brandFormData, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Marka Logosu (Opsiyonel)</Label>
              <div className="border-2 border-dashed border-border rounded-lg p-4 text-center hover:border-secondary/50 transition-colors cursor-pointer" onClick={() => document.getElementById("brand-image-input")?.click()}>
                <input id="brand-image-input" type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) { setBrandImageFile(file); setBrandFormData({ ...brandFormData, imageUrl: URL.createObjectURL(file) }); } }} />
                {brandFormData.imageUrl || brandImageFile ? (
                  <img src={brandFormData.imageUrl} alt="Preview" className="max-h-24 mx-auto rounded object-contain" />
                ) : (
                  <div className="text-muted-foreground"><Upload className="w-8 h-8 mx-auto mb-2 opacity-50" /><p className="text-sm">Görsel yüklemek için tıklayın</p></div>
                )}
              </div>
            </div>
            <Button type="submit" className="w-full h-11 font-semibold">{brandEditId ? "Güncelle" : "Oluştur"}</Button>
          </form>
        </DialogContent>
      </Dialog>

      <div className="grid lg:grid-cols-2 gap-4 md:gap-8 items-start">
        <div className="space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-border"><div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center"><FolderTree className="w-4 h-4 text-secondary" /></div><h3 className="font-bold text-lg text-foreground">Kategori Ağacı</h3></div>
          <div className="bg-card p-4 sm:p-6 rounded-xl border border-border shadow-sm">
            {data.categories.length > 0 ? <div className="space-y-2">{data.categories.map((c: any) => renderCategoryNode(c, 0))}</div> : <p className="text-muted-foreground text-sm">Henüz kategori bulunmuyor.</p>}
          </div>
        </div>
        <div className="space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-border"><div className="w-8 h-8 rounded-lg bg-chart-3/10 flex items-center justify-center"><Tag className="w-4 h-4 text-chart-3" /></div><h3 className="font-bold text-lg text-foreground">Markalar</h3></div>
          <div className="bg-card p-4 sm:p-6 rounded-xl border border-border shadow-sm">
            {data.brands.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {data.brands.map((b: any) => (
                  <div key={b.id} className="flex flex-col items-center p-3 rounded-xl border border-border bg-muted/30 text-center">
                    {b.imageUrl ? <img src={b.imageUrl} alt={b.name} className="h-12 w-auto object-contain mb-2" /> : <div className="w-12 h-12 rounded bg-secondary/10 flex items-center justify-center mb-2"><Tag className="w-6 h-6 text-secondary/50" /></div>}
                    <span className="text-foreground font-medium text-sm truncate w-full">{b.name}</span>
                    <div className="mt-2 flex items-center gap-2">
                      <button onClick={() => { setBrandEditId(b.id); setBrandFormData({ name: b.name, imageUrl: b.imageUrl || "" }); setBrandImageFile(null); setOpenBrand(true); }} className="p-1.5 rounded-md hover:bg-muted"><Pencil className="w-4 h-4 text-muted-foreground" /></button>
                      <button onClick={() => deleteBrand(b.id)} className="p-1.5 rounded-md hover:bg-destructive/10"><Trash2 className="w-4 h-4 text-destructive" /></button>
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="text-muted-foreground text-sm">Henüz marka bulunmuyor.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
