import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ShoppingBag, Plus, Search, ChevronRight, Link2, Copy, Check, Trash2 } from "lucide-react";

export default function Catalogs() {
  const { token, user } = useAuthStore();
  const [catalogs, setCatalogs] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });
  const [editId, setEditId] = useState<string | null>(null);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  const fetchCatalogs = async () => {
    const res = await fetch("/api/catalogs", { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setCatalogs(await res.json());
  };

  useEffect(() => {
    fetchCatalogs();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editId ? `/api/catalogs/${editId}` : "/api/catalogs";
    const method = editId ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setIsOpen(false);
      setForm({ name: "", description: "" });
      setEditId(null);
      fetchCatalogs();
    } else {
      const err = await res.json().catch(() => ({}));
      alert(err.error || "Hata oluştu");
    }
  };

  const openEdit = (c: any) => {
    setEditId(c.id);
    setForm({ name: c.name, description: c.description || "" });
    setIsOpen(true);
  };

  const openCreate = () => {
    setEditId(null);
    setForm({ name: "", description: "" });
    setIsOpen(true);
  };

  const copyLink = (slug: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/c/${slug}`);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Katalog silinsin mi?")) return;
    const res = await fetch(`/api/catalogs/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) fetchCatalogs();
    else alert("Katalog silinemedi.");
  };

  const filtered = catalogs.filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()));

  if (user?.role === "SUPER_ADMIN") {
    return <div className="p-4 text-center text-muted-foreground">Super Admin yönetemez.</div>;
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative flex-1 w-full sm:max-w-sm">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/50" />
          <Input placeholder="Katalog ara..." className="pl-10 h-11 bg-muted/30" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
        <Button onClick={openCreate} className="brand-gradient border-0 shadow-md shadow-secondary/20 hover:opacity-90 h-11 px-5 font-semibold gap-2 w-full sm:w-auto">
          <Plus className="w-4 h-4" /> Yeni Katalog
        </Button>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="text-lg font-bold">{editId ? "Katalog Düzenle" : "Yeni Katalog Oluştur"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Katalog Adı</Label>
              <Input required className="h-11" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Açıklama</Label>
              <Input className="h-11" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <Button type="submit" className="w-full h-11 font-semibold">{editId ? "Güncelle" : "Oluştur"}</Button>
          </form>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((c: any) => (
          <div key={c.id} className="bg-card rounded-xl border border-border shadow-sm overflow-hidden card-hover">
            <div className="p-4 md:p-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center shrink-0"><ShoppingBag className="w-5 h-5 text-secondary" /></div>
                <span className="status-badge status-active">{c._count?.items || 0} ürün</span>
              </div>
              <h3 className="font-bold text-foreground mb-1 line-clamp-1">{c.name}</h3>
              {c.description && <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{c.description}</p>}
              <button onClick={() => copyLink(c.slug)} className="w-full flex items-center gap-2 justify-between text-xs bg-muted/30 text-muted-foreground p-2.5 rounded-lg border border-border mb-4 hover:bg-muted/50 transition-colors">
                <span className="flex items-center gap-1 truncate"><Link2 className="w-3 h-3 shrink-0" /> /c/{c.slug}</span>
                {copiedSlug === c.slug ? <Check className="w-3 h-3 text-chart-2 shrink-0" /> : <Copy className="w-3 h-3 shrink-0" />}
              </button>
            </div>
            <div className="border-t border-border px-4 md:px-5 py-3 flex gap-2">
              <button onClick={() => handleDelete(c.id)} className="h-9 w-9 flex items-center justify-center rounded-lg border border-destructive/20 text-destructive hover:bg-destructive/10 transition-colors touch-target">
                <Trash2 className="w-4 h-4" />
              </button>
              <button onClick={() => openEdit(c)} className="flex-1 text-center py-2 rounded-lg text-xs font-medium border border-border hover:bg-muted transition-colors touch-target">Düzenle</button>
              <Link to={`/admin/catalogs/${c.id}`} className="flex-1 text-center py-2 rounded-lg text-xs font-medium bg-secondary/10 text-secondary hover:bg-secondary/20 transition-colors touch-target flex items-center justify-center gap-1">Yönet <ChevronRight className="w-3 h-3" /></Link>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-16">
            <ShoppingBag className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">{catalogs.length === 0 ? "Henüz bir katalog oluşturmadınız." : "Arama kriterlerine uygun katalog bulunamadı."}</p>
          </div>
        )}
      </div>
    </div>
  );
}
