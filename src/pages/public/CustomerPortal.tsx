import { useEffect, useState } from "react";
import { useCustomerAuthStore } from "@/store/useCustomerAuthStore";
import { Navigate, useNavigate } from "react-router-dom";
import { BookOpen, LogOut, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/BrandLogo";

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
    return <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground font-medium">Yükleniyor...</div>;
  }

  const handleLogout = () => {
    logout();
    navigate("/musteri-girisi");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <BrandLogo iconClassName="w-10 h-10 rounded-xl" />
          <div>
            <p className="text-xs text-muted-foreground font-medium">Müşteri Portalı</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm font-medium text-foreground hidden sm:block">
            Hoş Geldiniz, <span className="font-bold">{customer.name}</span>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout} className="text-muted-foreground border-border hover:bg-muted">
            <LogOut className="w-4 h-4 mr-2" />
            Çıkış
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6 mt-8">
        <h2 className="text-2xl font-bold text-foreground mb-6">Kataloglarınız</h2>
        
        {catalogs.length === 0 ? (
          <div className="bg-card p-12 text-center rounded-2xl border border-border shadow-sm">
            <BookOpen className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-foreground mb-2">Aktif Katalog Bulunamadı</h3>
            <p className="text-muted-foreground">Şu anda hesabınıza tanımlanmış aktif bir katalog bulunmuyor.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {catalogs.map(cat => (
              <div key={cat.id} className="bg-card p-6 rounded-2xl border border-border shadow-sm hover:shadow-md transition-shadow flex flex-col">
                <div className="w-12 h-12 bg-secondary/15 rounded-xl flex items-center justify-center mb-4 text-secondary">
                  <BookOpen className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">{cat.name}</h3>
                {cat.description && (
                  <p className="text-sm text-muted-foreground mb-6 line-clamp-2 flex-1">{cat.description}</p>
                )}
                <Button 
                  className="w-full mt-auto"
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
