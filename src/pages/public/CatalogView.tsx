import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { ArrowUpDown, ChevronDown, Search, ShoppingCart, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const formatPrice = (price: number) => {
  return price.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " TL";
};

export default function CatalogView() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const customerUsername = searchParams.get("customer") || "";
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
    let url = `/api/public/catalogs/${slug}`;
    if (customerUsername) url += `?customer=${customerUsername}`;

    fetch(url)
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
  }, [slug, customerUsername]);

  const orderMode = catalog?.tenant?.orderMode || "UNIT";
  const isBoxMode = orderMode === "BOX";

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

    const res = await fetch("/api/public/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tenantId: catalog.tenantId,
        catalogId: catalog.id,
        customer: catalog.customer ? null : customerForm,
        notes: orderNotes,
        totalAmount,
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

  if (loading) return <div className="p-10 text-center text-slate-600 font-medium">Katalog yükleniyor...</div>;
  if (!catalog) return <div className="p-10 text-center font-bold text-red-500">Katalog bulunamadı</div>;

  if (orderSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow text-center max-w-sm w-full">
          <div className="text-4xl mb-4">OK</div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Teşekkürler!</h2>
          <p className="text-slate-600 mb-6">Siparişiniz başarıyla alındı ve firmaya iletildi.</p>
          <Button onClick={() => setOrderSuccess(false)} className="w-full">Kataloga Dön</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-50 flex flex-col relative">
      <header className="bg-slate-100 text-slate-900 p-4 flex justify-between items-center shrink-0 shadow-sm sticky top-0 z-10 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold tracking-tight">{catalog.tenant.name}</h1>
          <p className="text-xs text-slate-500 uppercase tracking-[0.12em]">{catalog.name}</p>
        </div>
        <button
          onClick={() => setCartOpen(true)}
          className="flex items-center gap-2 bg-slate-600 hover:bg-slate-700 px-4 py-2 rounded-lg font-semibold transition-colors shadow-sm text-white"
        >
          <ShoppingCart className="w-5 h-5 flex-shrink-0" />
          <span className="hidden sm:inline">Sepet</span> ({cart.length})
        </button>
      </header>

      <main className="flex-1 p-4 md:p-6 max-w-7xl mx-auto w-full pb-24">
        {catalog.description && (
          <p className="text-slate-600 mb-6 max-w-3xl">{catalog.description}</p>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-4 overflow-hidden">
          <div className="flex items-center gap-2 p-3 bg-white">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Ürün adı veya barkod ara..."
                className="pl-9 bg-slate-50"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button
              type="button"
              title="Fiyat aralığı"
              onClick={() => setActiveFilterPanel(activeFilterPanel === "price" ? null : "price")}
              className={`h-10 w-10 inline-flex items-center justify-center rounded-lg border text-sm font-bold transition-colors ${activeFilterPanel === "price" ? "bg-slate-600 text-white" : "bg-white text-slate-700 hover:bg-slate-100"}`}
            >
              TL
            </button>
            <button
              type="button"
              title="Sıralama"
              onClick={() => setActiveFilterPanel(activeFilterPanel === "sort" ? null : "sort")}
              className={`h-10 w-10 inline-flex items-center justify-center rounded-lg border transition-colors ${activeFilterPanel === "sort" ? "bg-slate-600 text-white" : "bg-white text-slate-700 hover:bg-slate-100"}`}
            >
              <ArrowUpDown className="w-4 h-4" />
            </button>
          </div>

          {activeFilterPanel && (
            <div className="p-4 bg-slate-50 border-t">
              {activeFilterPanel === "price" && (
                <div className="grid sm:grid-cols-2 gap-3">
                  <Input type="number" placeholder="Min fiyat" className="bg-white" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} />
                  <Input type="number" placeholder="Max fiyat" className="bg-white" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
                </div>
              )}
              {activeFilterPanel === "sort" && (
                <select className="w-full border rounded-md px-3 py-2 text-sm bg-white" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                  <option value="name">İsim (A-Z)</option>
                  <option value="price">Fiyat (Artan)</option>
                  <option value="total">Tutar (Artan)</option>
                </select>
              )}
            </div>
          )}
        </div>

        <div className="lg:hidden mb-6 overflow-x-auto pb-1">
          <div className="flex gap-2 min-w-max">
            <button
              type="button"
              onClick={() => selectCategory("")}
              className={`rounded-full border px-4 py-2 text-sm font-medium whitespace-nowrap ${categoryFilter === "" ? "bg-slate-600 text-white border-slate-600" : "bg-white text-slate-700"}`}
            >
              Tüm kategoriler
            </button>
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => selectCategory(category)}
                className={`rounded-full border px-4 py-2 text-sm font-medium whitespace-nowrap ${categoryFilter === category ? "bg-slate-600 text-white border-slate-600" : "bg-white text-slate-700"}`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-[230px_minmax(0,1fr)] gap-6 items-start">
          <aside className="hidden lg:block bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden sticky top-24">
            <div className="p-4 border-b bg-slate-50">
              <div className="flex items-center gap-2 font-bold text-slate-800">
                <SlidersHorizontal className="h-4 w-4" />
                Kategoriler
              </div>
            </div>
            <div className="p-2 max-h-[calc(100vh-190px)] overflow-y-auto">
              <button
                type="button"
                onClick={() => selectCategory("")}
                className={`w-full text-left rounded-lg px-3 py-2 text-sm font-medium transition-colors ${categoryFilter === "" ? "bg-slate-600 text-white" : "text-slate-700 hover:bg-slate-100"}`}
              >
                Tüm kategoriler
              </button>
              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => selectCategory(category)}
                  className={`mt-1 w-full text-left rounded-lg px-3 py-2 text-sm font-medium transition-colors ${categoryFilter === category ? "bg-slate-600 text-white" : "text-slate-700 hover:bg-slate-100"}`}
                >
                  {category}
                </button>
              ))}
            </div>
          </aside>

          <div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredItems.map((item: any) => {
                const p = item.product;
                const originalPrice = getOriginalPrice(item);
                const price = getEffectivePrice(item);
                const hasDiscount = originalPrice !== price;
                const boxQty = p.piecesPerBox || 1;
                const boxPrice = price * boxQty;
                const primaryImage = p.images?.[0]?.mediumUrl || p.images?.[0]?.thumbUrl || p.images?.[0]?.originalUrl;

                return (
                  <div key={item.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col transition-all hover:shadow-lg hover:-translate-y-0.5">
                    <div className="h-48 bg-slate-100/70 flex items-center justify-center shrink-0 relative">
                      {primaryImage ? (
                        <img src={primaryImage} className="w-full h-full object-cover" alt={p.name} />
                      ) : (
                        <span className="text-slate-400 font-medium">Görsel yok</span>
                      )}
                      {p.barcode && <div className="absolute top-2 left-2 bg-white/90 px-2 py-1 text-[10px] font-mono rounded shadow-sm">B: {p.barcode}</div>}
                    </div>
                    <div className="p-4 flex flex-col flex-1">
                      <div className="text-xs text-emerald-700 font-bold uppercase tracking-wider mb-1 line-clamp-1">
                        {p.category?.name || "Kategori belirtilmemiş"}
                      </div>
                      <h3 className="font-bold text-slate-800 mb-1 leading-tight">{p.name}</h3>
                      <div className="text-xs text-slate-500 mb-2 space-x-2">
                        {p.piecesPerBox && <span>Koli: {p.piecesPerBox}</span>}
                        {p.packagingType && <span>Amb: {p.packagingType}</span>}
                      </div>

                      {isBoxMode ? (
                        <div className="mb-3">
                          <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Adet fiyatı</div>
                          <div className="text-sm font-semibold text-slate-600">
                            {hasDiscount && <span className="line-through text-slate-400 mr-2">{formatPrice(originalPrice)}</span>}
                            {formatPrice(price)}
                          </div>
                          <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mt-1">Koli fiyatı ({boxQty} adet)</div>
                          <div className="text-lg font-bold text-indigo-700">
                            {hasDiscount && <span className="line-through text-slate-400 mr-2 text-sm">{formatPrice(originalPrice * boxQty)}</span>}
                            {formatPrice(boxPrice)}
                          </div>
                        </div>
                      ) : (
                        <div className="mb-3">
                          <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Adet fiyatı</div>
                          <div className="text-lg font-bold text-indigo-700">
                            {hasDiscount && <span className="line-through text-slate-400 mr-2 text-sm">{formatPrice(originalPrice)}</span>}
                            {formatPrice(price)}
                          </div>
                        </div>
                      )}

                      <div className="mt-auto pt-4 flex gap-2 items-center border-t border-slate-100">
                        <div className="flex items-center gap-1 bg-slate-50 rounded-lg border">
                          <button type="button" onClick={() => handleUpdateAddQty(item.id, -1)} className="w-8 h-9 flex items-center justify-center text-slate-600 hover:bg-slate-200 rounded-l-lg font-bold transition-colors">-</button>
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
                          <button type="button" onClick={() => handleUpdateAddQty(item.id, 1)} className="w-8 h-9 flex items-center justify-center text-slate-600 hover:bg-slate-200 rounded-r-lg font-bold transition-colors">+</button>
                        </div>
                        <button
                          onClick={() => addToCart(item)}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-3 h-9 rounded-lg text-sm transition-colors"
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
              <div className="text-center py-20 text-slate-500">
                Arama kriterlerine uygun ürün bulunamadı.
              </div>
            )}
          </div>
        </div>
      </main>

      {cartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setCartOpen(false)} />
            <div className="relative w-full max-w-md bg-white shadow-2xl h-full flex flex-col border-l border-slate-200">
            <div className="p-4 border-b flex items-center justify-between bg-slate-600 text-white">
              <h2 className="text-xl font-bold flex items-center gap-2"><ShoppingCart className="w-6 h-6" /> Sepetim</h2>
              <button onClick={() => setCartOpen(false)} className="p-2 hover:bg-slate-500 rounded-full text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Sepette ara..."
                  className="h-9 pl-9 bg-slate-50"
                  value={cartSearch}
                  onChange={(e) => setCartSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {cart.length === 0 ? (
                <div className="text-center text-slate-500 py-10">Sepetiniz boş.</div>
              ) : (
                filteredCart.map((item) => (
                  <div key={item.productId} className="flex gap-4 border-b pb-4">
                    <div className="w-16 h-16 bg-slate-100 rounded flex-shrink-0">
                      {item.image && <img src={item.image} className="w-full h-full object-cover rounded" alt={item.name} />}
                    </div>
                    <div className="flex-1 flex flex-col justify-between">
                      <div className="font-semibold text-slate-800 leading-tight">{item.name}</div>
                      <div className="text-xs text-slate-500 mt-1">
                        Birim: {formatPrice(item.unitPrice * item.multiplier)} {isBoxMode ? "(1 Koli)" : ""}
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="font-bold text-indigo-600">{formatPrice(item.unitPrice * item.multiplier * (Number(item.quantity) || 0))}</span>
                        <div className="flex items-center gap-1 border rounded-md bg-slate-50">
                          <button type="button" onClick={() => updateQuantity(item.productId, -1)} className="w-7 h-7 flex items-center justify-center text-slate-600 hover:bg-slate-200 rounded-l-md font-bold transition-colors">-</button>
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
                          <button type="button" onClick={() => updateQuantity(item.productId, 1)} className="w-7 h-7 flex items-center justify-center text-slate-600 hover:bg-slate-200 rounded-r-md font-bold transition-colors">+</button>
                        </div>
                      </div>
                    </div>
                    <button onClick={() => removeCartItem(item.productId)} className="text-red-400 hover:text-red-500 self-start p-1"><X className="w-4 h-4" /></button>
                  </div>
                ))
              )}

              {cart.length > 0 && filteredCart.length === 0 && (
                <div className="text-center text-slate-500 py-10">Sepette aramaya uygun ürün bulunamadı.</div>
              )}
            </div>

            {cart.length > 0 && (
              <div className="p-4 bg-slate-50 border-t shrink-0">
                <div className="flex justify-between items-center mb-4 text-lg font-bold">
                  <span>Toplam</span>
                  <span className="text-emerald-700">{formatPrice(totalAmount)}</span>
                </div>

                <form onSubmit={handleCheckout} className="space-y-3">
                  {!catalog.customer && (
                    <div className="p-4 bg-white border rounded-lg shadow-sm">
                      <button
                        type="button"
                        onClick={() => setIsCustomerInfoOpen((prev) => !prev)}
                        className="flex w-full items-center justify-between text-left"
                      >
                        <h3 className="font-semibold text-sm text-slate-700">Müşteri İletişim Bilgileri</h3>
                        <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform ${isCustomerInfoOpen ? "rotate-180" : ""}`} />
                      </button>
                      {isCustomerInfoOpen && (
                        <div className="mt-3 space-y-3">
                          <Input required placeholder="Adınız Soyadınız / Firma" value={customerForm.name} onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })} />
                          <Input required type="email" placeholder="E-posta" value={customerForm.email} onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })} />
                          <Input placeholder="Telefon" value={customerForm.phone} onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })} />
                        </div>
                      )}
                    </div>
                  )}
                  {catalog.customer && (
                    <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-lg text-sm text-indigo-800">
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
