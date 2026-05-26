import React, { useEffect, useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Building2, Plus, ChevronRight, Users as UsersIcon, ArrowLeft } from "lucide-react";
import { useToastActions } from "@/components/ui/toast";

export default function Tenants() {
  const { token } = useAuthStore();
  const toast = useToastActions();
  const [tenants, setTenants] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<any>(null);
  const [storageInfo, setStorageInfo] = useState<any>(null);
  const [deletedProducts, setDeletedProducts] = useState<any[]>([]);
  const [deletedCustomers, setDeletedCustomers] = useState<any[]>([]);
  const [archiveTab, setArchiveTab] = useState<"products" | "customers">("products");

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
    const res = await fetch("/api/tenants", { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setTenants(await res.json());
  };

  const fetchTenantDetails = async (id: string) => {
    const [res, storageRes] = await Promise.all([
      fetch(`/api/tenants/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`/api/tenants/${id}/storage`, { headers: { Authorization: `Bearer ${token}` } }),
    ]);
    if (res.ok) setSelectedTenant(await res.json());
    if (storageRes.ok) setStorageInfo(await storageRes.json());
    const [dpRes, dcRes] = await Promise.all([
      fetch(`/api/admin/tenants/${id}/deleted-products`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`/api/admin/tenants/${id}/deleted-customers`, { headers: { Authorization: `Bearer ${token}` } }),
    ]);
    if (dpRes.ok) setDeletedProducts(await dpRes.json());
    if (dcRes.ok) setDeletedCustomers(await dcRes.json());
  };

  const restoreDeletedProduct = async (deletedId: string) => {
    if (!selectedTenant) return;
    const res = await fetch(`/api/admin/deleted-products/${deletedId}/restore`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      toast.success("Ürün geri yüklendi.");
      fetchTenantDetails(selectedTenant.id);
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error || "Geri yükleme başarısız.");
    }
  };

  const restoreDeletedCustomer = async (deletedId: string) => {
    if (!selectedTenant) return;
    const res = await fetch(`/api/admin/deleted-customers/${deletedId}/restore`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      toast.success("Müşteri geri yüklendi.");
      fetchTenantDetails(selectedTenant.id);
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error || "Geri yükleme başarısız.");
    }
  };

  useEffect(() => {
    fetchTenants();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/tenants", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(formData)
    });
    if (res.ok) {
      setOpen(false);
      setFormData({ name: "", adminName: "", adminEmail: "", adminPassword: "", planName: "Starter" });
      toast.success("Firma başarıyla oluşturuldu.");
      fetchTenants();
    } else {
      const resp = await res.json().catch(() => ({}));
      toast.error(resp.error || "Hata oluştu");
    }
  };

  const handleUpdateTenant = async () => {
    if (!selectedTenant) return;
    const res = await fetch(`/api/tenants/${selectedTenant.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        name: selectedTenant.name,
        planName: selectedTenant.planName,
        isActive: selectedTenant.isActive,
        licenseExpiresAt: selectedTenant.licenseExpiresAt,
        modules: selectedTenant.modules ? JSON.parse(selectedTenant.modules) : null,
        storageLimitBytes: selectedTenant.storageLimitBytes
      })
    });
    if (res.ok) {
      toast.success("Firma bilgileri güncellendi.");
      fetchTenants();
    } else {
      toast.error("Güncelleme başarısız.");
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
      setNewUserFormData({ name: "", email: "", password: "", role: "SALES_USER" });
      toast.success("Kullanıcı eklendi.");
      fetchTenantDetails(selectedTenant.id);
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error || "Hata oluştu");
    }
  };

  if (selectedTenant) {
    const usedMb = Number(storageInfo?.usedMb || 0);
    const limitGb = Number(storageInfo?.limitGb || 0);
    const usageRatio = Math.min(1, Math.max(0, Number(storageInfo?.usageRatio || 0)));

    return (
      <div className="min-h-screen bg-background">
        <div className="bg-card border-b border-border shadow-sm sticky top-0 z-10">
          <div className="px-4 md:px-6 py-4 flex items-center justify-between w-full">
            <div className="flex items-center gap-4">
              <button onClick={() => setSelectedTenant(null)} className="p-2 hover:bg-muted rounded-lg transition-colors touch-target">
                <ArrowLeft className="w-5 h-5 text-foreground" />
              </button>
              <div>
                <h1 className="text-lg md:text-xl font-bold text-foreground">{selectedTenant.name}</h1>
                <p className="text-sm text-muted-foreground">Firma yönetim ekranı</p>
              </div>
            </div>
            <Button onClick={handleUpdateTenant} className="brand-gradient border-0 shadow-md hover:opacity-90 px-6 md:px-8 h-10 md:h-11 font-semibold">Kaydet</Button>
          </div>
        </div>

        <div className="w-full p-4 md:p-6 space-y-4 md:space-y-8">
          <div className="grid md:grid-cols-2 gap-4 md:gap-8">
            <div className="bg-card p-5 md:p-6 rounded-xl border border-border shadow-sm space-y-5">
              <h3 className="font-bold text-foreground">Genel Bilgiler & Lisans</h3>
              <div className="space-y-2">
                <Label className="font-semibold text-sm">Firma Adı</Label>
                <Input className="h-11 border-border" value={selectedTenant.name} onChange={(e) => setSelectedTenant({ ...selectedTenant, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label className="font-semibold text-sm">Abonelik Paketi</Label>
                <select className="flex h-11 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm shadow-sm" value={selectedTenant.planName} onChange={(e) => setSelectedTenant({ ...selectedTenant, planName: e.target.value })}>
                  <option value="Starter">Starter Paketi (5 GB)</option>
                  <option value="Pro">Pro Paketi (20 GB)</option>
                  <option value="Enterprise">Enterprise Paketi (100 GB)</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label className="font-semibold text-sm">Lisans Bitiş Tarihi</Label>
                <Input type="date" className="h-11 border-border" value={selectedTenant.licenseExpiresAt ? selectedTenant.licenseExpiresAt.split("T")[0] : ""} onChange={(e) => setSelectedTenant({ ...selectedTenant, licenseExpiresAt: e.target.value })} />
              </div>
              <div className="flex items-center gap-2.5 pt-2">
                <input type="checkbox" id="isActive" checked={selectedTenant.isActive} onChange={(e) => setSelectedTenant({ ...selectedTenant, isActive: e.target.checked })} className="w-5 h-5 rounded border-border accent-secondary cursor-pointer" />
                <Label htmlFor="isActive" className="font-semibold cursor-pointer text-sm">Firma Aktif</Label>
              </div>

              {/* Premium Modüller */}
              <div className="border-t border-border pt-4 mt-4 space-y-3">
                <h4 className="text-sm font-bold text-foreground">Premium Modüller</h4>
                <div className="space-y-3">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={!!(selectedTenant.modules ? JSON.parse(selectedTenant.modules).xmlIntegration : false)} 
                      onChange={(e) => {
                        const parsed = selectedTenant.modules ? JSON.parse(selectedTenant.modules) : {};
                        parsed.xmlIntegration = e.target.checked;
                        setSelectedTenant({ ...selectedTenant, modules: JSON.stringify(parsed) });
                      }}
                      className="w-5 h-5 rounded border-border accent-secondary cursor-pointer" 
                    />
                    <span className="text-sm font-semibold text-foreground">XML İçe/Dışa Aktarma Modülü</span>
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={!!(selectedTenant.modules ? JSON.parse(selectedTenant.modules).excelIntegration : false)} 
                      onChange={(e) => {
                        const parsed = selectedTenant.modules ? JSON.parse(selectedTenant.modules) : {};
                        parsed.excelIntegration = e.target.checked;
                        setSelectedTenant({ ...selectedTenant, modules: JSON.stringify(parsed) });
                      }}
                      className="w-5 h-5 rounded border-border accent-secondary cursor-pointer" 
                    />
                    <span className="text-sm font-semibold text-foreground">Excel İçe Aktarma Modülü (Ürün/Müşteri)</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="bg-card p-5 md:p-6 rounded-xl border border-border shadow-sm">
              <h3 className="font-bold text-foreground mb-4">Yeni Kullanıcı Ekle</h3>
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Ad Soyad</Label>
                    <Input required className="h-11" value={newUserFormData.name} onChange={(e) => setNewUserFormData({ ...newUserFormData, name: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Rol</Label>
                    <select className="flex h-11 w-full rounded-lg border border-border bg-card px-3 py-1 text-sm shadow-sm" value={newUserFormData.role} onChange={(e) => setNewUserFormData({ ...newUserFormData, role: e.target.value })}>
                      <option value="TENANT_ADMIN">TENANT_ADMIN</option>
                      <option value="SALES_USER">SALES_USER</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">E-posta</Label>
                  <Input required type="email" className="h-11" value={newUserFormData.email} onChange={(e) => setNewUserFormData({ ...newUserFormData, email: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Şifre</Label>
                  <Input required type="text" className="h-11" value={newUserFormData.password} onChange={(e) => setNewUserFormData({ ...newUserFormData, password: e.target.value })} />
                </div>
                <Button type="submit" variant="secondary" className="w-full h-11 font-semibold">Kullanıcıyı Kaydet</Button>
              </form>
            </div>
          </div>

          <div className="bg-card p-5 md:p-6 rounded-xl border border-border shadow-sm space-y-4">
            <h3 className="font-bold text-foreground">Paket ve Kota Bilgileri</h3>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="rounded-lg border border-border p-4 bg-muted/20">
                <div className="text-xs text-muted-foreground">Paket</div>
                <div className="text-base font-semibold text-foreground mt-1">{selectedTenant.planName || "-"}</div>
              </div>
              <div className="rounded-lg border border-border p-4 bg-muted/20">
                <div className="text-xs text-muted-foreground">Kullanım</div>
                <div className="text-base font-semibold text-foreground mt-1">{usedMb.toFixed(2)} MB</div>
              </div>
              <div className="rounded-lg border border-border p-4 bg-muted/20">
                <div className="text-xs text-muted-foreground">Limit</div>
                <div className="text-base font-semibold text-foreground mt-1">{limitGb.toFixed(2)} GB</div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Kullanım Oranı</span>
                <span>{(usageRatio * 100).toFixed(1)}%</span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-secondary transition-all" style={{ width: `${usageRatio * 100}%` }} />
              </div>
            </div>
          </div>

          <div className="bg-card p-5 md:p-6 rounded-xl border border-border shadow-sm">
            <h3 className="font-bold text-foreground mb-4">Mevcut Kullanıcılar</h3>
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
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.name}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{u.email}</TableCell>
                      <TableCell><span className="status-badge status-approved">{u.role}</span></TableCell>
                      <TableCell><span className={`status-badge ${u.isActive ? "status-active" : "status-cancelled"}`}>{u.isActive ? "Aktif" : "Pasif"}</span></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="bg-card p-5 md:p-6 rounded-xl border border-border shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Button variant={archiveTab === "products" ? "secondary" : "outline"} size="sm" onClick={() => setArchiveTab("products")}>
                Silinen Ürünler
              </Button>
              <Button variant={archiveTab === "customers" ? "secondary" : "outline"} size="sm" onClick={() => setArchiveTab("customers")}>
                Silinen Müşteriler
              </Button>
            </div>
            {archiveTab === "products" ? (
              <div className="space-y-2">
                {deletedProducts.length === 0 && <p className="text-sm text-muted-foreground">Silinen ürün yok.</p>}
                {deletedProducts.map((p: any) => {
                  const snap = JSON.parse(p.snapshotJson || "{}");
                  return (
                    <div key={p.id} className="flex items-center justify-between border border-border rounded-lg p-3">
                      <div>
                        <div className="font-medium text-sm">{snap.name || p.originalId}</div>
                        <div className="text-xs text-muted-foreground">{new Date(p.deletedAt).toLocaleString("tr-TR")} · {p.restoreStatus}</div>
                      </div>
                      {p.restoreStatus !== "RESTORED" && (
                        <Button size="sm" onClick={() => restoreDeletedProduct(p.id)}>Geri Yükle</Button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-2">
                {deletedCustomers.length === 0 && <p className="text-sm text-muted-foreground">Silinen müşteri yok.</p>}
                {deletedCustomers.map((c: any) => {
                  const snap = JSON.parse(c.snapshotJson || "{}");
                  return (
                    <div key={c.id} className="flex items-center justify-between border border-border rounded-lg p-3">
                      <div>
                        <div className="font-medium text-sm">{snap.name || c.originalId}</div>
                        <div className="text-xs text-muted-foreground">{new Date(c.deletedAt).toLocaleString("tr-TR")} · {c.restoreStatus}</div>
                      </div>
                      {c.restoreStatus !== "RESTORED" && (
                        <Button size="sm" onClick={() => restoreDeletedCustomer(c.id)}>Geri Yükle</Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex justify-end">
        <Button onClick={() => setOpen(true)} className="brand-gradient border-0 shadow-md shadow-secondary/20 hover:opacity-90 h-11 px-5 font-semibold gap-2 w-full sm:w-auto">
          <Plus className="w-4 h-4" /> Yeni Firma Ekle
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="text-lg font-bold">Yeni Firma Oluştur</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-2"><Label className="text-sm font-semibold">Firma Adı</Label><Input required className="h-11" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} /></div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Abonelik Paketi</Label>
              <select className="flex h-11 w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm shadow-sm" value={formData.planName} onChange={(e) => setFormData({ ...formData, planName: e.target.value })}>
                <option value="Starter">Starter Paketi (5 GB)</option>
                <option value="Pro">Pro Paketi (20 GB)</option>
                <option value="Enterprise">Enterprise Paketi (100 GB)</option>
              </select>
            </div>
            <div className="space-y-2"><Label className="text-sm font-semibold">Admin Adı Soyadı</Label><Input required className="h-11" value={formData.adminName} onChange={(e) => setFormData({ ...formData, adminName: e.target.value })} /></div>
            <div className="space-y-2"><Label className="text-sm font-semibold">Admin E-posta</Label><Input required type="email" className="h-11" value={formData.adminEmail} onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })} /></div>
            <div className="space-y-2"><Label className="text-sm font-semibold">Geçici Şifre</Label><Input required type="password" className="h-11" value={formData.adminPassword} onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })} /></div>
            <Button type="submit" className="w-full h-11 font-semibold">Oluştur</Button>
          </form>
        </DialogContent>
      </Dialog>

      <div className="md:hidden space-y-3">
        {tenants.map((t) => (
          <div key={t.id} className="bg-card rounded-xl border border-border p-4 shadow-sm card-hover" onClick={() => fetchTenantDetails(t.id)}>
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0"><Building2 className="w-5 h-5" /></div>
                <div>
                  <div className="font-semibold text-foreground">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t._count.users} kullanıcı · {t.planName}</div>
                </div>
              </div>
              <span className={`status-badge ${t.isActive ? "status-active" : "status-cancelled"}`}>{t.isActive ? "Aktif" : "Pasif"}</span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <span className="text-xs text-muted-foreground">{t.licenseExpiresAt ? new Date(t.licenseExpiresAt).toLocaleDateString("tr-TR") : "Süresiz"}</span>
              <span className="text-xs text-secondary font-medium flex items-center gap-1">Yönet <ChevronRight className="w-3 h-3" /></span>
            </div>
          </div>
        ))}
      </div>

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
            {tenants.map((t) => (
              <TableRow key={t.id} className="hover:bg-muted/20">
                <TableCell><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0"><Building2 className="w-4 h-4" /></div><span className="font-medium">{t.name}</span></div></TableCell>
                <TableCell className="text-muted-foreground">{t._count.users}</TableCell>
                <TableCell><span className="status-badge status-approved">{t.planName}</span></TableCell>
                <TableCell className="text-muted-foreground text-sm">{t.licenseExpiresAt ? new Date(t.licenseExpiresAt).toLocaleDateString("tr-TR") : "-"}</TableCell>
                <TableCell><span className={`status-badge ${t.isActive ? "status-active" : "status-cancelled"}`}>{t.isActive ? "Aktif" : "Pasif"}</span></TableCell>
                <TableCell className="text-right"><Button variant="outline" size="sm" className="touch-target" onClick={() => fetchTenantDetails(t.id)}>Yönet & Detaylar</Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
