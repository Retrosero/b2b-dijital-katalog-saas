import { FormEvent, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowUpDown, ChevronDown, Search, ShoppingCart, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCustomerAuthStore } from "@/store/useCustomerAuthStore";

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

  const [catalog, setCatalog] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<any[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [cartSearch, setCartSearch] = useState("");

  const [customerForm, setCustomerForm] = useState({ name: "", email: "", phone: "" });
  const [isCustomerInfoOpen, setIsCustomerInfoOpen] = useState(false);
  const [orderNotes, setOrderNotes] = useState("");
  const [orderSuccess, setOrderSuccess] = useState(false);

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
        if (cartItem.multiplier === multiplier) return cartItem;
        changed = true;
        return { ...cartItem, multiplier };
      });
      return changed ? next : prev;
    });
  }, [catalog, isBoxMode, cart.length]);

  const categories = useMemo(() => {
    if (!catalog?.items) return [];
    const cats = catalog.items.map((i: any) => i.product.category?.name).filter(Boolean);
    return (Array.from(new Set(cats)) as string[]).sort((a, b) => a.localeCompare(b, "tr"));
  }, [catalog]);

  const getEffectivePrice = (item: any) => {
    const base = item.customPrice || item.product.price;
    const discountRate = catalog?.customer?.discountRate || 0;
    return discountRate > 0 ? base * (1 - discountRate / 100) : base;
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
          quantity: qty,
          multiplier: isBoxMode ? boxQty : 1,
          image: item.product.images?.[0]?.thumbUrl || item.product.images?.[0]?.originalUrl
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
      if (!customerForm.name?.trim() || !customerForm.email?.trim()) {
        return;
      }
    }

    const backendItems = cart.map((c) => ({
      ...c,
      quantity: c.quantity * c.multiplier
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
      alert("Sipariş verilirken bir hata oluştu.");
    }
  };

  if (loading) return <div className="p-10 text-center text-muted-foreground font-medium">Katalog yükleniyor...</div>;
  if (!catalog) return <div className="p-10 text-center font-bold text-destructive">Katalog bulunamadı</div>;

  if (orderSuccess) {
    return (
      <div className="min-h-screen bg-muted/40 flex items-center justify-center">
        <div className="bg-card p-8 rounded-xl shadow text-center max-w-sm w-full">
          <div className="w-14 h-14 mx-auto mb-4 brand-gradient rounded-2xl flex items-center justify-center text-white font-extrabold">S</div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Teşekkürler!</h2>
          <p className="text-muted-foreground mb-6">Siparişiniz başarıyla alındı ve firmaya iletildi.</p>
          <Button onClick={() => setOrderSuccess(false)} className="w-full">Kataloga Dön</Button>
        </div>
      </div>
    );
  }

  const navHeight = catalog.description ? "mb-0" : "";

  return (
    <div className="min-h-screen bg-card flex flex-col relative">
      <div className="fixed top-0 left-0 right-0 z-30">
        <header className="bg-gradient-to-r from-primary/5 via-card to-secondary/5 text-foreground px-4 py-3 lg:px-6 lg:py-4 flex flex-col shadow-sm border-b border-border">
          <div className="flex justify-between items-center gap-4">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <div className="min-w-0">
                <h1 className="text-xl lg:text-2xl font-bold tracking-tight truncate">{catalog.tenant.name}</h1>
                <p className="text-xs lg:text-sm text-muted-foreground uppercase tracking-wider">{catalog.name}</p>
              </div>
              {catalog.description && (
                <p className="hidden xl:block text-sm text-muted-foreground max-w-md truncate">{catalog.description}</p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
                <span>{catalog.items?.length || 0} ürün</span>
              </div>
              <button
                onClick={() => setCartOpen(true)}
                className="relative flex items-center gap-2 brand-gradient hover:opacity-90 px-4 py-2 rounded-xl font-semibold transition-opacity shadow-md text-white text-sm shrink-0"
              >
                <ShoppingCart className="w-5 h-5" />
                <span className="hidden sm:inline">Sepet</span>
                {cart.length > 0 && (
                  <span className="absolute -top-2 -right-2 bg-destructive text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                    {cart.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          <div className="mt-3 relative">
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-xl">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/50" />
                <Input
                  placeholder="Ürün adı veya barkod ara..."
                  className="pl-11 pr-4 h-11 bg-card text-base"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <button
                type="button"
                title="Fiyat aralığı"
                onClick={() => setActiveFilterPanel(activeFilterPanel === "price" ? null : "price")}
                className={`h-11 w-11 inline-flex items-center justify-center rounded-xl border text-sm font-bold transition-colors shrink-0 ${activeFilterPanel === "price" ? "bg-primary/10 text-primary border-primary/20" : "bg-card text-foreground border-border hover:bg-muted"}`}
              >
                TL
              </button>
              <button
                type="button"
                title="Sıralama"
                onClick={() => setActiveFilterPanel(activeFilterPanel === "sort" ? null : "sort")}
                className={`h-11 w-11 inline-flex items-center justify-center rounded-xl border transition-colors shrink-0 ${activeFilterPanel === "sort" ? "bg-primary/10 text-primary border-primary/20" : "bg-card text-foreground border-border hover:bg-muted"}`}
              >
                <ArrowUpDown className="w-5 h-5" />
              </button>
            </div>

            {activeFilterPanel && (
              <div className="absolute top-full right-0 mt-2 z-40 w-[min(22rem,100%)] max-w-full rounded-xl border border-border bg-card p-3 shadow-xl">
                {activeFilterPanel === "price" && (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <input
                        type="number"
                        placeholder="Min TL"
                        className="w-full h-9 px-3 border rounded text-sm bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                        value={minPrice}
                        onChange={(e) => setMinPrice(e.target.value)}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <input
                        type="number"
                        placeholder="Max TL"
                        className="w-full h-9 px-3 border rounded text-sm bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                        value={maxPrice}
                        onChange={(e) => setMaxPrice(e.target.value)}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveFilterPanel(null)}
                      className="h-9 px-4 brand-gradient text-white rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity shrink-0"
                    >
                      Uygula
                    </button>
                  </div>
                )}
                {activeFilterPanel === "sort" && (
                  <div className="flex items-center gap-2">
                    <select
                      className="flex-1 min-w-0 h-9 px-3 border rounded text-sm bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                    >
                      <option value="name">İsim (A-Z)</option>
                      <option value="price">Fiyat (Artan)</option>
                      <option value="total">Tutar (Artan)</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => setActiveFilterPanel(null)}
                      className="h-9 px-4 brand-gradient text-white rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity shrink-0"
                    >
                      Kapat
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </header>
      </div>

      <main className="flex-1 p-4 md:p-6 max-w-7xl mx-auto w-full pb-24 pt-[108px] sm:pt-[120px] md:pt-[130px]">

        <div className="lg:hidden sticky top-[110px] sm:top-[122px] z-20 mt-[2px] mb-4 overflow-x-auto bg-card py-2 border-b border-border">
          <div className="flex gap-2 min-w-max">
            <button
              type="button"
              onClick={() => selectCategory("")}
              className={`rounded-full border px-4 py-2 text-sm font-medium whitespace-nowrap ${categoryFilter === "" ? "bg-primary text-white border-sidebar-border" : "bg-card text-foreground/80"}`}
            >
              Tüm kategoriler
            </button>
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => selectCategory(category)}
                className={`rounded-full border px-4 py-2 text-sm font-medium whitespace-nowrap ${categoryFilter === category ? "bg-primary text-white border-sidebar-border" : "bg-card text-foreground/80"}`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-[230px_minmax(0,1fr)] gap-6 items-start">
          <aside className="hidden lg:block bg-card border border-border rounded-xl shadow-sm overflow-hidden sticky top-24">
            <div className="p-4 border-b bg-muted/40">
              <div className="flex items-center gap-2 font-bold text-foreground">
                <SlidersHorizontal className="h-4 w-4" />
                Kategoriler
              </div>
            </div>
            <div className="p-2 max-h-[calc(100vh-190px)] overflow-y-auto">
              <button
                type="button"
                onClick={() => selectCategory("")}
                className={`w-full text-left rounded-lg px-3 py-2 text-sm font-medium transition-colors ${categoryFilter === "" ? "bg-primary text-white" : "text-foreground/80 hover:bg-muted"}`}
              >
                Tüm kategoriler
              </button>
              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => selectCategory(category)}
                  className={`mt-1 w-full text-left rounded-lg px-3 py-2 text-sm font-medium transition-colors ${categoryFilter === category ? "bg-primary text-white" : "text-foreground/80 hover:bg-muted"}`}
                >
                  {category}
                </button>
              ))}
            </div>
          </aside>

          <div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5 lg:gap-6">
              {filteredItems.map((item: any) => {
                const p = item.product;
                const originalPrice = getOriginalPrice(item);
                const price = getEffectivePrice(item);
                const hasDiscount = originalPrice !== price;
                const boxQty = p.piecesPerBox || 1;
                const boxPrice = price * boxQty;
                const primaryImage = p.images?.[0]?.mediumUrl || p.images?.[0]?.thumbUrl || p.images?.[0]?.originalUrl;

                return (
                  <div key={item.id} className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm flex flex-col transition-all hover:shadow-xl hover:-translate-y-1 group">
                    <div className="h-56 lg:h-64 bg-muted/50 flex items-center justify-center shrink-0 relative overflow-hidden">
                      {primaryImage ? (
                        <>
                          <img src={primaryImage} className="w-full h-full object-cover transition-transform group-hover:scale-105" alt={p.name} />
                          {hasDiscount && (
                            <div className="absolute top-3 right-3 bg-destructive text-white text-xs font-bold px-2 py-1 rounded-full shadow">
                              %${Math.round((1 - price / originalPrice) * 100)}
                            </div>
                          )}
                        </>
                      ) : (
                        <span className="text-muted-foreground/40 font-medium">Görsel yok</span>
                      )}
                    </div>
                    <div className="p-5 flex flex-col flex-1">
                      <div className="text-xs text-secondary/80 font-semibold uppercase tracking-wider mb-2">
                        {p.category?.name || "Kategori belirtilmemiş"}
                      </div>
                      <h3 className="font-bold text-foreground text-base mb-3 leading-snug">{p.name}</h3>
                      <div className="text-xs text-muted-foreground mb-4 space-y-1">
                        {p.piecesPerBox && <div className="flex justify-between"><span>Koli:</span><span className="font-medium">{p.piecesPerBox} adet</span></div>}
                        {p.packagingType && <div className="flex justify-between"><span>Ambalaj:</span><span className="font-medium">{p.packagingType}</span></div>}
                        {p.barcode && <div className="flex justify-between"><span>Barkod:</span><span className="font-mono font-medium">{p.barcode}</span></div>}
                      </div>

                      {isBoxMode ? (
                        <div className="mb-3">
                          <div className="text-[10px] text-muted-foreground/60 font-medium uppercase tracking-wider">Koli fiyatı ({boxQty} adet)</div>
                          <div className="text-lg font-bold text-primary">
                            {hasDiscount && <span className="line-through text-muted-foreground/60 mr-2">{formatPrice(originalPrice * boxQty)}</span>}
                            {formatPrice(boxPrice)}
                          </div>
                          <div className="text-[10px] text-muted-foreground/60 font-medium uppercase tracking-wider mt-1">Adet fiyatı</div>
                          <div className="text-sm font-semibold text-muted-foreground">
                            {hasDiscount && <span className="line-through text-muted-foreground/60 mr-2 text-sm">{formatPrice(originalPrice)}</span>}
                            {formatPrice(price)}
                          </div>
                        </div>
                      ) : (
                        <div className="mb-3">
                          <div className="text-[10px] text-muted-foreground/60 font-medium uppercase tracking-wider">Adet fiyatı</div>
                          <div className="text-lg font-bold text-primary">
                            {hasDiscount && <span className="line-through text-muted-foreground/60 mr-2 text-sm">{formatPrice(originalPrice)}</span>}
                            {formatPrice(price)}
                          </div>
                        </div>
                      )}

                      <div className="mt-auto pt-4 flex gap-2 items-center border-t border-border">
                        <div className="flex items-center gap-1 bg-muted/40 rounded-lg border">
                          <button type="button" onClick={() => handleUpdateAddQty(item.id, -1)} className="w-8 h-9 flex items-center justify-center text-muted-foreground hover:bg-accent rounded-l-lg font-bold transition-colors">-</button>
                          <Input
                            type="number"
                            min="1"
                            className="w-12 h-9 text-center px-1 font-medium bg-transparent border-0 ring-0 focus-visible:ring-0 rounded-none shadow-none"
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
                          <button type="button" onClick={() => handleUpdateAddQty(item.id, 1)} className="w-8 h-9 flex items-center justify-center text-muted-foreground hover:bg-accent rounded-r-lg font-bold transition-colors">+</button>
                        </div>
                        <button
                          onClick={() => addToCart(item)}
                          className="flex-1 brand-gradient hover:opacity-90 text-white font-medium px-3 h-9 rounded-lg text-sm transition-opacity"
                        >
                          Ekle
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredItems.length === 0 && (
              <div className="text-center py-20 text-muted-foreground">
                Arama kriterlerine uygun ürün bulunamadı.
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-card border-t border-border py-4 text-center">
        <p className="text-xs text-muted-foreground/60">
          SatSatma.com tarafından hazırlanmıştır
        </p>
      </footer>

      {cartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setCartOpen(false)} />
            <div className="relative w-full max-w-md bg-card shadow-2xl h-full flex flex-col border-l border-border">
            <div className="p-4 border-b flex items-center justify-between bg-primary text-white">
              <h2 className="text-xl font-bold flex items-center gap-2"><ShoppingCart className="w-6 h-6" /> Sepetim</h2>
              <button onClick={() => setCartOpen(false)} className="p-2 hover:bg-primary/80 rounded-full text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/60" />
                <Input
                  placeholder="Sepette ara..."
                  className="h-9 pl-9 bg-muted/40"
                  value={cartSearch}
                  onChange={(e) => setCartSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {cart.length === 0 ? (
                <div className="text-center text-muted-foreground py-10">Sepetiniz boş.</div>
              ) : (
                filteredCart.map((item) => (
                  <div key={item.productId} className="flex gap-4 border-b pb-4">
                    <div className="w-16 h-16 bg-muted rounded flex-shrink-0">
                      {item.image && <img src={item.image} className="w-full h-full object-cover rounded" alt={item.name} />}
                    </div>
                    <div className="flex-1 flex flex-col justify-between">
                      <div className="font-semibold text-foreground leading-tight">{item.name}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Birim: {formatPrice(item.unitPrice * item.multiplier)} {isBoxMode ? "(1 Koli)" : ""}
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="font-bold text-primary">{formatPrice(item.unitPrice * item.multiplier * (Number(item.quantity) || 0))}</span>
                        <div className="flex items-center gap-1 border rounded-md bg-muted/40">
                          <button type="button" onClick={() => updateQuantity(item.productId, -1)} className="w-7 h-7 flex items-center justify-center text-muted-foreground hover:bg-accent rounded-l-md font-bold transition-colors">-</button>
                          <Input
                            type="number"
                            min="1"
                            className="w-10 h-7 text-center px-0 text-sm font-medium bg-transparent border-0 ring-0 focus-visible:ring-0 rounded-none shadow-none"
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
                          <button type="button" onClick={() => updateQuantity(item.productId, 1)} className="w-7 h-7 flex items-center justify-center text-muted-foreground hover:bg-accent rounded-r-md font-bold transition-colors">+</button>
                        </div>
                      </div>
                    </div>
                    <button onClick={() => removeCartItem(item.productId)} className="text-destructive/70 hover:text-destructive self-start p-1"><X className="w-4 h-4" /></button>
                  </div>
                ))
              )}

              {cart.length > 0 && filteredCart.length === 0 && (
                <div className="text-center text-muted-foreground py-10">Sepette aramaya uygun ürün bulunamadı.</div>
              )}
            </div>

            {cart.length > 0 && (
              <div className="p-4 bg-muted/40 border-t shrink-0">
                <div className="flex justify-between items-center mb-4 text-lg font-bold">
                  <span>Toplam</span>
                  <span className="text-secondary">{formatPrice(totalAmount)}</span>
                </div>

                <form onSubmit={handleCheckout} className="space-y-3">
                  {!catalog.customer && (
                    <div className="p-4 bg-card border rounded-lg shadow-sm">
                      <button
                        type="button"
                        onClick={() => setIsCustomerInfoOpen((prev) => !prev)}
                        className="flex w-full items-center justify-between text-left"
                      >
                        <h3 className="font-semibold text-sm text-foreground/80">Müşteri İletişim Bilgileri</h3>
                        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isCustomerInfoOpen ? "rotate-180" : ""}`} />
                      </button>
                      {isCustomerInfoOpen && (
                        <div className="mt-3 space-y-3">
                          <Input required placeholder="Adınız Soyadınız / Firma *" value={customerForm.name} onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })} />
                          <Input required type="tel" placeholder="Cep Telefonu * (+90...)" value={customerForm.phone} onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })} />
                          <Input type="email" placeholder="E-posta (opsiyonel)" value={customerForm.email} onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })} />
                        </div>
                      )}
                    </div>
                  )}
                  {catalog.customer && (
                    <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg text-sm text-primary">
                      <strong>Merhaba {catalog.customer.name}!</strong><br />Bu katalog size özel tanımlanmıştır, siparişiniz direkt hesabınıza işlenecektir.
                    </div>
                  )}
                  <Input placeholder="Sipariş Notu (İsteğe Bağlı)" value={orderNotes} onChange={(e) => setOrderNotes(e.target.value)} />

                  <Button type="submit" size="lg" className="w-full text-base py-6">Siparişi Tamamla</Button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}