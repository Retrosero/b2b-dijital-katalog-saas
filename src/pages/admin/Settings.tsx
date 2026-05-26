import React, { useEffect, useMemo, useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { Loader2, Monitor, Package, Settings as SettingsIcon, Plus, Trash2, Building, Users, Edit3, X, Check, FileCode, Download, Upload, Play, Copy } from "lucide-react";
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
  const [activeSettingsTab, setActiveSettingsTab] = useState<"general" | "commercial" | "xml">("general");
  
  // XML Integration Premium Module States
  let isXmlLicensed = false;
  if (user?.tenant?.modules) {
    try {
      const mods = JSON.parse(user.tenant.modules);
      isXmlLicensed = !!mods.xmlIntegration;
    } catch (e) {}
  }
  const [xmlConfig, setXmlConfig] = useState<any>(null);
  const [activeXmlTab, setActiveXmlTab] = useState<"export" | "import">("export");
  const [isXmlSaving, setIsXmlSaving] = useState(false);
  const [isAnalyzingXmlUrl, setIsAnalyzingXmlUrl] = useState(false);
  const [xmlAnalysis, setXmlAnalysis] = useState<{ tags: string[]; itemTag: string; itemCount: number; tagCount: number } | null>(null);
  const xmlApiFetch = async (path: string, init?: RequestInit) => {
    try {
      return await fetch(path, init);
    } catch (error) {
      const isDevLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
      if (isDevLocalhost) {
        return fetch(`http://127.0.0.1:3003${path}`, init);
      }
      throw error;
    }
  };

  const fetchXmlConfig = async () => {
    try {
      const res = await xmlApiFetch("/api/xml-config", { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        if (data.exportFields && typeof data.exportFields === "string") {
          data.exportFields = JSON.parse(data.exportFields);
        } else if (!data.exportFields) {
          data.exportFields = [];
        }
        if (data.importFieldsMapping && typeof data.importFieldsMapping === "string") {
          data.importFieldsMapping = JSON.parse(data.importFieldsMapping);
        } else if (!data.importFieldsMapping) {
          data.importFieldsMapping = { itemTag: "item" };
        }
        setXmlConfig(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveXmlConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsXmlSaving(true);
    try {
      const payload = {
        ...xmlConfig,
        exportFields: xmlConfig.exportFields,
        importFieldsMapping: xmlConfig.importFieldsMapping
      };
      const res = await xmlApiFetch("/api/xml-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        toast.success("XML Entegrasyonu ayarları kaydedildi.");
        fetchXmlConfig();
      } else {
        toast.error("Ayarlar kaydedilemedi.");
      }
    } catch (e) {
      toast.error("API bağlantısı kurulamadı. Sunucunun çalıştığını kontrol edin (3003).");
    } finally {
      setIsXmlSaving(false);
    }
  };

  const handleManualExport = async () => {
    try {
      const res = await xmlApiFetch("/api/xml-config/run-export", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success("XML ihracat derlemesi tamamlandı.");
        setTimeout(fetchXmlConfig, 1500);
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "XML derleme başarısız.");
      }
    } catch (e) {
      toast.error("Tetiklenemedi. API bağlantısını kontrol edin (3003).");
    }
  };

  const handleManualImport = async () => {
    try {
      const res = await xmlApiFetch("/api/xml-config/run-import", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success("XML ithalat işlemi başlatıldı. Aşağıdan takip edebilirsiniz.");
        setTimeout(fetchXmlConfig, 2500);
      }
    } catch (e) {
      toast.error("Tetiklenemedi. API bağlantısını kontrol edin (3003).");
    }
  };

  const handleAnalyzeImportUrl = async () => {
    if (!xmlConfig?.importUrl) {
      toast.warning("Önce XML URL giriniz.");
      return;
    }
    setIsAnalyzingXmlUrl(true);
    try {
      const res = await xmlApiFetch("/api/xml-config/analyze-import-url", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ importUrl: xmlConfig.importUrl })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "XML analiz edilemedi.");
        return;
      }
      setXmlAnalysis({
        tags: Array.isArray(data.tags) ? data.tags : [],
        itemTag: data.itemTag || "item",
        itemCount: Number(data.itemCount || 0),
        tagCount: Number(data.tagCount || 0)
      });
      const suggestions = data.mappingSuggestions && typeof data.mappingSuggestions === "object" ? data.mappingSuggestions : {};
      setXmlConfig({
        ...xmlConfig,
        importFieldsMapping: { ...xmlConfig.importFieldsMapping, ...suggestions, itemTag: data.itemTag || suggestions.itemTag || xmlConfig.importFieldsMapping?.itemTag || "item" }
      });
      toast.success(`XML analiz tamamlandı. ${data.tagCount || 0} etiket bulundu.`);
    } catch {
      toast.error("XML analizinde bağlantı hatası oluştu.");
    } finally {
      setIsAnalyzingXmlUrl(false);
    }
  };
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

  const importMappingFields = useMemo<Array<{ key: string; label: string; placeholder: string }>>(() => [
    { key: "itemTag", label: "Tekrarlanan Ürün Etiketi", placeholder: "item, urun, product" },
    { key: "id", label: "Ürün ID Etiketi", placeholder: "id, productId, urunId" },
    { key: "name", label: "Ürün Adı Etiketi", placeholder: "name, baslik, title" },
    { key: "sku", label: "Ürün Kodu (SKU) Etiketi", placeholder: "sku, kod, product_code" },
    { key: "barcode", label: "Barkod Etiketi", placeholder: "barcode, barkod, ean" },
    { key: "price", label: "Fiyat Etiketi", placeholder: "price, fiyat, price_sell" },
    { key: "costPrice", label: "Alış Fiyatı Etiketi", placeholder: "cost, alis_fiyati" },
    { key: "stock", label: "Stok Miktarı Etiketi", placeholder: "stock, stok, quantity" },
    { key: "category", label: "Kategori Etiketi", placeholder: "category, kategori" },
    { key: "brand", label: "Marka Etiketi", placeholder: "brand, marka" },
    { key: "description", label: "Açıklama Etiketi", placeholder: "description, aciklama" },
    { key: "piecesPerBox", label: "Koli Adedi Etiketi", placeholder: "piecesPerBox, koliAdeti" },
    { key: "packagingType", label: "Ambalaj Tipi Etiketi", placeholder: "packagingType, ambalaj" },
    { key: "imageUrl", label: "Görsel URL Etiketi", placeholder: "imageUrl, image, resim" },
    { key: "imageUrlsCsv", label: "Tüm Görseller CSV Etiketi", placeholder: "imageUrlsCsv, imagesCsv" },
    { key: "imageUrl1", label: "Görsel URL 1 Etiketi", placeholder: "imageUrl1, image1" },
    { key: "imageUrl2", label: "Görsel URL 2 Etiketi", placeholder: "imageUrl2, image2" },
    { key: "imageUrl3", label: "Görsel URL 3 Etiketi", placeholder: "imageUrl3, image3" },
    { key: "imageUrl4", label: "Görsel URL 4 Etiketi", placeholder: "imageUrl4, image4" },
    { key: "imageUrl5", label: "Görsel URL 5 Etiketi", placeholder: "imageUrl5, image5" },
    { key: "imageUrl6", label: "Görsel URL 6 Etiketi", placeholder: "imageUrl6, image6" },
    { key: "imageUrl7", label: "Görsel URL 7 Etiketi", placeholder: "imageUrl7, image7" },
    { key: "imageUrl8", label: "Görsel URL 8 Etiketi", placeholder: "imageUrl8, image8" },
    { key: "imageUrl9", label: "Görsel URL 9 Etiketi", placeholder: "imageUrl9, image9" },
    { key: "imageUrl10", label: "Görsel URL 10 Etiketi", placeholder: "imageUrl10, image10" }
  ].concat(
    priceLists.map((pl: any) => ({
      key: `priceList_${pl.id}`,
      label: `${pl.name} Fiyat Etiketi`,
      placeholder: `${pl.name}, ${pl.name} fiyati`
    }))
  ), [priceLists]);

  const exportFieldOptions = useMemo(() => [
    { key: "sku", label: "Ürün Kodu (SKU)" },
    { key: "barcode", label: "Barkod" },
    { key: "name", label: "Ürün Adı" },
    { key: "price", label: "Fiyat" },
    { key: "costPrice", label: "Alış Fiyatı" },
    { key: "stock", label: "Stok Miktarı" },
    { key: "category", label: "Kategori" },
    { key: "brand", label: "Marka" },
    { key: "description", label: "Ürün Açıklaması" },
    { key: "piecesPerBox", label: "Koli Adedi" },
    { key: "packagingType", label: "Ambalaj Tipi" },
    { key: "imageUrl", label: "Ana Görsel URL" },
    { key: "imageUrlsCsv", label: "Tüm Görseller (CSV)" },
    { key: "imageUrl1", label: "Görsel URL 1" },
    { key: "imageUrl2", label: "Görsel URL 2" },
    { key: "imageUrl3", label: "Görsel URL 3" },
    { key: "imageUrl4", label: "Görsel URL 4" },
    { key: "imageUrl5", label: "Görsel URL 5" },
    { key: "imageUrl6", label: "Görsel URL 6" },
    { key: "imageUrl7", label: "Görsel URL 7" },
    { key: "imageUrl8", label: "Görsel URL 8" },
    { key: "imageUrl9", label: "Görsel URL 9" },
    { key: "imageUrl10", label: "Görsel URL 10" },
    ...priceLists.map((pl: any) => ({ key: `priceList_${pl.id}`, label: `${pl.name} Fiyatı` }))
  ], [priceLists]);

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
      if (isXmlLicensed) {
        fetchXmlConfig();
      }
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
    <div className="space-y-6 w-full animate-fade-in">
      <div className="bg-card rounded-xl border border-border shadow-sm p-2">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setActiveSettingsTab("general")}
            className={`h-11 rounded-lg text-sm font-semibold transition-colors ${
              activeSettingsTab === "general"
                ? "brand-gradient text-white shadow-sm"
                : "bg-muted/40 text-muted-foreground hover:text-foreground"
            }`}
          >
            Genel Ayarlar
          </button>
          <button
            type="button"
            onClick={() => setActiveSettingsTab("commercial")}
            className={`h-11 rounded-lg text-sm font-semibold transition-colors ${
              activeSettingsTab === "commercial"
                ? "brand-gradient text-white shadow-sm"
                : "bg-muted/40 text-muted-foreground hover:text-foreground"
            }`}
          >
            Ticari Ayarlar
          </button>
          <button
            type="button"
            onClick={() => setActiveSettingsTab("xml")}
            className={`h-11 rounded-lg text-sm font-semibold transition-colors ${
              activeSettingsTab === "xml"
                ? "brand-gradient text-white shadow-sm"
                : "bg-muted/40 text-muted-foreground hover:text-foreground"
            }`}
          >
            XML Entegrasyonu
          </button>
        </div>
      </div>
      {activeSettingsTab === "general" && (
      <>
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

      </>
      )}

      {activeSettingsTab === "commercial" && (
      <>
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

      </>
      )}

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

      {/* XML Entegrasyonu Kartı */}
      {activeSettingsTab === "xml" && !isXmlLicensed && (
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden animate-fade-in">
          <div className="px-6 py-6 bg-gradient-to-r from-indigo-500/10 via-cyan-500/10 to-emerald-500/10 border-b border-border">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h3 className="text-xl font-bold text-foreground">XML Entegrasyon Modülü</h3>
                <p className="text-sm text-muted-foreground mt-1">Tedarikçi ve bayi akışlarınızı otomatikleştirin, manuel veri işini azaltın.</p>
              </div>
              <div className="text-right">
                <div className="text-xs text-muted-foreground uppercase tracking-wider">Başlangıç Fiyatı</div>
                <div className="text-2xl font-black text-foreground">₺499<span className="text-sm font-semibold text-muted-foreground">/ay</span></div>
              </div>
            </div>
          </div>
          <div className="p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                "Otomatik XML dışa aktarma (planlı)",
                "Tedarikçi XML içe aktarma ve senkron",
                "Alan eşleştirme ve akıllı etiket analizi",
                "Fiyat listesi bazlı dinamik XML alanları",
                "Import/Export işlem logları ve durum takibi",
                "Anlık çalıştırma: Şimdi Derle / Şimdi İçe Aktar"
              ].map((feature) => (
                <div key={feature} className="flex items-start gap-2 rounded-lg border border-border bg-muted/10 p-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5">✓</div>
                  <span className="text-sm text-foreground">{feature}</span>
                </div>
              ))}
            </div>
            <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/5 p-4">
              <p className="text-sm text-foreground">
                Bu modülü aktifleştirerek ürün güncellemelerini otomatikleştirebilir, katalog güncelliğini sürekli koruyabilirsiniz.
              </p>
            </div>
          </div>
        </div>
      )}

      {activeSettingsTab === "xml" && isXmlLicensed && xmlConfig && (
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden animate-fade-in">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-muted/10">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                <FileCode className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-foreground text-sm sm:text-base">XML Entegrasyon Modülü</h3>
                <p className="text-xs text-muted-foreground">Otomatik ve periyodik XML veri transferleri</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 p-1 bg-muted rounded-lg shrink-0">
              <button
                type="button"
                onClick={() => setActiveXmlTab("export")}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  activeXmlTab === "export" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                XML Ver (Export)
              </button>
              <button
                type="button"
                onClick={() => setActiveXmlTab("import")}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  activeXmlTab === "import" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                XML Al (Import)
              </button>
            </div>
          </div>

          <form onSubmit={handleSaveXmlConfig} className="p-5 space-y-6">
            {activeXmlTab === "export" ? (
              // EXPORT SETTINGS PANEL
              <div className="space-y-5 animate-fade-in">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Otomatik Derleme Sıklığı</label>
                    <select
                      className="flex h-11 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm shadow-sm"
                      value={xmlConfig.exportIntervalMinutes}
                      onChange={(e) => setXmlConfig({ ...xmlConfig, exportIntervalMinutes: Number(e.target.value) })}
                    >
                      <option value="0">Manuel (Kapalı)</option>
                      <option value="60">Her 1 Saat</option>
                      <option value="360">Her 6 Saat</option>
                      <option value="720">Her 12 Saat</option>
                      <option value="1440">Her 24 Saat (Günlük)</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Baz Fiyat Listesi</label>
                    <select
                      className="flex h-11 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm shadow-sm"
                      value={xmlConfig.exportPriceListId || ""}
                      onChange={(e) => setXmlConfig({ ...xmlConfig, exportPriceListId: e.target.value || null })}
                    >
                      <option value="">Varsayılan Ürün Fiyatı</option>
                      {priceLists.map((pl) => (
                        <option key={pl.id} value={pl.id}>{pl.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">XML'e Dahil Edilecek Ürün Bilgileri</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {exportFieldOptions.map((f) => {
                      const isChecked = xmlConfig.exportFields.includes(f.key);
                      return (
                        <label key={f.key} className="flex items-center gap-2 p-2.5 border border-border rounded-lg hover:bg-muted/30 cursor-pointer text-xs font-medium text-foreground bg-card transition-colors">
                          <input
                            type="checkbox"
                            className="w-4 h-4 cursor-pointer accent-indigo-500 rounded border-border"
                            checked={isChecked}
                            onChange={(e) => {
                              let fields = [...xmlConfig.exportFields];
                              if (e.target.checked) {
                                fields.push(f.key);
                              } else {
                                fields = fields.filter((item) => item !== f.key);
                              }
                              setXmlConfig({ ...xmlConfig, exportFields: fields });
                            }}
                          />
                          {f.label}
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2 border-t border-border pt-4">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Güvenli XML Bağlantınız</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={`${window.location.origin}/api/public/xml-export/${xmlConfig.exportKey}`}
                      className="flex-1 h-10 rounded-lg border border-border bg-muted/30 px-3 text-xs text-muted-foreground focus:outline-none select-all"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/api/public/xml-export/${xmlConfig.exportKey}`);
                        toast.success("XML URL kopyalandı!");
                      }}
                      className="h-10 px-4 bg-muted hover:bg-muted/80 text-foreground font-semibold flex items-center gap-1.5 shrink-0"
                    >
                      <Copy className="w-4 h-4" /> Kopyala
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">Bu URL ile diğer pazar yerleri veya bayileriniz ürün verilerinizi canlı ve güncel olarak çekebilir.</p>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 bg-muted/20 border border-border p-4 rounded-lg">
                  <div className="text-xs">
                    <span className="text-muted-foreground block">Son Güncelleme Zamanı</span>
                    <span className="font-semibold text-foreground">
                      {xmlConfig.exportLastRun ? new Date(xmlConfig.exportLastRun).toLocaleString("tr-TR") : "Henüz derlenmedi"}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleManualExport}
                    className="h-9 px-4 font-semibold text-xs flex items-center gap-1.5 border-indigo-500/20 text-indigo-500 hover:bg-indigo-500/10 cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5" /> Şimdi Çalıştır ve Derle
                  </Button>
                </div>
              </div>
            ) : (
              // IMPORT SETTINGS PANEL
              <div className="space-y-5 animate-fade-in">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Dış XML URL Adresi (Tedarikçi Kaynağı)</label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                      type="url"
                      placeholder="https://example.com/products-feed.xml"
                      value={xmlConfig.importUrl || ""}
                      onChange={(e) => setXmlConfig({ ...xmlConfig, importUrl: e.target.value })}
                    />
                    <Button type="button" variant="outline" onClick={handleAnalyzeImportUrl} disabled={isAnalyzingXmlUrl} className="shrink-0">
                      {isAnalyzingXmlUrl && <Loader2 className="w-4 h-4 animate-spin mr-1.5" />}
                      Linki Analiz Et
                    </Button>
                  </div>
                  {xmlAnalysis && (
                    <p className="text-[11px] text-muted-foreground">
                      Analiz: {xmlAnalysis.itemCount} ürün düğümü, {xmlAnalysis.tagCount} etiket bulundu. Önerilen itemTag: <span className="font-semibold text-foreground">{xmlAnalysis.itemTag}</span>
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Otomatik Senkronizasyon Sıklığı</label>
                    <select
                      className="flex h-11 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm shadow-sm"
                      value={xmlConfig.importIntervalMinutes}
                      onChange={(e) => setXmlConfig({ ...xmlConfig, importIntervalMinutes: Number(e.target.value) })}
                    >
                      <option value="0">Manuel (Kapalı)</option>
                      <option value="60">Her 1 Saat</option>
                      <option value="360">Her 6 Saat</option>
                      <option value="720">Her 12 Saat</option>
                      <option value="1440">Her 24 Saat (Günlük)</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Aktarılacak Fiyat Listesi</label>
                    <select
                      className="flex h-11 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm shadow-sm"
                      value={xmlConfig.importPriceListId || ""}
                      onChange={(e) => setXmlConfig({ ...xmlConfig, importPriceListId: e.target.value || null })}
                    >
                      <option value="">Varsayılan Ürün Fiyatı</option>
                      {priceLists.map((pl) => (
                        <option key={pl.id} value={pl.id}>{pl.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-3.5 border-t border-border pt-4">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">XML Alan & Etiket Eşleştirmeleri</label>
                  <datalist id="xml-tag-options">
                    {(xmlAnalysis?.tags || []).map((tag) => (
                      <option key={tag} value={tag} />
                    ))}
                  </datalist>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {importMappingFields.map((field) => (
                      <div key={field.key} className="space-y-1">
                        <span className="text-[11px] font-semibold text-foreground">{field.label}</span>
                        <Input
                          placeholder={field.placeholder}
                          list="xml-tag-options"
                          value={xmlConfig.importFieldsMapping?.[field.key] || (field.key === "itemTag" ? "item" : "")}
                          onChange={(e) => {
                            const mapping = { ...xmlConfig.importFieldsMapping, [field.key]: e.target.value };
                            setXmlConfig({ ...xmlConfig, importFieldsMapping: mapping });
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 bg-muted/20 border border-border p-4 rounded-lg">
                  <div className="text-xs">
                    <span className="text-muted-foreground block">
                      Son Senkronizasyon: <span className="font-semibold text-foreground">{xmlConfig.importLastRun ? new Date(xmlConfig.importLastRun).toLocaleString("tr-TR") : "Hiç çalıştırılmadı"}</span>
                    </span>
                    <span className="text-muted-foreground block mt-0.5">
                      Durum: <span className={`font-bold uppercase ${
                        xmlConfig.importStatus === "SUCCESS" ? "text-emerald-500" :
                        xmlConfig.importStatus === "FAILED" ? "text-destructive" :
                        xmlConfig.importStatus === "RUNNING" ? "text-amber-500 animate-pulse" : "text-muted-foreground"
                      }`}>{xmlConfig.importStatus || "BEKLEMEDE"}</span>
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!xmlConfig.importUrl || xmlConfig.importStatus === "RUNNING"}
                    onClick={handleManualImport}
                    className="h-9 px-4 font-semibold text-xs flex items-center gap-1.5 border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/10 cursor-pointer shrink-0 disabled:opacity-50"
                  >
                    <Upload className="w-3.5 h-3.5" /> Şimdi İçe Aktar (Sync Now)
                  </Button>
                </div>

                {xmlConfig.importLog && (
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">İçe Aktarım Detay & Hata Logları</span>
                    <textarea
                      readOnly
                      value={xmlConfig.importLog}
                      className="w-full h-32 text-[10px] font-mono bg-muted/50 text-muted-foreground p-3 border border-border rounded-lg focus:outline-none resize-none"
                    />
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                disabled={isXmlSaving}
                className="brand-gradient border-0 shadow-md shadow-secondary/20 hover:opacity-90 h-10 px-6 font-semibold text-xs gap-2"
              >
                {isXmlSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                XML Entegrasyon Ayarlarını Kaydet
              </Button>
            </div>
          </form>
        </div>
      )}

      {activeSettingsTab !== "xml" && (
        <Button
          onClick={handleSave}
          disabled={isLoading}
          className="brand-gradient border-0 shadow-md shadow-secondary/20 hover:opacity-90 h-12 px-8 font-semibold text-base gap-2 w-full sm:w-auto"
        >
          {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
          Ayarları Kaydet
        </Button>
      )}
    </div>
  );
}
