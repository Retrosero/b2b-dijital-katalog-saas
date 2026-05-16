import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FolderTree, Folder, Tag, ChevronRight } from "lucide-react";

export default function Categories() {
  const { token, user } = useAuthStore();
  const [data, setData] = useState({ categories: [] as any[], brands: [] as any[] });
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", parentId: "" });

  const fetchData = async () => {
    const res = await fetch("/api/categories", {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) setData(await res.json());
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        name: formData.name,
        parentId: formData.parentId || null
      })
    });
    if (res.ok) {
      setOpen(false);
      setFormData({ name: "", parentId: "" });
      fetchData();
    } else {
      alert("Hata oluştu");
    }
  };

  if (user?.role === "SUPER_ADMIN") {
    return <div className="p-4 text-center">Super Admin yönetemez.</div>;
  }

  // Filter categories to only allow selecting top-level or first-level as parents to restrict to 2 sub-levels
  const parentCandidates = data.categories.filter((c: any) => {
    if (!c.parentId) return true; // Level 0
    const parent = data.categories.find((p: any) => p.id === c.parentId);
    if (parent && !parent.parentId) return true; // Level 1
    return false; // Level 2
  });

  const rootCategories = data.categories.filter(c => !c.parentId);

  const renderCategoryNode = (cat: any, depth = 0) => {
    return (
      <div key={cat.id} className="relative">
        <div className={`flex items-center gap-3 p-3 rounded-xl mb-2 transition-colors ${depth === 0 ? 'bg-indigo-50/50 border border-indigo-100 hover:bg-indigo-50' : 'bg-white border shadow-sm hover:border-indigo-200'}`}>
          {depth === 0 ? (
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
              <FolderTree className="w-4 h-4" />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-lg bg-slate-50 text-slate-400 border flex items-center justify-center shrink-0">
              <Folder className="w-4 h-4" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h4 className={`font-semibold truncate ${depth === 0 ? 'text-indigo-900' : 'text-slate-700'}`}>{cat.name}</h4>
          </div>
        </div>
        {cat.children && cat.children.length > 0 && (
          <div className="pl-6 md:pl-10 relative">
            <div className="absolute top-0 bottom-6 left-[1.125rem] md:left-[2.125rem] w-px bg-indigo-100 pointer-events-none" />
            {cat.children.map((child: any) => (
              <div key={child.id} className="relative">
                <div className="absolute top-6 -left-[1.125rem] md:-left-[2.125rem] w-4 h-px bg-indigo-100 pointer-events-none" />
                {renderCategoryNode(child, depth + 1)}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button variant="secondary" onClick={() => setOpen(true)} className="w-full sm:w-auto h-11 px-6 font-bold shadow-sm">+ Yeni Kategori Ekle</Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeni Kategori Ekle</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Kategori Adı</Label>
              <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Ana Kategori (Opsiyonel)</Label>
              <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                value={formData.parentId} onChange={e => setFormData({...formData, parentId: e.target.value})}>
                <option value="">(Ana Kategori)</option>
                {parentCandidates.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">Sadece 2 alt kırılmaya kadar desteklenmektedir.</p>
            </div>
            <Button type="submit" className="w-full">Oluştur</Button>
          </form>
        </DialogContent>
      </Dialog>

      <div className="grid lg:grid-cols-2 gap-8 items-start">
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b">
            <FolderTree className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-lg text-slate-800">Kategori Ağacı</h3>
          </div>
          <div className="bg-white p-4 sm:p-6 rounded-2xl border shadow-sm">
            {rootCategories.length > 0 ? (
              <div className="space-y-2">
                {rootCategories.map((c: any) => renderCategoryNode(c, 0))}
              </div>
            ) : (
              <div className="text-center py-10 text-slate-400">Henüz kategori bulunmuyor.</div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b">
            <Tag className="w-5 h-5 text-amber-500" />
            <h3 className="font-bold text-lg text-slate-800">Markalar</h3>
          </div>
          <div className="bg-white p-4 sm:p-6 rounded-2xl border shadow-sm">
            {data.brands.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {data.brands.map((b: any) => (
                  <div key={b.id} className="flex items-center justify-center p-3 rounded-xl border bg-slate-50 text-slate-700 font-medium text-sm text-center">
                    {b.name}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 text-slate-400">Henüz marka bulunmuyor.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
