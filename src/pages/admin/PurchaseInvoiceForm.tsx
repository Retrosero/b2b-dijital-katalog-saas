import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/useAuthStore";
import { usePageHeaderStore } from "@/store/usePageHeaderStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Save, FileText, ArrowLeft, Tag, DollarSign, PackageOpen, ClipboardList, Search } from "lucide-react";
import { useToastActions } from "@/components/ui/toast";

interface InvoiceItemInput {
  productId: string; // holds ID of existing product, or "new"
  productName: string; // holds actual name
  quantity: string;
  unitPrice: string;
  taxRate: string;
  searchText: string; // current value of the search textbox
  showDropdown?: boolean;
}

const formatPrice = (price: number) => {
  return price.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " TL";
};

export default function PurchaseInvoiceForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuthStore();
  const { setHeader, resetHeader } = usePageHeaderStore();
  const toast = useToastActions();
  
  const isViewMode = !!id;
  const [loading, setLoading] = useState(isViewMode);
  const [products, setProducts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Fields
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [lastInvoiceNumber, setLastInvoiceNumber] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [supplierSearchInput, setSupplierSearchInput] = useState("");
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<InvoiceItemInput[]>([
    { productId: "", productName: "", quantity: "1", unitPrice: "0", taxRate: "20", searchText: "" }
  ]);
  const [createdAtDate, setCreatedAtDate] = useState<string>("");
  const [invoiceDate, setInvoiceDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [focusedRowIndex, setFocusedRowIndex] = useState<number | null>(null);

  // Help calculate the next invoice number
  const getNextInvoiceNumber = (lastNum: string): string => {
    const match = lastNum.match(/^(.*?)(\d+)$/);
    if (match) {
      const prefix = match[1];
      const digitsStr = match[2];
      const nextVal = parseInt(digitsStr, 10) + 1;
      const padded = String(nextVal).padStart(digitsStr.length, "0");
      return `${prefix}${padded}`;
    }
    return `${lastNum}-0001`;
  };

  // Compare if new invoice number is greater than old invoice number
  const isInvoiceNumberGreater = (newNum: string, oldNum: string): boolean => {
    const extractNumber = (str: string) => {
      const match = str.match(/\d+$/);
      return match ? parseInt(match[0], 10) : null;
    };
    const newDigits = extractNumber(newNum);
    const oldDigits = extractNumber(oldNum);
    if (newDigits !== null && oldDigits !== null) {
      const newPrefix = newNum.replace(/\d+$/, "");
      const oldPrefix = oldNum.replace(/\d+$/, "");
      if (newPrefix === oldPrefix) {
        return newDigits > oldDigits;
      }
    }
    return newNum.localeCompare(oldNum, undefined, { numeric: true }) > 0;
  };

  // Load products list
  const fetchProducts = async () => {
    try {
      const res = await fetch("/api/products", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setProducts(data || []);
      }
    } catch (e) {
      console.error("Error loading products:", e);
    }
  };

  // Load customers/suppliers list
  const fetchCustomers = async () => {
    try {
      const res = await fetch("/api/customers", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCustomers(data || []);
      }
    } catch (e) {
      console.error("Error loading customers:", e);
    }
  };

  // Load latest invoice number
  const fetchLatestInvoice = async () => {
    if (isViewMode) return;
    try {
      const res = await fetch("/api/purchase-invoices/latest", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const latest = await res.json();
        if (latest && latest.invoiceNumber) {
          setLastInvoiceNumber(latest.invoiceNumber);
          setInvoiceNumber(getNextInvoiceNumber(latest.invoiceNumber));
        } else {
          const thisYear = new Date().getFullYear();
          setInvoiceNumber(`ALF-${thisYear}-0001`);
        }
      }
    } catch (e) {
      console.error("Error loading latest invoice number:", e);
    }
  };

  // Load existing invoice for viewing
  const fetchInvoiceDetails = async () => {
    if (!id) return;
    try {
      const res = await fetch(`/api/purchase-invoices/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setInvoiceNumber(data.invoiceNumber || "");
        setSupplierName(data.supplierName || "");
        setSupplierSearchInput(data.supplierName || "");
        setNotes(data.notes || "");
        setCreatedAtDate(data.createdAt);
        
        // Map backend items to input structure
        const mappedItems = data.items.map((it: any) => ({
          productId: it.productId,
          productName: it.product?.name || "",
          quantity: String(it.quantity),
          unitPrice: String(it.unitPrice),
          taxRate: String(it.taxRate !== undefined && it.taxRate !== null ? it.taxRate : "20"),
          searchText: it.product?.name || ""
        }));
        setItems(mappedItems);
      } else {
        toast.error("Fatura yüklenemedi.");
        navigate("/admin/purchase-invoices");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchProducts();
      fetchCustomers();
      if (isViewMode) {
        fetchInvoiceDetails();
      } else {
        fetchLatestInvoice();
      }
    }
  }, [token, id]);

  // Auto-focus on new row's product search input
  useEffect(() => {
    if (focusedRowIndex !== null && focusedRowIndex < items.length) {
      const element = document.getElementById(`product-search-${focusedRowIndex}`);
      if (element) {
        element.focus();
        setFocusedRowIndex(null);
      }
    }
  }, [items.length, focusedRowIndex]);

  // Grand Totals Calculation
  const totals = useMemo(() => {
    let subtotal = 0;
    let kdvTotal = 0;
    
    items.forEach((item) => {
      const qty = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.unitPrice) || 0;
      const rate = parseFloat(item.taxRate) || 0;
      
      const lineSub = qty * price;
      const lineKdv = lineSub * (rate / 100);
      
      subtotal += lineSub;
      kdvTotal += lineKdv;
    });
    
    return {
      subtotal,
      kdvTotal,
      grandTotal: subtotal + kdvTotal
    };
  }, [items]);

  // Page Header Configuration
  useEffect(() => {
    setHeader({
      title: isViewMode ? "Alış Faturası Detayı" : "Yeni Alış Faturası Girişi",
      subtitle: isViewMode ? `${invoiceNumber} numaralı fatura kaydı` : "Sisteme toptan ürün ve stok girişi yapın",
      backTo: "/admin/purchase-invoices",
      actions: !isViewMode ? [
        {
          key: "save-invoice",
          label: "Faturayı Kaydet",
          onClick: () => void handleSubmit(),
          icon: <Save className="w-5 h-5" />,
          variant: "secondary",
          disabled: isSubmitting
        }
      ] : []
    });
    return resetHeader;
  }, [isViewMode, invoiceNumber, items, isSubmitting, setHeader, resetHeader]);

  const handleAddItemRow = () => {
    setItems([...items, { productId: "", productName: "", quantity: "1", unitPrice: "0", taxRate: "20", searchText: "" }]);
    setFocusedRowIndex(items.length);
  };

  const handleRemoveItemRow = (index: number) => {
    if (items.length === 1) return toast.warning("Faturada en az bir kalem bulunmalıdır.");
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof InvoiceItemInput, value: string) => {
    const newItems = [...items];
    (newItems[index] as any)[field] = value;
    setItems(newItems);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (isSubmitting) return;

    if (!invoiceNumber.trim()) return toast.warning("Lütfen fatura numarasını giriniz.");
    if (!supplierName.trim()) return toast.warning("Lütfen toptancı/tedarikçi adını giriniz.");

    if (lastInvoiceNumber) {
      if (!isInvoiceNumberGreater(invoiceNumber.trim(), lastInvoiceNumber)) {
        return toast.error(`Yeni fatura numarası (${invoiceNumber.trim()}), bir önceki fatura numarasından (${lastInvoiceNumber}) büyük olmalıdır.`);
      }
    }
    
    // Validate items
    const invalidItem = items.find(it => (!it.productId && !it.searchText.trim()) || parseFloat(it.quantity) <= 0 || parseFloat(it.unitPrice) < 0 || parseFloat(it.taxRate) < 0);
    if (invalidItem) {
      return toast.warning("Lütfen faturadaki tüm kalemlerin ürününü seçip miktar, birim fiyatı ve KDV oranlarını doğru giriniz.");
    }

    setIsSubmitting(true);
    try {
      const payload = {
        invoiceNumber: invoiceNumber.trim(),
        supplierName: supplierName.trim(),
        notes: notes.trim(),
        invoiceDate: invoiceDate,
        items: items.map(it => ({
          productId: it.productId || "new",
          productName: it.productId === "new" || !it.productId ? it.searchText.trim() : it.productName,
          quantity: parseInt(it.quantity, 10),
          unitPrice: parseFloat(it.unitPrice),
          taxRate: parseFloat(it.taxRate) || 0
        }))
      };

      const res = await fetch("/api/purchase-invoices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        toast.success("Alış faturası başarıyla kaydedildi, stoklar ve ürün alış maliyetleri güncellendi!");
        navigate("/admin/purchase-invoices");
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Alış faturası kaydedilemedi.");
      }
    } catch (e: any) {
      toast.error("Bir hata oluştu: " + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="p-8 text-muted-foreground">Yükleniyor...</div>;

  return (
    <div className="space-y-4 md:space-y-6 w-full animate-fade-in">
      <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
        
        {/* Invoice Metadata Card */}
        <div className="bg-card p-5 md:p-8 rounded-xl border border-border shadow-sm space-y-5">
          <h3 className="text-lg font-bold text-foreground flex items-center gap-2 border-b border-border pb-4">
            <span className="w-1.5 h-6 bg-secondary rounded-full"></span>
            Fatura Bilgileri
          </h3>
          
          <div className="grid md:grid-cols-3 gap-4 md:gap-6">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground">Fatura Numarası *</Label>
              <Input
                required
                disabled={isViewMode}
                className="h-11 border-border font-mono font-bold"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="Örn: ALF-2026-0001"
              />
              {lastInvoiceNumber && !isViewMode && (
                <p className="text-xs text-muted-foreground mt-1">
                  Son Girilen Fatura Numarası: <span className="font-mono font-bold text-secondary">{lastInvoiceNumber}</span>
                </p>
              )}
            </div>
            
            {/* Searchable Supplier Autocomplete */}
            <div className="space-y-2 relative">
              <Label className="text-sm font-semibold text-foreground">Toptancı / Tedarikçi Adı *</Label>
              <Input
                required
                disabled={isViewMode}
                className="h-11 border-border"
                value={supplierSearchInput}
                onChange={(e) => {
                  setSupplierSearchInput(e.target.value);
                  setSupplierName(e.target.value);
                  setShowSupplierDropdown(true);
                }}
                onFocus={() => {
                  if (!isViewMode) setShowSupplierDropdown(true);
                }}
                onBlur={() => {
                  setTimeout(() => setShowSupplierDropdown(false), 200);
                }}
                placeholder="Örn: Özgür Dağıtım Ltd. Şti."
              />
              
              {!isViewMode && showSupplierDropdown && (
                <div className="absolute z-50 left-0 right-0 mt-1 max-h-56 overflow-auto rounded-lg border border-border bg-card shadow-lg py-1">
                  {customers.filter(c => 
                    c.name.toLowerCase().includes(supplierSearchInput.toLowerCase())
                  ).length > 0 ? (
                    customers.filter(c => 
                      c.name.toLowerCase().includes(supplierSearchInput.toLowerCase())
                    ).map(c => (
                      <button
                        key={c.id}
                        type="button"
                        className="w-full text-left px-4 py-2 text-sm hover:bg-muted text-foreground transition-colors font-medium cursor-pointer"
                        onMouseDown={() => {
                          setSupplierSearchInput(c.name);
                          setSupplierName(c.name);
                          setShowSupplierDropdown(false);
                        }}
                      >
                        {c.name} {c.phone ? `(${c.phone})` : ""}
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-2.5 text-xs text-muted-foreground italic">
                      Mevcut müşterilerde eşleşme yok. Yeni bir isim olarak kaydedilecek.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Editable Invoice Date */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground">Fatura Tarihi *</Label>
              {isViewMode ? (
                <Input
                  disabled
                  className="h-11 border-border bg-muted/40 font-semibold"
                  value={createdAtDate ? new Date(createdAtDate).toLocaleDateString("tr-TR") : ""}
                />
              ) : (
                <Input
                  type="date"
                  required
                  className="h-11 border-border cursor-pointer font-semibold text-foreground"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                />
              )}
            </div>
            
            <div className="space-y-2 md:col-span-3">
              <Label className="text-sm font-semibold text-foreground">Açıklama / Not</Label>
              <textarea
                disabled={isViewMode}
                className="flex min-h-[80px] w-full rounded-lg border border-border bg-card px-4 py-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Bu faturaya dair not ekleyin..."
              />
            </div>
          </div>
        </div>

        {/* Invoice Item Entries Table */}
        <div className="bg-card p-5 md:p-8 rounded-xl border border-border shadow-sm space-y-5">
          <div className="flex justify-between items-center border-b border-border pb-4">
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <span className="w-1.5 h-6 bg-chart-3 rounded-full"></span>
              Alınan Ürünler & Stok Kalemleri
            </h3>
            {!isViewMode && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleAddItemRow}
                className="flex items-center gap-1.5 h-9 touch-target"
              >
                <Plus className="w-4.5 h-4.5" /> Kalem Ekle
              </Button>
            )}
          </div>

          <div className="space-y-3">
            {items.map((item, idx) => {
              const selectedProduct = products.find(p => p.id === item.productId);
              const skuLabel = selectedProduct?.sku ? ` [SKU: ${selectedProduct.sku}]` : "";
              const currentStockLabel = selectedProduct ? ` (Sistemdeki Mevcut Stok: ${selectedProduct.stock})` : "";
              
              const qtyNum = parseFloat(item.quantity) || 0;
              const priceNum = parseFloat(item.unitPrice) || 0;
              const lineTotal = qtyNum * priceNum;

              return (
                <div key={idx} className="flex flex-col md:flex-row gap-3.5 items-end bg-muted/20 p-4.5 rounded-xl border border-border/80">
                  
                  {/* Select Product Autocomplete */}
                  <div className="flex-1 space-y-2 w-full relative">
                    <Label className="text-xs font-bold text-muted-foreground uppercase flex justify-between">
                      <span>Kalem #{idx + 1} - Ürün Seçimi *</span>
                      {item.productId && item.productId !== "new" && (
                        <span className="text-[10px] text-amber-500 font-semibold normal-case">
                          {currentStockLabel}
                        </span>
                      )}
                      {item.productId === "new" && (
                        <span className="text-[10px] text-emerald-500 font-semibold normal-case bg-emerald-500/10 px-1.5 py-0.5 rounded">
                          ✨ Yeni Ürün Kartı Olarak Eklenecek
                        </span>
                      )}
                    </Label>
                    
                    {isViewMode ? (
                      <Input
                        disabled
                        className="h-10 border-border bg-muted/40 font-semibold text-foreground"
                        value={item.productName || "Yükleniyor..."}
                      />
                    ) : (
                      <div className="relative">
                        <Input
                          id={`product-search-${idx}`}
                          required
                          className="h-10 border-border bg-card px-3 py-2 text-sm shadow-sm font-semibold"
                          value={item.searchText}
                          onChange={(e) => {
                            const val = e.target.value;
                            const newItems = [...items];
                            newItems[idx].searchText = val;
                            newItems[idx].productName = val;
                            newItems[idx].showDropdown = true;
                            newItems[idx].productId = ""; 
                            setItems(newItems);
                          }}
                          onFocus={() => {
                            const newItems = [...items];
                            newItems[idx].showDropdown = true;
                            setItems(newItems);
                          }}
                          onBlur={() => {
                            setTimeout(() => {
                              const newItems = [...items];
                              newItems[idx].showDropdown = false;
                              setItems(newItems);
                            }, 200);
                          }}
                          placeholder="Ürün adı, SKU veya barkod yazın..."
                        />
                        
                        {item.showDropdown && (
                          <div className="absolute z-50 left-0 right-0 mt-1 max-h-56 overflow-auto rounded-lg border border-border bg-card shadow-lg py-1">
                            {products.filter(p => {
                              const searchVal = item.searchText.toLowerCase();
                              return (
                                p.name.toLowerCase().includes(searchVal) ||
                                (p.sku && p.sku.toLowerCase().includes(searchVal)) ||
                                (p.barcode && p.barcode.toLowerCase().includes(searchVal))
                              );
                            }).slice(0, 10).map(p => (
                              <button
                                key={p.id}
                                type="button"
                                className="w-full text-left px-3 py-2 text-sm hover:bg-muted text-foreground transition-colors font-semibold flex justify-between items-center cursor-pointer"
                                onMouseDown={() => {
                                  const newItems = [...items];
                                  newItems[idx].productId = p.id;
                                  newItems[idx].productName = p.name;
                                  newItems[idx].searchText = p.name;
                                  newItems[idx].showDropdown = false;
                                  
                                  // Auto-fill cost price
                                  if (p.costPrice) {
                                    newItems[idx].unitPrice = String(p.costPrice);
                                  } else if (p.price) {
                                    newItems[idx].unitPrice = String((p.price / 1.2).toFixed(2));
                                  }
                                  
                                  setItems(newItems);
                                }}
                              >
                                <span>{p.name} {p.sku ? `(SKU: ${p.sku})` : ""}</span>
                                <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono">
                                  {formatPrice(p.price)}
                                </span>
                              </button>
                            ))}
                            
                            {item.searchText.trim().length > 0 && (
                              <button
                                type="button"
                                className="w-full text-left px-3 py-2.5 text-sm hover:bg-emerald-500/10 text-emerald-500 font-bold border-t border-border flex items-center gap-1.5 cursor-pointer bg-emerald-500/5"
                                onMouseDown={() => {
                                  const newItems = [...items];
                                  newItems[idx].productId = "new";
                                  newItems[idx].productName = item.searchText.trim();
                                  newItems[idx].searchText = item.searchText.trim();
                                  newItems[idx].showDropdown = false;
                                  setItems(newItems);
                                }}
                              >
                                ➕ Yeni Ürün Kartı Olarak Ekle: "{item.searchText.trim()}"
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Quantity Input */}
                  <div className="w-full md:w-24 space-y-2 shrink-0">
                    <Label className="text-xs font-bold text-muted-foreground uppercase">Miktar *</Label>
                    <Input
                      required
                      type="number"
                      min="1"
                      disabled={isViewMode}
                      className="h-10 border-border font-semibold text-center"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(idx, "quantity", e.target.value)}
                    />
                  </div>

                  {/* Unit Purchase Price Input */}
                  <div className="w-full md:w-28 space-y-2 shrink-0">
                    <Label className="text-xs font-bold text-muted-foreground uppercase">Alış Fiyatı *</Label>
                    <Input
                      required
                      type="number"
                      step="0.01"
                      min="0"
                      disabled={isViewMode}
                      className="h-10 border-border font-semibold text-right"
                      value={item.unitPrice}
                      onChange={(e) => handleItemChange(idx, "unitPrice", e.target.value)}
                    />
                  </div>

                  {/* KDV Rate Selector */}
                  <div className="w-full md:w-28 space-y-2 shrink-0">
                    <Label className="text-xs font-bold text-muted-foreground uppercase">KDV Oranı *</Label>
                    {isViewMode ? (
                      <Input
                        disabled
                        className="h-10 border-border bg-muted/40 font-semibold text-center text-foreground"
                        value={`%${item.taxRate}`}
                      />
                    ) : (
                      <select
                        disabled={isViewMode}
                        className="flex h-10 w-full rounded-lg border border-border bg-card px-2.5 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring text-foreground font-semibold cursor-pointer"
                        value={item.taxRate}
                        onChange={(e) => handleItemChange(idx, "taxRate", e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Tab" && !e.shiftKey && idx === items.length - 1) {
                            e.preventDefault();
                            handleAddItemRow();
                          }
                        }}
                      >
                        <option value="20">%20</option>
                        <option value="10">%10</option>
                        <option value="1">%1</option>
                        <option value="0">%0</option>
                      </select>
                    )}
                  </div>

                  {/* Line Total */}
                  <div className="w-full md:w-36 space-y-2 shrink-0">
                    <Label className="text-xs font-bold text-muted-foreground uppercase">KDV Dahil Tutar</Label>
                    <div className="h-10 rounded-lg border border-border bg-muted/40 flex items-center px-3 font-mono font-bold text-foreground text-xs justify-end">
                      {formatPrice(lineTotal * (1 + (parseFloat(item.taxRate) || 0) / 100))}
                    </div>
                  </div>

                  {/* Remove Button */}
                  {!isViewMode && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveItemRow(idx)}
                      className="size-10 rounded-lg text-destructive hover:bg-destructive/10 shrink-0 touch-target cursor-pointer mb-0.5"
                    >
                      <Trash2 className="w-4.5 h-4.5" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Grand Summary Block */}
          <div className="flex flex-col md:flex-row justify-between items-start pt-6 border-t border-border mt-4 gap-4">
            <div className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5 bg-amber-500/10 text-amber-500 border border-amber-500/20 px-3.5 py-2.5 rounded-xl max-w-lg mt-2">
              <PackageOpen className="w-5 h-5 shrink-0" />
              <span>
                💡 Alış faturası sisteme kaydedildiğinde, faturada yer alan ürünlerin stok adetleri belirtilen miktarlar kadar otomatik olarak artacak ve ürünlerin **Alış Fiyatı (Cost Price)** en son fatura birim fiyatı olarak güncellenecektir. Yeni ürünler sistemde otomatik olarak açılacaktır.
              </span>
            </div>

            <div className="bg-secondary/5 rounded-xl border border-border p-5 w-full md:w-96 space-y-3 bg-card/60 backdrop-blur-md">
              <div className="flex justify-between items-center text-sm border-b border-border pb-2">
                <span className="text-muted-foreground font-semibold">Ara Toplam (KDV Hariç)</span>
                <span className="font-bold text-foreground font-mono">{formatPrice(totals.subtotal)}</span>
              </div>
              <div className="flex justify-between items-center text-sm border-b border-border pb-2">
                <span className="text-muted-foreground font-semibold">Toplam KDV</span>
                <span className="font-bold text-foreground font-mono">{formatPrice(totals.kdvTotal)}</span>
              </div>
              <div className="flex justify-between items-center pt-1">
                <span className="text-sm text-foreground font-extrabold">GENEL TOPLAM</span>
                <span className="text-xl font-black font-mono text-secondary">{formatPrice(totals.grandTotal)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Button for mobile screen */}
        {!isViewMode && (
          <div className="flex justify-end gap-3 no-print">
            <Button
              type="button"
              variant="outline"
              className="h-12 px-6"
              onClick={() => navigate("/admin/purchase-invoices")}
            >
              İptal Et
            </Button>
            <Button
              type="submit"
              variant="secondary"
              className="h-12 px-6 flex items-center gap-1.5"
              disabled={isSubmitting}
            >
              <Save className="w-5 h-5" /> Faturayı Kaydet (Stok Girişi Yap)
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}
