import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Barcode, ShoppingCart, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function FastSales() {
  const { token, user: currentUser } = useAuthStore();
  const [products, setProducts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  
  // Cart state
  const [cart, setCart] = useState<any[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [paymentType, setPaymentType] = useState("CASH");
  const [notes, setNotes] = useState("");

  const fastSalesSettings = currentUser?.fastSalesSettings ? JSON.parse(currentUser.fastSalesSettings) : {
    sku: true, barcode: true, category: true, piecesPerBox: true, packagingType: true, stock: true, description: true
  };

  useEffect(() => {
    fetchProducts();
    fetchCustomers();
  }, [token]);

  const fetchProducts = async () => {
    const res = await fetch("/api/products", { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setProducts(await res.json());
  };

  const fetchCustomers = async () => {
    const res = await fetch("/api/customers", { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setCustomers(await res.json());
  };

  const addToCart = (product: any) => {
    setCart((prev) => {
      const exists = prev.find(i => i.productId === product.id);
      if (exists) {
        return prev.map(i => i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { productId: product.id, categoryId: product.categoryId, name: product.name, unitPrice: product.price, quantity: 1, basePrice: product.price }];
    });
  };

  const updateQuantity = (productId: string, val: number) => {
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
    
    // Uygulanacak iskontolar
    const d1 = c.discountRate || 0;
    const d2 = c.discount2 || 0;
    const d3 = c.discount3 || 0;
    const d4 = c.discount4 || 0;
    const d5 = c.discount5 || 0;
    
    let catD = 0;
    if (c.categoryDiscounts && item.categoryId) {
      try {
         const parsed = JSON.parse(c.categoryDiscounts);
         if (parsed[item.categoryId]) catD = parsed[item.categoryId];
      } catch(e){}
    }
    
    if (d1) p = p * (1 - d1/100);
    if (d2) p = p * (1 - d2/100);
    if (d3) p = p * (1 - d3/100);
    if (d4) p = p * (1 - d4/100);
    if (d5) p = p * (1 - d5/100);
    if (catD) p = p * (1 - catD/100);
    
    return p;
  };

  const calculateTotal = () => {
    return cart.reduce((acc, i) => acc + (getDiscountedPrice(i) * i.quantity), 0);
  };

  const completeSale = async () => {
    if (!customerId) return alert("Lütfen müşteri seçiniz");
    if (cart.length === 0) return alert("Sepetiniz boş");

    const totalAmount = calculateTotal();
    
    const finalCart = cart.map(i => ({...i, unitPrice: getDiscountedPrice(i)}));

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
      setIsCartOpen(false);
      fetchProducts();
    } else {
      alert("Hata oluştu");
    }
  };

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.barcode?.includes(search) || p.sku?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Hızlı Satış</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setIsCartOpen(true)} className="relative">
            <ShoppingCart className="w-4 h-4 mr-2" />
            Sepet
            {cart.length > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold">{cart.reduce((a,b)=>a+b.quantity, 0)}</span>
            )}
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Ürün adı, barkod veya stok kodu ara..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background md:w-[150px]">
          <option value="">Filtrele (Kategori)</option>
        </select>
        <select className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background md:w-[150px]">
          <option value="">Sırala</option>
          <option value="price_asc">Fiyat (Artan)</option>
          <option value="price_desc">Fiyat (Azalan)</option>
        </select>
        <Button variant="outline" title="Barkod Okut"><Barcode className="w-4 h-4"/></Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredProducts.map((p) => {
          const cartItem = cart.find(i => i.productId === p.id);
          const currentQty = cartItem ? cartItem.quantity : 0;
          return (
            <div key={p.id} className="bg-white border rounded-lg p-4 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-semibold text-slate-800 line-clamp-2 pr-2">{p.sku ? `${p.sku} - ` : ''}{p.name}</h3>
                  <div className="text-slate-400">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"/></svg>
                  </div>
                </div>
                
                <div className="space-y-1 text-sm text-slate-600 mb-4">
                  {fastSalesSettings.sku && p.sku && <div className="grid grid-cols-3"><span className="font-medium text-slate-700">Kod</span><span className="col-span-2">: {p.sku}</span></div>}
                  {fastSalesSettings.barcode && p.barcode && <div className="grid grid-cols-3"><span className="font-medium text-slate-700">Barkod</span><span className="col-span-2">: {p.barcode}</span></div>}
                  <div className="grid grid-cols-3"><span className="font-medium text-slate-700">Marka</span><span className="col-span-2">: {p.brand?.name || '-'}</span></div>
                  {fastSalesSettings.category && p.category?.name && <div className="grid grid-cols-3"><span className="font-medium text-slate-700">Kategori</span><span className="col-span-2">: {p.category.name}</span></div>}
                  {fastSalesSettings.stock && <div className="grid grid-cols-3"><span className="font-medium text-slate-700">Stok</span><span className="col-span-2">: {p.stock}</span></div>}
                  {fastSalesSettings.piecesPerBox && p.piecesPerBox && <div className="grid grid-cols-3"><span className="font-medium text-slate-700">Koli Adeti</span><span className="col-span-2">: {p.piecesPerBox}</span></div>}
                  {fastSalesSettings.packagingType && p.packagingType && <div className="grid grid-cols-3"><span className="font-medium text-slate-700">Ambalaj</span><span className="col-span-2">: {p.packagingType}</span></div>}
                </div>
              </div>

              <div className="mt-4 flex flex-col items-end gap-3">
                <div className="text-xl font-bold text-blue-600">{p.price.toFixed(2)} TL</div>
                <div className="flex items-center gap-2">
                   <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => updateQuantity(p.id, Math.max(0, currentQty - 1))}>-</Button>
                   <Input 
                     type="number" 
                     className="h-8 w-16 text-center" 
                     value={currentQty > 0 ? currentQty : ""}
                     placeholder="0"
                     onChange={(e) => {
                       const val = parseInt(e.target.value) || 0;
                       if (val > 0) updateQuantity(p.id, val);
                       else updateQuantity(p.id, 0); // If deleted
                     }} 
                   />
                   <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => {
                     if(cartItem) updateQuantity(p.id, currentQty + 1);
                     else addToCart(p);
                   }}>+</Button>
                </div>
                <Button 
                   className="w-full bg-blue-600 hover:bg-blue-700 text-white mt-2" 
                   onClick={() => addToCart(p)}
                >
                  Sepete Ekle
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={isCartOpen} onOpenChange={setIsCartOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Sepet</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Müşteri</label>
              <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors mt-1" value={customerId} onChange={e => setCustomerId(e.target.value)}>
                <option value="">Seçiniz</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
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

            <div className="max-h-[300px] overflow-y-auto space-y-4 border-y py-4">
              {cart.map(item => {
                const discountedPrice = getDiscountedPrice(item);
                const hasDiscount = discountedPrice < (item.basePrice || item.unitPrice);
                return (
                 <div key={item.productId} className="flex items-center justify-between">
                  <div className="text-sm">
                    <div className="font-medium">{item.name}</div>
                    <div className="text-muted-foreground flex items-center gap-2">
                       {hasDiscount && <span className="line-through text-xs">{item.basePrice || item.unitPrice} TL</span>}
                       <span className={hasDiscount ? "text-green-600 font-semibold" : ""}>{discountedPrice.toFixed(2)} TL</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => updateQuantity(item.productId, item.quantity - 1)}>-</Button>
                    <span className="w-8 text-center">{item.quantity}</span>
                    <Button variant="outline" size="sm" onClick={() => updateQuantity(item.productId, item.quantity + 1)}>+</Button>
                    <Button variant="ghost" size="sm" onClick={() => updateQuantity(item.productId, 0)}><Trash2 className="w-4 h-4 text-red-500"/></Button>
                  </div>
                 </div>
                );
              })}
              {cart.length === 0 && <div className="text-center text-sm text-muted-foreground">Sepet boş</div>}
            </div>

            <div className="flex items-center justify-between font-bold text-lg">
              <span>Toplam:</span>
              <span>{calculateTotal().toFixed(2)} TL</span>
            </div>

            <Button className="w-full" onClick={completeSale}>Satışı Tamamla</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
