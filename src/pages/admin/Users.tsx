import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Users as UsersIcon, Shield, ChevronRight, Save } from "lucide-react";
import { usePageHeaderStore } from "@/store/usePageHeaderStore";
import { useToastActions } from "@/components/ui/toast";

export default function Users() {
  const { token, user } = useAuthStore();
  const { setHeader, resetHeader } = usePageHeaderStore();
  const toast = useToastActions();
  const [users, setUsers] = useState<any[]>([]);
  
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});

  const fetchUsers = async () => {
    const res = await fetch("/api/users", {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) setUsers(await res.json());
  };

  useEffect(() => {
    fetchUsers();
  }, [token]);

  const openEditPage = (u: any) => {
    setSelectedUser(u);
    setFormData({
      role: u.role,
      customerAccess: u.customerAccess || "ALL",
      allowedPagesArr: u.allowedPages ? JSON.parse(u.allowedPages) : null,
      fastSalesSettings: u.fastSalesSettings ? JSON.parse(u.fastSalesSettings) : {
        sku: true, barcode: true, category: true, piecesPerBox: true, packagingType: true, stock: true, description: true
      }
    });
  };

  const handleUpdate = async () => {
    const res = await fetch(`/api/users/${selectedUser.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        role: formData.role,
        customerAccess: formData.customerAccess,
        allowedPages: formData.allowedPagesArr ? JSON.stringify(formData.allowedPagesArr) : null,
        fastSalesSettings: JSON.stringify(formData.fastSalesSettings)
      })
    });
    
    if (res.ok) {
      setSelectedUser(null);
      toast.success("Kullanıcı ayarları güncellendi.");
      fetchUsers();
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error || "Hata oluştu.");
    }
  };

  useEffect(() => {
    if (!selectedUser) {
      resetHeader();
      return;
    }

    setHeader({
      title: "Kullanıcı Düzenle",
      subtitle: `${selectedUser.name} - ${selectedUser.email}`,
      backTo: null,
      onBack: () => setSelectedUser(null),
      actions: [
        {
          key: "save-user",
          label: "Kaydet",
          onClick: handleUpdate,
          icon: <Save className="w-5 h-5" />,
          variant: "secondary"
        }
      ]
    });
    return resetHeader;
  }, [selectedUser, formData, setHeader, resetHeader]);

  if (user?.role === "SUPER_ADMIN") {
    return <div className="p-4 text-center text-muted-foreground">Super Admin kullanıcıları Tenants (Firmalar) sayfasından yönetir.</div>;
  }

  const roleLabels: Record<string, string> = {
    TENANT_ADMIN: "Yönetici",
    SALES_USER: "Satış Temsilcisi"
  };

  // Full page edit view
  if (selectedUser) {
    return (
      <div className="bg-background">
        <div>
          <div className="bg-card p-5 md:p-8 rounded-xl border border-border shadow-sm space-y-6 md:space-y-8">
            <div className="grid md:grid-cols-2 gap-4 md:gap-8">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-foreground">Kullanıcı Yetki Rolü</label>
                <select 
                  className="flex h-11 w-full rounded-lg border border-border bg-muted/30 px-4 py-2 text-sm shadow-sm transition-colors focus:ring-2 focus:ring-ring outline-none touch-target"
                  value={formData.role || "SALES_USER"} 
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                >
                  <option value="TENANT_ADMIN">Yönetici (TENANT_ADMIN)</option>
                  <option value="SALES_USER">Satış Temsilcisi (SALES_USER)</option>
                </select>
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-foreground">Müşteri Data Erişimi</label>
                <select 
                  className="flex h-11 w-full rounded-lg border border-border bg-muted/30 px-4 py-2 text-sm shadow-sm transition-colors focus:ring-2 focus:ring-ring outline-none touch-target"
                  value={formData.customerAccess || "ALL"} 
                  onChange={(e) => setFormData({...formData, customerAccess: e.target.value})}
                >
                  <option value="ALL">Tüm Müşteriler</option>
                  <option value="OWN">Sadece Kendisine Atananlar</option>
                </select>
              </div>
            </div>

            <div className="pt-4 md:pt-6 border-t border-border">
              <h3 className="text-base font-bold mb-4 text-foreground">Erişilebilecek Sayfalar</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                {[
                  { key: "/admin/products", label: "Ürünler Yönetimi" },
                  { key: "/admin/categories", label: "Kategoriler" },
                  { key: "/admin/catalogs", label: "Kataloglar" },
                  { key: "/admin/fast-sales", label: "Hızlı Satış Modülü" },
                  { key: "/admin/orders", label: "Siparişler Listesi" },
                  { key: "/admin/warehouse", label: "Depo Envanteri" },
                  { key: "/admin/customers", label: "Müşteri Portföyü" },
                ].map((page) => {
                  const isChecked = !formData.allowedPagesArr ? true : formData.allowedPagesArr.includes(page.key);
                  return (
                    <label key={page.key} className="flex items-center gap-3 p-3 border border-border rounded-lg hover:bg-muted/30 cursor-pointer transition-colors bg-card touch-target">
                      <input type="checkbox" className="w-4 h-4 cursor-pointer text-secondary border-border rounded focus:ring-secondary accent-secondary" checked={isChecked} 
                        onChange={(e: any) => {
                          let arr = formData.allowedPagesArr || [
                            "/admin/products", "/admin/categories", "/admin/catalogs", 
                            "/admin/fast-sales", "/admin/orders", "/admin/warehouse", "/admin/customers"
                          ];
                          if (e.target.checked) setFormData({ ...formData, allowedPagesArr: [...arr, page.key] });
                          else setFormData({ ...formData, allowedPagesArr: arr.filter((a: string) => a !== page.key) });
                        }}
                      />
                      <span className="font-medium text-foreground">{page.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 md:pt-6 border-t border-border">
              <h3 className="text-base font-bold mb-4 text-foreground">Hızlı Satış Alanı Sütun Görünümleri</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-sm">
                {["sku", "barcode", "category", "piecesPerBox", "packagingType", "stock", "description"].map((key) => {
                  const labels: Record<string, string> = {
                    sku: "Stok Kodu", barcode: "Barkod", category: "Kategori",
                    piecesPerBox: "Koli Adeti", packagingType: "Ambalaj", stock: "Stok", description: "Açıklama"
                  };
                  return (
                    <label key={key} className="flex items-center gap-3 p-3 border border-border rounded-lg hover:bg-muted/30 cursor-pointer transition-colors bg-card touch-target">
                      <input type="checkbox" className="w-4 h-4 cursor-pointer text-secondary border-border rounded focus:ring-secondary accent-secondary" checked={formData.fastSalesSettings?.[key] || false} 
                        onChange={(e: any) => setFormData({
                          ...formData, 
                          fastSalesSettings: { ...formData.fastSalesSettings, [key]: e.target.checked }
                        })}
                      />
                      <span className="font-medium text-foreground">{labels[key]}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {users.map((c: any) => (
          <div key={c.id} className="bg-card rounded-xl border border-border p-4 shadow-sm card-hover">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                  {c.name?.slice(0, 2)?.toUpperCase() || "KU"}
                </div>
                <div>
                  <div className="font-semibold text-foreground">{c.name}</div>
                  <div className="text-xs text-muted-foreground">{c.email}</div>
                </div>
              </div>
              <span className={`status-badge ${c.role === "TENANT_ADMIN" ? "status-approved" : "status-pending"}`}>
                {roleLabels[c.role] || c.role}
              </span>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-border">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Shield className="w-3 h-3" />
                {c.customerAccess === "OWN" ? "Sadece Atanan" : "Tüm Müşteriler"}
              </span>
              <button onClick={() => openEditPage(c)} className="text-xs font-medium text-secondary hover:underline touch-target flex items-center gap-1">
                Düzenle <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
        {users.length === 0 && (
          <div className="text-center py-16">
            <UsersIcon className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">Bulunamadı</p>
          </div>
        )}
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block border rounded-xl bg-card overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead>Ad Soyad</TableHead>
              <TableHead>E-posta</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Müşteri Erişimi</TableHead>
              <TableHead className="text-right">İşlem</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((c: any) => (
              <TableRow key={c.id} className="hover:bg-muted/20">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-[10px] shrink-0">
                      {c.name?.slice(0, 2)?.toUpperCase() || "KU"}
                    </div>
                    <span className="font-medium">{c.name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">{c.email}</TableCell>
                <TableCell>
                  <span className={`status-badge ${c.role === "TENANT_ADMIN" ? "status-approved" : "status-pending"}`}>
                    {roleLabels[c.role] || c.role}
                  </span>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{c.customerAccess === "OWN" ? "Sadece Atanan" : "Tümü"}</TableCell>
                <TableCell className="text-right">
                  <Button variant="outline" size="sm" onClick={() => openEditPage(c)} className="touch-target">Düzenle</Button>
                </TableCell>
              </TableRow>
            ))}
            {users.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground h-24">Bulunamadı</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
