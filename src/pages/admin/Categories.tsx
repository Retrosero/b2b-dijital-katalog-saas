import React, { useEffect, useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FolderTree, Folder, Tag, Plus, Upload, Pencil, Trash2, Search } from "lucide-react";
import { useToastActions } from "@/components/ui/toast";

export default function Categories() {
  const { token, user } = useAuthStore();
  const toast = useToastActions();
  const [data, setData] = useState({ categories: [] as any[], brands: [] as any[] });
  const [open, setOpen] = useState(false);
  const [openBrand, setOpenBrand] = useState(false);
  const [formData, setFormData] = useState({ name: "", parentId: "" });
  const [brandFormData, setBrandFormData] = useState({ name: "", imageUrl: "" });
  const [brandImageFile, setBrandImageFile] = useState<File | null>(null);
  const [categoryEditId, setCategoryEditId] = useState<string | null>(null);
  const [brandEditId, setBrandEditId] = useState<string | null>(null);
  const [categorySearch, setCategorySearch] = useState("");
  const [brandSearch, setBrandSearch] = useState("");

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
      toast.success("Kategori başarıyla eklendi.");
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error || "İşlem başarısız.");
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
      toast.success("Marka başarıyla eklendi.");
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error || "İşlem başarısız.");
    }
  };

  const deleteCategory = async (id: string) => {
    if (!confirm("Kategori silinsin mi?")) return;
    const res = await fetch(`/api/categories/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) {
      toast.success("Kategori silindi.");
      fetchData();
    } else {
      toast.error("Kategori silinemedi.");
    }
  };

  const deleteBrand = async (id: string) => {
    if (!confirm("Marka silinsin mi?")) return;
    const res = await fetch(`/api/brands/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) {
      toast.success("Marka silindi.");
      fetchData();
    } else {
      toast.error("Marka silinemedi.");
    }
  };

  if (user?.role === "SUPER_ADMIN") {
    return <div className="p-4 text-center text-muted-foreground">Super Admin yönetemez.</div>;
  }

  // Flatten categories for search
  const flattenCategories = (cats: any[], prefix = ""): any[] => {
    let result: any[] = [];
    cats.forEach((c) => {
      result.push({ id: c.id, name: prefix + c.name, originalName: c.name, children: c.children });
      if (c.children?.length) result = result.concat(flattenCategories(c.children, prefix + "— "));
    });
    return result;
  };

  const allCategories = flattenCategories(data.categories);
  const filteredCategories = allCategories.filter((c) =>
    c.name.toLowerCase().includes(categorySearch.toLowerCase())
  );

  const filteredBrands = data.brands.filter((b) =>
    b.name.toLowerCase().includes(brandSearch.toLowerCase())
  );

  const parentCandidates = flattenCategories(data.categories);

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in">

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
        {/* Categories List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center"><FolderTree className="w-4 h-4 text-secondary" /></div><h3 className="font-bold text-lg text-foreground">Kategori Ağacı</h3></div>
            <button onClick={() => { setOpen(true); setCategoryEditId(null); setFormData({ name: "", parentId: "" }); }} className="h-9 px-3 rounded-lg brand-gradient text-white hover:opacity-90 font-medium text-sm flex items-center gap-1 transition-opacity"><Plus className="w-4 h-4" /> Ekle</button>
          </div>
          <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
            {/* Search */}
            <div className="p-3 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Kategori ara..."
                  value={categorySearch}
                  onChange={(e) => setCategorySearch(e.target.value)}
                  className="w-full h-10 pl-10 pr-3 rounded-lg border border-border bg-muted/30 text-sm"
                />
              </div>
            </div>
            {/* List */}
            <div className="max-h-[400px] overflow-y-auto">
              {filteredCategories.length > 0 ? (
                <div className="divide-y divide-border">
                  {filteredCategories.map((c) => {
                    const isChild = c.name.includes("—");
                    return (
                      <div key={c.id} className="flex items-center justify-between px-3 py-2.5 hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-2 min-w-0">
                          {isChild ? (
                            <Folder className="w-4 h-4 text-muted-foreground shrink-0" />
                          ) : (
                            <FolderTree className="w-4 h-4 text-secondary shrink-0" />
                          )}
                          <span className={`text-sm truncate ${isChild ? "text-muted-foreground" : "font-medium text-foreground"}`}>{c.name}</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={() => {
                            setCategoryEditId(c.id);
                            const originalCat = allCategories.find((ac) => ac.id === c.id);
                            setFormData({ name: originalCat?.originalName || c.name, parentId: "" });
                            setOpen(true);
                          }} className="p-1.5 rounded-md hover:bg-muted"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></button>
                          <button onClick={() => deleteCategory(c.id)} className="p-1.5 rounded-md hover:bg-destructive/10"><Trash2 className="w-3.5 h-3.5 text-destructive" /></button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-6 text-center text-muted-foreground text-sm">Sonuç bulunamadı.</div>
              )}
            </div>
          </div>
        </div>

        {/* Brands List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-lg bg-chart-3/10 flex items-center justify-center"><Tag className="w-4 h-4 text-chart-3" /></div><h3 className="font-bold text-lg text-foreground">Markalar</h3></div>
            <button onClick={() => { setOpenBrand(true); setBrandEditId(null); setBrandFormData({ name: "", imageUrl: "" }); setBrandImageFile(null); }} className="h-9 px-3 rounded-lg brand-gradient text-white hover:opacity-90 font-medium text-sm flex items-center gap-1 transition-opacity"><Plus className="w-4 h-4" /> Ekle</button>
          </div>
          <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
            {/* Search */}
            <div className="p-3 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Marka ara..."
                  value={brandSearch}
                  onChange={(e) => setBrandSearch(e.target.value)}
                  className="w-full h-10 pl-10 pr-3 rounded-lg border border-border bg-muted/30 text-sm"
                />
              </div>
            </div>
            {/* List */}
            <div className="max-h-[400px] overflow-y-auto">
              {filteredBrands.length > 0 ? (
                <div className="divide-y divide-border">
                  {filteredBrands.map((b) => (
                    <div key={b.id} className="flex items-center justify-between px-3 py-2.5 hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-2 min-w-0">
                        {b.imageUrl ? (
                          <img src={b.imageUrl} alt={b.name} className="h-8 w-auto object-contain shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded bg-secondary/10 flex items-center justify-center shrink-0"><Tag className="w-4 h-4 text-secondary/50" /></div>
                        )}
                        <span className="text-sm font-medium text-foreground truncate">{b.name}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => { setBrandEditId(b.id); setBrandFormData({ name: b.name, imageUrl: b.imageUrl || "" }); setBrandImageFile(null); setOpenBrand(true); }} className="p-1.5 rounded-md hover:bg-muted"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></button>
                        <button onClick={() => deleteBrand(b.id)} className="p-1.5 rounded-md hover:bg-destructive/10"><Trash2 className="w-3.5 h-3.5 text-destructive" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-muted-foreground text-sm">Sonuç bulunamadı.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
