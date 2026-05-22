import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useAuthStore } from "@/store/useAuthStore";
import { usePageHeaderStore } from "@/store/usePageHeaderStore";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronLeft, Plus, Trash2, Search, Building, CreditCard, FileText, Loader2, AlertCircle, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";

const formatPrice = (price: number) => {
  return price.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " TL";
};

const statusOptions = [
  { key: "PENDING", label: "Yeni Sipariş" },
  { key: "APPROVED", label: "Onaylandı" },
  { key: "PROCESSING", label: "Hazırlanıyor" },
  { key: "READY_FOR_SHIPMENT", label: "Sevkiyata Hazır" },
  { key: "SHIPPED", label: "Sevk Edildi" },
  { key: "COMPLETED", label: "Tamamlandı" },
  { key: "CANCELLED", label: "İptal Edildi" },
];

export default function OrderEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, user } = useAuthStore();
  const { setHeader, resetHeader } = usePageHeaderStore();

  // Data States
  const [order, setOrder] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form States
  const [paymentType, setPaymentType] = useState("CASH");
  const [bankName, setBankName] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("PENDING");
  const [orderItems, setOrderItems] = useState<any[]>([]);

  // Product Search autocomplete states
  const [productSearch, setProductSearch] = useState("");
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  const tenantBanks = useMemo<string[]>(() => {
    if (!user?.tenant?.banks) return [];
    try {
      return JSON.parse(user.tenant.banks);
    } catch (e) {
      return [];
    }
  }, [user]);

  // Fetch Order
  const fetchOrder = async () => {
    try {
      const res = await fetch(`/api/orders/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setOrder(data);
        setPaymentType(data.paymentType || "CASH");
        setBankName(data.bankName || "");
        setNotes(data.notes || "");
        setStatus(data.status || "PENDING");
        setOrderItems(data.items?.map((item: any) => ({
          id: item.id,
          productId: item.productId,
          product: item.product,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          note: item.note || ""
        })) || []);
      } else {
        alert("Fatura bulunamadı.");
        navigate("/admin/orders");
      }
    } catch (e) {
      console.error(e);
      alert("Fatura yüklenirken hata oluştu.");
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch Products for search
  const fetchProducts = async () => {
    try {
      const res = await fetch("/api/products", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setProducts(await res.json());
      }
    } catch (e) {
      console.error("Error fetching products:", e);
    }
  };

  useEffect(() => {
    if (token && id) {
      fetchOrder();
      fetchProducts();
    }
  }, [token, id]);

  // Page Header Hook
  useEffect(() => {
    if (order) {
      setHeader({
        title: `Fatura Düzenle: ${order.orderNumber}`,
        subtitle: order.customer?.name || null,
        backTo: `/admin/orders/${id}`,
        actions: []
      });
    }
    return resetHeader;
  }, [order, setHeader, resetHeader, id]);

  // Autocomplete suggestions
  const productSuggestions = useMemo(() => {
    if (!productSearch.trim()) return [];
    const q = productSearch.toLowerCase();
    return products.filter((p) => {
      const skuMatch = (p.sku || "").toLowerCase().includes(q);
      const barcodeMatch = (p.barcode || "").toLowerCase().includes(q);
      const nameMatch = (p.name || "").toLowerCase().includes(q);
      return skuMatch || barcodeMatch || nameMatch;
    }).slice(0, 10); // cap suggestions
  }, [productSearch, products]);

  // Add selected product to order items
  const handleAddProduct = (prod: any) => {
    const existing = orderItems.find(item => item.productId === prod.id);
    if (existing) {
      // Increment quantity
      setOrderItems(orderItems.map(item =>
        item.productId === prod.id ? { ...item, quantity: item.quantity + 1 } : item
      ));
    } else {
      // Add new row
      setOrderItems([...orderItems, {
        productId: prod.id,
        product: prod,
        quantity: 1,
        unitPrice: prod.price,
        note: ""
      }]);
    }
    setProductSearch("");
    setShowSearchDropdown(false);
  };

  // Remove item from list
  const handleRemoveItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  // Modify individual row items
  const handleItemChange = (index: number, key: string, val: any) => {
    const updated = [...orderItems];
    if (key === "quantity") {
      const parsed = parseInt(val);
      updated[index].quantity = isNaN(parsed) || parsed < 1 ? 1 : parsed;
    } else if (key === "unitPrice") {
      const parsed = parseFloat(val);
      updated[index].unitPrice = isNaN(parsed) || parsed < 0 ? 0 : parsed;
    } else {
      updated[index][key] = val;
    }
    setOrderItems(updated);
  };

  // Real-time calculations
  const showKdv = user?.tenant?.showInvoiceKdv !== false;
  const subtotal = useMemo(() => {
    return orderItems.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unitPrice)), 0);
  }, [orderItems]);

  const kdvAmount = useMemo(() => {
    return showKdv ? subtotal * 0.20 : 0; // 20% standard VAT
  }, [subtotal, showKdv]);

  const grandTotal = useMemo(() => {
    return showKdv ? subtotal + kdvAmount : subtotal;
  }, [subtotal, kdvAmount, showKdv]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (orderItems.length === 0) return alert("Faturada en az bir ürün bulunmalıdır.");
    if ((paymentType === "CREDIT_CARD" || paymentType === "TRANSFER") && tenantBanks.length > 0 && !bankName) {
      return alert("Lütfen ödeme için banka seçimi yapınız.");
    }

    setIsSaving(true);
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          customerId: order.customerId,
          paymentType,
          bankName: (paymentType === "CREDIT_CARD" || paymentType === "TRANSFER") ? bankName : null,
          notes,
          status,
          items: orderItems.map((item) => ({
            productId: item.productId,
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice),
            note: item.note || null
          }))
        })
      });

      if (res.ok) {
        alert("Fatura başarıyla güncellendi.");
        navigate(`/admin/orders/${id}`);
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Fatura güncellenirken hata oluştu.");
      }
    } catch (err: any) {
      alert("Bir hata oluştu: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center text-muted-foreground gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
        Fatura detayları yükleniyor...
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-6xl animate-fade-in pb-12">
      {/* Action Button Bar */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <Link
          to={`/admin/orders/${id}`}
          className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Faturaya Geri Dön
        </Link>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(`/admin/orders/${id}`)}
            disabled={isSaving}
          >
            İptal
          </Button>
          <Button
            type="submit"
            disabled={isSaving}
            className="brand-gradient border-0 px-6 font-semibold shadow-md shadow-secondary/15 flex items-center gap-1.5"
          >
            {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
            Faturayı Kaydet
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Form: General Info */}
        <div className="space-y-6 lg:col-span-1">
          <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden p-5 space-y-4">
            <h3 className="font-bold text-foreground text-sm border-b border-border pb-2 flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              Genel Bilgiler
            </h3>
            
            {/* Customer Display Card */}
            <div className="bg-muted/30 border border-border p-3.5 rounded-lg space-y-1.5">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Müşteri</span>
              <span className="font-bold text-foreground text-sm block">{order?.customer?.name || "-"}</span>
              {order?.customer?.balance !== undefined && (
                <span className="inline-flex items-center gap-1 text-xs text-primary font-bold mt-1 bg-primary/10 px-2 py-0.5 rounded-full">
                  Cari Bakiye: {formatPrice(order.customer.balance)}
                </span>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                Ödeme Tipi
              </label>
              <select
                value={paymentType}
                onChange={(e) => {
                  setPaymentType(e.target.value);
                  setBankName("");
                }}
                className="w-full h-9 rounded-lg border border-border bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="CASH">Nakit</option>
                <option value="CREDIT_CARD">Kredi Kartı</option>
                <option value="TRANSFER">Havale / EFT</option>
              </select>
            </div>

            {/* Conditional Bank selection */}
            {(paymentType === "CREDIT_CARD" || paymentType === "TRANSFER") && (
              <div className="animate-fade-in">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5" /> Banka Seçin
                </label>
                {tenantBanks.length > 0 ? (
                  <select
                    required
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full h-9 rounded-lg border border-border bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">-- Banka Seçiniz --</option>
                    {tenantBanks.map((bank) => (
                      <option key={bank} value={bank}>{bank}</option>
                    ))}
                  </select>
                ) : (
                  <div className="text-xs text-amber-500 py-2 border border-dashed border-amber-500/30 rounded px-3 bg-amber-500/5">
                    Lütfen önce Ayarlar sayfasından banka hesaplarınızı tanımlayın.
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                Fatura Durumu
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full h-9 rounded-lg border border-border bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {statusOptions.map((opt) => (
                  <option key={opt.key} value={opt.key}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                Fatura Notu
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Genel fatura/sipariş açıklaması yazın..."
                className="w-full min-h-[90px] p-3 rounded-lg border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              />
            </div>
          </div>
        </div>

        {/* Right Form: Product Grid & Totals */}
        <div className="space-y-6 lg:col-span-2">
          {/* Autocomplete Product Search */}
          <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden p-5 space-y-4">
            <h3 className="font-bold text-foreground text-sm border-b border-border pb-2 flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-primary" />
              Ürün Ekle & Kalem Listesi
            </h3>

            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <input
                value={productSearch}
                onChange={(e) => {
                  setProductSearch(e.target.value);
                  setShowSearchDropdown(true);
                }}
                onFocus={() => setShowSearchDropdown(true)}
                placeholder="Ürün adı, SKU kodu veya barkod yazarak arayın..."
                className="w-full h-10 pl-9 pr-4 rounded-lg border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/60"
              />
              
              {/* Autocomplete Dropdown */}
              {showSearchDropdown && productSuggestions.length > 0 && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowSearchDropdown(false)}
                  />
                  <div className="absolute left-0 right-0 top-11 bg-card border border-border rounded-lg shadow-xl max-h-60 overflow-y-auto z-20 divide-y divide-border">
                    {productSuggestions.map((prod) => (
                      <button
                        key={prod.id}
                        type="button"
                        onClick={() => handleAddProduct(prod)}
                        className="w-full px-4 py-2.5 text-left flex justify-between items-center hover:bg-muted/40 transition-colors"
                      >
                        <div>
                          <p className="text-sm font-bold text-foreground">{prod.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {prod.sku ? `Kod: ${prod.sku}` : ""} {prod.barcode ? `| Barkod: ${prod.barcode}` : ""}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-primary">{formatPrice(prod.price)}</p>
                          <p className="text-xs font-semibold text-muted-foreground">Stok: {prod.stock}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Line Items Table */}
            {orderItems.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-lg text-xs">
                <AlertCircle className="w-5 h-5 mx-auto mb-2 text-muted-foreground/60" />
                Henüz faturaya eklenmiş ürün bulunmuyor. Arama çubuğunu kullanarak ürün ekleyin.
              </div>
            ) : (
              <div className="border border-border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead className="font-bold text-xs py-2.5">Ürün Açıklaması</TableHead>
                      <TableHead className="font-bold text-xs py-2.5 text-center w-24">Miktar (Adet)</TableHead>
                      <TableHead className="font-bold text-xs py-2.5 text-right w-28">Birim Fiyat</TableHead>
                      <TableHead className="font-bold text-xs py-2.5 text-right w-28">Toplam</TableHead>
                      <TableHead className="w-10 py-2.5"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-border">
                    {orderItems.map((item, idx) => (
                      <TableRow key={item.productId || idx} className="hover:bg-muted/10">
                        <TableCell className="py-2.5">
                          <div>
                            <p className="text-sm font-bold text-foreground">{item.product?.name || "Bilinmeyen Ürün"}</p>
                            <p className="text-xs text-muted-foreground font-semibold">{item.product?.sku || ""}</p>
                            <input
                              type="text"
                              value={item.note}
                              onChange={(e) => handleItemChange(idx, "note", e.target.value)}
                              placeholder="Satır notu yaz..."
                              className="mt-1.5 w-full h-7 rounded border border-border/80 bg-transparent px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/50"
                            />
                          </div>
                        </TableCell>
                        <TableCell className="py-2.5 text-center">
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(idx, "quantity", e.target.value)}
                            className="w-16 h-8 text-center rounded border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        </TableCell>
                        <TableCell className="py-2.5 text-right">
                          <div className="relative">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={item.unitPrice}
                              onChange={(e) => handleItemChange(idx, "unitPrice", e.target.value)}
                              className="w-24 h-8 text-right rounded border border-border bg-card pr-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                          </div>
                        </TableCell>
                        <TableCell className="py-2.5 text-right font-black text-foreground text-sm">
                          {formatPrice(Number(item.quantity) * Number(item.unitPrice))}
                        </TableCell>
                        <TableCell className="py-2.5">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
                            title="Sil"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Totals Summary */}
            {orderItems.length > 0 && (
              <div className="flex justify-end pt-4">
                <div className="w-full sm:w-72 border border-border rounded-lg overflow-hidden bg-muted/10 shadow-inner">
                  {showKdv && (
                    <>
                      <div className="flex justify-between items-center border-b border-border px-4 py-2 text-xs">
                        <span className="text-muted-foreground font-semibold">Ara Toplam</span>
                        <span className="font-bold text-foreground">{formatPrice(subtotal)}</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-border px-4 py-2 text-xs">
                        <span className="text-muted-foreground font-semibold">KDV (%20)</span>
                        <span className="font-bold text-foreground">{formatPrice(kdvAmount)}</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between items-center bg-muted/65 px-4 py-3">
                    <span className="text-sm font-extrabold text-foreground">Genel Toplam</span>
                    <span className="text-base font-black text-primary">{formatPrice(grandTotal)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </form>
  );
}
