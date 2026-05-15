import { useEffect, useState, useMemo } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { ShoppingCart, X, Search, SlidersHorizontal, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const formatPrice = (price: number) => {
  return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " TL";
};

export default function CatalogView() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const customerUsername = searchParams.get("customer") || "";
  
  const [catalog, setCatalog] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<any[]>([]); // items in cart
  const [cartOpen, setCartOpen] = useState(false);
  
  const [customerForm, setCustomerForm] = useState({ name: "", email: "", phone: "" });
  const [orderNotes, setOrderNotes] = useState("");
  const [orderSuccess, setOrderSuccess] = useState(false);

  // Filters & Sorting
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("name"); // name, price, total
  const [categoryFilter, setCategoryFilter] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  
  // Local inputs state for adding to cart
  const [addQuantities, setAddQuantities] = useState<Record<string, number>>({});

  useEffect(() => {
    let url = `/api/public/catalogs/${slug}`;
    if (customerUsername) {
      url += `?customer=${customerUsername}`;
    }
    fetch(url)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        setCatalog(data);
        if (data?.customer) {
          setCustomerForm({ name: data.customer.name, email: data.customer.email, phone: data.customer.phone || "" });
        }
        
        // initialize quantities to 1
        if (data?.items) {
          const initialQ: Record<string, number> = {};
          data.items.forEach((i: any) => initialQ[i.id] = 1);
          setAddQuantities(initialQ);
        }

        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [slug]);

  const orderMode = catalog?.tenant?.orderMode || "UNIT";
  const isBoxMode = orderMode === "BOX";

  const categories = useMemo(() => {
    if (!catalog?.items) return [];
    const cats = catalog.items.map((i: any) => i.product.category?.name).filter(Boolean);
    return Array.from(new Set(cats)) as string[];
  }, [catalog]);

  const getEffectivePrice = (item: any) => {
    const base = item.customPrice || item.product.price;
    const discountRate = catalog?.customer?.discountRate || 0;
    if (discountRate > 0) {
      return base * (1 - discountRate / 100);
    }
    return base;
  };

  const getOriginalPrice = (item: any) => {
    return item.customPrice || item.product.price;
  };

  const filteredItems = useMemo(() => {
    if (!catalog?.items) return [];
    let items = [...catalog.items];

    // Search
    if (searchQuery) {
      items = items.filter(i => 
        i.product.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        i.product.barcode?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Category
    if (categoryFilter) {
      items = items.filter(i => i.product.category?.name === categoryFilter);
    }

    // Price range
    if (minPrice) items = items.filter(i => getEffectivePrice(i) >= Number(minPrice));
    if (maxPrice) items = items.filter(i => getEffectivePrice(i) <= Number(maxPrice));

    // Sort
    items.sort((a, b) => {
      const priceA = getEffectivePrice(a);
      const priceB = getEffectivePrice(b);
      const totalA = priceA * (isBoxMode ? (a.product.piecesPerBox || 1) : 1);
      const totalB = priceB * (isBoxMode ? (b.product.piecesPerBox || 1) : 1);

      if (sortBy === "name") return a.product.name.localeCompare(b.product.name);
      if (sortBy === "price") return priceA - priceB;
      if (sortBy === "total") return totalA - totalB;
      return 0;
    });

    return items;
  }, [catalog, searchQuery, sortBy, categoryFilter, minPrice, maxPrice, isBoxMode]);

  const handleUpdateAddQty = (itemId: string, delta: number) => {
    setAddQuantities(prev => ({
      ...prev,
      [itemId]: Math.max(1, (prev[itemId] || 1) + delta)
    }));
  };

  // Handle Cart
  const addToCart = (item: any) => {
    const qty = addQuantities[item.id] || 1;
    const boxQty = item.product.piecesPerBox || 1;
    
    // In BOX mode, quantity logic: cart stores the visible input quantity, but we will multiply price, or we can store unit quantity
    // Let's store what the user sees in `quantity`, and a `multiplier` for total calculations.
    
    setCart(prev => {
      const existing = prev.find(c => c.productId === item.product.id);
      if (existing) {
        return prev.map(c => c.productId === item.product.id ? { ...c, quantity: c.quantity + qty } : c);
      }
      return [...prev, { 
        productId: item.product.id, 
        name: item.product.name, 
        unitPrice: getEffectivePrice(item), 
        quantity: qty,
        multiplier: isBoxMode ? boxQty : 1,
        image: item.product.images?.[0]?.thumbUrl || item.product.images?.[0]?.originalUrl
      }];
    });

    // Reset input
    setAddQuantities(prev => ({...prev, [item.id]: 1}));
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(c => c.productId === productId ? { ...c, quantity: Math.max(1, (Number(c.quantity) || 0) + delta) } : c));
  };
  const removeCartItem = (productId: string) => {
    setCart(prev => prev.filter(c => c.productId !== productId));
  };

  const totalAmount = cart.reduce((sum, item) => sum + (item.unitPrice * item.multiplier * (Number(item.quantity) || 0)), 0);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // The server doesn't know about `multiplier`. We should probably submit `cart` where quantity = inputQty * multiplier so stock deducts right.
    // Wait, the user wants "arkaplanda 96 adet olarak eklesin" (in backend added as 96 units). 
    const backendItems = cart.map(c => ({
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
      setCartOpen(false);
    } else {
      alert("Sipariş verilirken bir hata oluştu.");
    }
  };

  if (loading) return <div className="p-10 text-center text-slate-600 font-medium">Katalog Yükleniyor...</div>;
  if (!catalog) return <div className="p-10 text-center font-bold text-red-500">Katalog Bulunamadı</div>;

  if (orderSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow text-center max-w-sm w-full">
          <div className="text-4xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Teşekkürler!</h2>
          <p className="text-slate-600 mb-6">Siparişiniz başarıyla alındı ve firmaya iletildi.</p>
          <Button onClick={() => setOrderSuccess(false)} className="w-full">Kataloga Dön</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col relative">
      <header className="bg-slate-900 text-white p-4 flex justify-between items-center shrink-0 shadow-md sticky top-0 z-10 transition-all">
        <div>
          <h1 className="text-xl font-bold tracking-tight">{catalog.tenant.name}</h1>
          <p className="text-sm text-slate-400">{catalog.name}</p>
        </div>
        <button 
          onClick={() => setCartOpen(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-lg font-medium transition-colors"
        >
          <ShoppingCart className="w-5 h-5 flex-shrink-0" />
          <span className="hidden sm:inline">Sepet</span> ({cart.reduce((s,i)=>s+(Number(i.quantity) || 0),0)})
        </button>
      </header>
      
      <main className="flex-1 p-4 md:p-6 max-w-7xl mx-auto w-full pb-24">
        {catalog.description && (
          <p className="text-slate-600 mb-6 max-w-3xl">{catalog.description}</p>
        )}
        
        {/* Filters and Sorting Toolbar */}
        <div className="bg-white p-4 rounded-xl shadow-sm border mb-6 space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Ürün adı veya barkod ara..." 
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <select 
                className="w-full md:w-48 border rounded-md px-3 py-2 text-sm bg-white"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="name">Sıralama: İsim (A-Z)</option>
                <option value="price">Sıralama: Fiyat (Artan)</option>
                <option value="total">Sıralama: Tutar (Artan)</option>
              </select>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-4 items-end pt-2 border-t text-sm">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-500">Kategori</label>
              <select 
                className="w-full md:w-48 border rounded-md px-3 py-2 bg-white"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="">Tümü</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-1 flex-1 md:flex-none">
              <label className="text-xs font-medium text-slate-500">Min Fiyat</label>
              <Input type="number" placeholder="0" className="w-full md:w-24" value={minPrice} onChange={e=>setMinPrice(e.target.value)} />
            </div>
            <div className="space-y-1 flex-1 md:flex-none">
              <label className="text-xs font-medium text-slate-500">Max Fiyat</label>
              <Input type="number" placeholder="0" className="w-full md:w-24" value={maxPrice} onChange={e=>setMaxPrice(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredItems.map((item: any) => {
            const p = item.product;
            const originalPrice = getOriginalPrice(item);
            const price = getEffectivePrice(item);
            const hasDiscount = originalPrice !== price;
            const boxQty = p.piecesPerBox || 1;
            const boxPrice = price * boxQty;
            const primaryImage = p.images?.[0]?.mediumUrl || p.images?.[0]?.thumbUrl || p.images?.[0]?.originalUrl;
            return (
              <div key={item.id} className="bg-white border rounded-xl overflow-hidden shadow-sm flex flex-col transition-shadow hover:shadow-md">
                <div className="h-48 bg-slate-100 flex items-center justify-center shrink-0 relative">
                  {primaryImage ? (
                    <img src={primaryImage} className="w-full h-full object-cover" alt={p.name} />
                  ) : (
                    <span className="text-slate-400 font-medium">Görsel Yok</span>
                  )}
                  {p.barcode && <div className="absolute top-2 left-2 bg-white/90 px-2 py-1 text-[10px] font-mono rounded shadow-sm">B: {p.barcode}</div>}
                </div>
                <div className="p-4 flex flex-col flex-1">
                  <div className="text-xs text-indigo-600 font-bold uppercase tracking-wider mb-1 line-clamp-1">
                    {p.category?.name || "Kategori Belirtilmemiş"}
                  </div>
                  <h3 className="font-bold text-slate-800 mb-1 leading-tight">{p.name}</h3>
                  <div className="text-xs text-slate-500 mb-2 space-x-2">
                    {p.piecesPerBox && <span>Koli: {p.piecesPerBox}</span>}
                    {p.packagingType && <span>Amb: {p.packagingType}</span>}
                  </div>
                  
                  {isBoxMode ? (
                    <div className="mb-3">
                      <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Adet Fiyatı</div>
                      <div className="text-sm font-semibold text-slate-600">
                        {hasDiscount && <span className="line-through text-slate-400 mr-2">{formatPrice(originalPrice)}</span>}
                        {formatPrice(price)}
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mt-1">Koli Fiyatı ({boxQty} Adet)</div>
                      <div className="text-lg font-bold text-indigo-700">
                        {hasDiscount && <span className="line-through text-slate-400 mr-2 text-sm">{formatPrice(originalPrice * boxQty)}</span>}
                        {formatPrice(boxPrice)}
                      </div>
                    </div>
                  ) : (
                    <div className="mb-3">
                      <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Adet Fiyatı</div>
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
                        value={addQuantities[item.id] || 1} 
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          if (!isNaN(val) && val >= 1) {
                            setAddQuantities(prev => ({...prev, [item.id]: val}));
                          } else if (e.target.value === '') {
                            setAddQuantities(prev => ({...prev, [item.id]: '' as any}));
                          }
                        }}
                        onBlur={(e) => {
                          const val = parseInt(e.target.value);
                          if (isNaN(val) || val < 1) {
                            setAddQuantities(prev => ({...prev, [item.id]: 1}));
                          }
                        }}
                      />
                      <button type="button" onClick={() => handleUpdateAddQty(item.id, 1)} className="w-8 h-9 flex items-center justify-center text-slate-600 hover:bg-slate-200 rounded-r-lg font-bold transition-colors">+</button>
                    </div>
                    <button 
                      onClick={() => addToCart(item)}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-3 h-9 rounded-lg text-sm transition-colors"
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
      </main>

      {/* Cart Drawer */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setCartOpen(false)} />
          <div className="relative w-full max-w-md bg-white shadow-2xl h-full flex flex-col">
            <div className="p-4 border-b flex items-center justify-between bg-slate-50">
              <h2 className="text-xl font-bold flex items-center gap-2"><ShoppingCart className="w-6 h-6" /> Sepetim</h2>
              <button onClick={() => setCartOpen(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {cart.length === 0 ? (
                <div className="text-center text-slate-500 py-10">Sepetiniz boş.</div>
              ) : (
                cart.map(item => (
                  <div key={item.productId} className="flex gap-4 border-b pb-4">
                    <div className="w-16 h-16 bg-slate-100 rounded flex-shrink-0">
                      {item.image && <img src={item.image} className="w-full h-full object-cover rounded" alt="th" />}
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
                              const val = parseInt(e.target.value);
                              if (!isNaN(val) && val >= 1) {
                                setCart(prev => prev.map(c => c.productId === item.productId ? { ...c, quantity: val } : c));
                              } else if (e.target.value === '') {
                                setCart(prev => prev.map(c => c.productId === item.productId ? { ...c, quantity: '' as any } : c));
                              }
                            }}
                            onBlur={(e) => {
                              const val = parseInt(e.target.value);
                              if (isNaN(val) || val < 1) {
                                setCart(prev => prev.map(c => c.productId === item.productId ? { ...c, quantity: 1 } : c));
                              }
                            }}
                          />
                          <button type="button" onClick={() => updateQuantity(item.productId, 1)} className="w-7 h-7 flex items-center justify-center text-slate-600 hover:bg-slate-200 rounded-r-md font-bold transition-colors">+</button>
                        </div>
                      </div>
                    </div>
                    <button onClick={() => removeCartItem(item.productId)} className="text-red-400 hover:text-red-500 self-start p-1"><X className="w-4 h-4"/></button>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <div className="p-4 bg-slate-50 border-t shrink-0">
                <div className="flex justify-between items-center mb-4 text-lg font-bold">
                  <span>Toplam</span>
                  <span className="text-indigo-600">{formatPrice(totalAmount)}</span>
                </div>
                
                <form onSubmit={handleCheckout} className="space-y-3">
                  {!catalog.customer && (
                    <div className="space-y-3 p-4 bg-white border rounded-lg shadow-sm">
                      <h3 className="font-semibold text-sm text-slate-700">İletişim Bilgileriniz</h3>
                      <Input required placeholder="Adınız Soyadınız / Firma" value={customerForm.name} onChange={e=>setCustomerForm({...customerForm, name: e.target.value})} />
                      <Input required type="email" placeholder="E-posta" value={customerForm.email} onChange={e=>setCustomerForm({...customerForm, email: e.target.value})} />
                      <Input placeholder="Telefon" value={customerForm.phone} onChange={e=>setCustomerForm({...customerForm, phone: e.target.value})} />
                    </div>
                  )}
                  {catalog.customer && (
                    <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-lg text-sm text-indigo-800">
                      <strong>Merhaba {catalog.customer.name}!</strong><br/>Bu katalog size özel tanımlanmıştır, siparişiniz direkt hesabınıza işlenecektir.
                    </div>
                  )}
                  <Input placeholder="Sipariş Notu (İsteğe Bağlı)" value={orderNotes} onChange={e=>setOrderNotes(e.target.value)} />
                  
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