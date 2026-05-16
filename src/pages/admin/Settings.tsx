import { useAuthStore } from "@/store/useAuthStore";
import { useState, useEffect } from "react";
import { Loader2, Settings as SettingsIcon, Package, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Settings() {
  const { user, fetchUser } = useAuthStore();
  const [orderMode, setOrderMode] = useState(user?.tenant?.orderMode || "UNIT");
  const [isLoading, setIsLoading] = useState(false);
  const [fastSalesSettings, setFastSalesSettings] = useState<any>({
    sku: true, barcode: true, category: true, piecesPerBox: true, packagingType: true, stock: true, description: true
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
      if (user?.role === "TENANT_ADMIN") {
         await fetch("/api/tenants/settings", {
           method: "PUT",
           headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem("token")}` },
           body: JSON.stringify({ orderMode })
         });
      }

      await fetch(`/api/users/${user.id}/fast-sales-settings`, {
           method: "PUT",
           headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem("token")}` },
           body: JSON.stringify({ fastSalesSettings: JSON.stringify(fastSalesSettings) })
      });
      
      await fetchUser();
      alert("Ayarlar kaydedildi.");
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const columnLabels: Record<string, string> = {
    sku: "Ürün Kodu", barcode: "Barkod", category: "Kategori",
    piecesPerBox: "Koli Adeti", packagingType: "Ambalaj", stock: "Stok", description: "Açıklama"
  };

  return (
    <div className="space-y-6 max-w-2xl animate-fade-in">
      {/* Kişisel Görünüm */}
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
              <label key={key} className="flex items-center gap-2.5 p-3 border border-border rounded-lg hover:bg-muted/30 cursor-pointer transition-colors touch-target bg-card">
                <input 
                  type="checkbox" 
                  className="w-4 h-4 cursor-pointer text-secondary border-border rounded focus:ring-secondary accent-secondary" 
                  checked={fastSalesSettings?.[key] || false} 
                  onChange={(e) => setFastSalesSettings({
                    ...fastSalesSettings, 
                    [key]: e.target.checked 
                  })}
                />
                <span className="text-sm font-medium text-foreground">{columnLabels[key]}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Paket ve Kota */}
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
                {user?.tenant?.storageLimitBytes ? ` ${((user?.tenant?.storageLimitBytes) / (1024 * 1024 * 1024)).toFixed(2)} GB`: " Sınırsız"}
              </span>
            </div>
            {user?.tenant?.storageLimitBytes && (
              <>
                <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                  <div 
                    className={`h-2.5 rounded-full transition-all duration-500 ${
                      ((user.tenant.usedStorageBytes || 0) / user.tenant.storageLimitBytes) > 0.9 ? "bg-destructive" : 
                      ((user.tenant.usedStorageBytes || 0) / user.tenant.storageLimitBytes) > 0.7 ? "bg-chart-3" : "bg-secondary"
                    }`} 
                    style={{ width: `${Math.min(100, ((user?.tenant?.usedStorageBytes || 0) / user.tenant.storageLimitBytes) * 100)}%` }}
                  ></div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Kalan kota: {(((user.tenant.storageLimitBytes) - (user.tenant.usedStorageBytes || 0)) / (1024 * 1024 * 1024)).toFixed(2)} GB
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Firma Ayarları */}
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
            <select 
              className="w-full h-11 border border-border rounded-lg px-3 py-2 text-sm bg-card shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring touch-target"
              value={orderMode}
              onChange={(e) => setOrderMode(e.target.value)}
              disabled={user?.role !== "TENANT_ADMIN"}
            >
              <option value="UNIT">Adet Bazlı Satış (Girilen miktar adet olarak eklenir)</option>
              <option value="BOX">Koli Bazlı Satış (Miktar × Ürün Koli Adedi olarak eklenir)</option>
            </select>
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
