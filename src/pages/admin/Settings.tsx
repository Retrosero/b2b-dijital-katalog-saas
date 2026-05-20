import { useAuthStore } from "@/store/useAuthStore";
import { useEffect, useState } from "react";
import { Loader2, Monitor, Package, Settings as SettingsIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

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
  const [orderMode, setOrderMode] = useState(user?.tenant?.orderMode || "UNIT");
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

  useEffect(() => {
    if (user?.tenant?.orderMode) {
      setOrderMode(user.tenant.orderMode);
    }
    if (user?.fastSalesSettings) {
      setFastSalesSettings(JSON.parse(user.fastSalesSettings));
    }
  }, [user]);

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
          body: JSON.stringify({ orderMode })
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
      alert("Ayarlar kaydedildi.");
    } catch (e: any) {
      alert(e.message);
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
        </div>
      </div>

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
