import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search } from "lucide-react";

export default function Catalogs() {
  const { token, user } = useAuthStore();
  const [catalogs, setCatalogs] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [open, setOpen] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    customerId: ""
  });

  const fetchData = async () => {
    const resCat = await fetch("/api/catalogs", { headers: { Authorization: `Bearer ${token}` } });
    if (resCat.ok) setCatalogs(await resCat.json());

    const resCust = await fetch("/api/customers", { headers: { Authorization: `Bearer ${token}` } });
    if (resCust.ok) setCustomers(await resCust.json());
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/catalogs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        ...formData,
        customerId: formData.customerId || null
      })
    });
    if (res.ok) {
      setOpen(false);
      setFormData({ name: "", slug: "", description: "", customerId: "" });
      fetchData();
    } else {
      alert("Hata oluştu, slug kullanılıyor olabilir.");
    }
  };

  if (user?.role === "SUPER_ADMIN") {
    return <div className="p-4 text-center">Super Admin katalog yönetemez. Firmalar menüsünden işlem yapın.</div>;
  }

  const filteredCatalogs = catalogs.filter(c => {
    const query = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(query) ||
      c.slug.toLowerCase().includes(query) ||
      (c.customer?.name && c.customer.name.toLowerCase().includes(query))
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end gap-3 w-full">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="İsim, url eki veya firmada ara..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button variant="secondary" onClick={() => setOpen(true)} className="shrink-0 h-11 px-6 font-bold shadow-sm">+ Yeni Katalog Oluştur</Button>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Yeni Katalog Oluştur</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Katalog Adı</Label>
                <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>URL Eki (Slug)</Label>
                <Input required value={formData.slug} onChange={e => setFormData({...formData, slug: e.target.value})} placeholder="ornek-katalog" />
                <p className="text-xs text-slate-500">Bu katalog şu adreste yayınlanacak: /c/{formData.slug}</p>
              </div>
              <div className="space-y-2">
                <Label>Açıklama</Label>
                <Input value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Özel Müşteri Seçimi (Opsiyonel)</Label>
                <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  value={formData.customerId} onChange={e => setFormData({...formData, customerId: e.target.value})}>
                  <option value="">Herkese Açık Katalog (Müşteri Formu Sorulur)</option>
                  {customers.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <p className="text-xs text-slate-500">Eğer müşteri seçilirse, gelen sipariş direkt bu müşteriye yansır ve sipariş veren kişiye bilgi sorulmaz.</p>
              </div>
              <Button type="submit" className="w-full">Oluştur</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-md bg-white overflow-hidden">
        <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="">Katalog Adı</TableHead>
                <TableHead className="">Atanan Müşteri</TableHead>
                <TableHead>URL Eki</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead>Ürün Sayısı</TableHead>
                <TableHead className="text-right ">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCatalogs.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>{c.customer?.name || <span className="text-muted-foreground text-xs">Herkese Açık</span>}</TableCell>
                  <TableCell className="text-indigo-600 font-mono text-xs">/c/{c.slug}</TableCell>
                  <TableCell>{c.isActive ? "Aktif" : "Pasif"}</TableCell>
                  <TableCell>{c._count.items}</TableCell>
                  <TableCell className="text-right flex items-center justify-end gap-2">
                    <a href={`/c/${c.slug}`} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-[0.8rem] font-medium transition-colors border hover:bg-muted hover:text-foreground h-8 px-2.5">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>
                      Önizle
                    </a>
                    <Link to={`/admin/catalogs/${c.id}`} className="inline-flex items-center justify-center rounded-lg text-[0.8rem] h-8 px-3 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-medium transition-colors">
                      Yönet
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
              {filteredCatalogs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground h-24">
                    Kayıtlı katalog bulunamadı.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
      </div>
    </div>
  );
}
