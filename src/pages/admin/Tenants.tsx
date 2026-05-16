import React, { useEffect, useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Building2, Plus, ChevronRight, Users as UsersIcon } from "lucide-react";

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
    <div className="space-y-4 animate-fade-in">
      <div className="flex justify-end">
        <Button onClick={() => setOpen(true)} className="brand-gradient border-0 shadow-md shadow-secondary/20 hover:opacity-90 h-11 px-5 font-semibold gap-2 w-full sm:w-auto">
          <Plus className="w-4 h-4" /> Yeni Firma Ekle
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Yeni Firma Oluştur</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Firma Adı</Label>
              <Input required className="h-11" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Abonelik Paketi</Label>
              <select className="flex h-11 w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm shadow-sm transition-colors focus:ring-2 focus:ring-ring outline-none touch-target" value={formData.planName} onChange={e => setFormData({...formData, planName: e.target.value})}>
                <option value="Starter">Starter Paketi (5 GB)</option>
                <option value="Pro">Pro Paketi (20 GB)</option>
                <option value="Enterprise">Enterprise Paketi (100 GB)</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Admin Adı Soyadı</Label>
              <Input required className="h-11" value={formData.adminName} onChange={e => setFormData({...formData, adminName: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Admin E-posta</Label>
              <Input required type="email" className="h-11" value={formData.adminEmail} onChange={e => setFormData({...formData, adminEmail: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Geçici Şifre</Label>
              <Input required type="password" className="h-11" value={formData.adminPassword} onChange={e => setFormData({...formData, adminPassword: e.target.value})} />
            </div>
            <Button type="submit" className="w-full h-11 font-semibold">Oluştur</Button>
          </form>
        </DialogContent>
      </Dialog>
      
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-[100vw] w-screen h-[100dvh] p-0 m-0 rounded-none border-0 flex flex-col bg-background !gap-0">
          {selectedTenant && (
            <>
              <DialogHeader className="px-4 md:px-6 py-4 md:py-5 bg-card border-b border-border shadow-sm sticky top-0 z-10 flex flex-row items-center justify-between pr-12 md:pr-8">
                 <DialogTitle className="text-lg md:text-xl font-bold flex items-center gap-3">
                    {selectedTenant.name}
                 </DialogTitle>
                 <Button onClick={handleUpdateTenant} className="brand-gradient border-0 shadow-md hover:opacity-90 px-6 md:px-8 h-10 md:h-11 font-semibold">Kaydet</Button>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto p-4 md:p-10 space-y-4 md:space-y-8 max-w-6xl mx-auto w-full">
                 <div className="grid md:grid-cols-2 gap-4 md:gap-8">
                   <div className="bg-card p-5 md:p-6 rounded-xl border border-border shadow-sm space-y-5 md:space-y-6">
                      <div className="flex items-center gap-3 border-b border-border pb-3">
                        <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center">
                          <Building2 className="w-4 h-4 text-secondary" />
                        </div>
                        <h3 className="font-bold text-foreground">Genel Bilgiler & Lisans</h3>
                      </div>
                      
                      <div className="space-y-2">
                         <Label className="font-semibold text-sm">Firma Adı</Label>
                         <Input className="h-11 border-border" value={selectedTenant.name} onChange={e => setSelectedTenant({...selectedTenant, name: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                         <Label className="font-semibold text-sm">Lisans / Abonelik Paketi</Label>
                         <select className="flex h-11 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm shadow-sm transition-colors focus:ring-2 outline-none touch-target" value={selectedTenant.planName} onChange={e => setSelectedTenant({...selectedTenant, planName: e.target.value})}>
                            <option value="Starter">Starter Paketi (5 GB)</option>
                            <option value="Pro">Pro Paketi (20 GB)</option>
                            <option value="Enterprise">Enterprise Paketi (100 GB)</option>
                         </select>
                      </div>
                      <div className="space-y-2">
                         <Label className="font-semibold text-sm">Lisans Bitiş Tarihi</Label>
                         <Input type="date" className="h-11 border-border" value={selectedTenant.licenseExpiresAt ? selectedTenant.licenseExpiresAt.split('T')[0] : ''} onChange={e => setSelectedTenant({...selectedTenant, licenseExpiresAt: e.target.value})} />
                      </div>
                      <div className="flex items-center gap-2.5 pt-2">
                         <input type="checkbox" id="isActive" checked={selectedTenant.isActive} onChange={e => setSelectedTenant({...selectedTenant, isActive: e.target.checked})} className="w-5 h-5 rounded border-border text-secondary focus:ring-secondary accent-secondary cursor-pointer" />
                         <Label htmlFor="isActive" className="font-semibold cursor-pointer text-sm">Firma Aktif (Giriş Yapabilirler)</Label>
                      </div>
                   </div>

                   <div className="bg-card p-5 md:p-6 rounded-xl border border-border shadow-sm flex flex-col">
                      <div className="flex items-center gap-3 border-b border-border pb-3 mb-5">
                        <div className="w-8 h-8 rounded-lg bg-chart-2/10 flex items-center justify-center">
                          <UsersIcon className="w-4 h-4 text-chart-2" />
                        </div>
                        <h3 className="font-bold text-foreground">Yeni Kullanıcı Ekle</h3>
                      </div>
                      <form onSubmit={handleCreateUser} className="space-y-4 flex-1 flex flex-col">
                         <div className="grid grid-cols-2 gap-4">
                           <div className="space-y-2">
                              <Label className="text-xs font-semibold">Ad Soyad</Label>
                              <Input required className="h-11" value={newUserFormData.name} onChange={e => setNewUserFormData({...newUserFormData, name: e.target.value})} />
                           </div>
                           <div className="space-y-2">
                              <Label className="text-xs font-semibold">Rol</Label>
                              <select className="flex h-11 w-full rounded-lg border border-border bg-card px-3 py-1 text-sm shadow-sm transition-colors touch-target" value={newUserFormData.role} onChange={e => setNewUserFormData({...newUserFormData, role: e.target.value})}>
                                 <option value="TENANT_ADMIN">TENANT_ADMIN</option>
                                 <option value="SALES_USER">SALES_USER</option>
                              </select>
                           </div>
                         </div>
                         <div className="space-y-2">
                           <Label className="text-xs font-semibold">E-posta</Label>
                           <Input required type="email" className="h-11" value={newUserFormData.email} onChange={e => setNewUserFormData({...newUserFormData, email: e.target.value})} />
                         </div>
                         <div className="space-y-2">
                           <Label className="text-xs font-semibold">Şifre</Label>
                           <Input required type="text" className="h-11" value={newUserFormData.password} onChange={e => setNewUserFormData({...newUserFormData, password: e.target.value})} />
                         </div>
                         <div className="mt-auto pt-4">
                           <Button type="submit" variant="secondary" className="w-full h-11 font-semibold">Kullanıcıyı Kaydet</Button>
                         </div>
                      </form>
                   </div>
                 </div>

                 <div className="bg-card p-5 md:p-6 rounded-xl border border-border shadow-sm">
                    <div className="flex items-center gap-3 border-b border-border pb-3 mb-4">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <UsersIcon className="w-4 h-4 text-primary" />
                      </div>
                      <h3 className="font-bold text-foreground">Mevcut Kullanıcılar</h3>
                    </div>

                    {/* Mobile Cards */}
                    <div className="md:hidden space-y-3">
                      {selectedTenant.users?.map((u: any) => (
                        <div key={u.id} className="p-3 rounded-lg border border-border bg-muted/20">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-sm text-foreground">{u.name}</div>
                              <div className="text-xs text-muted-foreground">{u.email}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="status-badge status-approved text-[10px]">{u.role}</span>
                              <span className={`status-badge ${u.isActive ? 'status-active' : 'status-cancelled'}`}>{u.isActive ? "Aktif" : "Pasif"}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Desktop Table */}
                    <div className="hidden md:block border border-border rounded-lg overflow-hidden">
                       <Table>
                         <TableHeader className="bg-muted/30">
                           <TableRow>
                             <TableHead>İsim</TableHead>
                             <TableHead>E-posta</TableHead>
                             <TableHead>Yetki</TableHead>
                             <TableHead>Durum</TableHead>
                           </TableRow>
                         </TableHeader>
                         <TableBody>
                           {selectedTenant.users?.map((u: any) => (
                              <TableRow key={u.id} className="hover:bg-muted/20">
                                <TableCell className="font-medium">{u.name}</TableCell>
                                <TableCell className="text-muted-foreground text-sm">{u.email}</TableCell>
                                <TableCell><span className="status-badge status-approved">{u.role}</span></TableCell>
                                <TableCell><span className={`status-badge ${u.isActive ? 'status-active' : 'status-cancelled'}`}>{u.isActive ? "Aktif" : "Pasif"}</span></TableCell>
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

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {tenants.map(t => (
          <div key={t.id} className="bg-card rounded-xl border border-border p-4 shadow-sm card-hover" onClick={() => fetchTenantDetails(t.id)}>
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-semibold text-foreground">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t._count.users} kullanıcı · {t.planName}</div>
                </div>
              </div>
              <span className={`status-badge ${t.isActive ? 'status-active' : 'status-cancelled'}`}>{t.isActive ? "Aktif" : "Pasif"}</span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <span className="text-xs text-muted-foreground">
                {t.licenseExpiresAt ? new Date(t.licenseExpiresAt).toLocaleDateString("tr-TR") : "Süresiz"}
              </span>
              <span className="text-xs text-secondary font-medium flex items-center gap-1">
                Yönet <ChevronRight className="w-3 h-3" />
              </span>
            </div>
          </div>
        ))}
        {tenants.length === 0 && (
          <div className="text-center py-16">
            <Building2 className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">Kayıtlı firma bulunamadı.</p>
          </div>
        )}
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block border rounded-xl bg-card overflow-hidden shadow-sm">
        <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead>Firma Adı</TableHead>
                <TableHead>Kullanıcı Sayısı</TableHead>
                <TableHead>Abonelik</TableHead>
                <TableHead>Lisans Süresi</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead className="text-right">İşlem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenants.map(t => (
                <TableRow key={t.id} className="hover:bg-muted/20">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <span className="font-medium">{t.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{t._count.users}</TableCell>
                  <TableCell>
                    <span className="status-badge status-approved">{t.planName}</span>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {t.licenseExpiresAt ? new Date(t.licenseExpiresAt).toLocaleDateString("tr-TR") : <span className="text-muted-foreground">-</span>}
                  </TableCell>
                  <TableCell>
                     <span className={`status-badge ${t.isActive ? 'status-active' : 'status-cancelled'}`}>{t.isActive ? "Aktif" : "Pasif"}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" className="touch-target" onClick={() => fetchTenantDetails(t.id)}>Yönet & Detaylar</Button>
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
