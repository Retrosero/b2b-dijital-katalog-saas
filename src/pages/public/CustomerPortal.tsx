import { useEffect, useState } from "react";
import { useCustomerAuthStore } from "@/store/useCustomerAuthStore";
import { Navigate, useNavigate } from "react-router-dom";
import { BookOpen, LogOut, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CustomerPortal() {
  const { customer, logout } = useCustomerAuthStore();
  const navigate = useNavigate();
  const [catalogs, setCatalogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!customer) return;
    
    fetch("/api/auth/customer/catalogs", {
      headers: { Authorization: `Bearer ${useCustomerAuthStore.getState().token}` }
    })
      .then(res => res.json())
      .then(data => {
        const cats = data.catalogs || [];
        setCatalogs(cats);
        
        // If there's exactly 1 catalog, automatically redirect to it
        if (cats.length === 1) {
          navigate(`/c/${cats[0].slug}?customer=${customer.username}`, { replace: true });
        } else {
          setLoading(false);
        }
      })
      .catch(() => setLoading(false));
  }, [customer, navigate]);

  if (!customer) {
    return <Navigate to="/musteri-girisi" replace />;
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 font-medium">Yükleniyor...</div>;
  }

  const handleLogout = () => {
    logout();
    navigate("/musteri-girisi");
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/30">
            <span className="font-bold text-white text-lg">K</span>
          </div>
          <div>
            <h1 className="font-bold text-slate-800 tracking-tight">Katalog Pro</h1>
            <p className="text-xs text-slate-500 font-medium">Müşteri Portalı</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm font-medium text-slate-700 hidden sm:block">
            Hoş Geldiniz, <span className="font-bold">{customer.name}</span>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout} className="text-slate-600 border-slate-200 hover:bg-slate-50">
            <LogOut className="w-4 h-4 mr-2" />
            Çıkış
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6 mt-8">
        <h2 className="text-2xl font-bold text-slate-800 mb-6">Kataloglarınız</h2>
        
        {catalogs.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 shadow-sm">
            <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-700 mb-2">Aktif Katalog Bulunamadı</h3>
            <p className="text-slate-500">Şu anda hesabınıza tanımlanmış aktif bir katalog bulunmuyor.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {catalogs.map(cat => (
              <div key={cat.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col">
                <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center mb-4 text-indigo-600">
                  <BookOpen className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">{cat.name}</h3>
                {cat.description && (
                  <p className="text-sm text-slate-500 mb-6 line-clamp-2 flex-1">{cat.description}</p>
                )}
                <Button 
                  className="w-full mt-auto bg-indigo-600 hover:bg-indigo-700 text-white"
                  onClick={() => navigate(`/c/${cat.slug}?customer=${customer.username}`)}
                >
                  Kataloğu Görüntüle <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
