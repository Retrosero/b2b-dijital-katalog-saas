import { useAuthStore } from "@/store/useAuthStore";
import { useEffect, useState } from "react";
import { Loader2, Monitor, Package, Settings as SettingsIcon, Plus, Trash2, Building, Users, Edit3, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToastActions } from "@/components/ui/toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const orderModeOptions = [
  {
    value: "UNIT",
    title: "Adet Bazlı Satış",
    description: "Siparişe yazılan miktar doğrudan adet olarak eklenir."
  },
  {
    value: "BOX",
    title: "Koli Bazlı Satış",
    description: "Siparişe 1 yazılırsa ürünün koli adedi kadar adet eklenir. Koli adedi boşsa 1 adet eklenir."
  }
];

// Get default storage limit based on package name
const getDefaultStorageLimit = (planName?: string | null): number => {
  const limits: Record<string, number> = {
    "Starter": 5 * 1024 * 1024 * 1024,    // 5GB
    "Premium": 20 * 1024 * 1024 * 1024,    // 20GB
    "Pro": 20 * 1024 * 1024 * 1024,         // 20GB
    "Enterprise": 100 * 1024 * 1024 * 1024, // 100GB
  };
  return limits[planName || "Starter"] || limits["Starter"];
};

export default function Settings() {
  const { user, token, fetchUser } = useAuthStore();
  const toast = useToastActions();
  const [orderMode, setOrderMode] = useState(user?.tenant?.orderMode || "UNIT");
  const [showInvoiceKdv, setShowInvoiceKdv] = useState(user?.tenant?.showInvoiceKdv !== false);
  const [banksList, setBanksList] = useState<string[]>([]);
  const [newBank, setNewBank] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [fastSalesSettings, setFastSalesSettings] = useState<any>({
    sku: true,
    barcode: true,
    category: true,
    piecesPerBox: true,
    packagingType: true,
    stock: true,
    description: true
  });

  // Fiyat listesi ve müşteri grupları
  const [priceLists, setPriceLists] = useState<any[]>([]);
  const [customerGroups, setCustomerGroups] = useState<any[]>([]);
  const [newPriceListName, setNewPriceListName] = useState("");
  const [newPriceListDefault, setNewPriceListDefault] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDiscount, setNewGroupDiscount] = useState("");
  const [editingGroup, setEditingGroup] = useState<any>(null);
  const [editingGroupName, setEditingGroupName] = useState("");
  const [editingGroupDiscount, setEditingGroupDiscount] = useState("");
  const [isPriceListModalOpen, setIsPriceListModalOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [selectedGroupMembers, setSelectedGroupMembers] = useState<any[]>([]);
  const [groupCustomers, setGroupCustomers] = useState<any[]>([]);
  const [allCustomers, setAllCustomers] = useState<any[]>([]);

  // Verileri yükle
  useEffect(() => {
    if (user?.tenant?.orderMode) {
      setOrderMode(user.tenant.orderMode);
    }
    if (user?.tenant?.showInvoiceKdv !== undefined) {
      setShowInvoiceKdv(user.tenant.showInvoiceKdv);
    }
    if (user?.tenant?.banks) {
      try {
        setBanksList(JSON.parse(user.tenant.banks));
      } catch (e) {
        setBanksList([]);
      }
    } else {
      setBanksList([]);
    }
    if (user?.fastSalesSettings) {
      setFastSalesSettings(JSON.parse(user.fastSalesSettings));
    }
    
    // Fiyat listeleri ve müşteri grupları yükle
    if (token) {
      fetchPriceLists();
      fetchCustomerGroups();
      fetchAllCustomers();
    }
  }, [user, token]);

  const fetchPriceLists = async () => {
    try {
      const res = await fetch("/api/price-lists", { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setPriceLists(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchCustomerGroups = async () => {
    try {
      const res = await fetch("/api/customer-groups", { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setCustomerGroups(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchAllCustomers = async () => {
    try {
      const res = await fetch("/api/customers", { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setAllCustomers(await res.json());
    } catch (e) { console.error(e); }
  };

  const handleAddBank = () => {
    const trimmed = newBank.trim();
    if (!trimmed) return;
    if (banksList.includes(trimmed)) {
      toast.warning("Bu banka zaten eklenmiş.");
      return;
    }
    setBanksList([...banksList, trimmed]);
    setNewBank("");
  };

  const handleRemoveBank = (bankToRemove: string) => {
    setBanksList(banksList.filter((b) => b !== bankToRemove));
  };

  // Fiyat listesi işlemleri
  const handleAddPriceList = async () => {
    if (!newPriceListName.trim()) {
      toast.warning("Fiyat listesi adı giriniz.");
      return;
    }
    try {
      const res = await fetch("/api/price-lists", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: newPriceListName.trim(), isDefault: newPriceListDefault })
      });
      if (res.ok) {
        toast.success("Fiyat listesi eklendi.");
        setNewPriceListName("");
        setNewPriceListDefault(false);
        fetchPriceLists();
      } else {
        const err = await res.json();
        toast.error(err.error || "Fiyat listesi eklenemedi.");
      }
    } catch (e) {
      toast.error("Bir hata oluştu.");
    }
  };

  const handleDeletePriceList = async (id: string) => {
    if (!confirm("Fiyat listesini silmek istediğinize emin misiniz?")) return;
    try {
      const res = await fetch(`/api/price-lists/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success("Fiyat listesi silindi.");
        fetchPriceLists();
      } else {
        const err = await res.json();
        toast.error(err.error || "Silinemedi.");
      }
    } catch (e) {
      toast.error("Bir hata oluştu.");
    }
  };

  // Müşteri grubu işlemleri
  const handleAddGroup = async () => {
    if (!newGroupName.trim()) {
      toast.warning("Grup adı giriniz.");
      return;
    }
    try {
      const res = await fetch("/api/customer-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: newGroupName.trim(), discountRate: newGroupDiscount || 0 })
      });
      if (res.ok) {
        toast.success("Müşteri grubu eklendi.");
        setNewGroupName("");
        setNewGroupDiscount("");
        fetchCustomerGroups();
      } else {
        const err = await res.json();
        toast.error(err.error || "Grup eklenemedi.");
      }
    } catch (e) {
      toast.error("Bir hata oluştu.");
    }
  };

  const handleUpdateGroup = async () => {
    if (!editingGroup || !editingGroupName.trim()) return;
    try {
      const res = await fetch(`/api/customer-groups/${editingGroup.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: editingGroupName.trim(), discountRate: editingGroupDiscount || 0 })
      });
      if (res.ok) {
        toast.success("Grup güncellendi.");
        setEditingGroup(null);
        fetchCustomerGroups();
      } else {
        toast.error("Grup güncellenemedi.");
      }
    } catch (e) {
      toast.error("Bir hata oluştu.");
    }
  };

  const handleDeleteGroup = async (id: string) => {
    if (!confirm("Grubu silmek istediğinize emin misiniz?")) return;
    try {
      const res = await fetch(`/api/customer-groups/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success("Grup silindi.");
        fetchCustomerGroups();
      } else {
        toast.error("Grup silinemedi.");
      }
    } catch (e) {
      toast.error("Bir hata oluştu.");
    }
  };

  const openGroupMembers = async (group: any) => {
    try {
      const res = await fetch(`/api/customer-groups/${group.id}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setEditingGroup(group);
        setEditingGroupName(group.name);
        setEditingGroupDiscount(group.discountRate?.toString() || "0");
        setSelectedGroupMembers(data.members || []);
        setIsGroupModalOpen(true);
      }
    } catch (e) {
      toast.error("Grup üyeleri yüklenemedi.");
    }
  };

  const handleAddMemberToGroup = async (customerId: string) => {
    if (!editingGroup) return;
    try {
      const res = await fetch(`/api/customer-groups/${editingGroup.id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ customerId })
      });
      if (res.ok || res.status === 400) {
        openGroupMembers(editingGroup);
      } else {
        toast.error("Üye eklenemedi.");
      }
    } catch (e) {
      toast.error("Bir hata oluştu.");
    }
  };

  const handleRemoveMemberFromGroup = async (customerId: string) => {
    if (!editingGroup) return;
    try {
      const res = await fetch(`/api/customer-groups/${editingGroup.id}/members/${customerId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        openGroupMembers(editingGroup);
      } else {
        toast.error("Üye çıkarılamadı.");
      }
    } catch (e) {
      toast.error("Bir hata oluştu.");
    }
  };

  if (user?.role === "SUPER_ADMIN") {
    return <div className="p-4 text-center text-muted-foreground">Ayarlar firmalara özeldir.</div>;
  }

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const authToken = token || localStorage.getItem("token") || sessionStorage.getItem("token");
      if (!authToken) {
        throw new Error("Oturum bulunamadı. Lütfen tekrar giriş yapın.");
      }

      if (user?.role === "TENANT_ADMIN") {
        const tenantRes = await fetch("/api/tenants/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
          body: JSON.stringify({ orderMode, banks: banksList, showInvoiceKdv })
        });
        if (!tenantRes.ok) {
          const err = await tenantRes.json().catch(() => ({}));
          throw new Error(err.error || "Firma ayarları kaydedilemedi.");
        }
      }

      const userRes = await fetch(`/api/users/${user.id}/fast-sales-settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ fastSalesSettings: JSON.stringify(fastSalesSettings) })
      });
      if (!userRes.ok) {
        const err = await userRes.json().catch(() => ({}));
        throw new Error(err.error || "Kişisel görünüm ayarları kaydedilemedi.");
      }

      await fetchUser();
      toast.success("Ayarlar kaydedildi.");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const columnLabels: Record<string, string> = {
    sku: "Ürün Kodu",
    barcode: "Barkod",
    category: "Kategori",
    piecesPerBox: "Koli Adeti",
    packagingType: "Ambalaj",
    stock: "Stok",
    description: "Açıklama"
  };

  return (
    <div className="space-y-6 max-w-2xl animate-fade-in">
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center">
            <Monitor className="w-4 h-4 text-secondary" />
          </div>
          <h3 className="font-bold text-foreground">Kişisel Görünüm Ayarları</h3>
        </div>
        <div className="p-5 space-y-4">
          <label className="text-sm font-semibold text-foreground block">Hızlı Satış Modülü Sütunları</label>
          <div className="grid grid-cols-2 gap-2.5">
            {Object.keys(columnLabels).map((key) => (
              <label key={key} className="flex items-center gap-2.5 p-3 border border-border rounded-lg hover:bg-muted/30 cursor-pointer transition-colors touch-target bg-card min-h-[56px]">
                <div className="w-6 h-6 shrink-0 flex items-center justify-center">
                  <input
                    type="checkbox"
                    className="w-5 h-5 cursor-pointer text-secondary border-border rounded focus:ring-secondary accent-secondary"
                    checked={fastSalesSettings?.[key] || false}
                    onChange={(e) => setFastSalesSettings({
                      ...fastSalesSettings,
                      [key]: e.target.checked
                    })}
                  />
                </div>
                <span className="text-sm font-medium text-foreground">{columnLabels[key]}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-chart-3/10 flex items-center justify-center">
            <Package className="w-4 h-4 text-chart-3" />
          </div>
          <h3 className="font-bold text-foreground">Paket ve Kota Bilgileri</h3>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex justify-between items-center bg-muted/30 p-4 border border-border rounded-lg">
            <div>
              <span className="text-xs text-muted-foreground block">Mevcut Paket</span>
              <span className="font-bold text-lg text-foreground">{user?.tenant?.planName || "Bilinmiyor"}</span>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground font-medium">Resim Depolama Alanı</span>
              <span className="font-semibold text-foreground">
                {((user?.tenant?.usedStorageBytes || 0) / (1024 * 1024 * 1024)).toFixed(2)} GB / 
                {((user?.tenant?.storageLimitBytes || getDefaultStorageLimit(user?.tenant?.planName)) / (1024 * 1024 * 1024)).toFixed(2)} GB
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
              <div
                className={`h-2.5 rounded-full transition-all duration-500 ${
                  ((user?.tenant?.usedStorageBytes || 0) / (user?.tenant?.storageLimitBytes || getDefaultStorageLimit(user?.tenant?.planName))) > 0.9 ? "bg-destructive" :
                  ((user?.tenant?.usedStorageBytes || 0) / (user?.tenant?.storageLimitBytes || getDefaultStorageLimit(user?.tenant?.planName))) > 0.7 ? "bg-chart-3" : "bg-secondary"
                }`}
                style={{ width: `${Math.min(100, ((user?.tenant?.usedStorageBytes || 0) / (user?.tenant?.storageLimitBytes || getDefaultStorageLimit(user?.tenant?.planName))) * 100)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Kalan kota: {((Math.max(0, (user?.tenant?.storageLimitBytes || getDefaultStorageLimit(user?.tenant?.planName)) - (user?.tenant?.usedStorageBytes || 0))) / (1024 * 1024 * 1024)).toFixed(2)} GB
            </p>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <SettingsIcon className="w-4 h-4 text-primary" />
          </div>
          <h3 className="font-bold text-foreground">Firma Ayarları</h3>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-sm font-semibold mb-2 block text-foreground">Sipariş Satış Tipi</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {orderModeOptions.map((option) => {
                const selected = orderMode === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setOrderMode(option.value)}
                    disabled={user?.role !== "TENANT_ADMIN"}
                    className={`min-h-[112px] rounded-lg border p-4 text-left transition-colors touch-target ${
                      selected
                        ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary/20"
                        : "border-border bg-card hover:bg-muted/30 text-foreground"
                    } ${user?.role !== "TENANT_ADMIN" ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
                    aria-pressed={selected}
                  >
                    <span className="flex items-center gap-2">
                      <span className={`h-4 w-4 rounded-full border flex items-center justify-center ${selected ? "border-primary" : "border-muted-foreground/40"}`}>
                        {selected && <span className="h-2 w-2 rounded-full bg-primary" />}
                      </span>
                      <span className="font-bold text-sm">{option.title}</span>
                    </span>
                    <span className="mt-2 block text-xs leading-relaxed text-muted-foreground">{option.description}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-border">
            <label className="flex items-center gap-2.5 p-3 border border-border rounded-lg hover:bg-muted/30 cursor-pointer transition-colors bg-card min-h-[56px]">
              <div className="w-6 h-6 shrink-0 flex items-center justify-center">
                <input
                  type="checkbox"
                  disabled={user?.role !== "TENANT_ADMIN"}
                  className="w-5 h-5 cursor-pointer text-secondary border-border rounded focus:ring-secondary accent-secondary"
                  checked={showInvoiceKdv}
                  onChange={(e) => setShowInvoiceKdv(e.target.checked)}
                />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-foreground">Satış Faturalarında KDV Göster</span>
                <span className="text-xs text-muted-foreground">Aktif edilirse, sipariş/fatura çıktılarında ve detay sayfasında KDV satırları ve hesaplamaları gösterilir.</span>
              </div>
            </label>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <Building className="w-4 h-4 text-emerald-500" />
          </div>
          <h3 className="font-bold text-foreground">Banka Hesap Tanımları</h3>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-xs text-muted-foreground">Kredi kartı ve havale/EFT ödeme seçeneklerinde gösterilmek üzere firmanıza ait bankaları tanımlayın.</p>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Örn: Garanti BBVA, Akbank..."
              value={newBank}
              onChange={(e) => setNewBank(e.target.value)}
              className="flex-1 h-10 rounded-lg border border-border bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary placeholder:text-muted-foreground/60"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddBank();
                }
              }}
            />
            <Button
              type="button"
              onClick={handleAddBank}
              className="h-10 px-4 bg-primary hover:bg-primary/95 font-medium text-sm flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Ekle
            </Button>
          </div>
          
          {banksList.length === 0 ? (
            <div className="text-center py-6 border border-dashed border-border rounded-lg text-muted-foreground text-xs">
              Tanımlanmış banka hesabı bulunmuyor.
            </div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {banksList.map((bank) => (
                <div
                  key={bank}
                  className="flex items-center justify-between p-3 border border-border rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors"
                >
                  <span className="text-sm font-medium text-foreground">{bank}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveBank(bank)}
                    className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                    title="Sil"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Fiyat Listeleri */}
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Package className="w-4 h-4 text-blue-500" />
            </div>
            <div>
              <h3 className="font-bold text-foreground">Fiyat Listeleri</h3>
              <p className="text-xs text-muted-foreground">Ürünlere farklı fiyat listeleri tanımlayın</p>
            </div>
          </div>
          <Button size="sm" onClick={() => setIsPriceListModalOpen(true)} className="h-8">
            <Plus className="w-4 h-4 mr-1" /> Ekle
          </Button>
        </div>
        <div className="p-5">
          {priceLists.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Henüz fiyat listesi yok.</p>
          ) : (
            <div className="space-y-2">
              {priceLists.map((list: any) => (
                <div key={list.id} className="flex items-center justify-between p-3 border border-border rounded-lg bg-muted/20">
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-foreground">{list.name}</span>
                    {list.isDefault && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">Varsayılan</span>
                    )}
                    <span className="text-xs text-muted-foreground">{list._count?.prices || 0} ürün</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeletePriceList(list.id)}
                    className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Müşteri Grupları */}
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Users className="w-4 h-4 text-purple-500" />
            </div>
            <div>
              <h3 className="font-bold text-foreground">Müşteri Grupları</h3>
              <p className="text-xs text-muted-foreground">Gruplara iskonto uygulayın veya toplu fiyat listesi atayın</p>
            </div>
          </div>
          <Button size="sm" onClick={() => setIsGroupModalOpen(true)} className="h-8">
            <Plus className="w-4 h-4 mr-1" /> Ekle
          </Button>
        </div>
        <div className="p-5">
          {customerGroups.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Henüz müşteri grubu yok.</p>
          ) : (
            <div className="space-y-2">
              {customerGroups.map((group: any) => (
                <div key={group.id} className="flex items-center justify-between p-3 border border-border rounded-lg bg-muted/20">
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-foreground">{group.name}</span>
                    {group.discountRate > 0 && (
                      <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
                        %{group.discountRate} iskonto
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">{group._count?.members || 0} üye</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openGroupMembers(group)}
                      className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                      title="Üyeleri yönet"
                    >
                      <Users className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteGroup(group.id)}
                      className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Fiyat Listesi Ekleme Modal */}
      <Dialog open={isPriceListModalOpen} onOpenChange={setIsPriceListModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Yeni Fiyat Listesi</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">Liste Adı</label>
              <Input
                placeholder="Örn: Toptancı Fiyatı"
                value={newPriceListName}
                onChange={(e) => setNewPriceListName(e.target.value)}
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={newPriceListDefault}
                onChange={(e) => setNewPriceListDefault(e.target.checked)}
                className="w-4 h-4 text-secondary border-border rounded"
              />
              <span className="text-sm text-foreground">Varsayılan fiyat listesi olarak işaretle</span>
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => { setIsPriceListModalOpen(false); setNewPriceListName(""); setNewPriceListDefault(false); }}>
                İptal
              </Button>
              <Button onClick={handleAddPriceList}>Ekle</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Müşteri Grubu Modal */}
      <Dialog open={isGroupModalOpen} onOpenChange={setIsGroupModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingGroup ? editingGroup.name : "Yeni Müşteri Grubu"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {editingGroup ? (
              // Üyelik yönetimi
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-foreground block mb-1.5">Grup Adı</label>
                    <Input
                      value={editingGroupName}
                      onChange={(e) => setEditingGroupName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground block mb-1.5">İskonto (%)</label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={editingGroupDiscount}
                      onChange={(e) => setEditingGroupDiscount(e.target.value)}
                    />
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={handleUpdateGroup} className="mb-2">
                  <Check className="w-4 h-4 mr-1" /> Değişiklikleri Kaydet
                </Button>
                
                <div className="border-t border-border pt-4">
                  <h4 className="text-sm font-semibold mb-2">Gruptaki Üyeler ({selectedGroupMembers.length})</h4>
                  <div className="max-h-40 overflow-y-auto space-y-1 mb-3">
                    {selectedGroupMembers.map((m: any) => (
                      <div key={m.id} className="flex items-center justify-between p-2 bg-muted/30 rounded text-sm">
                        <span>{m.customer?.name || "Bilinmeyen"}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveMemberFromGroup(m.customerId)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    {selectedGroupMembers.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-2">Henüz üye yok.</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">Müşteri Ekle</label>
                    <div className="flex gap-2">
                      <select
                        className="flex-1 h-9 rounded-lg border border-border bg-card px-3 text-sm"
                        onChange={(e) => {
                          if (e.target.value) {
                            handleAddMemberToGroup(e.target.value);
                            e.target.value = "";
                          }
                        }}
                        value=""
                      >
                        <option value="">-- Müşteri Seç --</option>
                        {allCustomers
                          .filter((c: any) => !selectedGroupMembers.find((m: any) => m.customerId === c.id))
                          .map((c: any) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                      </select>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              // Yeni grup oluşturma
              <>
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">Grup Adı</label>
                  <Input
                    placeholder="Örn: VIP Müşteriler"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">İskonto Oranı (%)</label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="0"
                    value={newGroupDiscount}
                    onChange={(e) => setNewGroupDiscount(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Bu gruba ait müşteriler tüm siparişlerde bu iskontoyu alır.</p>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => { setIsGroupModalOpen(false); setNewGroupName(""); setNewGroupDiscount(""); }}>
                    İptal
                  </Button>
                  <Button onClick={handleAddGroup}>Ekle</Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Button
        onClick={handleSave}
        disabled={isLoading}
        className="brand-gradient border-0 shadow-md shadow-secondary/20 hover:opacity-90 h-12 px-8 font-semibold text-base gap-2 w-full sm:w-auto"
      >
        {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
        Ayarları Kaydet
      </Button>
    </div>
  );
}
