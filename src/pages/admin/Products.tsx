import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { ArrowUpDown, Package, Search, Settings2, Plus, ChevronRight, SlidersHorizontal, X, Upload, AlertCircle, CheckCircle2, Loader2, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToastActions } from "@/components/ui/toast";
import * as XLSX from "xlsx";
import PlanUpgradeDialog from "@/components/PlanUpgradeDialog";

export default function Products() {
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
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [priceLists, setPriceLists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [sortBy, setSortBy] = useState("name-asc");
  const [statusFilter, setStatusFilter] = useState<"ACTIVE" | "PASSIVE" | "ALL">("ACTIVE");
  const [activePanel, setActivePanel] = useState<"filter" | "sort" | null>(null);
  const [isColumnMenuOpen, setIsColumnMenuOpen] = useState(false);

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
  const [onlyUpdateChanged, setOnlyUpdateChanged] = useState(true);
  const [mapping, setMapping] = useState<Record<string, string>>({
    name: "", sku: "", barcode: "", price: "", costPrice: "", stock: "", category: "", brand: "", description: "", piecesPerBox: "", packagingType: "",
    imageUrl: "", imageUrl2: "", imageUrl3: "", imageUrl4: "", imageUrl5: "", imageUrl6: "", imageUrl7: "", imageUrl8: "", imageUrl9: "", imageUrl10: ""
  });
  const [checkedFields, setCheckedFields] = useState<Record<string, boolean>>({
    name: true, sku: true, barcode: true, price: true, costPrice: true, stock: true, category: true, brand: true, description: true, piecesPerBox: true, packagingType: true,
    imageUrl: true, imageUrl2: true, imageUrl3: true, imageUrl4: true, imageUrl5: true, imageUrl6: true, imageUrl7: true, imageUrl8: true, imageUrl9: true, imageUrl10: true
  });
  const [categorySeparator, setCategorySeparator] = useState(">");
  const [importResult, setImportResult] = useState<any>(null);
  const [usageProductsCurrent, setUsageProductsCurrent] = useState(0);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const productsPerPage = 50;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, categoryFilter, sortBy, statusFilter]);

  const dbFieldLabels = useMemo(() => {
    const labels: Record<string, string> = {
      name: "Ürün Adı (* Zorunlu)",
      sku: "Stok Kodu (SKU)",
      barcode: "Barkod",
      price: "Satış Fiyatı",
      costPrice: "Alış Fiyatı",
      stock: "Stok Miktarı",
      category: "Kategori",
      brand: "Marka",
      description: "Açıklama",
      piecesPerBox: "Koli İçi Adedi",
      packagingType: "Ambalaj Tipi",
      imageUrl: "Ürün Görsel URL'si 1",
      imageUrl2: "Ürün Görsel URL'si 2",
      imageUrl3: "Ürün Görsel URL'si 3",
      imageUrl4: "Ürün Görsel URL'si 4",
      imageUrl5: "Ürün Görsel URL'si 5",
      imageUrl6: "Ürün Görsel URL'si 6",
      imageUrl7: "Ürün Görsel URL'si 7",
      imageUrl8: "Ürün Görsel URL'si 8",
      imageUrl9: "Ürün Görsel URL'si 9",
      imageUrl10: "Ürün Görsel URL'si 10"
    };
    priceLists.forEach((pl) => {
      labels[`priceList_${pl.id}`] = `${pl.name} Fiyatı`;
    });
    return labels;
  }, [priceLists]);

  const autoMap = (dbKey: string, headers: string[]): string => {
    if (dbKey.startsWith("priceList_")) {
      const plId = dbKey.replace("priceList_", "");
      const pl = priceLists.find(p => p.id === plId);
      if (pl) {
        const targets = [
          pl.name.toLowerCase(),
          `${pl.name.toLowerCase()} fiyatı`,
          `${pl.name.toLowerCase()} fiyati`,
          pl.name.toLowerCase().replace(" fiyatı", "").replace(" fiyati", ""),
          pl.name.toLowerCase().replace(" fiyat listesi", "").replace(" listesi", "")
        ];
        for (const header of headers) {
          const normalized = header.toLowerCase().trim();
          if (targets.includes(normalized)) return header;
        }
      }
      return "";
    }

    const mappings: Record<string, string[]> = {
      name: ["isim", "ad", "ürün adı", "urun adi", "title", "name", "ürünadı", "urunadi", "urun_adi", "ürün_adı"],
      sku: ["sku", "stok kodu", "kod", "code", "product code", "stokkodu", "stok_kodu", "urun_kodu", "ürün_kodu"],
      barcode: ["barcode", "barkod", "ean", "barkod no", "barkodno", "barkod_no"],
      price: ["price", "fiyat", "satış fiyatı", "satis fiyati", "tutar", "satis_fiyati", "satış_fiyatı"],
      costPrice: ["cost", "alış fiyatı", "alis fiyati", "maliyet", "alis_fiyati", "alış_fiyatı"],
      stock: ["stock", "stok", "adet", "miktar", "quantity", "stok adeti", "stokadeti", "stok_adeti"],
      category: ["category", "kategori", "grup", "kategori_adi", "kategori adı"],
      brand: ["brand", "marka", "üretici", "marka_adi", "marka adı"],
      description: ["description", "açıklama", "detay", "aciklama", "acıklama"],
      piecesPerBox: ["pieces per box", "koli adeti", "koliadeti", "koli içi", "koli ici", "koli_ici", "koli_adeti"],
      packagingType: ["packaging", "ambalaj", "paket", "koli", "ambalaj_tipi", "ambalaj tipi"],
      imageUrl: ["image", "images", "resim", "görsel", "gorsel", "gorsel_url", "görsel url", "resim url", "image url", "image_url", "image1", "resim1", "gorsel1"],
      imageUrl2: ["image2", "resim2", "gorsel2"],
      imageUrl3: ["image3", "resim3", "gorsel3"],
      imageUrl4: ["image4", "resim4", "gorsel4"],
      imageUrl5: ["image5", "resim5", "gorsel5"],
      imageUrl6: ["image6", "resim6", "gorsel6"],
      imageUrl7: ["image7", "resim7", "gorsel7"],
      imageUrl8: ["image8", "resim8", "gorsel8"],
      imageUrl9: ["image9", "resim9", "gorsel9"],
      imageUrl10: ["image10", "resim10", "gorsel10"]
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
        Object.keys(dbFieldLabels).forEach((key) => {
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
    if (checkedFields.name && !mapping.name) {
      toast.warning("Ürün Adı alanı eşleştirilmelidir!");
      return;
    }
    setIsImporting(true);
    try {
      const res = await fetch("/api/excel/import-products", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ rows: excelRows, mapping, checkedFields, categorySeparator, onlyUpdateChanged })
      });
      if (res.ok) {
        const data = await res.json();
        setImportResult(data);
        setMappingStep("result");
        toast.success("İçe aktarım tamamlandı!");
        fetchData();
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
    const initialMapping: Record<string, string> = {
      name: "", sku: "", barcode: "", price: "", costPrice: "", stock: "", category: "", brand: "", description: "", piecesPerBox: "", packagingType: "",
      imageUrl: "", imageUrl2: "", imageUrl3: "", imageUrl4: "", imageUrl5: "", imageUrl6: "", imageUrl7: "", imageUrl8: "", imageUrl9: "", imageUrl10: ""
    };
    const initialChecked: Record<string, boolean> = {
      name: true, sku: true, barcode: true, price: true, costPrice: true, stock: true, category: true, brand: true, description: true, piecesPerBox: true, packagingType: true,
      imageUrl: true, imageUrl2: true, imageUrl3: true, imageUrl4: true, imageUrl5: true, imageUrl6: true, imageUrl7: true, imageUrl8: true, imageUrl9: true, imageUrl10: true
    };
    priceLists.forEach((pl) => {
      initialMapping[`priceList_${pl.id}`] = "";
      initialChecked[`priceList_${pl.id}`] = true;
    });
    setMapping(initialMapping);
    setCheckedFields(initialChecked);
    setCategorySeparator(">");
  };

  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    barcode: true,
    sku: true,
    category: true,
    piecesPerBox: true,
    packagingType: true,
    stock: true,
    price: true
  });

  const columnStorageKey = "products-table-visible-columns:v1";

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const resProd = await fetch(`/api/products?status=${statusFilter}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!resProd.ok) throw new Error("Ürünler yüklenemedi.");
      setProducts(await resProd.json());
      const resUsage = await fetch("/api/usage-limits", { headers: { Authorization: `Bearer ${token}` } });
      if (resUsage.ok) {
        const usage = await resUsage.json();
        setUsageProductsCurrent(Number(usage?.products?.current || 0));
      }

      const resCat = await fetch("/api/categories", { headers: { Authorization: `Bearer ${token}` } });
      if (!resCat.ok) throw new Error("Kategoriler yüklenemedi.");
      const data = await resCat.json();
      setCategories(data.categories || []);

      const resPriceLists = await fetch("/api/price-lists", { headers: { Authorization: `Bearer ${token}` } });
      if (resPriceLists.ok) {
        const pLists = await resPriceLists.json();
        setPriceLists(pLists);
        setCheckedFields((prev) => {
          const next = { ...prev };
          pLists.forEach((pl: any) => {
            next[`priceList_${pl.id}`] = true;
          });
          return next;
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ürün listesi yüklenirken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token, statusFilter]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(columnStorageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        setVisibleColumns((prev) => ({ ...prev, ...parsed }));
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(columnStorageKey, JSON.stringify(visibleColumns));
    } catch (e) {}
  }, [visibleColumns]);

  const flattenCategories = (cats: any[], prefix = ""): any[] => {
    let result: any[] = [];
    cats.forEach(c => {
      result.push({ id: c.id, name: prefix + c.name });
      if (c.children && c.children.length > 0) {
        result = result.concat(flattenCategories(c.children, prefix + "-- "));
      }
    });
    return result;
  };

  const flatCategories = flattenCategories(categories.filter(c => !c.parentId));

  if (user?.role === "SUPER_ADMIN") {
    return <div className="p-4 text-center text-muted-foreground">Super Admin ürün yönetemez. Firmalar menüsünden işlem yapın.</div>;
  }

  const displayedProducts = [...products]
    .filter((p) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        p.name?.toLowerCase().includes(q) ||
        p.barcode?.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q) ||
        p.category?.name?.toLowerCase().includes(q)
      );
    })
    .filter((p) => !categoryFilter || p.categoryId === categoryFilter)
    .sort((a, b) => {
      if (sortBy === "name-asc") return (a.name || "").localeCompare(b.name || "");
      if (sortBy === "name-desc") return (b.name || "").localeCompare(a.name || "");
      if (sortBy === "price-asc") return (a.price || 0) - (b.price || 0);
      if (sortBy === "price-desc") return (b.price || 0) - (a.price || 0);
      if (sortBy === "stock-asc") return (a.stock || 0) - (b.stock || 0);
      if (sortBy === "stock-desc") return (b.stock || 0) - (a.stock || 0);
      return 0;
    });

  const totalPages = Math.ceil(displayedProducts.length / productsPerPage);
  const paginatedProducts = displayedProducts.slice((currentPage - 1) * productsPerPage, currentPage * productsPerPage);

  const columnCount = useMemo(() => {
    let count = 2;
    if (visibleColumns.barcode) count += 1;
    if (visibleColumns.sku) count += 1;
    if (visibleColumns.category) count += 1;
    if (visibleColumns.piecesPerBox) count += 1;
    if (visibleColumns.packagingType) count += 1;
    if (visibleColumns.stock) count += 1;
    if (visibleColumns.price) count += 1;
    return count;
  }, [visibleColumns]);

  const toggleColumn = (key: string) => {
    setVisibleColumns((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const sortOptions = [
    { value: "name-asc", label: "İsim (A-Z)" },
    { value: "name-desc", label: "İsim (Z-A)" },
    { value: "price-asc", label: "Fiyat (Düşükten Yükseğe)" },
    { value: "price-desc", label: "Fiyat (Yüksekten Düşüğe)" },
    { value: "stock-asc", label: "Stok (Düşükten Yükseğe)" },
    { value: "stock-desc", label: "Stok (Yüksekten Düşüğe)" }
  ];

  const selectedCategoryName = flatCategories.find((c) => c.id === categoryFilter)?.name || "Tüm Kategoriler";
  const selectedSortLabel = sortOptions.find((option) => option.value === sortBy)?.label || "Sıralama";

  const panelContent = activePanel ? (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            {activePanel === "filter" ? "Kategori filtresi" : "Sıralama"}
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            {activePanel === "filter" ? selectedCategoryName : selectedSortLabel}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-10 w-10 shrink-0"
          aria-label="Paneli kapat"
          title="Paneli kapat"
          onClick={() => setActivePanel(null)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {activePanel === "filter" ? (
        <select
          className="h-11 w-full rounded-lg border border-border bg-card px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring touch-target"
          value={categoryFilter}
          onChange={(e) => {
            setCategoryFilter(e.target.value);
            setActivePanel(null);
          }}
          aria-label="Ürün kategorisine göre filtrele"
        >
          <option value="">Tüm Kategoriler</option>
          {flatCategories.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      ) : (
        <div className="grid gap-2">
          {sortOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className={cn(
                "h-11 rounded-lg border px-3 text-left text-sm font-medium transition-colors touch-target",
                sortBy === option.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-foreground hover:bg-muted"
              )}
              onClick={() => {
                setSortBy(option.value);
                setActivePanel(null);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  ) : null;

  const isLimitReached = usageProductsCurrent >= limits.products;

  return (
    <div className="space-y-4 animate-fade-in">
      {isLimitReached && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 text-amber-900 shadow-sm leading-relaxed text-sm">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <strong className="font-bold block mb-0.5">Sistem Ürün Limitine Ulaştınız!</strong>
            Mevcut planınız kapsamındaki ürün limitini doldurdunuz veya aştınız (<span className="font-semibold">{usageProductsCurrent} / {limits.products}</span>). Yeni ürün ekleme ve Excel içe aktarma ile yeni ürün oluşturma işlemleri planınızı yükseltene kadar sınırlandırılacaktır. Mevcut ürünlerinizi güncellemeye devam edebilirsiniz.
          </div>
        </div>
      )}

      <div className="hidden md:flex justify-end gap-2.5">
        {isLimitReached ? (
          <PlanUpgradeDialog triggerLabel="Plan Yükselt" />
        ) : isExcelLicensed ? (
          <Button
            variant="outline"
            onClick={() => {
              setIsImportModalOpen(true);
            }}
            className="h-11 px-5 font-semibold gap-2 border-border text-foreground hover:bg-muted/40 cursor-pointer touch-target"
          >
            <Upload className="w-4 h-4 text-muted-foreground" /> Excel ile Ürün Yükle
          </Button>
        ) : null}
        {!isLimitReached && (
          <Link to="/admin/products/new">
            <Button className="brand-gradient border-0 shadow-md shadow-secondary/20 hover:opacity-90 transition-opacity h-11 px-5 font-semibold gap-2">
              <Plus className="w-4 h-4" /> Yeni Ürün Ekle
            </Button>
          </Link>
        )}
      </div>

      <div className="sticky top-0 z-20 rounded-xl border border-border bg-card p-3 md:p-4 shadow-sm">
        <div className="flex gap-2 md:gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/50" />
            <Input
              type="text"
              placeholder="Ürün adı, barkod, stok kodu veya kategori ara..."
              className="pl-10 h-11 bg-muted/30 border-border"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {!isLimitReached && (
            <Link to="/admin/products/new" className="md:hidden">
              <Button className="h-11 px-3 brand-gradient text-white font-semibold whitespace-nowrap">
                + Ekle
              </Button>
            </Link>
          )}
          <Button
            type="button"
            variant="outline"
            size="icon"
            className={cn(
              "h-11 w-11 shrink-0 touch-target",
              (activePanel === "filter" || categoryFilter) && "border-primary bg-primary/10 text-primary"
            )}
            aria-label="Kategori filtresi"
            title="Kategori filtresi"
            onClick={() => setActivePanel((current) => current === "filter" ? null : "filter")}
          >
            <SlidersHorizontal className="h-5 w-5" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className={cn(
              "h-11 w-11 shrink-0 touch-target",
              activePanel === "sort" && "border-primary bg-primary/10 text-primary"
            )}
            aria-label="Sıralama"
            title="Sıralama"
            onClick={() => setActivePanel((current) => current === "sort" ? null : "sort")}
          >
            <ArrowUpDown className="h-5 w-5" />
          </Button>
          <select
            className="h-11 rounded-lg border border-border bg-card px-3 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
          >
            <option value="ACTIVE">Aktif</option>
            <option value="PASSIVE">Pasif</option>
            <option value="ALL">Tümü</option>
          </select>
        </div>

        {activePanel && (
          <>
            <div className="mt-3 rounded-xl border border-border bg-muted/20 p-4">{panelContent}</div>
          </>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading && (
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            Ürünler yükleniyor...
          </div>
        </div>
      )}

      {!loading && !error && <div className="md:hidden space-y-3">
        {paginatedProducts.map(p => (
          <Link to={`/admin/products/${p.id}`} key={p.id} className="block bg-card rounded-xl border border-border p-3 shadow-sm card-hover">
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 bg-muted/50 rounded-lg overflow-hidden shrink-0 border border-border">
                {p.images && p.images.length > 0 ? (
                  <img src={p.images[0].thumbUrl || p.images[0].originalUrl} className="w-full h-full object-cover" alt="primary" />
                ) : p.imageUrl ? (
                  <img src={p.imageUrl} className="w-full h-full object-cover" alt="primary" />
                ) : (
                  <span className="w-full h-full flex items-center justify-center text-muted-foreground/30">
                    <Package className="w-6 h-6" />
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-foreground line-clamp-2 leading-tight">{p.name}</div>
                {p.category?.name && <div className="text-xs text-muted-foreground mt-1">{p.category.name}</div>}
                <div className="flex items-center gap-3 mt-2">
                  <span className="font-bold text-foreground">₺{Number(p.price || 0).toFixed(2)}</span>
                  <span className={`status-badge ${p.stock <= (p.stockThreshold || 0) ? "status-cancelled" : "status-active"}`}>
                    Stok: {p.stock ?? 0}
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground/30 shrink-0" />
            </div>
          </Link>
        ))}
        {displayedProducts.length === 0 && (
          <div className="text-center py-16">
            <Package className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">
              {products.length === 0 ? "Kayıtlı ürün bulunamadı." : "Arama kriterlerine uygun ürün bulunamadı."}
            </p>
          </div>
        )}
      </div>}

      {!loading && !error && <div className="hidden md:block border rounded-xl bg-card overflow-hidden shadow-sm">
        <div className="flex justify-end p-3 border-b bg-muted/20 relative">
          <Button variant="outline" size="sm" className="gap-2 touch-target" onClick={() => setIsColumnMenuOpen((v) => !v)}>
            <Settings2 className="w-4 h-4" />
            Alanlar
          </Button>
          {isColumnMenuOpen && (
            <div className="absolute right-3 top-12 z-20 w-64 rounded-xl border border-border bg-card shadow-lg p-4 space-y-2.5">
              <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" className="rounded" checked={visibleColumns.barcode} onChange={() => toggleColumn("barcode")} /> Barkod</label>
              <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" className="rounded" checked={visibleColumns.sku} onChange={() => toggleColumn("sku")} /> Stok Kodu</label>
              <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" className="rounded" checked={visibleColumns.category} onChange={() => toggleColumn("category")} /> Kategori</label>
              <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" className="rounded" checked={visibleColumns.piecesPerBox} onChange={() => toggleColumn("piecesPerBox")} /> Koli</label>
              <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" className="rounded" checked={visibleColumns.packagingType} onChange={() => toggleColumn("packagingType")} /> Ambalaj</label>
              <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" className="rounded" checked={visibleColumns.stock} onChange={() => toggleColumn("stock")} /> Stok</label>
              <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" className="rounded" checked={visibleColumns.price} onChange={() => toggleColumn("price")} /> Fiyat</label>
            </div>
          )}
        </div>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="min-w-[280px]">Ürün</TableHead>
              {visibleColumns.barcode && <TableHead>Barkod</TableHead>}
              {visibleColumns.sku && <TableHead>Stok Kodu</TableHead>}
              {visibleColumns.category && <TableHead>Kategori</TableHead>}
              {visibleColumns.piecesPerBox && <TableHead>Koli</TableHead>}
              {visibleColumns.packagingType && <TableHead>Ambalaj</TableHead>}
              {visibleColumns.stock && <TableHead>Stok</TableHead>}
              {visibleColumns.price && <TableHead>Fiyat</TableHead>}
              <TableHead className="text-right">İşlemler</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedProducts.map(p => (
              <TableRow key={p.id} className="hover:bg-muted/20">
                <TableCell className="py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-muted/50 rounded-lg overflow-hidden shrink-0 border border-border">
                      {p.images && p.images.length > 0 ? (
                        <img src={p.images[0].thumbUrl || p.images[0].originalUrl} className="w-full h-full object-cover" alt="primary" />
                      ) : p.imageUrl ? (
                        <img src={p.imageUrl} className="w-full h-full object-cover" alt="primary" />
                      ) : (
                        <span className="w-full h-full flex items-center justify-center text-muted-foreground/30">
                          <Package className="w-5 h-5" />
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-sm line-clamp-2 text-foreground">{p.name}</div>
                    </div>
                  </div>
                </TableCell>
                {visibleColumns.barcode && <TableCell className="py-3.5 text-sm text-muted-foreground">{p.barcode || "-"}</TableCell>}
                {visibleColumns.sku && <TableCell className="py-3.5 text-sm text-muted-foreground">{p.sku || "-"}</TableCell>}
                {visibleColumns.category && <TableCell className="py-3.5 text-sm text-muted-foreground">{p.category?.name || "-"}</TableCell>}
                {visibleColumns.piecesPerBox && <TableCell className="py-3.5 text-sm text-muted-foreground">{p.piecesPerBox || "-"}</TableCell>}
                {visibleColumns.packagingType && <TableCell className="py-3.5 text-sm text-muted-foreground">{p.packagingType || "-"}</TableCell>}
                {visibleColumns.stock && (
                  <TableCell className="py-3.5">
                    <span className={`status-badge ${p.stock <= (p.stockThreshold || 0) ? "status-cancelled" : "status-active"}`}>
                      {p.stock ?? 0}
                    </span>
                  </TableCell>
                )}
                {visibleColumns.price && <TableCell className="py-3.5 font-bold text-sm text-foreground">₺{Number(p.price || 0).toFixed(2)}</TableCell>}
                <TableCell className="text-right">
                  <div className="inline-flex items-center gap-1">
                    <Link to={`/admin/products/${p.id}`} className="inline-flex items-center gap-1 rounded-lg text-sm h-9 px-3 hover:bg-muted font-medium transition-colors border border-border touch-target">
                    Detay <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {displayedProducts.length === 0 && (
              <TableRow>
                <TableCell colSpan={columnCount} className="text-center text-muted-foreground h-24">
                  {products.length === 0 ? "Kayıtlı ürün bulunamadı." : "Arama kriterlerine uygun ürün bulunamadı."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>}

      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border border-border bg-card p-4 rounded-xl shadow-sm mt-4 animate-fade-in select-none">
          <div className="text-xs text-muted-foreground">
            Toplam <strong className="text-foreground">{displayedProducts.length}</strong> üründen <strong className="text-foreground">{((currentPage - 1) * productsPerPage) + 1} - {Math.min(currentPage * productsPerPage, displayedProducts.length)}</strong> arası gösteriliyor. Sistem kaydı: <strong className="text-foreground">{usageProductsCurrent}</strong> / {limits.products}
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

      {/* Excel İçe Aktarma Modali */}
      <Dialog open={isImportModalOpen} onOpenChange={(open) => { setIsImportModalOpen(open); if(!open) resetExcelImport(); }}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-indigo-500" /> Excel ile Hızlı Ürün Yükleme
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
                  Dosyanızı sürükleyip bırakabilir veya buraya tıklayarak seçebilirsiniz. (.xlsx, .xls, .csv desteklenir)
                </p>
              </div>
              {isUploading && (
                <div className="flex items-center justify-center gap-3 text-sm text-indigo-500">
                  <Loader2 className="w-5 h-5 animate-spin" /> Dosya analiz ediliyor...
                </div>
              )}
            </div>
          )}

          {mappingStep === "map" && (
            <div className="space-y-6 pt-2 animate-fade-in">
              <div className="bg-muted/20 border border-border p-4 rounded-xl flex items-center justify-between">
                <div className="text-xs">
                  <span className="text-muted-foreground">Analiz Edilen Dosya:</span> <strong className="text-foreground">{excelFile?.name}</strong>
                  <span className="text-muted-foreground ml-3 block sm:inline">Toplam Satır:</span> <strong className="text-foreground">{totalExcelRows} satır</strong>
                </div>
                <Button variant="ghost" size="sm" onClick={resetExcelImport} className="text-xs h-8 text-destructive">Yeni Dosya Seç</Button>
              </div>

              <div className="bg-muted/15 border border-border p-4 rounded-xl space-y-3">
                <h4 className="text-xs font-bold text-foreground flex items-center gap-2">
                  <span className="w-1.5 h-3 bg-indigo-500 rounded-full"></span>
                  Gelişmiş Ayarlar
                </h4>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1">
                    <label className="text-xs font-semibold text-foreground/80 block mb-1">
                      Kategori Ağacı Ayıracı (Separator)
                    </label>
                    <span className="text-[10px] text-muted-foreground block leading-relaxed">
                      Eğer Excel dosyanızda kategoriler "Oyuncak&gt;Araba&gt;Uçak" şeklinde hiyerarşik ise ayıracı girin (Örn: &gt;). Boş bırakırsanız tek kategori olarak eklenir.
                    </span>
                  </div>
                  <Input
                    placeholder="Örn: > veya /"
                    className="h-9 text-xs w-full sm:w-[120px] text-center border-border font-bold bg-card"
                    value={categorySeparator}
                    onChange={(e) => setCategorySeparator(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Sütunları Eşleştirin</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Excel dosyanızdaki sütun başlıklarını (sağda) veritabanımızdaki ürün alanları (solda) ile eşleştirin. Sistemimiz başlıklarınızı otomatik olarak tahmin etmiştir.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border border-border rounded-xl p-4 bg-muted/10 max-h-[300px] overflow-y-auto">
                  {Object.keys(dbFieldLabels).map((dbKey) => (
                    <div key={dbKey} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/50 pb-2.5 last:border-0 last:pb-0">
                      <div className="flex items-center gap-2 min-w-[170px]">
                        <input
                          type="checkbox"
                          id={`check-${dbKey}`}
                          checked={!!checkedFields[dbKey]}
                          onChange={(e) => setCheckedFields({ ...checkedFields, [dbKey]: e.target.checked })}
                          className="w-3.5 h-3.5 rounded text-indigo-600 border-border focus:ring-indigo-500 cursor-pointer"
                        />
                        <label htmlFor={`check-${dbKey}`} className="text-xs font-bold text-foreground cursor-pointer select-none">
                          {dbFieldLabels[dbKey]}
                        </label>
                      </div>
                      <select
                        className="flex h-9 w-full sm:w-[220px] rounded-lg border border-border bg-card px-2.5 py-1 text-xs shadow-sm transition-colors focus:outline-none disabled:opacity-50 disabled:bg-muted"
                        value={mapping[dbKey] || ""}
                        onChange={(e) => setMapping({ ...mapping, [dbKey]: e.target.value })}
                        disabled={!checkedFields[dbKey]}
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

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-border pt-4 mt-2">
                <label className="flex items-center gap-2 cursor-pointer border border-border bg-card hover:bg-slate-50/50 p-2.5 rounded-xl shadow-sm transition-all select-none">
                  <input
                    type="checkbox"
                    checked={onlyUpdateChanged}
                    onChange={(e) => setOnlyUpdateChanged(e.target.checked)}
                    className="w-4 h-4 rounded border-border accent-primary cursor-pointer"
                  />
                  <div className="flex flex-col text-left">
                    <span className="text-[11px] font-bold text-foreground">Yalnızca değişen alanları güncelle</span>
                    <span className="text-[9px] text-muted-foreground">Değişiklik yoksa veritabanı yazmasını atlar ve hızı artırır.</span>
                  </div>
                </label>
                <div className="flex gap-2 shrink-0">
                  <Button variant="outline" size="sm" onClick={() => setIsImportModalOpen(false)}>İptal</Button>
                  <Button
                    onClick={handleStartImport}
                    disabled={isImporting || !mapping.name}
                    className="brand-gradient border-0 shadow-md h-9 px-6 text-xs font-semibold gap-1.5"
                  >
                    {isImporting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    İçe Aktarmayı Başlat ({totalExcelRows} Ürün)
                  </Button>
                </div>
              </div>
            </div>
          )}

          {mappingStep === "result" && importResult && (
            <div className="py-6 space-y-6 text-center animate-fade-in">
              <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto text-emerald-500">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="font-bold text-foreground text-lg">İçe Aktarım Başarıyla Tamamlandı!</h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto leading-relaxed">
                  Excel dosyanızdaki ürün verileri başarıyla işlendi ve veritabanına aktarıldı.
                </p>
              </div>

              <div className="grid grid-cols-4 gap-2 max-w-md mx-auto border border-border p-4 rounded-xl bg-muted/10">
                <div>
                  <span className="text-[10px] text-muted-foreground block uppercase font-bold tracking-wider">Oluşturulan</span>
                  <span className="font-bold text-lg text-emerald-500 mt-0.5">{importResult.createdCount}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block uppercase font-bold tracking-wider">Güncellenen</span>
                  <span className="font-bold text-lg text-indigo-500 mt-0.5">{importResult.updatedCount}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block uppercase font-bold tracking-wider">Değişmeyen</span>
                  <span className="font-bold text-lg text-slate-500 mt-0.5">{importResult.skippedCount || 0}</span>
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
