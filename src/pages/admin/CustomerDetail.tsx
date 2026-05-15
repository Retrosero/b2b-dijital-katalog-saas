import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuthStore } from "@/store/useAuthStore";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ArrowLeft, User, KeyRound, MessageCircle } from "lucide-react";
import { Input } from "@/components/ui/input";

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
    const randomChars = Math.random().toString(36).substring(2, 6);
    const newUsername = `musteri_${randomChars}`;
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
        username: customer.username || newUsername, // Keep existing if set
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

  if (loading) return <div className="p-4">Yükleniyor...</div>;
  if (!customer) return <div className="p-4 text-red-500">Müşteri bulunamadı</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/admin/customers" className="inline-flex items-center justify-center size-8 border rounded-lg bg-background hover:bg-muted hover:text-foreground font-medium transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{customer.name}</h2>
          <p className="text-muted-foreground">{customer.email || "E-posta yok"} | {customer.phone || "Telefon yok"}</p>
        </div>
        <Link to={`/admin/customers/edit/${id}`} className="ml-auto">
          <Button variant="outline" className="gap-2 border-indigo-200 text-indigo-600 hover:bg-indigo-50">
            Düzenle
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-xl border shadow-sm flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
            <User className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800">Müşteri Bilgileri</h3>
            <div className="text-sm text-slate-600 mt-2 space-y-1">
              <p><strong>Adres:</strong> {customer.address || "-"}</p>
              <p><strong>İskonto:</strong> %{customer.discountRate || 0}</p>
              <p><strong>Kayıt:</strong> {new Date(customer.createdAt).toLocaleDateString("tr-TR")}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-xl border shadow-sm flex flex-col gap-3">
            <div className="flex items-center gap-2 text-slate-800 border-b pb-2">
              <KeyRound className="w-5 h-5 text-indigo-600" />
              <h3 className="font-semibold">Katalog & Giriş Bilgileri</h3>
            </div>
            
            <div className="flex-1 flex flex-col justify-center">
              {customer.username ? (
                <div className="text-sm space-y-1 mb-3">
                  <p><strong>Kullanıcı Adı:</strong> <span className="font-medium text-slate-900">{customer.username}</span></p>
                  {generatedPassword && (
                    <p><strong>Yeni Şifre:</strong> <span className="font-medium text-green-700 bg-green-50 px-1 rounded">{generatedPassword}</span></p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-slate-500 mb-3">Bu müşteri için henüz giriş bilgisi oluşturulmamış.</p>
              )}
              
              <div className="flex gap-2 mt-auto">
                <Button size="sm" variant="outline" onClick={handleGenerateAuth} disabled={updatingAuth}>
                  {customer.username ? "Şifre Yenile" : "Kayıt Oluştur"}
                </Button>
                {customer.username && generatedPassword && (
                  <Button size="sm" className="bg-[#25D366] hover:bg-[#20bd5a] text-white" onClick={handleShareWhatsapp}>
                    <MessageCircle className="w-4 h-4 mr-2" />
                    WhatsApp ile İlet
                  </Button>
                )}
              </div>
            </div>
        </div>
      </div>

      <div className="bg-white border rounded-lg shadow-sm overflow-hidden mt-6">
        <div className="p-4 border-b bg-slate-50">
          <h3 className="font-semibold text-slate-800">Geçmiş Siparişler</h3>
        </div>
        <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="">Sipariş No</TableHead>
                <TableHead className="">Tarih</TableHead>
                <TableHead>Tutar</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead className="text-right ">İçerik</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customer.orders?.map((o: any) => (
                <TableRow key={o.id}>
                  <TableCell className="font-medium text-indigo-600">{o.orderNumber}</TableCell>
                  <TableCell>{new Date(o.createdAt).toLocaleDateString("tr-TR")}</TableCell>
                  <TableCell className="font-bold text-slate-800">₺{o.totalAmount.toFixed(2)}</TableCell>
                  <TableCell>
                      <span className="inline-flex bg-amber-100 text-amber-800 text-xs px-2 py-1 rounded font-medium">Yeni</span>
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    <Link to={`/admin/orders/${o.id}`} className="inline-flex items-center justify-center rounded-lg text-xs sm:text-[0.8rem] h-7 px-2.5 hover:bg-muted hover:text-foreground font-medium transition-colors border">
                      Detay Gör
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
              {(!customer.orders || customer.orders.length === 0) && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-slate-500 py-8">
                    Henüz sipariş bulunmamaktadır.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
      </div>
    </div>
  );
}
