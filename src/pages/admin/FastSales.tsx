import { useState, useEffect, useMemo } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronDown, Search, Barcode, ShoppingCart, Trash2, Package, User, CreditCard, FileText, Tag, Boxes, SlidersHorizontal, ArrowUpDown, X } from "lucide-react";

const formatPrice = (price: number) => {
  return price.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " TL";
};

export default function FastSales() {
  const { token, user: currentUser } = useAuthStore();
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
  const [notes, setNotes] = useState("");

  const orderMode = currentUser?.tenant?.orderMode || "UNIT";
  const isBoxMode = orderMode === "BOX";
  const cartStorageKey = currentUser?.id ? `fast-sales-cart:${currentUser.id}:${currentUser.tenantId || "platform"}` : "";

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
      return [...prev, { productId: product.id, categoryId: product.categoryId, name: product.name, unitPrice: product.price, quantity, multiplier, piecesPerBox: product.piecesPerBox || null, packagingType: product.packagingType || null, basePrice: product.price, image }];
    });
    setAddQuantity(product.id, "");
  };

  const updateCartQuantity = (productId: string, val: number | "") => {
    if (val === "") { setCart((prev) => prev.map(i => i.productId === productId ? { ...i, quantity: "" } : i)); return; }
    if (val <= 0) { setCart((prev) => prev.filter(i => i.productId !== productId)); return; }
    setCart((prev) => prev.map(i => i.productId === productId ? { ...i, quantity: val } : i));
  };

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

  const completeSale = async () => {
    if (!customerId) return alert("Lütfen müşteri seçiniz");
    if (cart.length === 0) return alert("Sepetiniz boş");
    const totalAmount = calculateTotal();
    const finalCart = cart.map(i => ({ ...i, unitPrice: getDiscountedPrice(i), quantity: (Number(i.quantity) || 0) * i.multiplier }));
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ customerId, paymentType, notes, totalAmount, items: finalCart })
    });
    if (res.ok) {
      alert("Satış tamamlandı");
      setCart([]);
      if (cartStorageKey) { try { localStorage.removeItem(cartStorageKey); } catch(e) {} }
      fetchProducts();
    } else { alert("Hata oluştu"); }
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
    <div className="space-y-0 md:space-y-5 animate-fade-in">
      {/* Toolbar */}
      <div className="sticky top-0 z-20 -mt-3 md:mt-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75 border-0 md:border md:border-border rounded-none md:rounded-xl p-3 shadow-none md:shadow-sm">
        <div className="md:hidden space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Ürün adı, barkod veya stok kodu ara..."
              className="pl-9 h-10 bg-muted/40 border-0 focus-visible:ring-1 focus-visible:ring-ring"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-4 gap-2">
            <Button variant="outline" size="icon" className="h-10 w-full" title="Barkod Okut" aria-label="Barkod okut">
              <Barcode className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              type="button"
              className={cn("h-10 w-full", categoryFilter && "border-primary bg-primary/10 text-primary")}
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
              className={cn("h-10 w-full", sortBy && "border-primary bg-primary/10 text-primary")}
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
              className="relative h-10 w-full"
              title="Sepet"
              aria-label={`Sepet, ${getLineCount()} kalem`}
              onClick={() => setIsMobileCartOpen((prev) => !prev)}
            >
              <ShoppingCart className="w-4 h-4 text-secondary" />
              {getLineCount() > 0 && (
                <span className="absolute -right-1 -top-1 min-w-[20px] h-5 px-1.5 rounded-full brand-gradient text-white text-xs font-bold flex items-center justify-center">
                  {getLineCount()}
                </span>
              )}
            </Button>
          </div>
        </div>

        <div className="hidden md:flex flex-wrap xl:flex-nowrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Ürün adı, barkod veya stok kodu ara..."
              className="pl-9 h-9 bg-muted/40 border-0 focus-visible:ring-1 focus-visible:ring-ring"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button variant="outline" size="sm" className="h-9 px-3 gap-1.5 shrink-0" title="Barkod Okut">
            <Barcode className="w-4 h-4" />
            <span className="hidden sm:inline text-xs">Barkod</span>
          </Button>
          <select
            className="h-9 rounded-lg border border-border bg-muted/40 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring md:w-[160px]"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            aria-label="Ürünleri kategoriye göre filtrele"
          >
            <option value="">Filtrele</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
          <select
            className="h-9 rounded-lg border border-border bg-muted/40 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring md:w-[140px]"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="">Sırala</option>
            <option value="price_asc">Fiyat Artan</option>
            <option value="price_desc">Fiyat Azalan</option>
          </select>
          <div className="relative shrink-0">
            <Button
              variant="outline"
              size="sm"
              type="button"
              className="h-9 gap-2"
              onClick={() => setIsMobileCartOpen((prev) => !prev)}
            >
              <ShoppingCart className="w-4 h-4 text-secondary" />
              <span className="text-xs font-medium">Sepet</span>
              {getLineCount() > 0 && (
                <span className="min-w-[20px] h-5 px-1.5 rounded-full brand-gradient text-white text-xs font-bold flex items-center justify-center">
                  {getLineCount()}
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>

      {activeMobileSheet && (
        <div className="md:hidden fixed inset-0 z-50 flex items-end">
          <button
            type="button"
            className="absolute inset-0 bg-background/70 backdrop-blur-sm"
            aria-label="Filtre sıralama panelini kapat"
            onClick={() => setActiveMobileSheet(null)}
          />
          <div className="relative w-full max-h-[75dvh] overflow-y-auto rounded-t-2xl border border-border bg-card p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl">
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-muted-foreground/30" />
            {mobileSheetContent}
          </div>
        </div>
      )}

      {/* Main grid */}
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_400px] gap-5 items-start">

        {/* Products */}
        <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-4">
          {filteredProducts.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-20 text-muted-foreground bg-card border border-border rounded-xl">
              <Package className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm font-medium">Ürün bulunamadı</p>
            </div>
          )}
          {filteredProducts.map((p) => {
            const addQty = addQuantities[p.id] ?? "";
            const img = p.images?.[0]?.thumbUrl || p.images?.[0]?.originalUrl;
            return (
              <div key={p.id} className="bg-card border-0 md:border md:border-border rounded-xl shadow-none md:shadow-sm flex flex-col card-hover overflow-hidden">
                {/* Product image banner */}
                {img ? (
                  <div className="h-32 overflow-hidden bg-muted/30 border-b border-border/60 flex items-center justify-center">
                    <img src={img} alt={p.name} className="w-full h-full object-contain p-2" />
                  </div>
                ) : (
                  <div className="h-32 bg-muted/30 flex items-center justify-center">
                    <Package className="w-10 h-10 text-muted-foreground/40" />
                  </div>
                )}

                <div className="p-4 flex flex-col flex-1">
                  <h3 className="font-semibold text-foreground text-sm leading-snug line-clamp-2 mb-3">
                    {p.name}
                  </h3>

                  <div className="space-y-1 text-xs text-muted-foreground mb-3 flex-1">
                    {fastSalesSettings.sku && p.sku && (
                      <div className="flex items-center gap-1.5">
                        <Tag className="w-3 h-3 shrink-0" />
                        <span className="font-medium text-foreground/70">{p.sku}</span>
                      </div>
                    )}
                    {fastSalesSettings.barcode && p.barcode && (
                      <div className="flex items-center gap-1.5">
                        <Barcode className="w-3 h-3 shrink-0" />
                        <span>{p.barcode}</span>
                      </div>
                    )}
                    {fastSalesSettings.category && p.category?.name && (
                      <div className="flex items-center gap-1.5">
                        <Boxes className="w-3 h-3 shrink-0" />
                        <span>{p.category.name}</span>
                      </div>
                    )}
                    {fastSalesSettings.stock && (
                      <div className="flex items-center gap-1.5">
                        <Package className="w-3 h-3 shrink-0" />
                        <span>Stok: <span className="font-semibold text-foreground">{p.stock}</span></span>
                      </div>
                    )}
                    {fastSalesSettings.piecesPerBox && p.piecesPerBox && (
                      <div className="flex items-center gap-1.5">
                        <Boxes className="w-3 h-3 shrink-0" />
                        <span>Koli Adeti: {p.piecesPerBox}</span>
                      </div>
                    )}
                  </div>

                  {/* Price + add to cart */}
                  <div className="border-t border-border pt-3 mt-auto">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-lg font-bold text-secondary">{formatPrice(p.price)}</span>
                      {p.brand?.name && <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{p.brand.name}</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center border border-border rounded-lg overflow-hidden bg-muted/30">
                        <button
                          type="button"
                          className="w-7 h-8 flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors font-bold text-base"
                          onClick={() => changeAddQuantity(p.id, -1)}
                        >-</button>
                        <Input
                          type="number" min="0"
                          className="w-12 h-8 text-center text-sm border-0 bg-transparent ring-0 focus-visible:ring-0 shadow-none p-0 font-semibold"
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
                          className="w-7 h-8 flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors font-bold text-base"
                          onClick={() => changeAddQuantity(p.id, 1)}
                        >+</button>
                      </div>
                      <Button
                        size="sm"
                        className="flex-1 h-8 brand-gradient text-white hover:opacity-90 transition-opacity text-xs font-semibold gap-1.5"
                        onClick={() => addToCart(p)}
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                        Ekle
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Cart aside */}
        <aside className={`${isMobileCartOpen ? "block" : "hidden"} xl:block xl:sticky xl:top-24 bg-card border border-border rounded-xl shadow-sm overflow-hidden`}>
          {/* Cart header */}
          <div className="px-4 py-3.5 border-b border-border flex items-center justify-between bg-muted/30">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg brand-gradient flex items-center justify-center">
                <ShoppingCart className="w-4 h-4 text-white" />
              </div>
              <h3 className="font-bold text-foreground">Sepet</h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground bg-muted px-2.5 py-1 rounded-full">{getLineCount()} kalem</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 xl:hidden"
                onClick={() => setIsMobileCartOpen(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Customer panel */}
          <div className="border-b border-border">
            <button
              type="button"
              onClick={() => setIsCustomerPanelOpen((open) => !open)}
              className="flex w-full items-center justify-between px-4 py-3.5 text-left hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${selectedCustomer ? "bg-secondary/15" : "bg-muted"}`}>
                  <User className={`w-3.5 h-3.5 ${selectedCustomer ? "text-secondary" : "text-muted-foreground"}`} />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-foreground">Müşteri</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {selectedCustomer ? `${selectedCustomer.name}` : "Seçilmedi"}
                  </div>
                </div>
              </div>
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform shrink-0 ${isCustomerPanelOpen ? "rotate-180" : ""}`} />
            </button>

            {isCustomerPanelOpen && (
              <div className="px-4 pb-4 space-y-3 border-t border-border bg-muted/20">
                <div className="pt-3">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Müşteri Seç</label>
                  <select
                    className="w-full h-9 rounded-lg border border-border bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    value={customerId}
                    onChange={e => setCustomerId(e.target.value)}
                  >
                    <option value="">Müşteri seçiniz...</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  {selectedCustomer && (
                    <div className="mt-2 flex items-center gap-2 rounded-lg border border-secondary/20 bg-secondary/5 px-3 py-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-secondary shrink-0" />
                      <span className="text-xs text-secondary font-medium">Bakiye: {formatPrice(Number(selectedCustomer.balance) || 0)}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                    <CreditCard className="w-3 h-3" />Ödeme Tipi
                  </label>
                  <select
                    className="w-full h-9 rounded-lg border border-border bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    value={paymentType}
                    onChange={e => setPaymentType(e.target.value)}
                  >
                    <option value="CASH">Nakit</option>
                    <option value="CREDIT_CARD">Kredi Kartı</option>
                    <option value="TRANSFER">Havale / EFT</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                    <FileText className="w-3 h-3" />Notlar
                  </label>
                  <Input
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Sipariş notu..."
                    className="h-9 text-sm bg-card"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Cart search */}
          <div className="px-4 py-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Sepette ara..."
                className="h-8 pl-8 text-xs bg-muted/30 border-0 focus-visible:ring-1"
                value={cartSearch}
                onChange={(e) => setCartSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Cart items */}
          <div className="max-h-[380px] overflow-y-auto custom-scrollbar divide-y divide-border">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-muted-foreground">
                <ShoppingCart className="w-8 h-8 mb-2 opacity-25" />
                <p className="text-sm font-medium">Sepet boş</p>
                <p className="text-xs mt-1 opacity-70">Ürün ekleyerek başlayın</p>
              </div>
            ) : filteredCart.map(item => {
              const discountedPrice = getDiscountedPrice(item);
              const hasDiscount = discountedPrice < (item.basePrice || item.unitPrice);
              const lineTotal = discountedPrice * item.multiplier * (Number(item.quantity) || 0);
              return (
                <div key={item.productId} className="flex gap-3 px-4 py-3 hover:bg-muted/20 transition-colors">
                  <div className="w-12 h-12 bg-muted rounded-lg flex-shrink-0 overflow-hidden flex items-center justify-center">
                    {item.image
                      ? <img src={item.image} className="w-full h-full object-contain p-1" alt={item.name} />
                      : <div className="w-full h-full flex items-center justify-center"><Package className="w-5 h-5 text-muted-foreground/40" /></div>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-xs text-foreground leading-snug line-clamp-2">{item.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {hasDiscount && <span className="line-through mr-1.5">{formatPrice(item.basePrice || item.unitPrice)}</span>}
                      <span className={hasDiscount ? "text-secondary font-semibold" : ""}>{formatPrice(discountedPrice * item.multiplier)}</span>
                      {isBoxMode && <span className="ml-1 opacity-70">/ koli</span>}
                    </div>
                    <div className="flex items-center justify-between mt-1.5 gap-2">
                      <span className="font-bold text-xs text-secondary">{formatPrice(lineTotal)}</span>
                      <div className="flex items-center border border-border rounded-lg overflow-hidden bg-muted/30">
                        <button
                          type="button"
                          onClick={() => updateCartQuantity(item.productId, Math.max(0, (Number(item.quantity) || 0) - 1))}
                          className="w-6 h-6 flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors font-bold text-sm"
                        >-</button>
                        <Input
                          type="number" min="1"
                          className="w-9 h-6 text-center text-xs border-0 bg-transparent ring-0 focus-visible:ring-0 shadow-none p-0 font-semibold"
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
                          className="w-6 h-6 flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors font-bold text-sm"
                        >+</button>
                      </div>
                    </div>
                    {item.piecesPerBox && (
                      <div className="text-xs text-muted-foreground/70 mt-0.5">
                        Koli: {isBoxMode ? Number(item.quantity) || 0 : ((Number(item.quantity) || 0) / (Number(item.piecesPerBox) || 1)).toFixed(2)}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => updateCartQuantity(item.productId, 0)}
                    className="text-muted-foreground hover:text-destructive transition-colors self-start p-1 rounded hover:bg-destructive/10"
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

          {/* Cart summary */}
          {cart.length > 0 && (
            <div className="p-4 border-t border-border bg-muted/20 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-card border border-border rounded-lg p-2.5 text-center">
                  <div className="text-xs text-muted-foreground mb-0.5">Kalem</div>
                  <div className="font-bold text-sm text-foreground">{getLineCount()}</div>
                </div>
                <div className="bg-card border border-border rounded-lg p-2.5 text-center">
                  <div className="text-xs text-muted-foreground mb-0.5">Koli</div>
                  <div className="font-bold text-sm text-foreground">{getPackageTotal().toFixed(2)}</div>
                </div>
              </div>
              <div className="flex items-center justify-between bg-card border border-border rounded-lg px-4 py-3">
                <span className="text-sm font-semibold text-foreground">Toplam</span>
                <span className="text-base font-bold text-secondary">{formatPrice(calculateTotal())}</span>
              </div>
              <Button
                className="w-full brand-gradient text-white hover:opacity-90 transition-opacity font-semibold gap-2"
                size="lg"
                onClick={completeSale}
              >
                <ShoppingCart className="w-4 h-4" />
                Satışı Tamamla
              </Button>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
