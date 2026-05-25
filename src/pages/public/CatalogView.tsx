import { FormEvent, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowUpDown, ChevronDown, Search, ShoppingCart, SlidersHorizontal, X, Package, Tag, StickyNote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useCustomerAuthStore } from "@/store/useCustomerAuthStore";
import { useToastActions } from "@/components/ui/toast";

const formatPrice = (price: number) => {
  return price.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " TL";
};

export default function CatalogView() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const customerUsername = searchParams.get("customer") || "";
  const customerToken = useCustomerAuthStore((state) => state.token);
  const isCustomerAuthInitialized = useCustomerAuthStore((state) => state.isInitialized);
  const cartStorageKey = slug ? `catalog-cart:${slug}:${customerUsername || "public"}` : "";
  const toast = useToastActions();

  const [catalog, setCatalog] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<any[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [cartSearch, setCartSearch] = useState("");

  const [customerForm, setCustomerForm] = useState({ name: "", email: "", phone: "" });
  const [isCustomerInfoOpen, setIsCustomerInfoOpen] = useState(false);
  const [orderNotes, setOrderNotes] = useState("");
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [itemNoteEditor, setItemNoteEditor] = useState<{ open: boolean; productId: string; productName: string; value: string }>({
    open: false,
    productId: "",
    productName: "",
    value: "",
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [activeFilterPanel, setActiveFilterPanel] = useState<"price" | "sort" | null>(null);
  const [addQuantities, setAddQuantities] = useState<Record<string, number | "">>({});

  useEffect(() => {
    if (!cartStorageKey) return;
    try {
      const saved = localStorage.getItem(cartStorageKey);
      if (!saved) return;
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed.cart)) setCart(parsed.cart);
      if (parsed.customerForm) setCustomerForm(parsed.customerForm);
      if (typeof parsed.orderNotes === "string") setOrderNotes(parsed.orderNotes);
    } catch (e) {}
  }, [cartStorageKey]);

  useEffect(() => {
    if (!cartStorageKey) return;
    try {
      localStorage.setItem(cartStorageKey, JSON.stringify({ cart, customerForm, orderNotes }));
    } catch (e) {}
  }, [cartStorageKey, cart, customerForm, orderNotes]);

  useEffect(() => {
    if (!slug) return;
    if (customerUsername && !isCustomerAuthInitialized) return;
    if (customerUsername && !customerToken) {
      navigate(`/musteri-girisi?next=${encodeURIComponent(location.pathname + location.search)}`, { replace: true });
      return;
    }

    const isCustomerCatalog = Boolean(customerUsername && customerToken);
    const url = isCustomerCatalog ? `/api/customer/catalogs/${slug}` : `/api/public/catalogs/${slug}`;
    const headers = isCustomerCatalog ? { Authorization: `Bearer ${customerToken}` } : undefined;

    fetch(url, { headers })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setCatalog(data);
        if (data?.customer) {
          setCustomerForm({
            name: data.customer.name,
            email: data.customer.email,
            phone: data.customer.phone || ""
          });
        }

        if (data?.items) {
          const initialQ: Record<string, number> = {};
          data.items.forEach((i: any) => {
            initialQ[i.id] = 1;
          });
          setAddQuantities(initialQ);
        }

        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [slug, customerUsername, customerToken, isCustomerAuthInitialized, navigate, location.pathname, location.search]);

  const orderMode = catalog?.tenant?.orderMode || "UNIT";
  const isBoxMode = orderMode === "BOX";

  useEffect(() => {
    if (!catalog?.items?.length || !cart.length) return;
    setCart((prev) => {
      let changed = false;
      const next = prev.map((cartItem) => {
        const catalogItem = catalog.items.find((item: any) => item.product?.id === cartItem.productId);
        if (!catalogItem) return cartItem;
        const piecesPerBox = catalogItem.product?.piecesPerBox || 1;
        const multiplier = isBoxMode ? piecesPerBox : 1;
        const unitPrice = getEffectivePrice(catalogItem);
        const originalUnitPrice = getOriginalPrice(catalogItem);
        if (
          cartItem.multiplier === multiplier &&
          cartItem.unitPrice === unitPrice &&
          cartItem.originalUnitPrice === originalUnitPrice
        ) return cartItem;
        changed = true;
        return { ...cartItem, multiplier, unitPrice, originalUnitPrice };
      });
      return changed ? next : prev;
    });
  }, [catalog, isBoxMode, cart.length]);

  const categories = useMemo(() => {
    if (!catalog?.items) return [];
    const cats = catalog.items.map((i: any) => i.product.category?.name).filter(Boolean);
    return (Array.from(new Set(cats)) as string[]).sort((a, b) => a.localeCompare(b, "tr"));
  }, [catalog]);

  const getCustomerDiscountRates = () => {
    if (!catalog?.customer) return [];
    const customerDiscount = Number(catalog.customer.discountRate) || 0;
    const groupDiscounts = (catalog.customer.groupMemberships || [])
      .map((membership: any) => Number(membership.group?.discountRate) || 0);
    return [customerDiscount, ...groupDiscounts].filter((discount) => discount > 0);
  };

  const applyCustomerDiscounts = (basePrice: number) => {
    return getCustomerDiscountRates().reduce(
      (price, discount) => price * (1 - discount / 100),
      basePrice
    );
  };

  const getEffectivePrice = (item: any) => {
    const base = item.customPrice || item.product.price;
    return applyCustomerDiscounts(base);
  };

  const getOriginalPrice = (item: any) => {
    return item.customPrice || item.product.price;
  };

  const filteredItems = useMemo(() => {
    if (!catalog?.items) return [];
    let items = [...catalog.items];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter((i) =>
        i.product.name.toLowerCase().includes(q) ||
        i.product.barcode?.toLowerCase().includes(q)
      );
    }

    if (categoryFilter) {
      items = items.filter((i) => i.product.category?.name === categoryFilter);
    }

    if (minPrice) items = items.filter((i) => getEffectivePrice(i) >= Number(minPrice));
    if (maxPrice) items = items.filter((i) => getEffectivePrice(i) <= Number(maxPrice));

    // Stokta olmayan ürünleri gizle
    items = items.filter((i) => i.product.stock > 0);

    items.sort((a, b) => {
      const priceA = getEffectivePrice(a);
      const priceB = getEffectivePrice(b);
      const totalA = priceA * (isBoxMode ? a.product.piecesPerBox || 1 : 1);
      const totalB = priceB * (isBoxMode ? b.product.piecesPerBox || 1 : 1);

      if (sortBy === "name") return a.product.name.localeCompare(b.product.name, "tr");
      if (sortBy === "price") return priceA - priceB;
      if (sortBy === "total") return totalA - totalB;
      return 0;
    });

    return items;
  }, [catalog, searchQuery, sortBy, categoryFilter, minPrice, maxPrice, isBoxMode]);

  const handleUpdateAddQty = (itemId: string, delta: number) => {
    setAddQuantities((prev) => ({
      ...prev,
      [itemId]: Math.max(1, (Number(prev[itemId]) || 1) + delta)
    }));
  };

  const addToCart = (item: any) => {
    const qty = Math.max(1, Number(addQuantities[item.id]) || 1);
    const boxQty = item.product.piecesPerBox || 1;

    setCart((prev) => {
      const existing = prev.find((c) => c.productId === item.product.id);
      if (existing) {
        return prev.map((c) =>
          c.productId === item.product.id ? { ...c, quantity: Number(c.quantity || 0) + qty } : c
        );
      }

      return [
        ...prev,
        {
          productId: item.product.id,
          name: item.product.name,
          unitPrice: getEffectivePrice(item),
          originalUnitPrice: getOriginalPrice(item),
          quantity: qty,
          multiplier: isBoxMode ? boxQty : 1,
          image: item.product.images?.[0]?.thumbUrl || item.product.images?.[0]?.originalUrl,
          note: ""
        }
      ];
    });

    setAddQuantities((prev) => ({ ...prev, [item.id]: 1 }));
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev.map((c) =>
        c.productId === productId
          ? { ...c, quantity: Math.max(1, (Number(c.quantity) || 0) + delta) }
          : c
      )
    );
  };

  const removeCartItem = (productId: string) => {
    setCart((prev) => prev.filter((c) => c.productId !== productId));
  };

  const updateCartItemNote = (productId: string, note: string) => {
    setCart((prev) => prev.map((c) => (c.productId === productId ? { ...c, note } : c)));
  };

  const openItemNoteEditor = (item: any) => {
    setItemNoteEditor({
      open: true,
      productId: item.productId,
      productName: item.name,
      value: item.note || "",
    });
  };

  const saveItemNote = () => {
    if (!itemNoteEditor.productId) return;
    updateCartItemNote(itemNoteEditor.productId, itemNoteEditor.value);
    setItemNoteEditor({ open: false, productId: "", productName: "", value: "" });
  };

  const selectCategory = (category: string) => {
    setCategoryFilter(category);
  };

  const totalAmount = cart.reduce(
    (sum, item) => sum + item.unitPrice * item.multiplier * (Number(item.quantity) || 0),
    0
  );
  const filteredCart = cart.filter((item) =>
    item.name?.toLowerCase().includes(cartSearch.toLowerCase())
  );

  const handleCheckout = async (e: FormEvent) => {
    e.preventDefault();
    if (!catalog.customer) {
      if (!isCustomerInfoOpen) {
        setIsCustomerInfoOpen(true);
        return;
      }
      if (!customerForm.name?.trim() || !customerForm.phone?.trim()) {
        toast.warning("Lütfen adınız ve cep telefonunuzu girin.");
        return;
      }
    }

    const backendItems = cart.map((c) => ({
      ...c,
      quantity: c.quantity * c.multiplier,
      note: c.note || null
    }));

    const isCustomerOrder = Boolean(catalog.customer && customerToken);
    const res = await fetch(isCustomerOrder ? "/api/customer/orders" : "/api/public/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(isCustomerOrder ? { Authorization: `Bearer ${customerToken}` } : {})
      },
      body: JSON.stringify({
        catalogId: catalog.id,
        customer: isCustomerOrder ? null : customerForm,
        notes: orderNotes,
        items: backendItems
      })
    });

    if (res.ok) {
      setOrderSuccess(true);
      setCart([]);
      if (cartStorageKey) {
        try {
          localStorage.removeItem(cartStorageKey);
        } catch (e) {}
      }
      setCartOpen(false);
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error || "Sipariş verilirken bir hata oluştu.");
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-muted-foreground font-medium">Katalog yükleniyor...</p>
      </div>
    </div>
  );
  
  if (!catalog) return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30">
      <div className="bg-card p-8 rounded-2xl shadow-lg text-center max-w-sm">
        <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <X className="w-8 h-8 text-destructive" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">Katalog Bulunamadı</h2>
        <p className="text-muted-foreground mb-6">Aradığınız katalog mevcut değil veya silinmiş olabilir.</p>
        <Button variant="outline" onClick={() => navigate(-1)}>Geri Dön</Button>
      </div>
    </div>
  );

  if (orderSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-muted/30 to-secondary/5 flex items-center justify-center p-6">
        <div className="bg-card p-10 rounded-3xl shadow-2xl text-center max-w-md w-full animate-fade-in">
          <div className="w-20 h-20 brand-gradient rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-foreground mb-3">Teşekkürler!</h2>
          <p className="text-muted-foreground mb-8 text-lg">Siparişiniz başarıyla alındı ve firmaya iletildi. En kısa sürede size dönüş yapacağız.</p>
          <Button onClick={() => setOrderSuccess(false)} size="lg" className="w-full h-12 text-base font-semibold">
            Kataloga Dön
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Modern Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-border shadow-sm">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20 gap-4">
            {/* Brand */}
            <div className="flex items-center gap-4 min-w-0">
              <div className="min-w-0">
                <h1 className="text-lg sm:text-2xl font-bold text-foreground tracking-tight truncate">{catalog.tenant.name}</h1>
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm text-muted-foreground uppercase tracking-wider font-medium">{catalog.name}</span>
                  <span className="hidden sm:inline text-muted-foreground/40">•</span>
                  <span className="hidden sm:inline text-xs text-muted-foreground">{catalog.items?.length || 0} ürün</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="hidden lg:flex items-center gap-3 min-w-0 mr-2">
                <div className="relative w-[420px] xl:w-[520px]">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/50" />
                  <Input
                    placeholder="Urun adi veya barkod ara..."
                    className="pl-12 pr-4 h-11 bg-muted/30 border-border text-base rounded-xl focus:bg-white"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  title="Fiyat araligi"
                  onClick={() => setActiveFilterPanel(activeFilterPanel === "price" ? null : "price")}
                  className={`h-11 w-11 inline-flex items-center justify-center rounded-xl border text-sm font-bold transition-all shrink-0 ${activeFilterPanel === "price" ? "bg-primary text-white border-primary" : "bg-muted/30 text-foreground border-border hover:bg-muted"}`}
                >
                  TL
                </button>
                <button
                  type="button"
                  title="Siralama"
                  onClick={() => setActiveFilterPanel(activeFilterPanel === "sort" ? null : "sort")}
                  className={`h-11 w-11 inline-flex items-center justify-center rounded-xl border transition-all shrink-0 ${activeFilterPanel === "sort" ? "bg-primary text-white border-primary" : "bg-muted/30 text-foreground border-border hover:bg-muted"}`}
                >
                  <ArrowUpDown className="w-5 h-5" />
                </button>
              </div>
              <button
                onClick={() => setCartOpen(true)}
                className="relative flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2.5 sm:px-5 sm:py-3 rounded-xl font-semibold transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 text-sm sm:text-base"
              >
                <ShoppingCart className="w-5 h-5" />
                <span className="hidden sm:inline">Sepet</span>
                {cart.length > 0 && (
                  <span className="absolute -top-2 -right-2 bg-destructive text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shadow-sm animate-bounce">
                    {cart.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="pb-4 flex items-center gap-3 lg:hidden">
            <div className="relative flex-1 max-w-2xl">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/50" />
              <Input
                placeholder="Ürün adı veya barkod ara..."
                className="pl-12 pr-4 h-12 bg-muted/50 border-border text-base rounded-xl focus:bg-card"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button
              type="button"
              title="Fiyat aralığı"
              onClick={() => setActiveFilterPanel(activeFilterPanel === "price" ? null : "price")}
              className={`h-12 w-12 inline-flex items-center justify-center rounded-xl border text-sm font-bold transition-all shrink-0 ${activeFilterPanel === "price" ? "bg-primary text-white border-primary" : "bg-muted/50 text-foreground border-border hover:bg-muted"}`}
            >
              TL
            </button>
            <button
              type="button"
              title="Sıralama"
              onClick={() => setActiveFilterPanel(activeFilterPanel === "sort" ? null : "sort")}
              className={`h-12 w-12 inline-flex items-center justify-center rounded-xl border transition-all shrink-0 ${activeFilterPanel === "sort" ? "bg-primary text-white border-primary" : "bg-muted/50 text-foreground border-border hover:bg-muted"}`}
            >
              <ArrowUpDown className="w-5 h-5" />
            </button>
          </div>

          {/* Filter Panel */}
          {activeFilterPanel && (
            <div className="pb-4 animate-fade-in">
              <div className="bg-card border border-border rounded-xl p-4 shadow-lg max-w-2xl">
                {activeFilterPanel === "price" && (
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      placeholder="Min TL"
                      className="flex-1 h-10 px-4 border rounded-lg bg-muted/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      value={minPrice}
                      onChange={(e) => setMinPrice(e.target.value)}
                    />
                    <span className="text-muted-foreground">-</span>
                    <input
                      type="number"
                      placeholder="Max TL"
                      className="flex-1 h-10 px-4 border rounded-lg bg-muted/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setActiveFilterPanel(null)}
                      className="h-10 px-5 brand-gradient text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
                    >
                      Uygula
                    </button>
                  </div>
                )}
                {activeFilterPanel === "sort" && (
                  <div className="flex items-center gap-3">
                    <select
                      className="flex-1 h-10 px-4 border rounded-lg bg-muted/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                    >
                      <option value="name">İsim (A-Z)</option>
                      <option value="price">Fiyat (Artan)</option>
                      <option value="price-desc">Fiyat (Azalan)</option>
                      <option value="total">Tutar (Artan)</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => setActiveFilterPanel(null)}
                      className="h-10 px-5 brand-gradient text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
                    >
                      Kapat
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full bg-white px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-28 lg:pb-8">
        {/* Mobile Category Pills */}
        <div className="lg:hidden mb-6 overflow-x-auto -mx-4 px-4">
          <div className="flex gap-2 min-w-max pb-2">
            <button
              type="button"
              onClick={() => selectCategory("")}
              className={`px-5 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${categoryFilter === "" ? "bg-primary text-white shadow-md" : "bg-muted/50 text-muted-foreground border border-border"}`}
            >
              Tümü
            </button>
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => selectCategory(category)}
                className={`px-5 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${categoryFilter === category ? "bg-primary text-white shadow-md" : "bg-muted/50 text-muted-foreground border border-border"}`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-8">
          {/* Desktop Sidebar */}
          <aside className="hidden lg:block w-64 shrink-0">
            <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden sticky top-32">
              <div className="p-4 border-b bg-gradient-to-r from-primary/5 to-secondary/5">
                <div className="flex items-center gap-3 font-bold text-foreground">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Tag className="w-4 h-4 text-primary" />
                  </div>
                  <span>Kategoriler</span>
                </div>
              </div>
              <div className="p-3 max-h-[calc(100vh-200px)] overflow-y-auto">
                <button
                  type="button"
                  onClick={() => selectCategory("")}
                  className={`w-full text-left rounded-xl px-4 py-3 text-sm font-semibold transition-all mb-1 ${categoryFilter === "" ? "bg-primary text-white shadow-md" : "text-foreground/70 hover:bg-muted"}`}
                >
                  Tümü ({catalog.items?.length || 0})
                </button>
                {categories.map((category) => {
                  const count = catalog.items.filter((i: any) => i.product.category?.name === category).length;
                  return (
                    <button
                      key={category}
                      type="button"
                      onClick={() => selectCategory(category)}
                      className={`w-full text-left rounded-xl px-4 py-3 text-sm font-semibold transition-all mb-1 ${categoryFilter === category ? "bg-primary text-white shadow-md" : "text-foreground/70 hover:bg-muted"}`}
                    >
                      {category} ({count})
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>

          {/* Product Grid */}
          <div className="flex-1 min-w-0">
            {/* Grid - Modern Card Design */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filteredItems.map((item: any) => {
                const p = item.product;
                const originalPrice = getOriginalPrice(item);
                const price = getEffectivePrice(item);
                const hasDiscount = originalPrice !== price;
                const boxQty = p.piecesPerBox || 1;
                const boxPrice = price * boxQty;
                const primaryImage = p.images?.[0]?.mediumUrl || p.images?.[0]?.thumbUrl || p.images?.[0]?.originalUrl;

                return (
                  <div 
                    key={item.id} 
                    className="bg-card border border-border rounded-2xl overflow-hidden flex flex-col transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-primary/20 group"
                  >
                    {/* Product Image */}
                    <div className="h-52 lg:h-60 bg-gradient-to-br from-muted/30 to-muted/50 flex items-center justify-center relative overflow-hidden">
                      {primaryImage ? (
                        <img 
                          src={primaryImage} 
                          className={cn(
                            "w-full h-full object-cover transition-transform duration-500",
                            p.stock <= 0 && "opacity-40 grayscale"
                          )} 
                          alt={p.name} 
                        />
                      ) : (
                        <div className={cn("flex flex-col items-center justify-center text-muted-foreground/40", p.stock <= 0 && "opacity-40 grayscale")}>
                          <Package className="w-12 h-12 mb-2" />
                          <span className="text-sm font-medium">Görsel yok</span>
                        </div>
                      )}
                      {hasDiscount && (
                        <div className="absolute top-3 left-3 bg-gradient-to-r from-destructive to-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
                          %{Math.round((1 - price / originalPrice) * 100)} İndirim
                        </div>
                      )}
                      {isBoxMode && (
                        <div className="absolute top-3 right-3 bg-secondary text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
                          Koli
                        </div>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="p-5 flex flex-col flex-1">
                      {/* Category Badge */}
                      <div className="inline-flex items-center gap-1.5 text-xs text-secondary font-semibold uppercase tracking-wider mb-2">
                        <span className="w-2 h-2 rounded-full bg-secondary"></span>
                        {p.category?.name || "Kategori belirtilmemiş"}
                      </div>

                      {/* Product Name */}
                      <h3 className="font-bold text-foreground text-base lg:text-lg mb-3 leading-snug line-clamp-2">{p.name}</h3>

                      {/* Product Details - Bottom Section */}
                      <div className="text-xs text-muted-foreground mb-4 space-y-1.5 bg-muted/30 rounded-xl p-3">
                        {p.piecesPerBox && (
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-2">
                              <Package className="w-3.5 h-3.5 text-muted-foreground/60" />
                              Koli
                            </span>
                            <span className="font-semibold text-foreground">{p.piecesPerBox} adet</span>
                          </div>
                        )}
                        {p.packagingType && (
                          <div className="flex items-center justify-between">
                            <span>Ambalaj</span>
                            <span className="font-semibold text-foreground">{p.packagingType}</span>
                          </div>
                        )}
                        {p.barcode && (
                          <div className="flex items-center justify-between">
                            <span>Barkod</span>
                            <span className="font-mono font-semibold text-foreground">{p.barcode}</span>
                          </div>
                        )}
                      </div>

                      {/* Price Section - Box Mode Reversed */}
                      {isBoxMode ? (
                        <div className="mb-4 bg-gradient-to-r from-primary/5 to-secondary/5 rounded-xl p-4 border border-primary/10">
                          {/* Adet Fiyatı - BÜYÜK */}
                          <div className="mb-2">
                            <div className="text-[10px] text-muted-foreground/60 font-semibold uppercase tracking-wider mb-1">Adet Fiyatı</div>
                            <div className="text-2xl font-bold text-primary">
                              {hasDiscount && <span className="text-sm line-through text-muted-foreground/50 mr-2">{formatPrice(originalPrice)}</span>}
                              {formatPrice(price)}
                            </div>
                          </div>
                          {/* Koli Fiyatı - KÜÇÜK */}
                          <div className="border-t border-primary/10 pt-2 mt-2">
                            <div className="text-[10px] text-muted-foreground/60 font-semibold uppercase tracking-wider mb-0.5">
                              Koli Fiyatı ({boxQty} adet)
                            </div>
                            <div className="text-base font-semibold text-muted-foreground">
                              {formatPrice(boxPrice)}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="mb-4 bg-gradient-to-r from-primary/5 to-secondary/5 rounded-xl p-4 border border-primary/10">
                          <div className="text-[10px] text-muted-foreground/60 font-semibold uppercase tracking-wider mb-1">Fiyat</div>
                          <div className="text-2xl font-bold text-primary">
                            {hasDiscount && <span className="text-sm line-through text-muted-foreground/50 mr-2">{formatPrice(originalPrice)}</span>}
                            {formatPrice(price)}
                          </div>
                        </div>
                      )}

                      {/* Add to Cart */}
                      <div className="mt-auto pt-4 flex gap-2 items-center border-t border-border">
                        <div className="flex items-center bg-muted/50 rounded-xl border">
                          <button 
                            type="button" 
                            onClick={() => handleUpdateAddQty(item.id, -1)} 
                            disabled={p.stock <= 0}
                            className={cn(
                              "w-10 h-11 flex items-center justify-center rounded-l-xl font-bold text-lg transition-colors",
                              p.stock <= 0 
                                ? "text-muted-foreground/30 cursor-not-allowed" 
                                : "text-foreground/60 hover:bg-muted hover:text-foreground"
                            )}
                          >
                            −
                          </button>
                          <Input
                            type="number"
                            min="1"
                            disabled={p.stock <= 0}
                            className={cn(
                              "w-14 h-11 text-center px-1 font-semibold text-base bg-transparent border-0 ring-0 focus-visible:ring-0 rounded-none shadow-none",
                              p.stock <= 0 && "text-muted-foreground/50"
                            )}
                            value={addQuantities[item.id] || ""}
                            placeholder="1"
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value === "") return setAddQuantities((prev) => ({ ...prev, [item.id]: "" }));
                              const val = parseInt(value);
                              if (!Number.isNaN(val) && val >= 1) {
                                setAddQuantities((prev) => ({ ...prev, [item.id]: val }));
                              }
                            }}
                            onBlur={(e) => {
                              const val = parseInt(e.target.value);
                              if (Number.isNaN(val) || val < 1) {
                                setAddQuantities((prev) => ({ ...prev, [item.id]: 1 }));
                              }
                            }}
                          />
                          <button 
                            type="button" 
                            onClick={() => handleUpdateAddQty(item.id, 1)} 
                            disabled={p.stock <= 0}
                            className={cn(
                              "w-10 h-11 flex items-center justify-center rounded-r-xl font-bold text-lg transition-colors",
                              p.stock <= 0 
                                ? "text-muted-foreground/30 cursor-not-allowed" 
                                : "text-foreground/60 hover:bg-muted hover:text-foreground"
                            )}
                          >
                            +
                          </button>
                        </div>
                        <button
                          onClick={() => addToCart(item)}
                          disabled={p.stock <= 0}
                          className={cn(
                            "flex-1 font-semibold px-4 h-11 rounded-xl text-sm transition-all shadow-md",
                            p.stock <= 0
                              ? "bg-muted text-muted-foreground cursor-not-allowed"
                              : "brand-gradient hover:opacity-90 text-white hover:shadow-lg"
                          )}
                        >
                          {p.stock > 0 ? "Sepete Ekle" : "Tükendi"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Empty State */}
            {filteredItems.length === 0 && (
              <div className="text-center py-20">
                <div className="w-20 h-20 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Search className="w-10 h-10 text-muted-foreground/30" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">Ürün Bulunamadı</h3>
                <p className="text-muted-foreground">Arama kriterlerine uygun ürün bulunamadı.</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full rounded-none bg-card border-t border-border py-6 text-center mt-auto">
        <p className="text-sm text-muted-foreground/60 font-medium">
          SatSatma.com tarafından hazırlanmıştır
        </p>
      </footer>

      {/* Cart Sidebar */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setCartOpen(false)} />
          <div className="relative w-full max-w-md bg-card shadow-2xl h-full flex flex-col border-l border-border animate-slide-in-right">
            {/* Cart Header */}
            <div className="p-5 border-b flex items-center justify-between bg-gradient-to-r from-primary to-primary/80 text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <ShoppingCart className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Sepetim</h2>
                  <p className="text-sm text-white/80">{cart.length} ürün</p>
                </div>
              </div>
              <button 
                onClick={() => setCartOpen(false)} 
                className="p-2 hover:bg-white/20 rounded-xl transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Cart Search */}
            <div className="p-4 border-b">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/50" />
                <Input
                  placeholder="Sepette ara..."
                  className="h-11 pl-12 bg-muted/50 rounded-xl"
                  value={cartSearch}
                  onChange={(e) => setCartSearch(e.target.value)}
                />
              </div>
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {cart.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ShoppingCart className="w-8 h-8 text-muted-foreground/30" />
                  </div>
                  <p className="text-muted-foreground font-medium">Sepetiniz boş</p>
                  <p className="text-sm text-muted-foreground/60 mt-1">Ürün ekleyerek başlayın</p>
                </div>
              ) : (
                filteredCart.map((item) => {
                  const originalUnitPrice = Number(item.originalUnitPrice ?? item.unitPrice) || 0;
                  const hasDiscount = originalUnitPrice > item.unitPrice;
                  return (
                    <div key={item.productId} className="flex gap-3 bg-muted/20 rounded-xl p-3 border border-border/60">
                      <div className="w-16 h-16 bg-card rounded-lg overflow-hidden shrink-0">
                        {item.image && <img src={item.image} className="w-full h-full object-cover" alt={item.name} />}
                      </div>
                      <div className="flex-1 flex flex-col justify-between min-w-0">
                        <div className="font-semibold text-sm text-foreground leading-tight line-clamp-2">{item.name}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Birim:{" "}
                          {hasDiscount && (
                            <span className="line-through text-muted-foreground/60 mr-1">
                              {formatPrice(originalUnitPrice * item.multiplier)}
                            </span>
                          )}
                          <span>{formatPrice(item.unitPrice * item.multiplier)}</span> {isBoxMode ? "(1 Koli)" : ""}
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <span className="font-bold text-base text-primary">{formatPrice(item.unitPrice * item.multiplier * (Number(item.quantity) || 0))}</span>
                          <div className="flex items-center gap-1 bg-card rounded-lg border">
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.productId, -1)}
                              className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:bg-muted rounded-lg font-bold transition-colors"
                            >
                              −
                            </button>
                          <Input
                            type="number"
                            min="1"
                            className="w-12 h-8 text-center px-0 text-sm font-medium bg-transparent border-0 ring-0 focus-visible:ring-0 rounded-none shadow-none"
                            value={item.quantity}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value === "") {
                                setCart((prev) => prev.map((c) => c.productId === item.productId ? { ...c, quantity: "" } : c));
                                return;
                              }
                              const val = parseInt(value);
                              if (!Number.isNaN(val) && val >= 1) {
                                setCart((prev) => prev.map((c) => c.productId === item.productId ? { ...c, quantity: val } : c));
                              }
                            }}
                            onBlur={(e) => {
                              const val = parseInt(e.target.value);
                              if (Number.isNaN(val) || val < 1) {
                                setCart((prev) => prev.map((c) => c.productId === item.productId ? { ...c, quantity: 1 } : c));
                              }
                            }}
                          />
                          <button 
                            type="button" 
                            onClick={() => updateQuantity(item.productId, 1)} 
                            className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:bg-muted rounded-lg font-bold transition-colors"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="self-start flex flex-col gap-1">
                      <button
                        type="button"
                        onClick={() => openItemNoteEditor(item)}
                        className={cn(
                          "inline-flex h-7 w-7 items-center justify-center rounded-md border transition-colors",
                          item.note ? "border-secondary/40 bg-secondary/10 text-secondary" : "border-border bg-card text-muted-foreground"
                        )}
                        title="Ürün notu"
                        aria-label="Ürün notu"
                      >
                        <StickyNote className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => removeCartItem(item.productId)} 
                        className="text-destructive/50 hover:text-destructive p-1"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  );
                })
              )}

              {cart.length > 0 && filteredCart.length === 0 && (
                <div className="text-center text-muted-foreground py-10">Sepette aramaya uygun ürün bulunamadı.</div>
              )}
            </div>

            {/* Cart Footer */}
            {cart.length > 0 && (
              <div className="p-5 bg-muted/30 border-t shrink-0 space-y-4">
                <div className="flex justify-between items-center text-xl font-bold">
                  <span>Toplam</span>
                  <span className="text-2xl text-primary">{formatPrice(totalAmount)}</span>
                </div>

                <form onSubmit={handleCheckout} className="space-y-3">
                  {!catalog.customer && (
                    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
                      <button
                        type="button"
                        onClick={() => setIsCustomerInfoOpen((prev) => !prev)}
                        className="flex w-full items-center justify-between text-left"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                            <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          </div>
                          <div>
                            <h3 className="font-semibold text-foreground">Müşteri Bilgileri</h3>
                            <p className="text-xs text-muted-foreground">Sipariş için iletişim bilgileri</p>
                          </div>
                        </div>
                        <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${isCustomerInfoOpen ? "rotate-180" : ""}`} />
                      </button>
                      {isCustomerInfoOpen && (
                        <div className="mt-4 space-y-3 pt-4 border-t border-border">
                          <div>
                            <label className="text-sm font-semibold text-foreground mb-1.5 block">Ad Soyad *</label>
                            <Input 
                              required 
                              placeholder="Adınız Soyadınız" 
                              value={customerForm.name} 
                              onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })} 
                              className="h-12 rounded-xl"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-semibold text-foreground mb-1.5 block">Cep Telefonu *</label>
                            <Input 
                              required 
                              type="tel" 
                              placeholder="05XX XXX XX XX" 
                              value={customerForm.phone} 
                              onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })} 
                              className="h-12 rounded-xl"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-semibold text-foreground mb-1.5 block">E-posta (opsiyonel)</label>
                            <Input 
                              type="email" 
                              placeholder="ornek@email.com" 
                              value={customerForm.email} 
                              onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })} 
                              className="h-12 rounded-xl"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {catalog.customer && (
                    <div className="p-4 bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20 rounded-2xl">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white font-bold">
                          {catalog.customer.name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">Merhaba {catalog.customer.name}!</p>
                          <p className="text-xs text-muted-foreground">Siparişiniz hesabınıza işlenecektir</p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <Input 
                    placeholder="Sipariş notu (opsiyonel)" 
                    value={orderNotes} 
                    onChange={(e) => setOrderNotes(e.target.value)} 
                    className="h-12 rounded-xl"
                  />

                  <Button 
                    type="submit" 
                    size="lg" 
                    className="w-full h-14 text-lg font-bold rounded-xl shadow-lg hover:shadow-xl transition-all"
                  >
                    Siparişi Tamamla
                  </Button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      <Dialog open={itemNoteEditor.open} onOpenChange={(open) => setItemNoteEditor((prev) => ({ ...prev, open }))}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Ürün Notu</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">{itemNoteEditor.productName}</div>
            <textarea
              value={itemNoteEditor.value}
              onChange={(e) => setItemNoteEditor((prev) => ({ ...prev, value: e.target.value }))}
              placeholder="Bu ürün için not ekleyin..."
              className="min-h-28 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setItemNoteEditor({ open: false, productId: "", productName: "", value: "" })}>
                Vazgeç
              </Button>
              <Button type="button" onClick={saveItemNote}>Kaydet</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

