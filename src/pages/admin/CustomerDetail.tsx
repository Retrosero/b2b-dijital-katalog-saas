import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuthStore } from "@/store/useAuthStore";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ArrowLeft, User, KeyRound, MessageCircle, ChevronRight, ShoppingCart } from "lucide-react";
import { Input } from "@/components/ui/input";

const createUsernameBase = (name: string) => {
  return name
    .toLocaleLowerCase("tr-TR")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 32) || "musteri";
};

export default function CustomerDetail() {
  const { id } = useParams();
  const { token } = useAuthStore();
  const [customer, setCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [updatingAuth, setUpdatingAuth] = useState(false);

  useEffect(() => {
    fetch(`/api/customers/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setCustomer(data);
        setLoading(false);
      });
  }, [id, token]);

  const handleGenerateAuth = async () => {
    let newUsername = customer.username || createUsernameBase(customer.name);
    if (!customer.username) {
      try {
        const res = await fetch("/api/customers", {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const customers = await res.json();
          const exists = customers.some((c: any) => {
            if (c.id === customer.id || !c.username) return false;
            return c.username === newUsername || c.username.startsWith(`${newUsername}_`);
          });
          if (exists) newUsername = `${newUsername}_${customer.id}`;
        }
      } catch(e) {}
    }
    const newPassword = Math.random().toString(36).substring(2, 8) + "!";
    
    setUpdatingAuth(true);
    const res = await fetch(`/api/customers/${id}`, {
      method: "PUT",
      headers: { 
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}` 
      },
      body: JSON.stringify({
        name: customer.name,
        username: newUsername,
        password: newPassword,
      })
    });
    
    if (res.ok) {
      const updated = await res.json();
      setCustomer({ ...customer, username: updated.username });
      setGeneratedPassword(newPassword);
    } else {
      alert("Bilgiler oluşturulamadı.");
    }
    setUpdatingAuth(false);
  };

  const handleShareWhatsapp = () => {
    if (!customer?.phone) {
      alert("Müşterinin telefon numarası kayıtlı değil.");
      return;
    }
    
    const catalogSlug = customer.tenant?.catalogs?.[0]?.slug || "";
    // Note: If you have a specific B2B login route, you'd link it here. Let's use the catalog link.
    const baseUrl = window.location.origin;
    const loginLink = `${baseUrl}/c/${catalogSlug}?customer=${customer.username}`;
    
    const text = `Merhaba ${customer.name},\n\nSistemimize giriş bilgileriniz aşağıdadır:\n\nKullanıcı Adı: ${customer.username}\nŞifre: ${generatedPassword}\n\nSipariş vermek ve kataloğumuzu incelemek için aşağıdaki linke tıklayabilirsiniz:\n${loginLink}`;
    const encodedText = encodeURIComponent(text);
    const cleanPhone = customer.phone.replace(/[^0-9]/g, "");
    
    window.open(`https://wa.me/${cleanPhone}?text=${encodedText}`, '_blank');
  };

  if (loading) return <div className="p-4 text-muted-foreground">Yükleniyor...</div>;
  if (!customer) return <div className="p-4 text-destructive">Müşteri bulunamadı</div>;

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      <div className="flex items-center gap-3 md:gap-4">
        <Link to="/admin/customers" className="inline-flex items-center justify-center size-10 border border-border rounded-lg bg-card hover:bg-muted transition-colors touch-target">
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </Link>
        <Link to={`/admin/customers/edit/${id}`} className="ml-auto">
          <Button variant="outline" className="gap-2 border-secondary/30 text-secondary hover:bg-secondary/5 touch-target">
            Düzenle
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
        <div className="bg-card p-4 md:p-5 rounded-xl border border-border shadow-sm flex items-start gap-4">
          <div className="w-12 h-12 rounded-full brand-gradient flex items-center justify-center text-white shrink-0 shadow-md">
            <User className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-foreground">{customer.name}</h3>
            <div className="text-sm text-muted-foreground mt-2 space-y-1.5">
              <p><strong className="text-foreground">Adres:</strong> {customer.address || "-"}</p>
              <p><strong className="text-foreground">İskonto:</strong> %{customer.discountRate || 0}</p>
              <p><strong className="text-foreground">Kayıt:</strong> {new Date(customer.createdAt).toLocaleDateString("tr-TR")}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-card p-4 md:p-5 rounded-xl border border-border shadow-sm flex flex-col gap-3">
            <div className="flex items-center gap-2 text-foreground border-b border-border pb-3">
              <KeyRound className="w-5 h-5 text-secondary" />
              <h3 className="font-bold">Katalog & Giriş Bilgileri</h3>
            </div>
            
            <div className="flex-1 flex flex-col justify-center">
              {customer.username ? (
                <div className="text-sm space-y-1.5 mb-3">
                  <p><strong className="text-foreground">Kullanıcı Adı:</strong> <span className="font-medium text-foreground font-mono">{customer.username}</span></p>
                  {generatedPassword && (
                    <p><strong className="text-foreground">Yeni Şifre:</strong> <span className="font-medium text-chart-2 bg-chart-2/10 px-1.5 py-0.5 rounded">{generatedPassword}</span></p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground mb-3">Bu müşteri için henüz giriş bilgisi oluşturulmamış.</p>
              )}
              
              <div className="flex gap-2 mt-auto flex-wrap">
                <Button size="sm" variant="outline" onClick={handleGenerateAuth} disabled={updatingAuth} className="touch-target">
                  {customer.username ? "Şifre Yenile" : "Kayıt Oluştur"}
                </Button>
                {customer.username && generatedPassword && (
                  <Button size="sm" className="bg-[#25D366] hover:bg-[#20bd5a] text-white touch-target" onClick={handleShareWhatsapp}>
                    <MessageCircle className="w-4 h-4 mr-2" />
                    WhatsApp ile İlet
                  </Button>
                )}
              </div>
            </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/30 flex items-center gap-2">
          <ShoppingCart className="w-4 h-4 text-secondary" />
          <h3 className="font-bold text-foreground">Geçmiş Siparişler</h3>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden divide-y divide-border">
          {customer.orders?.map((o: any) => (
            <Link to={`/admin/orders/${o.id}`} key={o.id} className="block p-4 hover:bg-muted/20 transition-colors">
              <div className="flex items-start justify-between gap-2 mb-1">
                <div>
                  <div className="text-xs text-secondary font-bold">{o.orderNumber}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{new Date(o.createdAt).toLocaleDateString("tr-TR")}</div>
                </div>
                <span className="status-badge status-pending">Yeni</span>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="font-bold text-foreground">₺{o.totalAmount.toFixed(2)}</span>
                <span className="text-xs text-secondary font-medium flex items-center gap-1">Detay <ChevronRight className="w-3 h-3" /></span>
              </div>
            </Link>
          ))}
          {(!customer.orders || customer.orders.length === 0) && (
            <div className="text-center py-10">
              <ShoppingCart className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">Henüz sipariş bulunmamaktadır.</p>
            </div>
          )}
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block">
          <Table>
              <TableHeader>
                <TableRow className="bg-muted/20">
                  <TableHead>Sipariş No</TableHead>
                  <TableHead>Tarih</TableHead>
                  <TableHead>Tutar</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead className="text-right">İçerik</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customer.orders?.map((o: any) => (
                  <TableRow key={o.id} className="hover:bg-muted/20">
                    <TableCell className="font-semibold text-secondary">{o.orderNumber}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{new Date(o.createdAt).toLocaleDateString("tr-TR")}</TableCell>
                    <TableCell className="font-bold text-foreground">₺{o.totalAmount.toFixed(2)}</TableCell>
                    <TableCell>
                        <span className="status-badge status-pending">Yeni</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link to={`/admin/orders/${o.id}`} className="inline-flex items-center gap-1 rounded-lg text-sm h-9 px-3 hover:bg-muted font-medium transition-colors border border-border touch-target">
                        Detay <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
                {(!customer.orders || customer.orders.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Henüz sipariş bulunmamaktadır.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
        </div>
      </div>
    </div>
  );
}
