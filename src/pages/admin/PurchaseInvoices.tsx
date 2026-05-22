import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/useAuthStore";
import { usePageHeaderStore } from "@/store/usePageHeaderStore";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { FileText, Search, Plus, Trash2, CalendarDays, Eye } from "lucide-react";

const formatPrice = (price: number) => {
  return price.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " TL";
};

const formatDate = (dateString: string) => {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
};

export default function PurchaseInvoices() {
  const navigate = useNavigate();
  const { token } = useAuthStore();
  const { setHeader, resetHeader } = usePageHeaderStore();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/purchase-invoices", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setInvoices(data || []);
      }
    } catch (e) {
      console.error("Error fetching purchase invoices:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchInvoices();
    }
  }, [token]);

  useEffect(() => {
    setHeader({
      title: "Alış Faturaları",
      subtitle: "Yeni stok girişleri yapın ve maliyetlerinizi takip edin",
      actions: [
        {
          key: "new-purchase-invoice",
          label: "Fatura Gir (Stok Ekle)",
          onClick: () => navigate("/admin/purchase-invoices/new"),
          icon: <Plus className="w-5 h-5" />,
          variant: "secondary"
        }
      ]
    });
    return resetHeader;
  }, [setHeader, resetHeader, navigate]);

  const handleDelete = async (id: string, invoiceNumber: string) => {
    if (!window.confirm(`${invoiceNumber} numaralı alış faturasını silmek istediğinize emin misiniz? Bu işlem, faturadaki miktarları stoktan geri düşecektir!`)) {
      return;
    }

    try {
      const res = await fetch(`/api/purchase-invoices/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        alert("Alış faturası başarıyla silindi ve stoklar güncellendi.");
        fetchInvoices();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Fatura silinirken hata oluştu.");
      }
    } catch (error: any) {
      alert("Hata: " + error.message);
    }
  };

  const filteredInvoices = useMemo(() => {
    if (!searchQuery.trim()) return invoices;
    const q = searchQuery.toLowerCase().trim();
    return invoices.filter((inv) => 
      inv.invoiceNumber.toLowerCase().includes(q) ||
      inv.supplierName.toLowerCase().includes(q) ||
      (inv.notes && inv.notes.toLowerCase().includes(q))
    );
  }, [invoices, searchQuery]);

  return (
    <div className="space-y-4 md:space-y-6 w-full animate-fade-in">
      {/* Search & Actions Bar */}
      <div className="bg-card p-4 rounded-xl border border-border shadow-sm flex flex-col md:flex-row gap-3 justify-between items-center">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground" />
          <input
            type="text"
            className="flex h-10 w-full rounded-lg border border-border bg-card pl-10 pr-4 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring touch-target"
            placeholder="Fatura no veya tedarikçi ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5 bg-muted/30 px-3 py-1.5 rounded-lg border border-border">
          <FileText className="w-4 h-4 text-secondary" />
          Toplam {filteredInvoices.length} alış faturası listeleniyor.
        </div>
      </div>

      {/* Listing Content */}
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-muted-foreground">Yükleniyor...</div>
        ) : filteredInvoices.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center">
            <FileText className="w-12 h-12 text-muted-foreground/30 mb-3" />
            <p className="font-medium">Kayıtlı alış faturası bulunamadı.</p>
            <p className="text-xs mt-1 text-muted-foreground/75">Stok girişi yapmak için yeni bir alış faturası kaydedin.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/10 border-b border-border">
                  <TableHead className="font-semibold text-foreground py-3.5">Fatura No</TableHead>
                  <TableHead className="font-semibold text-foreground">Tedarikçi / Toptancı</TableHead>
                  <TableHead className="font-semibold text-foreground">Tarih</TableHead>
                  <TableHead className="font-semibold text-foreground">Açıklama / Not</TableHead>
                  <TableHead className="font-semibold text-foreground text-right">Toplam Tutar</TableHead>
                  <TableHead className="font-semibold text-foreground text-right w-[140px]">İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.map((inv) => (
                  <TableRow key={inv.id} className="border-b border-border/60 hover:bg-muted/5 transition-colors">
                    <TableCell className="font-semibold text-foreground py-4">
                      <span className="bg-blue-500/10 text-blue-500 border border-blue-500/20 text-xs px-2.5 py-1 rounded-full font-bold">
                        {inv.invoiceNumber}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium text-foreground">{inv.supplierName}</TableCell>
                    <TableCell className="text-muted-foreground text-xs font-medium">
                      <div className="flex items-center gap-1.5">
                        <CalendarDays className="w-3.5 h-3.5 text-muted-foreground/70" />
                        {formatDate(inv.createdAt)}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs max-w-[200px] truncate">
                      {inv.notes || "-"}
                    </TableCell>
                    <TableCell className="text-right font-bold text-foreground text-sm">
                      {formatPrice(inv.totalAmount)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Detayları Gör"
                          onClick={() => navigate(`/admin/purchase-invoices/${inv.id}`)}
                          className="size-8.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent cursor-pointer"
                        >
                          <Eye className="w-4.5 h-4.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Faturayı Sil"
                          onClick={() => handleDelete(inv.id, inv.invoiceNumber)}
                          className="size-8.5 rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                        >
                          <Trash2 className="w-4.5 h-4.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
