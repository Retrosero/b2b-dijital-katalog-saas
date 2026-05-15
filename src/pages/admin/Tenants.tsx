import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function Tenants() {
  const { token } = useAuthStore();
  const [tenants, setTenants] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<any>(null);

  const [formData, setFormData] = useState({
    name: "",
    adminName: "",
    adminEmail: "",
    adminPassword: "",
    planName: "Starter"
  });

  const [newUserFormData, setNewUserFormData] = useState({
    name: "", email: "", password: "", role: "SALES_USER"
  });

  const fetchTenants = async () => {
    const res = await fetch("/api/tenants", {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) setTenants(await res.json());
  };

  const fetchTenantDetails = async (id: string) => {
    const res = await fetch(`/api/tenants/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      setSelectedTenant(await res.json());
      setDetailsOpen(true);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/tenants", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(formData)
    });
      if (res.ok) {
      setOpen(false);
      setFormData({ name: "", adminName: "", adminEmail: "", adminPassword: "", planName: "Starter" });
      fetchTenants();
    } else {
      const resp = await res.json();
      alert(resp.error || "Hata oluştu");
    }
  };

  const handleUpdateTenant = async () => {
    if(!selectedTenant) return;
    const res = await fetch(`/api/tenants/${selectedTenant.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({
        name: selectedTenant.name,
        planName: selectedTenant.planName,
        isActive: selectedTenant.isActive,
        licenseExpiresAt: selectedTenant.licenseExpiresAt,
      })
    });
    if (res.ok) {
      alert("Firma bilgileri güncellendi");
      fetchTenants();
    } else {
      alert("Güncelleme başarısız");
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
     e.preventDefault();
     if (!selectedTenant) return;
     const res = await fetch(`/api/tenants/${selectedTenant.id}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(newUserFormData)
     });
     if (res.ok) {
        setNewUserFormData({ name: "", email: "", password: "", role: "SALES_USER"});
        fetchTenantDetails(selectedTenant.id); // Refresh
        alert("Kullanıcı eklendi.");
     } else {
        const err = await res.json();
        alert(err.error || "Hata oluştu");
     }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Firmalar</h2>
          <p className="text-muted-foreground">Sistemdeki tüm tenant/firmaları yönetin.</p>
        </div>
        <Button onClick={() => setOpen(true)} className="w-full sm:w-auto">+ Yeni Firma Ekle</Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeni Firma Oluştur</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Firma Adı</Label>
              <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Abonelik Paketi</Label>
              <select className="flex h-10 w-full rounded-md border border-input bg-slate-50 px-3 py-2 text-sm shadow-sm transition-colors focus:ring-2 focus:ring-indigo-500 outline-none" value={formData.planName} onChange={e => setFormData({...formData, planName: e.target.value})}>
                <option value="Starter">Starter Paketi (5 GB)</option>
                <option value="Pro">Pro Paketi (20 GB)</option>
                <option value="Enterprise">Enterprise Paketi (100 GB)</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Admin Adı Soyadı</Label>
              <Input required value={formData.adminName} onChange={e => setFormData({...formData, adminName: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Admin E-posta</Label>
              <Input required type="email" value={formData.adminEmail} onChange={e => setFormData({...formData, adminEmail: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Geçici Şifre</Label>
              <Input required type="password" value={formData.adminPassword} onChange={e => setFormData({...formData, adminPassword: e.target.value})} />
            </div>
            <Button type="submit" className="w-full">Oluştur</Button>
          </form>
        </DialogContent>
      </Dialog>
      
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-[100vw] w-screen h-[100dvh] p-0 m-0 rounded-none border-0 flex flex-col bg-slate-50 !gap-0">
          {selectedTenant && (
            <>
              <DialogHeader className="px-6 py-5 bg-white border-b shadow-sm sticky top-0 z-10 flex flex-row items-center justify-between pr-8">
                 <DialogTitle className="text-2xl font-bold flex items-center gap-3">
                    {selectedTenant.name} Detayları
                 </DialogTitle>
                 <Button onClick={handleUpdateTenant} size="lg" className="px-8 shadow-md">Değişiklikleri Kaydet</Button>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto p-4 md:p-10 space-y-8 max-w-6xl mx-auto w-full">
                 <div className="grid md:grid-cols-2 gap-8">
                   <div className="bg-white p-6 rounded-xl border shadow-sm space-y-6">
                      <h3 className="font-bold text-lg border-b pb-2">Genel Bilgiler & Lisans</h3>
                      
                      <div className="space-y-2">
                         <Label className="font-semibold">Firma Adı</Label>
                         <Input className="h-10 border-slate-200" value={selectedTenant.name} onChange={e => setSelectedTenant({...selectedTenant, name: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                         <Label className="font-semibold">Lisans / Abonelik Paketi</Label>
                         <select className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm transition-colors focus:ring-2 outline-none" value={selectedTenant.planName} onChange={e => setSelectedTenant({...selectedTenant, planName: e.target.value})}>
                            <option value="Starter">Starter Paketi (5 GB)</option>
                            <option value="Pro">Pro Paketi (20 GB)</option>
                            <option value="Enterprise">Enterprise Paketi (100 GB)</option>
                         </select>
                      </div>
                      <div className="space-y-2">
                         <Label className="font-semibold">Lisans Bitiş Tarihi</Label>
                         <Input type="date" className="h-10 border-slate-200" value={selectedTenant.licenseExpiresAt ? selectedTenant.licenseExpiresAt.split('T')[0] : ''} onChange={e => setSelectedTenant({...selectedTenant, licenseExpiresAt: e.target.value})} />
                      </div>
                      <div className="space-y-2 flex items-center gap-2 pt-2">
                         <input type="checkbox" id="isActive" checked={selectedTenant.isActive} onChange={e => setSelectedTenant({...selectedTenant, isActive: e.target.checked})} className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                         <Label htmlFor="isActive" className="font-semibold cursor-pointer">Firma Aktif (Giriş Yapabilirler)</Label>
                      </div>
                   </div>

                   <div className="bg-white p-6 rounded-xl border shadow-sm flex flex-col">
                      <h3 className="font-bold text-lg border-b pb-2 mb-4">Yeni Kullanıcı Ekle</h3>
                      <form onSubmit={handleCreateUser} className="space-y-4 flex-1 flex flex-col">
                         <div className="grid grid-cols-2 gap-4">
                           <div className="space-y-2">
                              <Label className="text-xs font-semibold">Ad Soyad</Label>
                              <Input required value={newUserFormData.name} onChange={e => setNewUserFormData({...newUserFormData, name: e.target.value})} />
                           </div>
                           <div className="space-y-2">
                              <Label className="text-xs font-semibold">Rol</Label>
                              <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors" value={newUserFormData.role} onChange={e => setNewUserFormData({...newUserFormData, role: e.target.value})}>
                                 <option value="TENANT_ADMIN">TENANT_ADMIN</option>
                                 <option value="SALES_USER">SALES_USER</option>
                              </select>
                           </div>
                         </div>
                         <div className="space-y-2">
                           <Label className="text-xs font-semibold">E-posta</Label>
                           <Input required type="email" value={newUserFormData.email} onChange={e => setNewUserFormData({...newUserFormData, email: e.target.value})} />
                         </div>
                         <div className="space-y-2">
                           <Label className="text-xs font-semibold">Şifre</Label>
                           <Input required type="text" value={newUserFormData.password} onChange={e => setNewUserFormData({...newUserFormData, password: e.target.value})} />
                         </div>
                         <div className="mt-auto pt-4">
                           <Button type="submit" variant="secondary" className="w-full">Kullanıcıyı Kaydet</Button>
                         </div>
                      </form>
                   </div>
                 </div>

                 <div className="bg-white p-6 rounded-xl border shadow-sm">
                    <h3 className="font-bold text-lg border-b pb-2 mb-4">Mevcut Kullanıcılar</h3>
                    <div className="border rounded-lg overflow-hidden">
                       <Table>
                         <TableHeader className="bg-slate-50">
                           <TableRow>
                             <TableHead>İsim</TableHead>
                             <TableHead>E-posta</TableHead>
                             <TableHead>Yetki</TableHead>
                             <TableHead>Durum</TableHead>
                           </TableRow>
                         </TableHeader>
                         <TableBody>
                           {selectedTenant.users?.map((u: any) => (
                              <TableRow key={u.id}>
                                <TableCell className="font-medium">{u.name}</TableCell>
                                <TableCell>{u.email}</TableCell>
                                <TableCell><span className="text-xs font-bold px-2 py-1 bg-slate-100 rounded">{u.role}</span></TableCell>
                                <TableCell>{u.isActive ? "Aktif" : "Pasif"}</TableCell>
                              </TableRow>
                           ))}
                         </TableBody>
                       </Table>
                    </div>
                 </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <div className="border rounded-md bg-white overflow-hidden">
        <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="">Firma Adı</TableHead>
                <TableHead>Kullanıcı Sayısı</TableHead>
                <TableHead>Abonelik</TableHead>
                <TableHead>Lisans Süresi</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead className="text-right">İşlem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenants.map(t => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.name}</TableCell>
                  <TableCell>{t._count.users}</TableCell>
                  <TableCell>
                    <span className="px-2 py-1 bg-slate-100 text-slate-800 rounded-lg text-xs font-semibold">{t.planName}</span>
                  </TableCell>
                  <TableCell>
                    {t.licenseExpiresAt ? new Date(t.licenseExpiresAt).toLocaleDateString("tr-TR") : <span className="text-muted-foreground">-</span>}
                  </TableCell>
                  <TableCell>
                     {t.isActive ? <span className="text-green-600 font-semibold">Aktif</span> : <span className="text-red-600">Pasif</span>}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => fetchTenantDetails(t.id)}>Yönet & Detaylar</Button>
                  </TableCell>
                </TableRow>
              ))}
              {tenants.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground h-24">
                    Kayıtlı firma bulunamadı.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
      </div>
    </div>
  );
}
