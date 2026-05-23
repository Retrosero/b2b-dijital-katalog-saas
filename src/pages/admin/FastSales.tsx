import { useState, useEffect, useMemo } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { usePageHeaderStore } from "@/store/usePageHeaderStore";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronDown, Search, Barcode, ShoppingCart, Trash2, Package, User, CreditCard, FileText, Tag, Boxes, SlidersHorizontal, ArrowUpDown, X, StickyNote, Building } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToastActions } from "@/components/ui/toast";
import CameraXScanner from "@/components/CameraXScanner";

const formatPrice = (price: number) => {
  return price.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " TL";
};

export default function FastSales() {
  const { token, user: currentUser } = useAuthStore();
  const { setHeader, resetHeader } = usePageHeaderStore();
  const toast = useToastActions();
  const [products, setProducts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [sortBy, setSortBy] = useState("");
  const [activeMobileSheet, setActiveMobileSheet] = useState<"filter" | "sort" | null>(null);
  const [cartSearch, setCartSearch] = useState("");
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  const [cart, setCart] = useState<any[]>([]);
  const [addQuantities, setAddQuantities] = useState<Record<string, number | "">>({});
  const [customerId, setCustomerId] = useState("");
  const [isCustomerPanelOpen, setIsCustomerPanelOpen] = useState(false);
  const [paymentType, setPaymentType] = useState("CASH");
  const [bankName, setBankName] = useState("");
  const [notes, setNotes] = useState("");
  const [noteEditor, setNoteEditor] = useState<{ open: boolean; productId: string; productName: string; value: string }>({
    open: false,
    productId: "",
    productName: "",
    value: "",
  });

  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [hideOutOfStock, setHideOutOfStock] = useState(true);

  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
      oscillator.start();
      setTimeout(() => {
        oscillator.stop();
        audioCtx.close();
      }, 150);
    } catch (e) {}
  };

  const handleBarcodeScanned = (barcode: string) => {
    if (!barcode) return;
    playBeep();
    setSearch(barcode);
    setIsScannerOpen(false);
    toast.success(`Barkod başarıyla okundu: ${barcode}`);
  };

  const orderMode = currentUser?.tenant?.orderMode || "UNIT";
  const isBoxMode = orderMode === "BOX";
  const cartStorageKey = currentUser?.id ? `fast-sales-cart:${currentUser.id}:${currentUser.tenantId || "platform"}` : "";

  const tenantBanks = useMemo<string[]>(() => {
    if (!currentUser?.tenant?.banks) return [];
    try {
      return JSON.parse(currentUser.tenant.banks);
    } catch (e) {
      return [];
    }
  }, [currentUser]);

  const fastSalesSettings = currentUser?.fastSalesSettings ? JSON.parse(currentUser.fastSalesSettings) : {
    sku: true, barcode: true, category: true, piecesPerBox: true, packagingType: true, stock: true, description: true
  };

  useEffect(() => { fetchProducts(); fetchCustomers(); }, [token]);

  useEffect(() => {
    if (!cartStorageKey) return;
    try {
      const saved = localStorage.getItem(cartStorageKey);
      if (!saved) return;
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed.cart)) setCart(parsed.cart);
      if (typeof parsed.customerId === "string") setCustomerId(parsed.customerId);
      if (typeof parsed.paymentType === "string") setPaymentType(parsed.paymentType);
      if (typeof parsed.notes === "string") setNotes(parsed.notes);
    } catch(e) {}
  }, [cartStorageKey]);

  useEffect(() => {
    if (!cartStorageKey) return;
    try { localStorage.setItem(cartStorageKey, JSON.stringify({ cart, customerId, paymentType, notes })); } catch(e) {}
  }, [cartStorageKey, cart, customerId, paymentType, notes]);

  const fetchProducts = async () => {
    const res = await fetch("/api/products", { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setProducts(await res.json());
  };

  const fetchCustomers = async () => {
    const res = await fetch("/api/customers", { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setCustomers(await res.json());
  };

  const setAddQuantity = (productId: string, value: number | "") => setAddQuantities((prev) => ({ ...prev, [productId]: value }));
  const changeAddQuantity = (productId: string, delta: number) => setAddQuantities((prev) => ({ ...prev, [productId]: Math.max(0, (Number(prev[productId]) || 0) + delta) }));

  const addToCart = (product: any) => {
    const quantity = Number(addQuantities[product.id]) || 0;
    if (quantity <= 0) return;
    const multiplier = isBoxMode ? product.piecesPerBox || 1 : 1;
    const image = product.images?.[0]?.thumbUrl || product.images?.[0]?.originalUrl;
    setCart((prev) => {
      const exists = prev.find(i => i.productId === product.id);
      if (exists) return prev.map(i => i.productId === product.id ? { ...i, quantity: Number(i.quantity || 0) + quantity } : i);
      return [...prev, { productId: product.id, categoryId: product.categoryId, name: product.name, unitPrice: product.price, quantity, multiplier, piecesPerBox: product.piecesPerBox || null, packagingType: product.packagingType || null, basePrice: product.price, image, note: "" }];
    });
    setAddQuantity(product.id, "");
  };

  const updateCartQuantity = (productId: string, val: number | "") => {
    if (val === "") { setCart((prev) => prev.map(i => i.productId === productId ? { ...i, quantity: "" } : i)); return; }
    if (val <= 0) { setCart((prev) => prev.filter(i => i.productId !== productId)); return; }
    setCart((prev) => prev.map(i => i.productId === productId ? { ...i, quantity: val } : i));
  };

  const updateCartItemNote = (productId: string, note: string) => {
    setCart((prev) => prev.map((i) => (i.productId === productId ? { ...i, note } : i)));
  };

  const openItemNoteEditor = (item: any) => {
    setNoteEditor({
      open: true,
      productId: item.productId,
      productName: item.name,
      value: item.note || "",
    });
  };

  const saveItemNote = () => {
    if (!noteEditor.productId) return;
    updateCartItemNote(noteEditor.productId, noteEditor.value);
    setNoteEditor({ open: false, productId: "", productName: "", value: "" });
  };

  useEffect(() => {
    if (!products.length || !cart.length) return;
    setCart((prev) => {
      let changed = false;
      const next = prev.map((item) => {
        const product = products.find((p) => p.id === item.productId);
        if (!product) return item;
        const piecesPerBox = product.piecesPerBox || 1;
        const multiplier = isBoxMode ? piecesPerBox : 1;
        if (item.multiplier === multiplier && item.piecesPerBox === (product.piecesPerBox || null)) return item;
        changed = true;
        return { ...item, multiplier, piecesPerBox: product.piecesPerBox || null };
      });
      return changed ? next : prev;
    });
  }, [products, isBoxMode, cart.length]);

  const getDiscountedPrice = (item: any) => {
    let p = item.basePrice || item.unitPrice;
    if (!customerId) return p;
    const c = customers.find(x => x.id === customerId);
    if (!c) return p;
    const discounts = [c.discountRate, c.discount2, c.discount3, c.discount4, c.discount5].map((d) => Number(d) || 0);
    let catD = 0;
    if (c.categoryDiscounts && item.categoryId) {
      try { const parsed = JSON.parse(c.categoryDiscounts); if (parsed[item.categoryId]) catD = Number(parsed[item.categoryId]) || 0; } catch(e) {}
    }
    discounts.forEach((d) => { if (d) p = p * (1 - d / 100); });
    if (catD) p = p * (1 - catD / 100);
    return p;
  };

  const calculateTotal = () => cart.reduce((acc, i) => acc + (getDiscountedPrice(i) * i.multiplier * (Number(i.quantity) || 0)), 0);
  const getLineCount = () => cart.length;
  const selectedCustomer = customers.find((customer) => customer.id === customerId);
  const getPackageTotal = () => {
    if (isBoxMode) return cart.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
    return cart.reduce((sum, item) => { const qty = Number(item.quantity) || 0; const ppb = Number(item.piecesPerBox) || 1; return sum + (qty / ppb); }, 0);
  };

  useEffect(() => {
    if (isMobileCartOpen) {
      setHeader({
        title: "Sepet",
        subtitle: `${getLineCount()} kalem`,
        backTo: null,
        onBack: () => setIsMobileCartOpen(false),
        actions: []
      });
      return resetHeader;
    }

    setHeader({
      title: "Hızlı Satış",
      subtitle: null,
      backTo: null,
      onBack: null,
      actions: []
    });
    return resetHeader;
  }, [isMobileCartOpen, cart, setHeader, resetHeader]);

  const completeSale = async () => {
    if (!customerId) return toast.warning("Lütfen müşteri seçiniz");
    if (cart.length === 0) return toast.warning("Sepetiniz boş");
    
    if ((paymentType === "CREDIT_CARD" || paymentType === "TRANSFER") && tenantBanks.length > 0 && !bankName) {
      return toast.warning("Lütfen ödeme için banka seçiniz.");
    }

    const totalAmount = calculateTotal();
    const finalCart = cart.map(i => ({ ...i, unitPrice: getDiscountedPrice(i), quantity: (Number(i.quantity) || 0) * i.multiplier, note: i.note || null }));
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ 
        customerId, 
        paymentType, 
        bankName: (paymentType === "CREDIT_CARD" || paymentType === "TRANSFER") ? bankName : null, 
        notes, 
        totalAmount, 
        status: "PENDING", 
        items: finalCart 
      })
    });
    if (res.ok) {
      toast.success("Satış tamamlandı");
      setCart([]);
      setBankName("");
      if (cartStorageKey) { try { localStorage.removeItem(cartStorageKey); } catch(e) {} }
      fetchProducts();
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error || "Satış tamamlanamadı.");
    }
  };

  const categories = useMemo(() => {
    const map = new Map<string, string>();
    products.forEach((product) => {
      if (product.categoryId && product.category?.name) map.set(product.categoryId, product.category.name);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [products]);

  const sortOptions = [
    { value: "", label: "Varsayılan" },
    { value: "price_asc", label: "Fiyat Artan" },
    { value: "price_desc", label: "Fiyat Azalan" }
  ];

  const selectedCategoryName = categories.find((category) => category.id === categoryFilter)?.name || "Tüm Kategoriler";
  const selectedSortLabel = sortOptions.find((option) => option.value === sortBy)?.label || "Varsayılan";

  const filteredProducts = products.filter(p =>
    (!hideOutOfStock || Number(p.stock || 0) > 0) &&
    (!categoryFilter || p.categoryId === categoryFilter) &&
    (
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.barcode?.includes(search) ||
      p.sku?.toLowerCase().includes(search.toLowerCase())
    )
  ).sort((a, b) => {
    if (sortBy === "price_asc") return Number(a.price || 0) - Number(b.price || 0);
    if (sortBy === "price_desc") return Number(b.price || 0) - Number(a.price || 0);
    return 0;
  });
  const filteredCart = cart.filter(item => item.name?.toLowerCase().includes(cartSearch.toLowerCase()));

  const mobileSheetContent = activeMobileSheet ? (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            {activeMobileSheet === "filter" ? "Ürün filtresi" : "Sıralama"}
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            {activeMobileSheet === "filter" ? selectedCategoryName : selectedSortLabel}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-10 w-10 shrink-0"

          aria-label="Paneli kapat"
          title="Paneli kapat"
          onClick={() => setActiveMobileSheet(null)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {activeMobileSheet === "filter" ? (
        <div className="grid gap-2">
          <button
            type="button"
            className={cn(
              "h-11 rounded-lg border px-3 text-left text-sm font-medium transition-colors touch-target",
              !categoryFilter ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-foreground hover:bg-muted"
            )}
            onClick={() => {
              setCategoryFilter("");
              setActiveMobileSheet(null);
            }}
          >
            Tüm Kategoriler
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              className={cn(
                "h-11 rounded-lg border px-3 text-left text-sm font-medium transition-colors touch-target",
                categoryFilter === category.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-foreground hover:bg-muted"
              )}
              onClick={() => {
                setCategoryFilter(category.id);
                setActiveMobileSheet(null);
              }}
            >
              {category.name}
            </button>
          ))}
        </div>
      ) : (
        <div className="grid gap-2">
          {sortOptions.map((option) => (
            <button
              key={option.value || "default"}
              type="button"
              className={cn(
                "h-11 rounded-lg border px-3 text-left text-sm font-medium transition-colors touch-target",
                sortBy === option.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-foreground hover:bg-muted"
              )}
              onClick={() => {
                setSortBy(option.value);
                setActiveMobileSheet(null);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  ) : null;

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in w-full pb-8">
      {/* Toolbar */}
      <div className="sticky top-0 z-20 bg-white dark:bg-card border border-border/60 shadow-md shadow-slate-100/50 dark:shadow-none rounded-2xl p-3 md:p-4 transition-all duration-300">
        {/* Mobile Toolbar */}
        <div className="md:hidden space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
            <Input
              placeholder="Ürün adı, barkod veya stok kodu ara..."
              className="pl-9 h-10 bg-slate-50/50 dark:bg-muted/10 border border-border/80 focus-visible:ring-2 focus-visible:ring-primary/20 rounded-xl transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-4 gap-2">
            <Button 
              variant="outline" 
              size="icon" 
              className="h-10 w-full bg-slate-50/50 dark:bg-muted/10 border-border/80 rounded-xl hover:bg-slate-100/50" 
              title="Barkod Okut" 
              aria-label="Barkod okut"
              onClick={() => { setIsScannerOpen(true); }}
            >
              <Barcode className="w-4 h-4 text-primary" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              type="button"
              className={cn(
                "h-10 w-full rounded-xl transition-all",
                hideOutOfStock
                  ? "border-secondary bg-secondary/15 text-secondary"
                  : "bg-slate-50/50 dark:bg-muted/10 border-border/80 hover:bg-slate-100/50"
              )}
              title={hideOutOfStock ? "Tükenenler gizli" : "Tükenenler görünür"}
              aria-label="Stok filtresi"
              onClick={() => setHideOutOfStock((v) => !v)}
            >
              <span className="text-xs font-extrabold">S</span>
            </Button>
            <Button
              variant="outline"
              size="icon"
              type="button"
              className={cn("h-10 w-full bg-slate-50/50 dark:bg-muted/10 border-border/80 rounded-xl transition-all", categoryFilter && "border-primary bg-primary/10 text-primary")}
              title="Filtrele"
              aria-label="Ürünleri filtrele"
              onClick={() => setActiveMobileSheet("filter")}
            >
              <SlidersHorizontal className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              type="button"
              className={cn("h-10 w-full bg-slate-50/50 dark:bg-muted/10 border-border/80 rounded-xl transition-all", sortBy && "border-primary bg-primary/10 text-primary")}
              title="Sırala"
              aria-label="Ürünleri sırala"
              onClick={() => setActiveMobileSheet("sort")}
            >
              <ArrowUpDown className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              type="button"
              className="relative h-10 w-full bg-slate-50/50 dark:bg-muted/10 border-border/80 rounded-xl hover:bg-slate-100/50"
              title="Sepet"
              aria-label={`Sepet, ${getLineCount()} kalem`}
              onClick={() => setIsMobileCartOpen((prev) => !prev)}
            >
              <ShoppingCart className="w-4 h-4 text-secondary animate-pulse" />
              {getLineCount() > 0 && (
                <span className="absolute -right-1 -top-1 min-w-[20px] h-5 px-1.5 rounded-full brand-gradient text-white text-[10px] font-bold flex items-center justify-center shadow-sm">
                  {getLineCount()}
                </span>
              )}
            </Button>
          </div>
          {mobileSheetContent && (
            <div className="mt-2 rounded-xl border border-border/60 bg-slate-50/30 dark:bg-muted/5 p-3 shadow-inner">
              {mobileSheetContent}
            </div>
          )}
        </div>

        {/* Desktop Toolbar */}
        <div className="hidden md:flex flex-wrap xl:flex-nowrap items-center gap-3">
          <div className="relative flex-1 min-w-[260px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
            <Input
              placeholder="Ürün adı, barkod veya stok kodu ara..."
              className="pl-9 h-10 bg-slate-50/50 dark:bg-muted/10 border border-border/60 hover:border-border/80 focus-visible:ring-2 focus-visible:ring-primary/20 rounded-xl transition-all duration-200"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="h-10 px-4 gap-2 shrink-0 border-border/60 hover:border-border/50 rounded-xl bg-slate-50/50 hover:bg-slate-100/50 transition-all duration-200 shadow-sm" 
            title="Barkod Okut"
            onClick={() => { setIsScannerOpen(true); }}
          >
            <Barcode className="w-4 h-4 text-primary" />
            <span className="hidden sm:inline text-xs font-bold uppercase tracking-wider text-muted-foreground/80">Barkod</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            type="button"
            className={cn(
              "h-10 px-3 shrink-0 rounded-xl transition-all duration-200 shadow-sm font-extrabold",
              hideOutOfStock
                ? "border-secondary bg-secondary/15 text-secondary"
                : "border-border/60 hover:border-border/50 bg-slate-50/50 hover:bg-slate-100/50 text-muted-foreground"
            )}
            title={hideOutOfStock ? "Tükenenler gizli" : "Tükenenler görünür"}
            aria-label="Stok filtresi"
            onClick={() => setHideOutOfStock((v) => !v)}
          >
            S
          </Button>
          <select
            className="h-10 rounded-xl border border-border/60 bg-slate-50/50 px-3.5 text-sm text-foreground/80 focus:outline-none focus:ring-2 focus:ring-primary/20 md:w-[180px] hover:bg-slate-100/50 dark:hover:bg-muted/30 cursor-pointer transition-all duration-200 font-medium"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            aria-label="Ürünleri kategoriye göre filtrele"
          >
            <option value="">Filtrele (Kategori)</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
          <select
            className="h-10 rounded-xl border border-border/60 bg-slate-50/50 px-3.5 text-sm text-foreground/80 focus:outline-none focus:ring-2 focus:ring-primary/20 md:w-[160px] hover:bg-slate-100/50 dark:hover:bg-muted/30 cursor-pointer transition-all duration-200 font-medium"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="">Sırala (Fiyat)</option>
            <option value="price_asc">Fiyat Artan</option>
            <option value="price_desc">Fiyat Azalan</option>
          </select>
          <div className="relative shrink-0">
            <Button
              variant="outline"
              size="sm"
              type="button"
              className="h-10 gap-2 border-border/60 hover:border-border/80 rounded-xl bg-slate-50/50 hover:bg-slate-100/50 transition-all duration-200 font-bold text-xs uppercase tracking-wider text-secondary"
              onClick={() => setIsMobileCartOpen((prev) => !prev)}
            >
              <div className="relative">
                <ShoppingCart className="w-4 h-4 text-secondary" />
                {getLineCount() > 0 && (
                  <span className="absolute -top-2.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-white text-[9px] font-black flex items-center justify-center shadow-sm">
                    {getLineCount()}
                  </span>
                )}
              </div>
              <span>Sepet</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Cart Sheet Drawer (Full Screen Overlay) */}
      {isMobileCartOpen && (
        <div className="xl:hidden fixed inset-0 z-50 flex flex-col bg-slate-50/98 dark:bg-background/98 backdrop-blur-md animate-fade-in">
          {/* Mobile Header */}
          <div className="flex items-center justify-between border-b border-border bg-white/95 dark:bg-card/95 px-4 py-3.5 shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl brand-gradient flex items-center justify-center shadow-md shadow-secondary/10">
                <ShoppingCart className="w-4 h-4 text-white animate-bounce-subtle" />
              </div>
              <div>
                <h3 className="text-sm font-black leading-none text-foreground tracking-tight">Alışveriş Sepeti</h3>
                <p className="text-[10px] text-muted-foreground/80 font-bold uppercase mt-1 tracking-wider">{getLineCount()} KALEM</p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-muted-foreground hover:bg-slate-100 dark:hover:bg-muted rounded-xl transition-all duration-200"
              aria-label="Sepeti kapat"
              onClick={() => setIsMobileCartOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar pb-32">
            {/* Customer Information Panel */}
            <div className="bg-white dark:bg-card border-b border-border/60 p-4 space-y-3.5 shadow-sm">
              <div className="rounded-2xl border border-border bg-slate-50/50 dark:bg-muted/5 p-3.5 space-y-3">
                <div className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-primary" />
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Cari Müşteri Seçimi</label>
                </div>
                <select
                  className="w-full h-10 rounded-xl border border-border bg-white px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium cursor-pointer"
                  value={customerId}
                  onChange={e => setCustomerId(e.target.value)}
                >
                  <option value="">Müşteri seçiniz...</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {selectedCustomer && (
                  <div className="mt-2.5 flex items-center justify-between gap-2 rounded-xl border border-secondary/20 bg-secondary/5 px-3.5 py-2 shadow-inner animate-pulse-subtle">
                    <span className="text-xs text-muted-foreground truncate mr-2 font-medium">{selectedCustomer.name}</span>
                    <span className="text-xs text-secondary font-black shrink-0 font-mono">Bakiye: {formatPrice(Number(selectedCustomer.balance) || 0)}</span>
                  </div>
                )}
              </div>

              {/* Payment Method Selector for Mobile */}
              {selectedCustomer && (
                <div className="grid grid-cols-2 gap-3 animate-fade-in">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-muted-foreground/70 uppercase tracking-wider flex items-center gap-1">
                      <CreditCard className="w-3 h-3 text-muted-foreground/60" />Ödeme
                    </label>
                    <select
                      className="w-full h-9.5 rounded-xl border border-border bg-white px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium cursor-pointer"
                      value={paymentType}
                      onChange={e => {
                        setPaymentType(e.target.value);
                        setBankName("");
                      }}
                    >
                      <option value="CASH">Nakit</option>
                      <option value="CREDIT_CARD">Kart</option>
                      <option value="TRANSFER">EFT/Havale</option>
                    </select>
                  </div>
                  {(paymentType === "CREDIT_CARD" || paymentType === "TRANSFER") && (
                    <div className="space-y-1 animate-fade-in">
                      <label className="text-[9px] font-bold text-muted-foreground/70 uppercase tracking-wider flex items-center gap-1">
                        <Building className="w-3 h-3 text-muted-foreground/60" />Banka
                      </label>
                      {tenantBanks.length > 0 ? (
                        <select
                          className="w-full h-9.5 rounded-xl border border-border bg-white px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium cursor-pointer"
                          value={bankName}
                          onChange={e => setBankName(e.target.value)}
                        >
                          <option value="">-- Banka --</option>
                          {tenantBanks.map((bank) => (
                            <option key={bank} value={bank}>{bank}</option>
                          ))}
                        </select>
                      ) : (
                        <div className="text-[9px] text-amber-500 font-bold border border-dashed border-amber-500/30 rounded-xl px-2 py-1 bg-amber-500/5 leading-tight">
                          Hesap Yok
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Cart search inside Mobile Cart */}
              <div className="relative pt-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
                <Input
                  placeholder="Sepetteki ürünlerde ara..."
                  className="h-8.5 pl-8.5 text-xs bg-slate-50/50 dark:bg-muted/10 border border-border/60 hover:border-border/80 focus-visible:ring-2 focus-visible:ring-primary/10 rounded-xl transition-all"
                  value={cartSearch}
                  onChange={(e) => setCartSearch(e.target.value)}
                />
              </div>
            </div>

            {/* Cart Product List for Mobile */}
            <div className="divide-y divide-border/40 bg-white dark:bg-card shadow-sm">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground bg-white dark:bg-card">
                  <ShoppingCart className="w-12 h-12 mb-3 opacity-20 text-muted-foreground animate-bounce-subtle" />
                  <p className="text-sm font-bold text-foreground/80">Sepetiniz boş</p>
                  <p className="text-xs mt-1 text-muted-foreground/60">Ürün ekleyerek hemen başlayın</p>
                </div>
              ) : filteredCart.map(item => {
                const discountedPrice = getDiscountedPrice(item);
                const hasDiscount = discountedPrice < (item.basePrice || item.unitPrice);
                const lineTotal = discountedPrice * item.multiplier * (Number(item.quantity) || 0);
                return (
                  <div key={item.productId} className="flex gap-3 px-4 py-4 hover:bg-slate-50/40 dark:hover:bg-muted/10 transition-colors relative group/item">
                    <div className="w-12 h-12 bg-slate-50 dark:bg-muted/30 rounded-xl flex-shrink-0 overflow-hidden flex items-center justify-center border border-border/40 p-1 shadow-sm">
                      {item.image
                        ? <img src={item.image} className="w-full h-full object-contain p-1" alt={item.name} />
                        : <div className="w-full h-full flex items-center justify-center"><Package className="w-5 h-5 text-muted-foreground/30" /></div>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-xs text-foreground/90 leading-snug line-clamp-2">{item.name}</div>
                      <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1.5 flex-wrap">
                        {hasDiscount && <span className="line-through opacity-70 font-mono">{formatPrice(item.basePrice || item.unitPrice)}</span>}
                        <span className={cn("font-semibold font-mono", hasDiscount ? "text-secondary font-bold" : "text-foreground/80")}>
                          {formatPrice(discountedPrice * item.multiplier)}
                        </span>
                        {isBoxMode && <span className="text-[10px] text-muted-foreground/60 font-medium">/ koli</span>}
                      </div>

                      {item.note && (
                        <div className="mt-1.5 flex items-center gap-1 text-[10px] text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-lg w-fit font-semibold shadow-sm animate-fade-in">
                          <StickyNote className="w-2.5 h-2.5 shrink-0" />
                          Not: <span className="truncate max-w-[160px]">{item.note}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between mt-3 gap-2">
                        <div className="flex flex-col">
                          <span className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-wider leading-none mb-0.5">Satır Toplamı</span>
                          <span className="font-extrabold text-xs text-secondary font-mono">{formatPrice(lineTotal)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openItemNoteEditor(item)}
                            className={cn(
                              "inline-flex h-6.5 w-6.5 items-center justify-center rounded-lg border transition-all shadow-sm",
                              item.note 
                                ? "border-amber-500/30 bg-amber-500/15 text-amber-600" 
                                : "border-border/60 bg-white text-muted-foreground"
                            )}
                            title="Not Ekle"
                          >
                            <StickyNote className="w-3.5 h-3.5" />
                          </button>
                          <div className="flex items-center border border-border/60 rounded-lg overflow-hidden bg-slate-50 dark:bg-muted/20 h-6.5 shadow-sm">
                            <button
                              type="button"
                              onClick={() => updateCartQuantity(item.productId, Math.max(0, (Number(item.quantity) || 0) - 1))}
                              className="w-5.5 h-full flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors font-bold text-xs"
                            >-</button>
                            <Input
                              type="number" min="1"
                              className="w-7 h-full text-center text-xs border-0 bg-transparent ring-0 focus-visible:ring-0 shadow-none p-0 font-bold font-mono"
                              value={item.quantity}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === "") return updateCartQuantity(item.productId, "");
                                const parsed = parseInt(val);
                                if (!Number.isNaN(parsed) && parsed >= 1) updateCartQuantity(item.productId, parsed);
                              }}
                              onBlur={() => { if (!item.quantity || Number(item.quantity) < 1) updateCartQuantity(item.productId, 1); }}
                            />
                            <button
                              type="button"
                              onClick={() => updateCartQuantity(item.productId, (Number(item.quantity) || 0) + 1)}
                              className="w-5.5 h-full flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors font-bold text-xs"
                            >+</button>
                          </div>
                        </div>
                      </div>
                      {item.piecesPerBox && (
                        <div className="text-[10px] text-muted-foreground/60 mt-1.5 font-bold font-mono">
                          Koli: {isBoxMode ? Number(item.quantity) || 0 : ((Number(item.quantity) || 0) / (Number(item.piecesPerBox) || 1)).toFixed(2)}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => updateCartQuantity(item.productId, 0)}
                      className="text-muted-foreground/50 hover:text-destructive transition-colors self-start p-1.5 rounded-lg hover:bg-destructive/10 shrink-0"
                      title="Sil"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
              {cart.length > 0 && filteredCart.length === 0 && (
                <div className="text-center text-xs text-muted-foreground py-10">Arama sonucu bulunamadı.</div>
              )}
            </div>
          </div>

          {/* Bottom fixed Action Section for Mobile */}
          {cart.length > 0 && (
            <div className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-card/95 border-t border-border shadow-lg p-4 pb-6 space-y-3.5 animate-slide-up backdrop-blur-md">
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-50 dark:bg-muted/10 border border-border/60 rounded-xl p-2 text-center shadow-inner">
                  <div className="text-[9px] font-bold text-muted-foreground/70 uppercase tracking-wider mb-0.5">Mevcut Kalem</div>
                  <div className="font-black text-sm text-foreground font-mono">{getLineCount()}</div>
                </div>
                <div className="bg-slate-50 dark:bg-muted/10 border border-border/60 rounded-xl p-2 text-center shadow-inner">
                  <div className="text-[9px] font-bold text-muted-foreground/70 uppercase tracking-wider mb-0.5">Toplam Koli</div>
                  <div className="font-black text-sm text-foreground font-mono">{getPackageTotal().toFixed(2)}</div>
                </div>
              </div>
              <div className="space-y-1.5">
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Siparişle ilgili genel not..."
                  className="h-9.5 text-xs bg-slate-50/50 border-border/60 rounded-xl focus-visible:ring-2 focus-visible:ring-primary/20"
                />
              </div>
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">TOPLAM TUTAR</span>
                <span className="text-base font-black text-secondary font-mono">{formatPrice(calculateTotal())}</span>
              </div>
              <Button
                className="w-full brand-gradient text-white hover:opacity-95 active:scale-98 transition-all font-bold text-xs uppercase tracking-widest py-5.5 rounded-xl shadow-md shadow-secondary/15 flex items-center justify-center gap-2 group/mobile-btn"
                size="lg"
                onClick={completeSale}
              >
                <ShoppingCart className="w-4 h-4 animate-bounce-subtle" />
                Satışı Tamamla
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Main responsive grid layout */}
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_400px] gap-6 items-start">
        
        {/* Left Column: Products Listing */}
        <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-5">
          {filteredProducts.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-24 text-muted-foreground bg-white dark:bg-card border border-border/60 rounded-2xl shadow-sm">
              <Package className="w-12 h-12 mb-3.5 opacity-20 text-muted-foreground animate-pulse" />
              <p className="text-sm font-bold text-foreground/85">Hiç ürün bulunamadı</p>
              <p className="text-xs mt-1 text-muted-foreground/60">Arama kriterlerini değiştirip tekrar deneyin</p>
            </div>
          )}
          
          {filteredProducts.map((p) => {
            const addQty = addQuantities[p.id] ?? "";
            const img = p.images?.[0]?.thumbUrl || p.images?.[0]?.originalUrl;
            return (
              <div key={p.id} className="bg-white dark:bg-card border border-border/60 rounded-2xl shadow-sm hover:shadow-xl hover:border-border/100 hover:scale-[1.01] transition-all duration-300 flex flex-col overflow-hidden group">
                {/* Product image with sleek ratio */}
                {img ? (
                  <div className="aspect-[4/3] w-full overflow-hidden bg-slate-50/30 dark:bg-muted/5 border-b border-border/40 flex items-center justify-center relative p-3">
                    <img src={img} alt={p.name} className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-300 ease-out" />
                  </div>
                ) : (
                  <div className="aspect-[4/3] w-full bg-slate-50/30 dark:bg-muted/5 border-b border-border/40 flex items-center justify-center">
                    <Package className="w-9 h-9 text-muted-foreground/20" />
                  </div>
                )}

                {/* Card Body */}
                <div className="p-4 flex flex-col flex-1">
                  {fastSalesSettings.category && p.category?.name && (
                    <div className="text-[10px] font-bold text-primary/80 bg-primary/5 uppercase tracking-wider mb-1.5 px-2.5 py-0.5 rounded w-fit leading-none">
                      {p.category.name}
                    </div>
                  )}
                  <h3 className="font-bold text-foreground/90 text-sm leading-snug line-clamp-2 mb-3 min-h-[40px] group-hover:text-primary transition-colors duration-200">
                    {p.name}
                  </h3>

                  {/* Details Grid */}
                  <div className="space-y-1.5 text-xs text-muted-foreground/90 mb-4 flex-1">
                    {fastSalesSettings.sku && p.sku && (
                      <div className="flex items-center justify-between py-0.5 border-b border-dashed border-border/40">
                        <span className="text-muted-foreground/70 font-medium">Stok Kodu (SKU)</span>
                        <span className="font-semibold text-foreground font-mono bg-slate-50 dark:bg-muted/20 px-1.5 py-0.5 rounded">{p.sku}</span>
                      </div>
                    )}
                    {fastSalesSettings.barcode && p.barcode && (
                      <div className="flex items-center justify-between py-0.5 border-b border-dashed border-border/40">
                        <span className="text-muted-foreground/70 font-medium">Barkod</span>
                        <span className="font-mono font-medium text-foreground">{p.barcode}</span>
                      </div>
                    )}
                    {fastSalesSettings.stock && (
                      <div className="flex items-center justify-between py-0.5 border-b border-dashed border-border/40">
                        <span className="text-muted-foreground/70 font-medium">Stok Durumu</span>
                        <span className={cn("font-bold px-1.5 py-0.5 rounded text-[11px] font-mono", p.stock <= 0 ? "bg-red-50 text-red-500 dark:bg-red-500/10" : "bg-green-50 text-green-600 dark:bg-green-500/10")}>
                          {p.stock <= 0 ? "Tükendi" : `${p.stock} Adet`}
                        </span>
                      </div>
                    )}
                    {fastSalesSettings.piecesPerBox && p.piecesPerBox && (
                      <div className="flex items-center justify-between py-0.5">
                        <span className="text-muted-foreground/70 font-medium">Koli İçi Adet</span>
                        <span className="font-semibold text-foreground bg-amber-500/10 text-amber-600 px-1.5 py-0.5 rounded">{p.piecesPerBox}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions & Pricing */}
                  <div className="border-t border-border/50 pt-3.5 mt-auto">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 leading-none mb-0.5">Birim Fiyat</span>
                        <span className="text-lg font-black text-secondary font-mono">{formatPrice(p.price)}</span>
                      </div>
                      {p.brand?.name && (
                        <span className="text-[10px] font-extrabold text-primary/80 bg-primary/10 px-2.5 py-1 rounded-full uppercase tracking-wider">
                          {p.brand.name}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <div className="flex items-center border border-border/60 rounded-xl overflow-hidden bg-slate-50 dark:bg-muted/10 h-10 w-28 shadow-inner shrink-0 transition-colors focus-within:border-primary/45">
                        <button
                          type="button"
                          className="w-8 h-full flex items-center justify-center text-muted-foreground hover:bg-slate-100 hover:text-foreground transition-colors font-bold text-base"
                          onClick={() => changeAddQuantity(p.id, -1)}
                        >-</button>
                        <Input
                          type="number" min="0"
                          className="flex-1 h-full text-center text-xs border-0 bg-transparent ring-0 focus-visible:ring-0 shadow-none p-0 font-bold font-mono"
                          value={addQty} placeholder=""
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === "") return setAddQuantity(p.id, "");
                            const parsed = parseInt(val);
                            if (!Number.isNaN(parsed) && parsed >= 0) setAddQuantity(p.id, parsed);
                          }}
                        />
                        <button
                          type="button"
                          className="w-8 h-full flex items-center justify-center text-muted-foreground hover:bg-slate-100 hover:text-foreground transition-colors font-bold text-base"
                          onClick={() => changeAddQuantity(p.id, 1)}
                        >+</button>
                      </div>
                      <Button
                        size="sm"
                        className="flex-1 h-10 brand-gradient text-white hover:opacity-95 active:scale-98 transition-all text-xs font-bold uppercase tracking-wider gap-2 rounded-xl shadow-md shadow-secondary/15 group/add-btn"
                        onClick={() => addToCart(p)}
                      >
                        <ShoppingCart className="w-4 h-4 group-hover/add-btn:translate-x-0.5 transition-transform" />
                        Ekle
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column: Desktop Cart Aside (Always visible on large screens) */}
        <aside className={`${isMobileCartOpen ? "block" : "hidden"} xl:block xl:sticky xl:top-[88px] bg-white dark:bg-card border border-border/60 shadow-lg shadow-slate-100/50 dark:shadow-none rounded-2xl overflow-hidden transition-all duration-300`}>
          {/* Header */}
          <div className="px-4 py-3.5 border-b border-border/60 flex items-center justify-between bg-slate-50/50 dark:bg-muted/5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl brand-gradient flex items-center justify-center shadow-md shadow-secondary/10">
                <ShoppingCart className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="font-extrabold text-foreground text-sm tracking-tight">Alışveriş Sepeti</h3>
                <p className="text-[10px] text-muted-foreground/70 font-semibold uppercase tracking-wider">{getLineCount()} KALEM</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-white bg-secondary px-2.5 py-0.5 rounded-full shadow-sm">{getLineCount()} ÖĞE</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 xl:hidden text-muted-foreground hover:bg-slate-100 rounded-lg transition-all"
                onClick={() => setIsMobileCartOpen(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Customer Selection Panel */}
          <div className="border-b border-border/60 bg-white dark:bg-card">
            <button
              type="button"
              onClick={() => setIsCustomerPanelOpen((open) => !open)}
              className="flex w-full items-center justify-between px-4 py-4 text-left hover:bg-slate-50/50 dark:hover:bg-muted/5 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors", selectedCustomer ? "bg-secondary/10 text-secondary" : "bg-slate-100 dark:bg-muted text-muted-foreground")}>
                  <User className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider leading-none mb-1">Müşteri Cari Bilgisi</div>
                  <div className="text-xs font-bold text-foreground truncate">
                    {selectedCustomer ? `${selectedCustomer.name}` : "Seçilmemiş (Müşteri Seçiniz)"}
                  </div>
                </div>
              </div>
              <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform shrink-0", isCustomerPanelOpen && "rotate-180")} />
            </button>

            {isCustomerPanelOpen && (
              <div className="px-4 pb-4 space-y-3.5 border-t border-border/60 bg-slate-50/30 dark:bg-muted/5 animate-fade-in">
                <div className="pt-3">
                  <label className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider mb-1.5 block">Cari Seç</label>
                  <select
                    className="w-full h-9.5 rounded-xl border border-border bg-white dark:bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer hover:bg-slate-50 transition-all font-medium"
                    value={customerId}
                    onChange={e => setCustomerId(e.target.value)}
                  >
                    <option value="">Müşteri seçiniz...</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  {selectedCustomer && (
                    <div className="mt-2.5 flex items-center justify-between gap-2 rounded-xl border border-secondary/20 bg-secondary/5 px-3.5 py-2 shadow-inner animate-pulse-subtle">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-secondary shrink-0" />
                        <span className="text-[10px] font-bold text-secondary uppercase tracking-wider">Cari Bakiye</span>
                      </div>
                      <span className="text-xs text-secondary font-black font-mono">{formatPrice(Number(selectedCustomer.balance) || 0)}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-muted-foreground/60" />Ödeme Yöntemi
                  </label>
                  <select
                    className="w-full h-9.5 rounded-xl border border-border bg-white dark:bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer hover:bg-slate-50 transition-all font-medium"
                    value={paymentType}
                    onChange={e => {
                      setPaymentType(e.target.value);
                      setBankName("");
                    }}
                  >
                    <option value="CASH">Nakit Ödeme</option>
                    <option value="CREDIT_CARD">Kredi Kartı</option>
                    <option value="TRANSFER">Havale / EFT</option>
                  </select>
                </div>

                {(paymentType === "CREDIT_CARD" || paymentType === "TRANSFER") && (
                  <div className="animate-fade-in">
                    <label className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <Building className="w-3.5 h-3.5 text-muted-foreground/60" />Banka Seçimi
                    </label>
                    {tenantBanks.length > 0 ? (
                      <select
                        className="w-full h-9.5 rounded-xl border border-border bg-white dark:bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer hover:bg-slate-50 transition-all font-medium"
                        value={bankName}
                        onChange={e => setBankName(e.target.value)}
                      >
                        <option value="">-- Banka Seçiniz --</option>
                        {tenantBanks.map((bank) => (
                          <option key={bank} value={bank}>{bank}</option>
                        ))}
                      </select>
                    ) : (
                      <div className="text-xs text-amber-500 py-2.5 border border-dashed border-amber-500/30 rounded-xl px-3 bg-amber-500/5 font-medium leading-relaxed">
                        Lütfen önce Ayarlar sayfasından banka hesaplarınızı tanımlayın.
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-muted-foreground/60" />Genel Sipariş Notu
                  </label>
                  <Input
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Siparişle ilgili genel not..."
                    className="h-9.5 rounded-xl text-sm bg-white dark:bg-card border-border/80 focus-visible:ring-2 focus-visible:ring-primary/20"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Cart search inside aside */}
          <div className="px-4 py-3 border-b border-border/60 bg-slate-50/30 dark:bg-muted/5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
              <Input
                placeholder="Sepetteki ürünlerde ara..."
                className="h-8.5 pl-8.5 text-xs bg-white dark:bg-card border-border/60 hover:border-border/80 focus-visible:ring-2 focus-visible:ring-primary/10 rounded-xl transition-all"
                value={cartSearch}
                onChange={(e) => setCartSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Cart Items List for desktop */}
          <div className="max-h-[380px] overflow-y-auto custom-scrollbar divide-y divide-border/40 bg-white dark:bg-card">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <ShoppingCart className="w-10 h-10 mb-2.5 opacity-20 text-muted-foreground animate-pulse" />
                <p className="text-xs font-bold text-foreground/80">Sepetiniz boş</p>
                <p className="text-[11px] mt-0.5 text-muted-foreground/60">Sol taraftan ürün ekleyebilirsiniz</p>
              </div>
            ) : filteredCart.map(item => {
              const discountedPrice = getDiscountedPrice(item);
              const hasDiscount = discountedPrice < (item.basePrice || item.unitPrice);
              const lineTotal = discountedPrice * item.multiplier * (Number(item.quantity) || 0);
              return (
                <div key={item.productId} className="flex gap-3 px-4 py-3.5 hover:bg-slate-50/50 dark:hover:bg-muted/10 transition-colors relative group/item">
                  <div className="w-11 h-11 bg-slate-50 dark:bg-muted/30 rounded-xl flex-shrink-0 overflow-hidden flex items-center justify-center border border-border/40 p-1">
                    {item.image
                      ? <img src={item.image} className="w-full h-full object-contain p-0.5" alt={item.name} />
                      : <div className="w-full h-full flex items-center justify-center"><Package className="w-5 h-5 text-muted-foreground/30" /></div>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-xs text-foreground/90 leading-snug line-clamp-2">{item.name}</div>
                    <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1.5 flex-wrap">
                      {hasDiscount && <span className="line-through opacity-70 font-mono">{formatPrice(item.basePrice || item.unitPrice)}</span>}
                      <span className={cn("font-semibold font-mono", hasDiscount ? "text-secondary font-bold" : "text-foreground/80")}>
                        {formatPrice(discountedPrice * item.multiplier)}
                      </span>
                      {isBoxMode && <span className="text-[10px] text-muted-foreground/60 font-medium">/ koli</span>}
                    </div>

                    {item.note && (
                      <div className="mt-1.5 flex items-center gap-1 text-[10px] text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-lg w-fit font-semibold shadow-sm animate-fade-in">
                        <StickyNote className="w-2.5 h-2.5 shrink-0" />
                        Not: <span className="truncate max-w-[150px]">{item.note}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-2.5 gap-2">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-wider leading-none mb-0.5">Satır Toplamı</span>
                        <span className="font-extrabold text-xs text-secondary font-mono">{formatPrice(lineTotal)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openItemNoteEditor(item)}
                          className={cn(
                            "inline-flex h-6.5 w-6.5 items-center justify-center rounded-lg border transition-all shadow-sm",
                            item.note 
                              ? "border-amber-500/30 bg-amber-500/15 text-amber-600" 
                              : "border-border/60 bg-white text-muted-foreground hover:bg-slate-50 hover:text-foreground"
                          )}
                          title="Not Ekle"
                        >
                          <StickyNote className="w-3.5 h-3.5" />
                        </button>
                        <div className="flex items-center border border-border/60 rounded-lg overflow-hidden bg-slate-50 dark:bg-muted/20 h-6.5 shadow-sm">
                          <button
                            type="button"
                            onClick={() => updateCartQuantity(item.productId, Math.max(0, (Number(item.quantity) || 0) - 1))}
                            className="w-5.5 h-full flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors font-bold text-xs"
                          >-</button>
                          <Input
                            type="number" min="1"
                            className="w-7 h-full text-center text-xs border-0 bg-transparent ring-0 focus-visible:ring-0 shadow-none p-0 font-bold font-mono"
                            value={item.quantity}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === "") return updateCartQuantity(item.productId, "");
                              const parsed = parseInt(val);
                              if (!Number.isNaN(parsed) && parsed >= 1) updateCartQuantity(item.productId, parsed);
                            }}
                            onBlur={() => { if (!item.quantity || Number(item.quantity) < 1) updateCartQuantity(item.productId, 1); }}
                          />
                          <button
                            type="button"
                            onClick={() => updateCartQuantity(item.productId, (Number(item.quantity) || 0) + 1)}
                            className="w-5.5 h-full flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors font-bold text-xs"
                          >+</button>
                        </div>
                      </div>
                    </div>
                    {item.piecesPerBox && (
                      <div className="text-[10px] text-muted-foreground/60 mt-1.5 font-bold font-mono">
                        Koli: {isBoxMode ? Number(item.quantity) || 0 : ((Number(item.quantity) || 0) / (Number(item.piecesPerBox) || 1)).toFixed(2)}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => updateCartQuantity(item.productId, 0)}
                    className="text-muted-foreground/50 hover:text-destructive transition-colors self-start p-1 rounded-lg hover:bg-destructive/10 shrink-0"
                    title="Sil"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
            {cart.length > 0 && filteredCart.length === 0 && (
              <div className="text-center text-xs text-muted-foreground py-10">Arama sonucu bulunamadı.</div>
            )}
          </div>

          {/* Cart Summary for desktop */}
          {cart.length > 0 && (
            <div className="p-4 border-t border-border/60 bg-slate-50/50 dark:bg-muted/10 space-y-3.5">
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white dark:bg-card border border-border/50 rounded-xl p-2.5 text-center shadow-sm hover:shadow-md transition-shadow">
                  <div className="text-[9px] font-bold text-muted-foreground/70 uppercase tracking-wider mb-0.5">Toplam Kalem</div>
                  <div className="font-extrabold text-sm text-foreground font-mono">{getLineCount()}</div>
                </div>
                <div className="bg-white dark:bg-card border border-border/50 rounded-xl p-2.5 text-center shadow-sm hover:shadow-md transition-shadow">
                  <div className="text-[9px] font-bold text-muted-foreground/70 uppercase tracking-wider mb-0.5">Toplam Koli</div>
                  <div className="font-extrabold text-sm text-foreground font-mono">{getPackageTotal().toFixed(2)}</div>
                </div>
              </div>
              <div className="flex items-center justify-between bg-white dark:bg-card border border-border/50 rounded-xl px-4 py-3 shadow-sm hover:shadow-md transition-shadow">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">GENEL TOPLAM</span>
                <span className="text-base font-black text-secondary font-mono">{formatPrice(calculateTotal())}</span>
              </div>
              <Button
                className="w-full brand-gradient text-white hover:opacity-95 active:scale-98 transition-all font-bold text-xs uppercase tracking-widest py-5.5 rounded-xl shadow-lg shadow-secondary/15 flex items-center justify-center gap-2 group/btn"
                size="lg"
                onClick={completeSale}
              >
                <ShoppingCart className="w-4 h-4 group-hover/btn:translate-x-0.5 transition-transform" />
                Satışı Tamamla
              </Button>
            </div>
          )}
        </aside>
      </div>

      {/* Note Editor Modal dialog */}
      <Dialog open={noteEditor.open} onOpenChange={(open) => setNoteEditor((prev) => ({ ...prev, open }))}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Ürün Notu Ekle / Düzenle</DialogTitle>
          </DialogHeader>
          <div className="space-y-3.5 pt-2">
            <div className="text-xs text-muted-foreground font-bold uppercase tracking-wider bg-slate-50 dark:bg-muted/10 px-3 py-1.5 rounded-lg border border-border/60">{noteEditor.productName}</div>
            <textarea
              value={noteEditor.value}
              onChange={(e) => setNoteEditor((prev) => ({ ...prev, value: e.target.value }))}
              placeholder="Sadece bu ürüne ait sipariş notu..."
              className="min-h-28 w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm focus-visible:outline-none focus:ring-2 focus:ring-primary/20 focus:border-border/80 transition-all"
            />
            <div className="flex justify-end gap-2.5 pt-1">
              <Button type="button" variant="outline" className="rounded-xl" onClick={() => setNoteEditor({ open: false, productId: "", productName: "", value: "" })}>
                Vazgeç
              </Button>
              <Button type="button" className="brand-gradient text-white hover:opacity-95 rounded-xl px-5 font-bold text-xs uppercase tracking-wider" onClick={saveItemNote}>Notu Kaydet</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <CameraXScanner isOpen={isScannerOpen} onClose={() => setIsScannerOpen(false)} onScan={handleBarcodeScanned} continuous={false} />
    </div>
  );
}



