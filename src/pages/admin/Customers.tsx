import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuthStore } from "@/store/useAuthStore";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users as UsersIcon, Plus, Mail, Phone, Search, Wallet, UserRoundCog, Upload, AlertCircle, CheckCircle2, Loader2, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToastActions } from "@/components/ui/toast";
import * as XLSX from "xlsx";
import PlanUpgradeDialog from "@/components/PlanUpgradeDialog";

const formatPrice = (value: number) => {
  return value.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " TL";
};

const getRepresentativeLabel = (customer: any) => {
  if (customer?.assignedUser?.name) return customer.assignedUser.name;
  if (String(customer?.username || "").startsWith("katalog-")) return "Katalog";
  return null;
};

export default function Customers() {
  const { token, user } = useAuthStore();
  const toast = useToastActions();

  const limits = useMemo(() => {
    const PLAN_LIMITS: Record<string, { products: number; catalogs: number; customers: number }> = {
      Starter: { products: 250, catalogs: 10, customers: 100 },
      Premium: { products: 1000, catalogs: 100, customers: 10000 },
      Pro: { products: 2500, catalogs: 250, customers: 25000 },
      Enterprise: { products: 10000, catalogs: 1000, customers: 100000 },
    };
    const plan = user?.tenant?.planName || "Starter";
    return PLAN_LIMITS[plan] || PLAN_LIMITS["Starter"];
  }, [user?.tenant?.planName]);

  const [customers, setCustomers] = useState<any[]>([]);
  const [customerGroups, setCustomerGroups] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ACTIVE" | "PASSIVE" | "DELETED" | "ALL">("ACTIVE");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const customersPerPage = 50;

  useEffect(() => {
    setCurrentPage(1);
  }, [search, groupFilter, statusFilter]);

  // Excel Premium Import States
  let isExcelLicensed = false;
  if (user?.tenant?.modules) {
    try {
      const mods = JSON.parse(user.tenant.modules);
      isExcelLicensed = !!mods.excelIntegration;
    } catch (e) {}
  }
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
  const [excelRows, setExcelRows] = useState<any[]>([]);
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [totalExcelRows, setTotalExcelRows] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [mappingStep, setMappingStep] = useState<"upload" | "map" | "result">("upload");
  const [mapping, setMapping] = useState<Record<string, string>>({
    name: "", email: "", phone: "", address: "", taxOffice: "", taxNumber: "", username: "", password: ""
  });
  const [importResult, setImportResult] = useState<any>(null);
  const [usageCustomersCurrent, setUsageCustomersCurrent] = useState(0);

  const dbFieldLabels: Record<string, string> = {
    name: "Müşteri Adı / Ünvanı (* Zorunlu)",
    email: "E-posta Adresi",
    phone: "Telefon Numarası",
    address: "Açık Adres",
    taxOffice: "Vergi Dairesi",
    taxNumber: "Vergi Numarası / T.C.",
    username: "Kullanıcı Adı (Giriş için)",
    password: "Giriş Şifresi"
  };

  const autoMap = (dbKey: string, headers: string[]): string => {
    const mappings: Record<string, string[]> = {
      name: ["isim", "ad", "ünvan", "unvan", "müşteri adı", "musteri adi", "company", "firma adı", "firma adı / ünvanı", "name"],
      email: ["email", "e-posta", "eposta", "mail", "e-mail"],
      phone: ["phone", "telefon", "tel", "gsm", "telefon numarası", "tel no"],
      address: ["address", "adres", "açık adres", "acik adres", "sehir", "il", "ilce"],
      taxOffice: ["tax office", "vergi dairesi", "vd", "vergidairesi", "taxoffice"],
      taxNumber: ["tax number", "vergi numarası", "vn", "vergi no", "vergino", "tc", "t.c.", "tckn", "taxnumber"],
      username: ["username", "kullanıcı adı", "kullanici adi", "cari kod", "carikod", "kod"],
      password: ["password", "şifre", "sifre", "parola", "şifresi", "sifresi"]
    };
    const targets = mappings[dbKey] || [];
    for (const header of headers) {
      const normalized = header.toLowerCase().trim();
      if (targets.includes(normalized)) return header;
    }
    return "";
  };

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setExcelFile(file);
    setIsUploading(true);
    
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result as string;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { defval: "" });
        
        const headers = data.length > 0 ? Object.keys(data[0] as object) : [];
        setExcelHeaders(headers);
        setExcelRows(data);
        setPreviewRows(data.slice(0, 5));
        setTotalExcelRows(data.length);

        const newMapping: Record<string, string> = {};
        Object.keys(mapping).forEach((key) => {
          newMapping[key] = autoMap(key, headers);
        });
        setMapping(newMapping);
        setMappingStep("map");
      } catch (e) {
        toast.error("Excel dosyası okunamadı.");
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleStartImport = async () => {
    if (!mapping.name) {
      toast.warning("Müşteri Adı alanı eşleştirilmelidir!");
      return;
    }
    setIsImporting(true);
    try {
      const res = await fetch("/api/excel/import-customers", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ rows: excelRows, mapping })
      });
      if (res.ok) {
        const data = await res.json();
        setImportResult(data);
        setMappingStep("result");
        toast.success("Müşteriler içe aktarıldı!");
        fetchCustomers();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "İthalat başarısız oldu.");
      }
    } catch (e) {
      toast.error("Bir hata oluştu.");
    } finally {
      setIsImporting(false);
    }
  };

  const resetExcelImport = () => {
    setExcelFile(null);
    setExcelHeaders([]);
    setExcelRows([]);
    setPreviewRows([]);
    setTotalExcelRows(0);
    setMappingStep("upload");
    setImportResult(null);
    setMapping({
      name: "", email: "", phone: "", address: "", taxOffice: "", taxNumber: "", username: "", password: ""
    });
  };

  const fetchCustomers = async () => {
    const res = await fetch(`/api/customers?status=${statusFilter}`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setCustomers(await res.json());
    const resUsage = await fetch("/api/usage-limits", { headers: { Authorization: `Bearer ${token}` } });
    if (resUsage.ok) {
      const usage = await resUsage.json();
      setUsageCustomersCurrent(Number(usage?.customers?.current || 0));
    }
  };

  const fetchCustomerGroups = async () => {
    const res = await fetch("/api/customer-groups", { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setCustomerGroups(await res.json());
  };

  useEffect(() => {
    fetchCustomers();
    fetchCustomerGroups();
  }, [token, statusFilter]);

  const handleSetStatus = async (customerId: string, status: "ACTIVE" | "PASSIVE") => {
    const res = await fetch(`/api/customers/${customerId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status })
    });
    if (res.ok) {
      toast.success(status === "ACTIVE" ? "Müşteri aktifleştirildi." : "Müşteri pasife alındı.");
      fetchCustomers();
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error || "İşlem başarısız.");
    }
  };

  const handleDeleteCustomer = async (customerId: string, name: string) => {
    if (!window.confirm(`"${name}" müşterisini silmek istediğinize emin misiniz?`)) return;
    const res = await fetch(`/api/customers/${customerId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      toast.success(data?.mode === "passived" ? "Hareket bulunduğu için pasife alındı." : "Müşteri silindi.");
      fetchCustomers();
    } else {
      toast.error(data?.error || "Silme işlemi başarısız.");
    }
  };

  const filteredCustomers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return customers.filter((c: any) => {
      const groupIds = (c.groupMemberships || []).map((membership: any) => membership.groupId || membership.group?.id);
      const matchesGroup =
        !groupFilter ||
        (groupFilter === "__none__" ? groupIds.length === 0 : groupIds.includes(groupFilter));
      if (!matchesGroup) return false;
      if (!q) return true;
      return [c.name, c.email, c.phone, c.username, c.assignedUser?.name, ...(c.groupMemberships || []).map((membership: any) => membership.group?.name)]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [customers, search, groupFilter]);

  const totalPages = Math.ceil(filteredCustomers.length / customersPerPage);
  const paginatedCustomers = filteredCustomers.slice((currentPage - 1) * customersPerPage, currentPage * customersPerPage);

  const isLimitReached = usageCustomersCurrent >= limits.customers;

  if (user?.role === "SUPER_ADMIN") {
    return <div className="p-4 text-center text-muted-foreground">Super Admin yönetemez.</div>;
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {isLimitReached && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 text-amber-900 shadow-sm leading-relaxed text-sm">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <strong className="font-bold block mb-0.5">Sistem Müşteri Limitine Ulaştınız!</strong>
            Mevcut planınız kapsamındaki müşteri limitini doldurdunuz veya aştınız (<span className="font-semibold">{usageCustomersCurrent} / {limits.customers}</span>). Yeni müşteri ekleme ve Excel içe aktarma ile yeni müşteri oluşturma işlemleri planınızı yükseltene kadar sınırlandırılacaktır. Mevcut müşterilerinizi yönetmeye devam edebilirsiniz.
          </div>
        </div>
      )}

      <div className="sticky top-0 z-20 bg-background py-2 flex flex-wrap items-center gap-2.5">
        <div className="relative flex-1 md:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Müşteri ara..."
            className="pl-9"
          />
        </div>
        <div className="relative w-full sm:w-56">
          <UserRoundCog className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <select
            className="flex h-11 w-full rounded-lg border border-border bg-card pl-9 pr-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
          >
            <option value="">Tüm Gruplar</option>
            <option value="__none__">Grupsuz Müşteriler</option>
            {customerGroups.map((group: any) => (
              <option key={group.id} value={group.id}>{group.name}</option>
            ))}
          </select>
        </div>
        <select
          className="flex h-11 w-full sm:w-36 rounded-lg border border-border bg-card px-3 py-1 text-sm shadow-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
        >
          <option value="ACTIVE">Aktif</option>
          <option value="PASSIVE">Pasif</option>
          <option value="DELETED">Silinen</option>
          <option value="ALL">Tümü</option>
        </select>
        {isLimitReached ? (
          <PlanUpgradeDialog triggerLabel="Plan Yükselt" />
        ) : (
          <>
            {isExcelLicensed && (
              <Button variant="outline" onClick={() => setIsImportModalOpen(true)} className="h-11 px-4 font-semibold gap-1.5 border-border text-foreground hover:bg-muted/40 cursor-pointer touch-target">
                <Upload className="w-4 h-4 text-muted-foreground" /> Excel ile Yükle
              </Button>
            )}
            <Link to="/admin/customers/new">
              <Button className="brand-gradient border-0 shadow-md shadow-secondary/20 hover:opacity-90 transition-opacity h-11 px-3 font-semibold gap-1.5 whitespace-nowrap">
                <Plus className="w-4 h-4" /> Ekle
              </Button>
            </Link>
          </>
        )}
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-2.5">
        {paginatedCustomers.map((c: any) => (
          <Link
            key={c.id}
            to={`/admin/customers/${c.id}`}
            className="block bg-card rounded-lg border border-border/80 p-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)] active:scale-[0.995] transition-transform"
          >
            <div className="flex items-start justify-between gap-2 mb-2.5">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-md bg-secondary/10 border border-secondary/20 flex items-center justify-center text-secondary font-semibold text-[11px] shrink-0">
                  {c.name?.slice(0, 2)?.toUpperCase() || "MÜ"}
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-[13px] text-foreground truncate">{c.name}</div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {getRepresentativeLabel(c) ? `Temsilci: ${getRepresentativeLabel(c)}` : "Temsilci atanmadı"}
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    Grup: {c.groupMemberships?.[0]?.group?.name || "Grup yok"}
                  </div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-[10px] text-muted-foreground">Bakiye</div>
                <div className="text-[12px] font-semibold text-secondary">{formatPrice(Number(c.balance) || 0)}</div>
              </div>
            </div>
            <div className="space-y-1.5 text-[11px] text-muted-foreground">
              <div className="flex items-center gap-1.5 truncate">
                <Mail className="w-3 h-3 shrink-0" />
                <span className="truncate">{c.email || "-"}</span>
              </div>
              <div className="flex items-center gap-1.5 truncate">
                <Phone className="w-3 h-3 shrink-0" />
                <span className="truncate">{c.phone || "-"}</span>
              </div>
              <div className="flex items-center gap-1.5 truncate">
                <Wallet className="w-3 h-3 shrink-0" />
                <span className="truncate">Cari bakiye: {formatPrice(Number(c.balance) || 0)}</span>
              </div>
            </div>
          </Link>
        ))}
        {filteredCustomers.length === 0 && (
          <div className="text-center py-16">
            <UsersIcon className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">Kayıtlı müşteri bulunamadı.</p>
          </div>
        )}
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block border rounded-xl bg-card overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead>Ad</TableHead>
              <TableHead>E-posta</TableHead>
              <TableHead>Telefon</TableHead>
              <TableHead>Grup</TableHead>
              <TableHead>Temsilci</TableHead>
              <TableHead>Kullanıcı Adı</TableHead>
              <TableHead>Bakiye</TableHead>
              <TableHead className="text-right">Detay</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedCustomers.map((c: any) => (
              <TableRow key={c.id} className="hover:bg-muted/20">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full brand-gradient flex items-center justify-center text-white font-bold text-[10px] shrink-0">
                      {c.name?.slice(0, 2)?.toUpperCase() || "MÜ"}
                    </div>
                    <span className="font-medium">{c.name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">{c.email || "-"}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{c.phone || "-"}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{c.groupMemberships?.[0]?.group?.name || "-"}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{getRepresentativeLabel(c) || "-"}</TableCell>
                <TableCell className="text-muted-foreground text-sm font-mono">{c.username || "-"}</TableCell>
                <TableCell className="text-muted-foreground text-sm font-medium">{formatPrice(Number(c.balance) || 0)}</TableCell>
                <TableCell className="text-right whitespace-nowrap">
                  <div className="inline-flex gap-1">
                    {c.status !== "DELETED" && (
                      <button
                        type="button"
                        className="inline-flex items-center justify-center h-9 px-2 rounded-lg text-xs border border-border hover:bg-muted transition-colors"
                        onClick={() => handleSetStatus(c.id, c.status === "PASSIVE" ? "ACTIVE" : "PASSIVE")}
                      >
                        {c.status === "PASSIVE" ? "Aktif Et" : "Pasif Et"}
                      </button>
                    )}
                    {c.status !== "DELETED" && (
                      <button
                        type="button"
                        className="inline-flex items-center justify-center h-9 px-2 rounded-lg text-xs border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors"
                        onClick={() => handleDeleteCustomer(c.id, c.name)}
                      >
                        Sil
                      </button>
                    )}
                    <Link to={`/admin/customers/${c.id}`} className="inline-flex items-center justify-center h-9 px-3 rounded-lg text-sm border border-secondary/30 text-secondary hover:bg-secondary/10 transition-colors touch-target">
                      Detay
                    </Link>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filteredCustomers.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground h-24">Bulunamadı</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border border-border bg-card p-4 rounded-xl shadow-sm mt-4 animate-fade-in select-none">
          <div className="text-xs text-muted-foreground">
            Toplam <strong className="text-foreground">{filteredCustomers.length}</strong> müşteriden <strong className="text-foreground">{((currentPage - 1) * customersPerPage) + 1} - {Math.min(currentPage * customersPerPage, filteredCustomers.length)}</strong> arası gösteriliyor.
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(1)}
              className="h-8 px-2 text-xs font-semibold"
            >
              İlk
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              className="h-8 px-3 text-xs font-semibold"
            >
              Geri
            </Button>
            <span className="text-xs text-foreground px-3.5 font-bold font-mono border border-border h-8 flex items-center bg-muted/20 rounded-lg">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              className="h-8 px-3 text-xs font-semibold"
            >
              İleri
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(totalPages)}
              className="h-8 px-2 text-xs font-semibold"
            >
              Son
            </Button>
          </div>
        </div>
      )}

      {/* Excel Müşteri İçe Aktarma Modali */}
      <Dialog open={isImportModalOpen} onOpenChange={(open) => { setIsImportModalOpen(open); if(!open) resetExcelImport(); }}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-indigo-500" /> Excel ile Müşteri Yükleme
            </DialogTitle>
          </DialogHeader>

          {mappingStep === "upload" && (
            <div className="py-8 space-y-6">
              <div className="border-2 border-dashed border-border rounded-xl p-8 text-center bg-muted/10 hover:bg-muted/20 transition-all relative">
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleExcelUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <Upload className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="font-bold text-foreground mb-1">Excel veya CSV Dosyası Yükleyin</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                  Müşteri listenizi içeren dosyayı sürükleyip bırakabilir veya buraya tıklayarak seçebilirsiniz.
                </p>
              </div>
              {isUploading && (
                <div className="flex items-center justify-center gap-3 text-sm text-indigo-500">
                  <Loader2 className="w-5 h-5 animate-spin" /> Dosya inceleniyor...
                </div>
              )}
            </div>
          )}

          {mappingStep === "map" && (
            <div className="space-y-6 pt-2 animate-fade-in">
              <div className="bg-muted/20 border border-border p-4 rounded-xl flex items-center justify-between">
                <div className="text-xs">
                  <span className="text-muted-foreground">Yüklenen Liste:</span> <strong className="text-foreground">{excelFile?.name}</strong>
                  <span className="text-muted-foreground ml-3 block sm:inline">Toplam Cari:</span> <strong className="text-foreground">{totalExcelRows} satır</strong>
                </div>
                <Button variant="ghost" size="sm" onClick={resetExcelImport} className="text-xs h-8 text-destructive">Yeni Dosya Seç</Button>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Sütunları Eşleştirin</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Excel dosyanızdaki başlıkları (sağda) veritabanındaki müşteri veri alanları (solda) ile eşleştirin.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border border-border rounded-xl p-4 bg-muted/10 max-h-[300px] overflow-y-auto">
                  {Object.keys(dbFieldLabels).map((dbKey) => (
                    <div key={dbKey} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/50 pb-2.5 last:border-0 last:pb-0">
                      <span className="text-xs font-bold text-foreground min-w-[150px]">{dbFieldLabels[dbKey]}</span>
                      <select
                        className="flex h-9 w-full sm:w-[220px] rounded-lg border border-border bg-card px-2.5 py-1 text-xs shadow-sm focus:outline-none"
                        value={mapping[dbKey]}
                        onChange={(e) => setMapping({ ...mapping, [dbKey]: e.target.value })}
                      >
                        <option value="">-- Eşleştirme Yok --</option>
                        {excelHeaders.map((h) => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              {previewRows.length > 0 && (
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Veri Önizleme Panel</h4>
                  <div className="border border-border rounded-xl overflow-hidden max-h-[160px] overflow-auto">
                    <Table>
                      <TableHeader className="bg-muted/30 sticky top-0">
                        <TableRow>
                          {Object.entries(mapping).map(([dbKey, excelHeader]) => {
                            const headerKey = excelHeader as string;
                            if (!headerKey) return null;
                            return <TableHead key={dbKey} className="text-[10px] py-2 h-8 font-bold">{dbFieldLabels[dbKey]}</TableHead>;
                          })}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {previewRows.map((row, rIdx) => (
                          <TableRow key={rIdx} className="hover:bg-muted/10">
                            {Object.entries(mapping).map(([dbKey, excelHeader]) => {
                              const headerKey = excelHeader as string;
                              if (!headerKey) return null;
                              return <TableCell key={dbKey} className="text-[10px] py-1.5 h-8 text-muted-foreground truncate max-w-[150px]">{String(row[headerKey] || "")}</TableCell>;
                            })}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 border-t border-border pt-4 mt-2">
                <Button variant="outline" size="sm" onClick={() => setIsImportModalOpen(false)}>İptal</Button>
                <Button
                  onClick={handleStartImport}
                  disabled={isImporting || !mapping.name}
                  className="brand-gradient border-0 shadow-md h-9 px-6 text-xs font-semibold gap-1.5"
                >
                  {isImporting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  İçe Aktarmayı Başlat ({totalExcelRows} Müşteri)
                </Button>
              </div>
            </div>
          )}

          {mappingStep === "result" && importResult && (
            <div className="py-6 space-y-6 text-center animate-fade-in">
              <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto text-emerald-500">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="font-bold text-foreground text-lg">Müşteriler Başarıyla İçe Aktarıldı!</h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto leading-relaxed">
                  Excel listesindeki tüm kayıtlar analiz edildi, veritabanınızla senkronize edildi.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto border border-border p-4 rounded-xl bg-muted/10">
                <div>
                  <span className="text-[10px] text-muted-foreground block uppercase font-bold tracking-wider">Yeni Kayıt</span>
                  <span className="font-bold text-lg text-emerald-500 mt-0.5">{importResult.createdCount}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block uppercase font-bold tracking-wider">Güncellenen</span>
                  <span className="font-bold text-lg text-indigo-500 mt-0.5">{importResult.updatedCount}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block uppercase font-bold tracking-wider">Başarısız</span>
                  <span className="font-bold text-lg text-destructive mt-0.5">{importResult.failedCount}</span>
                </div>
              </div>

              {importResult.errors && importResult.errors.length > 0 && (
                <div className="max-w-md mx-auto space-y-1.5 text-left border border-border rounded-xl p-3 bg-muted/30">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5 text-amber-500" /> Aktarım Uyarısı & Hata Kayıtları</span>
                  <div className="max-h-24 overflow-y-auto text-[10px] text-muted-foreground space-y-1 font-mono leading-relaxed">
                    {importResult.errors.map((err: string, eIdx: number) => (
                      <div key={eIdx} className="border-b border-border/30 pb-1 last:border-0 last:pb-0">{err}</div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-center border-t border-border pt-4 mt-2">
                <Button onClick={() => setIsImportModalOpen(false)} className="h-9 px-6 text-xs font-semibold">Kapat</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
