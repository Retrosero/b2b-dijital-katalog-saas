import React, { useEffect, useMemo, useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Wallet, Search, Plus, Trash2, Building, CreditCard, ArrowRightLeft, FileText, CalendarDays, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { printCollectionReceipt } from "@/lib/printUtils";
import { useToastActions } from "@/components/ui/toast";

const formatPrice = (price: number) => {
  return price.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " TL";
};

const paymentTypeMap: Record<string, { label: string; className: string }> = {
  CASH: { label: "Nakit", className: "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" },
  CREDIT_CARD: { label: "Kredi Kartı", className: "bg-blue-500/10 text-blue-500 border border-blue-500/20" },
  TRANSFER: { label: "Havale / EFT", className: "bg-purple-500/10 text-purple-500 border border-purple-500/20" },
};

export default function Collections() {
  const { token, user } = useAuthStore();
  const toast = useToastActions();
  const [collections, setCollections] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  
  // Filters & State
  const [searchQuery, setSearchQuery] = useState("");
  const [paymentTypeFilter, setPaymentTypeFilter] = useState("ALL");
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New Collection Form Fields
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentType, setPaymentType] = useState("CASH");
  const [bankName, setBankName] = useState("");
  const [notes, setNotes] = useState("");

  const tenantBanks = useMemo<string[]>(() => {
    if (!user?.tenant?.banks) return [];
    try {
      return JSON.parse(user.tenant.banks);
    } catch (e) {
      return [];
    }
  }, [user]);

  const fetchCollections = async () => {
    try {
      const res = await fetch("/api/collections?limit=100", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCollections(data.items || []);
      }
    } catch (e) {
      console.error("Error fetching collections:", e);
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await fetch("/api/customers", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setCustomers(await res.json());
      }
    } catch (e) {
      console.error("Error fetching customers:", e);
    }
  };

  useEffect(() => {
    if (token) {
      fetchCollections();
      fetchCustomers();
    }
  }, [token]);

  const handleAddCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId) return toast.warning("Lütfen müşteri seçiniz.");
    
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return toast.warning("Lütfen geçerli bir tahsilat tutarı giriniz.");
    }

    if ((paymentType === "CREDIT_CARD" || paymentType === "TRANSFER") && tenantBanks.length > 0 && !bankName) {
      return toast.warning("Lütfen banka seçimi yapınız.");
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/collections", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          customerId: selectedCustomerId,
          amount: parsedAmount,
          paymentType,
          bankName: (paymentType === "CREDIT_CARD" || paymentType === "TRANSFER") ? bankName : null,
          notes
        })
      });

      if (res.ok) {
        toast.success("Tahsilat kaydı başarıyla eklendi.");
        setIsModalOpen(false);
        // Reset form
        setSelectedCustomerId("");
        setAmount("");
        setPaymentType("CASH");
        setBankName("");
        setNotes("");
        // Reload collections
        fetchCollections();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Tahsilat kaydedilirken hata oluştu.");
      }
    } catch (err: any) {
      toast.error("Bir hata oluştu: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCollection = async (id: string, receiptNumber: string) => {
    if (!window.confirm(`${receiptNumber} nolu tahsilat makbuzunu silmek istediğinize emin misiniz?`)) return;

    try {
      const res = await fetch(`/api/collections/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        toast.success("Tahsilat kaydı silindi.");
        fetchCollections();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Tahsilat silinirken hata oluştu.");
      }
    } catch (err: any) {
      toast.error("Bir hata oluştu: " + err.message);
    }
  };

  // Stats Card Calculations
  const stats = useMemo(() => {
    let total = 0;
    let cash = 0;
    let cc = 0;
    let transfer = 0;

    collections.forEach((col) => {
      const amt = Number(col.amount) || 0;
      total += amt;
      if (col.paymentType === "CASH") cash += amt;
      else if (col.paymentType === "CREDIT_CARD") cc += amt;
      else if (col.paymentType === "TRANSFER") transfer += amt;
    });

    return { total, cash, cc, transfer };
  }, [collections]);

  // Filtered Collections
  const filteredCollections = useMemo(() => {
    return collections
      .filter((col) => (paymentTypeFilter === "ALL" ? true : col.paymentType === paymentTypeFilter))
      .filter((col) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        const customerName = (col.customer?.name || "").toLowerCase();
        const receipt = (col.receiptNumber || "").toLowerCase();
        const noteText = (col.notes || "").toLowerCase();
        const bankText = (col.bankName || "").toLowerCase();
        return customerName.includes(q) || receipt.includes(q) || noteText.includes(q) || bankText.includes(q);
      });
  }, [collections, searchQuery, paymentTypeFilter]);

  if (user?.role === "SUPER_ADMIN") {
    return <div className="p-4 text-center text-muted-foreground">Süper yöneticiler tahsilatları göremez.</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Wallet className="w-6 h-6 text-primary" />
            Tahsilat İşlemleri
          </h2>
          <p className="text-sm text-muted-foreground">Müşterilerden gelen ödemeleri, makbuzları ve kasa/banka hareketlerini yönetin.</p>
        </div>
        <Button
          onClick={() => setIsModalOpen(true)}
          className="brand-gradient border-0 shadow-md shadow-secondary/10 hover:opacity-95 h-11 px-5 font-semibold text-sm gap-2"
        >
          <Plus className="w-4 h-4" />
          Yeni Tahsilat Ekle
        </Button>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl border border-border shadow-sm p-4 relative overflow-hidden flex flex-col justify-between min-h-[92px]">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block">Toplam Tahsilat</span>
          <span className="text-2xl font-black text-foreground mt-1.5 block">{formatPrice(stats.total)}</span>
        </div>
        <div className="bg-card rounded-xl border border-border shadow-sm p-4 relative overflow-hidden flex flex-col justify-between min-h-[92px]">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block">Nakit Kasa</span>
          <span className="text-2xl font-black text-emerald-500 mt-1.5 block">{formatPrice(stats.cash)}</span>
        </div>
        <div className="bg-card rounded-xl border border-border shadow-sm p-4 relative overflow-hidden flex flex-col justify-between min-h-[92px]">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block">Kredi Kartı POS</span>
          <span className="text-2xl font-black text-blue-500 mt-1.5 block">{formatPrice(stats.cc)}</span>
        </div>
        <div className="bg-card rounded-xl border border-border shadow-sm p-4 relative overflow-hidden flex flex-col justify-between min-h-[92px]">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block">Havale / EFT Banka</span>
          <span className="text-2xl font-black text-purple-500 mt-1.5 block">{formatPrice(stats.transfer)}</span>
        </div>
      </div>

      {/* Filter and Search Panel */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Müşteri adı, makbuz no veya banka ara..."
            className="w-full h-10 pl-9 pr-4 rounded-lg border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/60"
          />
        </div>
        <select
          value={paymentTypeFilter}
          onChange={(e) => setPaymentTypeFilter(e.target.value)}
          className="h-10 px-3 rounded-lg border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="ALL">Tüm Ödeme Tipleri</option>
          <option value="CASH">Nakit</option>
          <option value="CREDIT_CARD">Kredi Kartı</option>
          <option value="TRANSFER">Havale / EFT</option>
        </select>
      </div>

      {/* Collections Table */}
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        {filteredCollections.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-sm">Hiç tahsilat kaydı bulunamadı.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-bold">Makbuz No</TableHead>
                  <TableHead className="font-bold">Müşteri</TableHead>
                  <TableHead className="font-bold">Tarih</TableHead>
                  <TableHead className="font-bold">Ödeme Yöntemi</TableHead>
                  <TableHead className="font-bold">Banka</TableHead>
                  <TableHead className="font-bold text-right">Tutar</TableHead>
                  <TableHead className="font-bold">Açıklama</TableHead>
                  <TableHead className="w-20 text-right">İşlem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCollections.map((col) => {
                  const method = paymentTypeMap[col.paymentType] || { label: col.paymentType, className: "bg-muted text-muted-foreground border-border" };
                  return (
                    <TableRow key={col.id} className="hover:bg-muted/10">
                      <TableCell className="font-bold text-foreground text-xs uppercase tracking-wide">
                        {col.receiptNumber}
                      </TableCell>
                      <TableCell className="font-medium text-foreground">
                        {col.customer?.name || "Bilinmeyen Müşteri"}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        <span className="flex items-center gap-1.5">
                          <CalendarDays className="w-3.5 h-3.5" />
                          {new Date(col.createdAt).toLocaleDateString("tr-TR", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${method.className}`}>
                          {method.label}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm font-semibold text-foreground">
                        {col.bankName ? (
                          <span className="flex items-center gap-1">
                            <Building className="w-3.5 h-3.5 text-muted-foreground" />
                            {col.bankName}
                          </span>
                        ) : "-"}
                      </TableCell>
                      <TableCell className="text-right font-black text-emerald-500 text-sm">
                        {formatPrice(col.amount)}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs max-w-xs truncate" title={col.notes || ""}>
                        {col.notes || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => printCollectionReceipt(col, col.customer, user?.tenant)}
                            className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors inline-flex items-center justify-center"
                            title="Yazdır"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          {user?.role === "TENANT_ADMIN" && (
                            <button
                              type="button"
                              onClick={() => handleDeleteCollection(col.id, col.receiptNumber)}
                              className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors inline-flex items-center justify-center"
                              title="Sil"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* New Collection Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-primary" />
              Yeni Tahsilat Ekle
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddCollection} className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                Müşteri Seçin
              </label>
              <select
                required
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full h-10 rounded-lg border border-border bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">-- Müşteri Seçiniz --</option>
                {customers.map((cust) => (
                  <option key={cust.id} value={cust.id}>
                    {cust.name} {cust.balance !== undefined ? `(Bakiye: ${formatPrice(cust.balance)})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                Ödeme Yöntemi
              </label>
              <select
                value={paymentType}
                onChange={(e) => {
                  setPaymentType(e.target.value);
                  setBankName("");
                }}
                className="w-full h-10 rounded-lg border border-border bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="CASH">Nakit</option>
                <option value="CREDIT_CARD">Kredi Kartı</option>
                <option value="TRANSFER">Havale / EFT</option>
              </select>
            </div>

            {/* Bank Select Prompt when Credit Card or Transfer is selected */}
            {(paymentType === "CREDIT_CARD" || paymentType === "TRANSFER") && (
              <div className="animate-fade-in space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5" /> Banka Seçin
                </label>
                {tenantBanks.length > 0 ? (
                  <select
                    required
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full h-10 rounded-lg border border-border bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">-- Banka Seçiniz --</option>
                    {tenantBanks.map((bank) => (
                      <option key={bank} value={bank}>{bank}</option>
                    ))}
                  </select>
                ) : (
                  <div className="text-xs text-amber-500 py-2 border border-dashed border-amber-500/30 rounded px-3 bg-amber-500/5">
                    Lütfen önce Ayarlar sayfasından banka hesaplarınızı tanımlayın.
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                Tutar
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  required
                  min="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full h-10 pl-3 pr-10 rounded-lg border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <div className="absolute right-3 top-2 text-sm text-muted-foreground font-bold">
                  TL
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                Açıklama / Notlar
              </label>
              <textarea
                placeholder="Ödeme açıklaması, makbuz referansı vb..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full min-h-[70px] p-3 rounded-lg border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              />
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                disabled={isLoading}
                className="h-10"
              >
                İptal
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="h-10 brand-gradient border-0 px-6 font-semibold"
              >
                Kaydet
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
