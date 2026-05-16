import { useAuthStore } from "@/store/useAuthStore";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";

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
    return <div className="p-4 text-center">Ayarlar firmalara özeldir.</div>;
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

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="space-y-4 bg-white p-6 rounded-lg border shadow-sm">
        <div className="space-y-6">
          
          <div className="border-b pb-4">
             <h3 className="text-lg font-semibold mb-3">Kişisel Görünüm Ayarları (Hızlı Satış)</h3>
             <label className="text-sm font-medium mb-2 block">Hızlı Satış Modülü Sütunları</label>
             <div className="grid grid-cols-2 gap-2 text-sm">
               {["sku", "barcode", "category", "piecesPerBox", "packagingType", "stock", "description"].map((key) => {
                 const labels: any = {
                   sku: "Ürün Kodu", barcode: "Barkod", category: "Kategori",
                   piecesPerBox: "Koli Adeti", packagingType: "Ambalaj", stock: "Stok", description: "Açıklama"
                 };
                 return (
                   <label key={key} className="flex items-center space-x-2 cursor-pointer">
                     <input type="checkbox" checked={fastSalesSettings?.[key] || false} 
                       onChange={(e) => setFastSalesSettings({
                         ...fastSalesSettings, 
                         [key]: e.target.checked 
                       })}
                     />
                     <span>{labels[key]}</span>
                   </label>
                 );
               })}
             </div>
          </div>

          <div className="border-b pb-4">
            <h3 className="text-lg font-semibold mb-3">Paket ve Kota Bilgileri</h3>
            <div className="p-4 bg-slate-50 border rounded-lg space-y-4">
              <div className="flex justify-between items-center bg-white p-3 border rounded shadow-sm">
                <div>
                  <span className="text-sm text-slate-500 block">Mevcut Paket</span>
                  <span className="font-semibold text-lg">{user?.tenant?.planName || "Bilinmiyor"}</span>
                </div>
                {/* We can show limits depending on plan if needed, but for now just name */}
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Resim Depolama Alanı</span>
                  <span className="font-medium">
                    {((user?.tenant?.usedStorageBytes || 0) / (1024 * 1024 * 1024)).toFixed(2)} GB / 
                    {user?.tenant?.storageLimitBytes ? ` ${((user?.tenant?.storageLimitBytes) / (1024 * 1024 * 1024)).toFixed(2)} GB`: " Sınırsız"}
                  </span>
                </div>
                {user?.tenant?.storageLimitBytes && (
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className={`h-2.5 rounded-full ${
                        ((user.tenant.usedStorageBytes || 0) / user.tenant.storageLimitBytes) > 0.9 ? "bg-red-600" : 
                        ((user.tenant.usedStorageBytes || 0) / user.tenant.storageLimitBytes) > 0.7 ? "bg-amber-500" : "bg-indigo-600"
                      }`} 
                      style={{ width: `${Math.min(100, ((user?.tenant?.usedStorageBytes || 0) / user.tenant.storageLimitBytes) * 100)}%` }}
                    ></div>
                  </div>
                )}
                {user?.tenant?.storageLimitBytes && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Kalan kota: {(((user.tenant.storageLimitBytes) - (user.tenant.usedStorageBytes || 0)) / (1024 * 1024 * 1024)).toFixed(2)} GB
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="pt-2">
            <h3 className="text-lg font-semibold mb-3">Firma Ayarları</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Sipariş Satış Tipi</label>
                <select 
                  className="w-full border rounded-md px-3 py-2"
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

          <button 
            onClick={handleSave}
            disabled={isLoading}
            className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 transition-colors flex items-center gap-2"
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            Kaydet
          </button>
        </div>
      </div>
    </div>
  );
}
