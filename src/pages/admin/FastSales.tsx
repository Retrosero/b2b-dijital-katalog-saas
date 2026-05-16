import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChevronDown, Search, Barcode, ShoppingCart, Trash2 } from "lucide-react";

const formatPrice = (price: number) => {
  return price.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " TL";
};

export default function FastSales() {
  const { token, user: currentUser } = useAuthStore();
  const [products, setProducts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [cartSearch, setCartSearch] = useState("");
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

  useEffect(() => {
    fetchProducts();
    fetchCustomers();
  }, [token]);

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
    try {
      localStorage.setItem(cartStorageKey, JSON.stringify({ cart, customerId, paymentType, notes }));
    } catch(e) {}
  }, [cartStorageKey, cart, customerId, paymentType, notes]);

  const fetchProducts = async () => {
    const res = await fetch("/api/products", { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setProducts(await res.json());
  };

  const fetchCustomers = async () => {
    const res = await fetch("/api/customers", { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setCustomers(await res.json());
  };

  const setAddQuantity = (productId: string, value: number | "") => {
    setAddQuantities((prev) => ({ ...prev, [productId]: value }));
  };

  const changeAddQuantity = (productId: string, delta: number) => {
    setAddQuantities((prev) => ({
      ...prev,
      [productId]: Math.max(1, (Number(prev[productId]) || 1) + delta)
    }));
  };

  const addToCart = (product: any) => {
    const quantity = Math.max(1, Number(addQuantities[product.id]) || 1);
    const multiplier = isBoxMode ? product.piecesPerBox || 1 : 1;
    const image = product.images?.[0]?.thumbUrl || product.images?.[0]?.originalUrl;

    setCart((prev) => {
      const exists = prev.find(i => i.productId === product.id);
      if (exists) {
        return prev.map(i => i.productId === product.id ? { ...i, quantity: Number(i.quantity || 0) + quantity } : i);
      }
      return [...prev, {
        productId: product.id,
        categoryId: product.categoryId,
        name: product.name,
        unitPrice: product.price,
        quantity,
        multiplier,
        piecesPerBox: product.piecesPerBox || null,
        packagingType: product.packagingType || null,
        basePrice: product.price,
        image
      }];
    });
    setAddQuantity(product.id, 1);
  };

  const updateCartQuantity = (productId: string, val: number | "") => {
    if (val === "") {
      setCart((prev) => prev.map(i => i.productId === productId ? { ...i, quantity: "" } : i));
      return;
    }
    if (val <= 0) {
      setCart((prev) => prev.filter(i => i.productId !== productId));
      return;
    }
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
      try {
        const parsed = JSON.parse(c.categoryDiscounts);
        if (parsed[item.categoryId]) catD = Number(parsed[item.categoryId]) || 0;
      } catch(e) {}
    }

    discounts.forEach((d) => {
      if (d) p = p * (1 - d / 100);
    });
    if (catD) p = p * (1 - catD / 100);

    return p;
  };

  const calculateTotal = () => {
    return cart.reduce((acc, i) => acc + (getDiscountedPrice(i) * i.multiplier * (Number(i.quantity) || 0)), 0);
  };

  const getLineCount = () => cart.length;
  const selectedCustomer = customers.find((customer) => customer.id === customerId);

  const getPackageTotal = () => {
    if (isBoxMode) return cart.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
    return cart.reduce((sum, item) => {
      const qty = Number(item.quantity) || 0;
      const piecesPerBox = Number(item.piecesPerBox) || 1;
      return sum + (qty / piecesPerBox);
    }, 0);
  };

  const completeSale = async () => {
    if (!customerId) return alert("Lütfen müşteri seçiniz");
    if (cart.length === 0) return alert("Sepetiniz boş");

    const totalAmount = calculateTotal();
    const finalCart = cart.map(i => ({
      ...i,
      unitPrice: getDiscountedPrice(i),
      quantity: (Number(i.quantity) || 0) * i.multiplier
    }));

    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        customerId,
        paymentType,
        notes,
        totalAmount,
        items: finalCart
      })
    });

    if (res.ok) {
      alert("Satış tamamlandı");
      setCart([]);
      if (cartStorageKey) {
        try { localStorage.removeItem(cartStorageKey); } catch(e) {}
      }
      fetchProducts();
    } else {
      alert("Hata oluştu");
    }
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.barcode?.includes(search) ||
    p.sku?.toLowerCase().includes(search.toLowerCase())
  );
  const filteredCart = cart.filter(item =>
    item.name?.toLowerCase().includes(cartSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap xl:flex-nowrap items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Ürün adı, barkod veya stok kodu ara..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Button variant="outline" title="Barkod Okut"><Barcode className="w-4 h-4"/></Button>
        <select className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background md:w-[150px]">
          <option value="">Filtrele</option>
        </select>
        <select className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background md:w-[150px]">
          <option value="">Sırala</option>
          <option value="price_asc">Fiyat Artan</option>
          <option value="price_desc">Fiyat Azalan</option>
        </select>
        <Button variant="outline" className="gap-2">
          <ShoppingCart className="w-4 h-4 text-blue-600" />
          <span>Sepet</span>
          <span className="rounded-full bg-blue-600 px-2 py-0.5 text-xs font-bold text-white">{getLineCount()}</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_420px] gap-6 items-start">
        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
          {filteredProducts.map((p) => {
            const addQty = addQuantities[p.id] ?? 1;
            return (
              <div key={p.id} className="bg-white border rounded-lg p-4 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="font-semibold text-slate-800 line-clamp-2 pr-2">{p.sku ? `${p.sku} - ` : ""}{p.name}</h3>
                    <div className="text-slate-400">
                      <ShoppingCart className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="space-y-1 text-sm text-slate-600 mb-4">
                    {fastSalesSettings.sku && p.sku && <div className="grid grid-cols-3"><span className="font-medium text-slate-700">Kod</span><span className="col-span-2">: {p.sku}</span></div>}
                    {fastSalesSettings.barcode && p.barcode && <div className="grid grid-cols-3"><span className="font-medium text-slate-700">Barkod</span><span className="col-span-2">: {p.barcode}</span></div>}
                    <div className="grid grid-cols-3"><span className="font-medium text-slate-700">Marka</span><span className="col-span-2">: {p.brand?.name || "-"}</span></div>
                    {fastSalesSettings.category && p.category?.name && <div className="grid grid-cols-3"><span className="font-medium text-slate-700">Kategori</span><span className="col-span-2">: {p.category.name}</span></div>}
                    {fastSalesSettings.stock && <div className="grid grid-cols-3"><span className="font-medium text-slate-700">Stok</span><span className="col-span-2">: {p.stock}</span></div>}
                    {fastSalesSettings.piecesPerBox && p.piecesPerBox && <div className="grid grid-cols-3"><span className="font-medium text-slate-700">Koli Adeti</span><span className="col-span-2">: {p.piecesPerBox}</span></div>}
                    {fastSalesSettings.packagingType && p.packagingType && <div className="grid grid-cols-3"><span className="font-medium text-slate-700">Ambalaj</span><span className="col-span-2">: {p.packagingType}</span></div>}
                  </div>
                </div>

                <div className="mt-4 flex flex-col items-end gap-3">
                  <div className="text-xl font-bold text-blue-600">{formatPrice(p.price)}</div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => changeAddQuantity(p.id, -1)}>-</Button>
                    <Input
                      type="number"
                      min="1"
                      className="h-8 w-16 text-center"
                      value={addQty}
                      placeholder="1"
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === "") return setAddQuantity(p.id, "");
                        const parsed = parseInt(value);
                        if (!Number.isNaN(parsed) && parsed >= 1) setAddQuantity(p.id, parsed);
                      }}
                      onBlur={() => {
                        if (!addQuantities[p.id] || Number(addQuantities[p.id]) < 1) setAddQuantity(p.id, 1);
                      }}
                    />
                    <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => changeAddQuantity(p.id, 1)}>+</Button>
                  </div>
                  <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white mt-2" onClick={() => addToCart(p)}>
                    Sepete Ekle
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        <aside className="xl:sticky xl:top-4 bg-white border rounded-lg shadow-sm overflow-hidden">
          <div className="p-4 border-b flex items-center justify-between bg-slate-50">
            <h3 className="text-lg font-bold flex items-center gap-2"><ShoppingCart className="w-5 h-5" /> Sepet</h3>
            <span className="text-sm text-muted-foreground">{getLineCount()} kalem</span>
          </div>

          <div className="p-4 border-b">
            <button
              type="button"
              onClick={() => setIsCustomerPanelOpen((open) => !open)}
              className="flex w-full items-center justify-between rounded-md border bg-white px-3 py-2 text-left shadow-sm transition-colors hover:bg-slate-50"
            >
              <div>
                <div className="text-sm font-semibold text-slate-800">Müşteri Bilgileri</div>
                <div className="text-xs text-muted-foreground">
                  {selectedCustomer ? `${selectedCustomer.name} - Bakiye: ${formatPrice(Number(selectedCustomer.balance) || 0)}` : "Müşteri seçilmedi"}
                </div>
              </div>
              <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform ${isCustomerPanelOpen ? "rotate-180" : ""}`} />
            </button>

            {isCustomerPanelOpen && (
              <div className="mt-4 space-y-4">
                <div>
                  <label className="text-sm font-medium">Müşteri</label>
                  <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors mt-1" value={customerId} onChange={e => setCustomerId(e.target.value)}>
                    <option value="">Seçiniz</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  {selectedCustomer && (
                    <div className="mt-2 rounded-md border bg-blue-50 px-3 py-2 text-sm text-blue-900">
                      Bakiye: <span className="font-bold">{formatPrice(Number(selectedCustomer.balance) || 0)}</span>
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium">Ödeme Tipi</label>
                  <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors mt-1" value={paymentType} onChange={e => setPaymentType(e.target.value)}>
                    <option value="CASH">Nakit</option>
                    <option value="CREDIT_CARD">Kredi Kartı</option>
                    <option value="TRANSFER">Havale/EFT</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Notlar</label>
                  <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Sipariş notu..." />
                </div>
              </div>
            )}
          </div>

          <div className="px-4 pt-4">
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

          <div className="max-h-[420px] overflow-y-auto px-4 pb-4 pt-4 space-y-4">
            {cart.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground border-y py-10">Sepet boş</div>
            ) : (
              filteredCart.map(item => {
                const discountedPrice = getDiscountedPrice(item);
                const hasDiscount = discountedPrice < (item.basePrice || item.unitPrice);
                const lineTotal = discountedPrice * item.multiplier * (Number(item.quantity) || 0);
                return (
                  <div key={item.productId} className="flex gap-3 border-b pb-4">
                    <div className="w-14 h-14 bg-slate-100 rounded flex-shrink-0 overflow-hidden">
                      {item.image && <img src={item.image} className="w-full h-full object-cover" alt={item.name} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-slate-800 leading-tight">{item.name}</div>
                      <div className="text-xs text-slate-500 mt-1">
                        {hasDiscount && <span className="line-through mr-2">{formatPrice(item.basePrice || item.unitPrice)}</span>}
                        <span className={hasDiscount ? "text-green-600 font-semibold" : ""}>{formatPrice(discountedPrice * item.multiplier)}</span>
                        {isBoxMode && <span> / koli</span>}
                      </div>
                      <div className="flex items-center justify-between mt-2 gap-3">
                        <span className="font-bold text-blue-600">{formatPrice(lineTotal)}</span>
                        <div className="flex items-center gap-1 border rounded-md bg-slate-50">
                          <button type="button" onClick={() => updateCartQuantity(item.productId, Math.max(0, (Number(item.quantity) || 0) - 1))} className="w-7 h-7 flex items-center justify-center text-slate-600 hover:bg-slate-200 rounded-l-md font-bold">-</button>
                          <Input
                            type="number"
                            min="1"
                            className="w-10 h-7 text-center px-0 text-sm font-medium bg-transparent border-0 ring-0 focus-visible:ring-0 rounded-none shadow-none"
                            value={item.quantity}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value === "") return updateCartQuantity(item.productId, "");
                              const parsed = parseInt(value);
                              if (!Number.isNaN(parsed) && parsed >= 1) updateCartQuantity(item.productId, parsed);
                            }}
                            onBlur={() => {
                              if (!item.quantity || Number(item.quantity) < 1) updateCartQuantity(item.productId, 1);
                            }}
                          />
                          <button type="button" onClick={() => updateCartQuantity(item.productId, (Number(item.quantity) || 0) + 1)} className="w-7 h-7 flex items-center justify-center text-slate-600 hover:bg-slate-200 rounded-r-md font-bold">+</button>
                        </div>
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        Koli Adeti: {isBoxMode ? Number(item.quantity) || 0 : ((Number(item.quantity) || 0) / (Number(item.piecesPerBox) || 1)).toFixed(2)}
                      </div>
                    </div>
                    <button onClick={() => updateCartQuantity(item.productId, 0)} className="text-red-400 hover:text-red-500 self-start p-1"><Trash2 className="w-4 h-4"/></button>
                  </div>
                );
              })
            )}
            {cart.length > 0 && filteredCart.length === 0 && (
              <div className="text-center text-sm text-muted-foreground border-y py-10">Sepette aramaya uygun ürün bulunamadı.</div>
            )}
          </div>

          {cart.length > 0 && (
            <div className="p-4 bg-slate-50 border-t space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-md border bg-white p-3">
                  <div className="text-muted-foreground">Kalem</div>
                  <div className="font-bold">{getLineCount()}</div>
                </div>
                <div className="rounded-md border bg-white p-3">
                  <div className="text-muted-foreground">Koli Adeti</div>
                  <div className="font-bold">{getPackageTotal().toFixed(2)}</div>
                </div>
              </div>
              <div className="flex items-center justify-between text-lg font-bold">
                <span>Toplam</span>
                <span className="text-blue-600">{formatPrice(calculateTotal())}</span>
              </div>
              <Button className="w-full" size="lg" onClick={completeSale}>Satışı Tamamla</Button>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
