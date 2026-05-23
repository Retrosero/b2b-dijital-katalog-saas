import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/useAuthStore";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Save, User, Building, Percent } from "lucide-react";
import { usePageHeaderStore } from "@/store/usePageHeaderStore";
import { useToastActions } from "@/components/ui/toast";

function FormRow({ label, children, required = false }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[200px_minmax(0,1fr)] items-start gap-1 md:gap-3 py-0.5">
      <Label className="text-xs font-semibold text-foreground/80 pt-1.5">
        {label}{required ? " *" : ""}
      </Label>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export default function CustomerForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuthStore();
  const { setHeader, resetHeader } = usePageHeaderStore();
  const toast = useToastActions();
  const isEdit = !!id;

  const [loading, setLoading] = useState(isEdit);
  const [categories, setCategories] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [priceLists, setPriceLists] = useState<any[]>([]);
  const [customerGroups, setCustomerGroups] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    taxOffice: "",
    taxNumber: "",
    discountRate: "0",
    username: "",
    password: "",
    assignedUserId: "",
    categoryDiscounts: {} as Record<string, string>,
    priceListId: "",
    groupId: "",
  });

  const fetchData = async () => {
    const [resCat, resUsers, resPriceLists, resCustomerGroups] = await Promise.all([
      fetch("/api/categories", { headers: { Authorization: `Bearer ${token}` } }),
      fetch("/api/users", { headers: { Authorization: `Bearer ${token}` } }),
      fetch("/api/price-lists", { headers: { Authorization: `Bearer ${token}` } }),
      fetch("/api/customer-groups", { headers: { Authorization: `Bearer ${token}` } }),
    ]);
    if (resCat.ok) {
      const data = await resCat.json();
      setCategories(data.categories || []);
    }
    if (resUsers.ok) {
      const data = await resUsers.json();
      setUsers(Array.isArray(data) ? data.filter((u: any) => u.isActive) : []);
    }
    if (resPriceLists.ok) {
      setPriceLists(await resPriceLists.json());
    }
    if (resCustomerGroups.ok) {
      setCustomerGroups(await resCustomerGroups.json());
    }

    if (isEdit) {
      const res = await fetch(`/api/customers/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const c = await res.json();
        setFormData({
          name: c.name || "",
          email: c.email || "",
          phone: c.phone || "",
          address: c.address || "",
          taxOffice: c.taxOffice || "",
          taxNumber: c.taxNumber || "",
          discountRate: c.discountRate?.toString() || "0",
          username: c.username || "",
          password: "",
          assignedUserId: c.assignedUserId || "",
          categoryDiscounts: c.categoryDiscounts ? JSON.parse(c.categoryDiscounts) : {},
          priceListId: c.priceListId || "",
          groupId: c.groupMemberships?.[0]?.groupId || c.groupMemberships?.[0]?.group?.id || "",
        });
      }
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id, token]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const url = isEdit ? `/api/customers/${id}` : "/api/customers";
    const method = isEdit ? "PUT" : "POST";
    const selectedGroupId = customerGroups.some((group: any) => group.id === formData.groupId) ? formData.groupId : "";
    const selectedPriceListId = priceLists.some((priceList: any) => priceList.id === formData.priceListId) ? formData.priceListId : "";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        ...formData,
        categoryDiscounts: formData.categoryDiscounts,
        priceListId: selectedPriceListId || null,
        groupId: selectedGroupId || null,
      }),
    });

    if (res.ok) {
      navigate("/admin/customers");
      toast.success(isEdit ? "Müşteri başarıyla güncellendi." : "Müşteri başarıyla oluşturuldu.");
    } else {
      const err = await res.json().catch(() => ({}));
      console.error("Customer save failed:", { status: res.status, error: err });
      toast.error(err.error || "Hata oluştu");
    }
  };

  useEffect(() => {
    setHeader({
      title: isEdit ? "Müşteri Düzenle" : "Yeni Müşteri",
      subtitle: isEdit ? "Müşteri bilgilerini güncelle" : "Yeni müşteri kaydı oluştur",
      backTo: "/admin/customers",
      actions: [
        {
          key: "save-customer",
          label: isEdit ? "Güncelle" : "Kaydet",
          onClick: () => void handleSubmit(),
          icon: <Save className="w-5 h-5" />,
          variant: "secondary",
        },
      ],
    });
    return resetHeader;
  }, [isEdit, formData, token, id, setHeader, resetHeader]);

  if (loading) return <div className="p-8 text-muted-foreground">Yükleniyor...</div>;

  return (
    <div className="space-y-3 animate-fade-in">
      <div className="grid xl:grid-cols-12 gap-3 items-start">
        <div className="xl:col-span-8 space-y-3">
          <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
            <div className="px-4 py-2.5 border-b border-border flex items-center gap-2.5 bg-muted/5">
              <div className="w-7 h-7 rounded-md bg-secondary/10 flex items-center justify-center">
                <User className="w-3.5 h-3.5 text-secondary" />
              </div>
              <h3 className="text-sm font-bold text-foreground">Kimlik ve İletişim Bilgileri</h3>
            </div>
            <div className="p-3 md:p-4 space-y-1">
              <FormRow label="Müşteri / Cari Ünvanı" required>
                <Input required className="h-9 text-sm border-border" placeholder="Örn: ABC Tekstil LTD ŞTİ" value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} />
              </FormRow>
              <FormRow label="E-posta Adresi">
                <Input type="email" className="h-9 text-sm border-border" value={formData.email} onChange={e=>setFormData({...formData, email: e.target.value})} />
              </FormRow>
              <FormRow label="Telefon Numarası">
                <Input className="h-9 text-sm border-border" value={formData.phone} onChange={e=>setFormData({...formData, phone: e.target.value})} />
              </FormRow>
              <div className="pt-1">
                <Label className="text-[10px] font-bold text-muted-foreground/80 uppercase tracking-wider">Katalog & Giriş Bilgileri</Label>
              </div>
              <FormRow label="Katalog Kullanıcı Adı">
                <div className="space-y-1">
                  <Input className="h-9 text-sm border-border font-mono" value={formData.username || ""} onChange={e=>setFormData({...formData, username: e.target.value})} />
                  <p className="text-[11px] leading-tight text-muted-foreground">Müşteri katalog girişi için kullanılır. Boş bırakılırsa otomatik oluşturulur.</p>
                </div>
              </FormRow>
              <FormRow label="Katalog Şifresi">
                <div className="space-y-1">
                  <Input
                    type="password"
                    className="h-9 text-sm border-border font-mono"
                    value={formData.password || ""}
                    onChange={e=>setFormData({...formData, password: e.target.value})}
                    placeholder={isEdit ? "Değiştirmek istemiyorsanız boş bırakın" : "Şifre girin"}
                  />
                  <p className="text-[11px] leading-tight text-muted-foreground">
                    {isEdit ? "Boş bırakırsanız mevcut şifre korunur." : "Bu şifre müşteri katalog girişinde kullanılacaktır."}
                  </p>
                </div>
              </FormRow>
              <FormRow label="Temsilci">
                <select
                  className="flex h-9 w-full rounded-lg border border-border bg-card px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={formData.assignedUserId}
                  onChange={(e) => setFormData({ ...formData, assignedUserId: e.target.value })}
                >
                  <option value="">Seçiniz</option>
                  {users.map((u: any) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role === "TENANT_ADMIN" ? "Yönetici" : "Satış Temsilcisi"})
                    </option>
                  ))}
                </select>
              </FormRow>
              <FormRow label="Açık Adres">
                <Textarea className="min-h-[60px] py-1.5 px-3 text-sm border-border" value={formData.address} onChange={e=>setFormData({...formData, address: e.target.value})} />
              </FormRow>
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
            <div className="px-4 py-2.5 border-b border-border flex items-center gap-2.5 bg-muted/5">
              <div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center">
                <Building className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
              <h3 className="text-sm font-bold text-foreground">Vergi Bilgileri</h3>
            </div>
            <div className="p-3 md:p-4 space-y-1">
              <FormRow label="Vergi Dairesi">
                <Input className="h-9 text-sm border-border" value={formData.taxOffice} onChange={e=>setFormData({...formData, taxOffice: e.target.value})} />
              </FormRow>
              <FormRow label="Vergi Numarası / TCKN">
                <Input className="h-9 text-sm border-border" value={formData.taxNumber} onChange={e=>setFormData({...formData, taxNumber: e.target.value})} />
              </FormRow>
            </div>
          </div>
        </div>

        <div className="xl:col-span-4 space-y-3">
          <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
            <div className="px-4 py-2.5 border-b border-border flex items-center gap-2.5 bg-muted/5">
              <div className="w-7 h-7 rounded-md bg-chart-2/10 flex items-center justify-center">
                <Percent className="w-3.5 h-3.5 text-chart-2" />
              </div>
              <h3 className="text-sm font-bold text-foreground">Ticari Ayarlar</h3>
            </div>
            <div className="p-3 md:p-4 space-y-2">
              <FormRow label="Müşteri Grubu">
                <div className="space-y-1">
                  <select
                    className="flex h-9 w-full rounded-lg border border-border bg-card px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={formData.groupId}
                    onChange={(e) => setFormData({ ...formData, groupId: e.target.value })}
                  >
                    <option value="">Grup Yok</option>
                    {customerGroups.map((group: any) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] leading-tight text-muted-foreground">Müşteriyi tanımlı bir müşteri grubuna bağlar.</p>
                </div>
              </FormRow>
              <FormRow label="Fiyat Listesi">
                <div className="space-y-1">
                  <select
                    className="flex h-9 w-full rounded-lg border border-border bg-card px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={formData.priceListId}
                    onChange={(e) => setFormData({ ...formData, priceListId: e.target.value })}
                  >
                    <option value="">Varsayılan Fiyat Listesi</option>
                    {priceLists.map((pl: any) => (
                      <option key={pl.id} value={pl.id}>
                        {pl.name} {pl.isDefault ? "(Varsayılan)" : ""}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] leading-tight text-muted-foreground">Müşteriye özel fiyat listesi uygulanır.</p>
                </div>
              </FormRow>
              <FormRow label="Genel İskonto Oranı (%)">
                <div className="space-y-1">
                  <Input type="number" className="h-9 text-sm border-border" value={formData.discountRate} onChange={e=>setFormData({...formData, discountRate: e.target.value})} />
                  <p className="text-[11px] leading-tight text-muted-foreground">Tüm ürünlerde varsayılan olarak uygulanır.</p>
                </div>
              </FormRow>

              <div className="pt-1 space-y-2">
                <Label className="text-[10px] font-bold text-muted-foreground/80 uppercase tracking-wider">Kategori Bazlı İskontolar</Label>
                <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                  {categories.map((c) => (
                    <div key={c.id} className="flex items-center justify-between gap-2.5 p-2 bg-muted/20 rounded-md border border-border/80">
                      <Label className="text-xs font-medium text-foreground truncate flex-1">{c.name}</Label>
                      <div className="flex items-center gap-1 w-[72px]">
                        <Input
                          type="number"
                          className="h-7 text-xs text-center p-1 border-border bg-card"
                          placeholder="0"
                          value={formData.categoryDiscounts[c.id] || ""}
                          onChange={e => setFormData({
                            ...formData,
                            categoryDiscounts: { ...formData.categoryDiscounts, [c.id]: e.target.value },
                          })}
                        />
                        <span className="text-[9px] text-muted-foreground font-bold">%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
