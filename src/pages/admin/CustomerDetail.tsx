import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuthStore } from "@/store/useAuthStore";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit3, User, KeyRound, MessageCircle, ChevronRight, ShoppingCart, Link2, Copy, Check, ExternalLink, Download } from "lucide-react";
import { usePageHeaderStore } from "@/store/usePageHeaderStore";
import { cn } from "@/lib/utils";

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
  const { setHeader, resetHeader } = usePageHeaderStore();
  const [customer, setCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [catalogs, setCatalogs] = useState<any[]>([]);
  
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [updatingAuth, setUpdatingAuth] = useState(false);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<string>("ALL");

  useEffect(() => {
    Promise.all([
      fetch(`/api/customers/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      }),
      fetch("/api/catalogs", {
        headers: { Authorization: `Bearer ${token}` }
      })
    ])
      .then(([resCustomer, resCatalogs]) => Promise.all([resCustomer.json(), resCatalogs.json()]))
      .then(([customerData, catalogsData]) => {
        setCustomer(customerData);
        setCatalogs(catalogsData);
        setLoading(false);
      });
  }, [id, token]);

  useEffect(() => {
    setHeader({
      title: customer?.name || "Müşteri Detayı",
      subtitle: customer ? "Müşteri bilgileri, katalog girişi ve sipariş geçmişi" : null,
      backTo: "/admin/customers",
      actions: id ? [
        {
          key: "edit-customer",
          label: "Düzenle",
          to: `/admin/customers/edit/${id}`,
          icon: <Edit3 className="w-5 h-5" />,
          variant: "secondary"
        }
      ] : []
    });
    return resetHeader;
  }, [id, customer, setHeader, resetHeader]);

  const getUniqueSuffix = (baseName: string, phone: string | null, existingUsernames: string[]) => {
    // First try phone last 4 digits
    if (phone) {
      const cleanPhone = phone.replace(/[^0-9]/g, "");
      const last4 = cleanPhone.slice(-4);
      if (last4 && last4.length === 4) {
        const candidate = `${baseName}${last4}`;
        if (!existingUsernames.includes(candidate)) return last4;
      }
    }
    // Fallback: random 4-digit number
    return Math.floor(1000 + Math.random() * 9000).toString();
  };

  const handleGenerateAuth = async () => {
    let newUsername = customer.username || createUsernameBase(customer.name);
    if (!customer.username) {
      try {
        const res = await fetch("/api/customers", {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const customers = await res.json();
          const allUsernames = customers.map((c: any) => c.username).filter(Boolean);
          const exists = allUsernames.includes(newUsername) || allUsernames.some(u => u.startsWith(`${newUsername}`));
          if (exists) {
            const suffix = getUniqueSuffix(newUsername, customer.phone, allUsernames);
            newUsername = `${newUsername}${suffix}`;
          }
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
    const baseUrl = window.location.origin;
    const loginLink = `${baseUrl}/c/${catalogSlug}?customer=${customer.username}`;
    
    const text = `Merhaba ${customer.name},\n\nSistemimize giriş bilgileriniz aşağıdadır:\n\nKullanıcı Adı: ${customer.username}\nŞifre: ${generatedPassword}\n\nSipariş vermek ve kataloğumuzu incelemek için aşağıdaki linke tıklayabilirsiniz:\n${loginLink}`;
    const encodedText = encodeURIComponent(text);
    const cleanPhone = customer.phone.replace(/[^0-9]/g, "");
    
    window.open(`https://wa.me/${cleanPhone}?text=${encodedText}`, '_blank');
  };

  const copyToClipboard = (text: string, slug: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  // Get customer-specific catalog or all tenant catalogs
  const getCustomerCatalogs = () => {
    if (!catalogs || catalogs.length === 0) return [];
    const customerCatalogs = catalogs.filter((c: any) => c.customerId === customer.id);
    if (customerCatalogs.length > 0) return customerCatalogs;
    return catalogs.filter((c: any) => !c.customerId);
  };

  const customerCatalogs = getCustomerCatalogs();
  const customerOrders = customer?.orders || [];

  const orderYears = useMemo<number[]>(() => {
    const years = customerOrders
      .map((o: any) => Number(new Date(o.createdAt).getFullYear()))
      .filter((year: number) => Number.isFinite(year));
    return Array.from(new Set<number>(years)).sort((a, b) => b - a);
  }, [customerOrders]);

  const filteredOrders = useMemo(() => {
    if (selectedYear === "ALL") return customerOrders;
    return customerOrders.filter((o: any) => new Date(o.createdAt).getFullYear() === Number(selectedYear));
  }, [customerOrders, selectedYear]);

  const handleExportOrdersPdf = () => {
    const totalAmount = filteredOrders.reduce((sum: number, o: any) => sum + Number(o.totalAmount || 0), 0);
    const rowsHtml = filteredOrders.map((o: any, idx: number) => `
      <tr>
        <td>${idx + 1}</td>
        <td>${o.orderNumber || "-"}</td>
        <td>${new Date(o.createdAt).toLocaleDateString("tr-TR")}</td>
        <td>₺${Number(o.totalAmount || 0).toFixed(2)}</td>
        <td><span class="status">Yeni</span></td>
      </tr>
    `).join("");

    const html = `
      <!doctype html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Gecmis Siparisler</title>
        <style>
          :root { color-scheme: light; }
          * { box-sizing: border-box; }
          body {
            font-family: "Nunito Variable", Arial, sans-serif;
            margin: 0;
            padding: 28px;
            background: #f8fafc;
            color: #0f172a;
          }
          .sheet {
            background: #ffffff;
            border: 1px solid #dbeafe;
            border-radius: 14px;
            padding: 20px;
          }
          .top {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 12px;
            margin-bottom: 14px;
          }
          h1 { font-size: 20px; margin: 0; letter-spacing: .2px; }
          .sub { margin-top: 4px; font-size: 12px; color: #64748b; }
          .meta-badge {
            background: #eef2ff;
            color: #1e40af;
            border: 1px solid #c7d2fe;
            border-radius: 999px;
            font-size: 12px;
            padding: 6px 10px;
            font-weight: 700;
            white-space: nowrap;
          }
          .stats {
            display: flex;
            gap: 8px;
            margin: 10px 0 16px;
          }
          .stat {
            border: 1px solid #dbeafe;
            background: #f8fbff;
            border-radius: 10px;
            padding: 8px 10px;
            min-width: 130px;
          }
          .stat-label { font-size: 11px; color: #64748b; }
          .stat-value { margin-top: 2px; font-size: 15px; font-weight: 800; color: #0f172a; }
          table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            overflow: hidden;
          }
          thead tr { background: #f1f5f9; }
          th, td { padding: 11px 12px; border-bottom: 1px solid #eef2f7; font-size: 12.5px; text-align: left; }
          tbody tr:nth-child(even) { background: #fcfdff; }
          tbody tr:last-child td { border-bottom: 0; }
          .index { width: 42px; color: #64748b; }
          .amount { font-weight: 800; color: #0f172a; }
          .status {
            display: inline-block;
            font-size: 11px;
            font-weight: 700;
            color: #0f766e;
            background: #ecfeff;
            border: 1px solid #a5f3fc;
            padding: 3px 8px;
            border-radius: 999px;
          }
          .empty {
            text-align: center;
            color: #64748b;
            padding: 18px 12px;
          }
          @media print {
            body { padding: 0; background: #fff; }
            .sheet { border: 0; border-radius: 0; }
          }
        </style>
      </head>
      <body>
        <div class="sheet">
          <div class="top">
            <div>
              <h1>Geçmiş Siparişler</h1>
              <div class="sub">${customer.name}</div>
            </div>
            <div class="meta-badge">${selectedYear === "ALL" ? "Tüm Yıllar" : selectedYear}</div>
          </div>
          <div class="stats">
            <div class="stat">
              <div class="stat-label">Sipariş Adedi</div>
              <div class="stat-value">${filteredOrders.length}</div>
            </div>
            <div class="stat">
              <div class="stat-label">Toplam Tutar</div>
              <div class="stat-value">₺${totalAmount.toFixed(2)}</div>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th class="index">#</th>
                <th>Sipariş No</th>
                <th>Tarih</th>
                <th>Tutar</th>
                <th>Durum</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml || `<tr><td class="empty" colspan="5">Henüz sipariş bulunmamaktadır.</td></tr>`}
            </tbody>
          </table>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open("", "_blank", "width=1024,height=768");
    if (!printWindow) return;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 200);
  };

  if (loading) return <div className="p-4 text-muted-foreground">Yükleniyor...</div>;
  if (!customer) return <div className="p-4 text-destructive">Müşteri bulunamadı</div>;

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in">
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
                <div className="text-sm space-y-2 mb-3">
                  <div className="flex items-center justify-between">
                    <p><strong className="text-foreground">Kullanıcı:</strong> <span className="font-medium text-foreground font-mono">{customer.username}</span></p>
                    <button
                      onClick={() => copyToClipboard(customer.username, 'username')}
                      className={cn(
                        "h-7 px-2 rounded border font-medium text-xs flex items-center gap-1 transition-all",
                        copiedSlug === 'username'
                          ? "bg-chart-2/10 border-chart-2/30 text-chart-2"
                          : "bg-card border-border hover:bg-muted text-muted-foreground hover:text-foreground"
                      )}
                      title="Kullanıcı adını kopyala"
                    >
                      {copiedSlug === 'username' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                  {generatedPassword && (
                    <div className="flex items-center justify-between">
                      <p><strong className="text-foreground">Şifre:</strong> <span className="font-medium text-chart-2 bg-chart-2/10 px-1.5 py-0.5 rounded">{generatedPassword}</span></p>
                      <button
                        onClick={() => copyToClipboard(generatedPassword, 'password')}
                        className={cn(
                          "h-7 px-2 rounded border font-medium text-xs flex items-center gap-1 transition-all",
                          copiedSlug === 'password'
                            ? "bg-chart-2/10 border-chart-2/30 text-chart-2"
                            : "bg-card border-border hover:bg-muted text-muted-foreground hover:text-foreground"
                        )}
                        title="Şifreyi kopyala"
                      >
                        {copiedSlug === 'password' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  )}
                  {customerCatalogs.length > 0 && (
                    <div className="pt-2 border-t border-border">
                      <p className="text-xs text-muted-foreground mb-2">Katalog Linkleri:</p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 text-xs bg-muted/50 px-2 py-1 rounded truncate">
                          /c/{customerCatalogs[0].slug}
                        </code>
                        <button
                          onClick={() => {
                            const url = `${window.location.origin}/c/${customerCatalogs[0].slug}?customer=${customer.username}`;
                            copyToClipboard(url, `catalog-${customerCatalogs[0].slug}`);
                          }}
                          className={cn(
                            "h-7 px-2 rounded border font-medium text-xs flex items-center gap-1 transition-all shrink-0",
                            copiedSlug === `catalog-${customerCatalogs[0].slug}`
                              ? "bg-chart-2/10 border-chart-2/30 text-chart-2"
                              : "bg-card border-border hover:bg-muted text-muted-foreground hover:text-foreground"
                          )}
                          title="Linki kopyala"
                        >
                          {copiedSlug === `catalog-${customerCatalogs[0].slug}` ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        </button>
                        <a
                          href={`/c/${customerCatalogs[0].slug}?customer=${customer.username}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="h-7 px-2 rounded border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground font-medium text-xs flex items-center gap-1 transition-all shrink-0"
                          title="Yeni sekmede aç"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
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
                  <Button size="sm" variant="ghost" className="bg-[#25D366] hover:bg-[#20bd5a] text-white hover:text-white touch-target" onClick={handleShareWhatsapp}>
                    <MessageCircle className="w-4 h-4 mr-2" />
                    WhatsApp ile İlet
                  </Button>
                )}
              </div>
            </div>
        </div>
      </div>

      {/* Katalog Linkleri */}
      {false && customerCatalogs.length > 0 && (
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-border bg-muted/30 flex items-center gap-2">
            <Link2 className="w-4 h-4 text-secondary" />
            <h3 className="font-bold text-foreground">Katalog Linkleri</h3>
          </div>
          <div className="p-4 space-y-2">
            {customerCatalogs.map((catalog: any) => {
              const catalogUrl = `${window.location.origin}/c/${catalog.slug}?customer=${customer.username}`;
              return (
                <div key={catalog.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border border-border">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground text-sm">{catalog.name}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <code className="text-xs text-muted-foreground bg-background px-2 py-1 rounded border truncate">
                        /c/{catalog.slug}
                      </code>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => copyToClipboard(catalogUrl, catalog.slug)}
                      className={cn(
                        "h-9 px-3 rounded-lg border font-medium text-xs flex items-center gap-1.5 transition-all",
                        copiedSlug === catalog.slug
                          ? "bg-chart-2/10 border-chart-2/30 text-chart-2"
                          : "bg-card border-border hover:bg-muted text-muted-foreground hover:text-foreground"
                      )}
                      title="Kopyala"
                    >
                      {copiedSlug === catalog.slug ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedSlug === catalog.slug ? "Kopyalandı" : "Kopyala"}
                    </button>
                    <a
                      href={catalogUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-9 px-3 rounded-lg border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground font-medium text-xs flex items-center gap-1.5 transition-all"
                      title="Yeni sekmede aç"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Aç
                    </a>
                  </div>
                </div>
              );
            })}
            <p className="text-xs text-muted-foreground mt-2">
              Müşteri bu linke tıkladığında şifre ile giriş yapması istenecek. Giriş bilgileri WhatsApp ile gönderilebilir.
            </p>
          </div>
        </div>
      )}

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <ShoppingCart className="w-4 h-4 text-secondary" />
          <h3 className="font-bold text-foreground">Geçmiş Siparişler</h3>
          <div className="flex items-center gap-2">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="h-9 min-w-[120px] rounded-lg border border-border bg-card px-3 text-sm"
            >
              <option value="ALL">Tüm Yıllar</option>
              {orderYears.map((year) => (
                <option key={year} value={String(year)}>{year}</option>
              ))}
            </select>
            <Button size="sm" variant="outline" onClick={handleExportOrdersPdf} className="h-9 gap-1.5">
              <Download className="w-3.5 h-3.5" />
              PDF Kaydet
            </Button>
          </div>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden divide-y divide-border">
          {filteredOrders.map((o: any) => (
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
          {filteredOrders.length === 0 && (
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
                {filteredOrders.map((o: any) => (
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
                {filteredOrders.length === 0 && (
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
