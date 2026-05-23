import { useEffect, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Save, Image as ImageIcon, Edit3, GripVertical, Search, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { usePageHeaderStore } from "@/store/usePageHeaderStore";
import { useToastActions } from "@/components/ui/toast";

export default function CatalogDetail() {
  const { id } = useParams();
  const { token } = useAuthStore();
  const { setHeader, resetHeader } = usePageHeaderStore();
  const toast = useToastActions();
  const [catalog, setCatalog] = useState<any>(null);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Search and Sort states
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("custom");

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [newCustomPrice, setNewCustomPrice] = useState("");
  const [addSearchTerm, setAddSearchTerm] = useState("");
  
  // Item edit states
  const [editingItem, setEditingItem] = useState<{ id: string, price: string } | null>(null);
  const [isBulkEditing, setIsBulkEditing] = useState(false);
  const [bulkPrices, setBulkPrices] = useState<Record<string, string>>({});

  useEffect(() => {
    loadData();
  }, [id, token]);

  const loadData = async () => {
    try {
      const [catRes, prodRes] = await Promise.all([
        fetch(`/api/catalogs/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/products`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      const [catData, prodData] = await Promise.all([catRes.json(), prodRes.json()]);
      setCatalog(catData);
      setAllProducts(prodData);
      setLoading(false);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  const handleAddItem = async () => {
    if (selectedProductIds.length === 0) return;
    try {
      await fetch(`/api/catalogs/${id}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          items: selectedProductIds.map(productId => ({
            productId,
            customPrice: newCustomPrice || undefined
          }))
        })
      });
      setIsAddModalOpen(false);
      setSelectedProductIds([]);
      setNewCustomPrice("");
      setAddSearchTerm("");
      loadData();
    } catch (e) {
      toast.error("Ürün(ler) eklenirken hata oluştu.");
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    if (!confirm("Bu ürünü katalogdan çıkarmak istediğinize emin misiniz?")) return;
    try {
      await fetch(`/api/catalogs/${id}/items/${itemId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Ürün katalogdan çıkarıldı.");
      loadData();
    } catch (e) {
      toast.error("Ürün silinirken hata oluştu.");
    }
  };

  const handleUpdatePrice = async (itemId: string) => {
    if (!editingItem) return;
    try {
      await fetch(`/api/catalogs/${id}/items/${itemId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ customPrice: editingItem.price })
      });
      setEditingItem(null);
      toast.success("Fiyat güncellendi.");
      loadData();
    } catch (e) {
      toast.error("Fiyat güncellenirken hata oluştu.");
    }
  };

  const handleStartBulkEdit = () => {
    const initialPrices: Record<string, string> = {};
    catalog?.items?.forEach((item: any) => {
      initialPrices[item.id] = item.customPrice?.toString() || "";
    });
    setBulkPrices(initialPrices);
    setIsBulkEditing(true);
  };

  const handleSaveBulkEdit = async () => {
    try {
      const itemsPayload = Object.keys(bulkPrices).map(id => ({
        id,
        customPrice: bulkPrices[id]
      }));
      await fetch(`/api/catalogs/${id}/items/bulk-price`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ items: itemsPayload })
      });
      setIsBulkEditing(false);
      toast.success("Toplu fiyat güncellemesi tamamlandı.");
      loadData();
    } catch (e) {
      toast.error("Toplu fiyat güncellemesi başarısız oldu.");
    }
  };

  const onDragEnd = async (result: any) => {
    if (!result.destination) return;
    if (result.destination.index === result.source.index) return;
    if (isBulkEditing || editingItem) return;

    const items = Array.from(catalog.items || []);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    const newOrderPayload = items.map((item: any, index) => ({ id: item.id, order: index }));
    setCatalog({ ...catalog, items });

    try {
      await fetch(`/api/catalogs/${id}/reorder`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ items: newOrderPayload })
      });
    } catch (e) {
      toast.error("Sıralama kaydedilemedi.");
      loadData(); // revert
    }
  };

  useEffect(() => {
    setHeader({
      title: catalog?.name || "Katalog Detayı",
      subtitle: catalog ? "Katalog içeriği, ürün sırası ve özel fiyat yönetimi" : null,
      backTo: "/admin/catalogs",
      actions: isBulkEditing ? [
        {
          key: "cancel-bulk-price",
          label: "İptal",
          onClick: () => setIsBulkEditing(false),
          icon: <X className="w-5 h-5" />,
          variant: "destructive"
        },
        {
          key: "save-bulk-price",
          label: "Fiyatları Kaydet",
          onClick: handleSaveBulkEdit,
          icon: <Save className="w-5 h-5" />,
          variant: "secondary"
        }
      ] : [
        ...(catalog?.items?.length > 0 ? [{
          key: "bulk-price",
          label: "Toplu Fiyat Düzenle",
          onClick: handleStartBulkEdit,
          icon: <Edit3 className="w-5 h-5" />,
          variant: "secondary" as const
        }] : []),
        {
          key: "add-catalog-product",
          label: "Kataloğa Ürün Ekle",
          onClick: () => setIsAddModalOpen(true),
          icon: <Plus className="w-5 h-5" />,
          variant: "secondary"
        }
      ]
    });
    return resetHeader;
  }, [catalog, isBulkEditing, setHeader, resetHeader]);

  if (loading) return <div className="p-4">Yükleniyor...</div>;
  if (!catalog) return <div className="p-4 text-red-500">Katalog bulunamadı</div>;

  const productOptions = allProducts.filter(p => !catalog.items?.find((i: any) => i.productId === p.id));

  const filteredAndSortedItems = () => {
    if (!catalog?.items) return [];
    let items = [...catalog.items];

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      items = items.filter(item => {
        const prod = item.product;
        if (!prod) return false;
        return (
          prod.name?.toLowerCase().includes(q) ||
          prod.barcode?.toLowerCase().includes(q) ||
          prod.category?.name?.toLowerCase().includes(q) ||
          prod.brand?.name?.toLowerCase().includes(q)
        );
      });
    }

    if (sortBy === "name-asc") {
      items.sort((a, b) => (a.product?.name || "").localeCompare(b.product?.name || ""));
    } else if (sortBy === "name-desc") {
      items.sort((a, b) => (b.product?.name || "").localeCompare(a.product?.name || ""));
    } else if (sortBy === "price-asc") {
      items.sort((a, b) => {
        const priceA = a.customPrice ?? a.product?.price ?? 0;
        const priceB = b.customPrice ?? b.product?.price ?? 0;
        return priceA - priceB;
      });
    } else if (sortBy === "price-desc") {
      items.sort((a, b) => {
        const priceA = a.customPrice ?? a.product?.price ?? 0;
        const priceB = b.customPrice ?? b.product?.price ?? 0;
        return priceB - priceA;
      });
    }

    return items;
  };

  const displayedItems = filteredAndSortedItems();
  const isDragDisabled = searchTerm !== "" || sortBy !== "custom" || isBulkEditing || !!editingItem;

  return (
    <div className="space-y-6 w-full max-w-none animate-fade-in">
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Ürün adı, barkod, kategori..."
                className="pl-9 h-9 bg-background"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              className="h-9 w-full sm:w-auto rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
            >
              <option value="custom">Özel Sıralama</option>
              <option value="name-asc">İsim (A-Z)</option>
              <option value="name-desc">İsim (Z-A)</option>
              <option value="price-asc">Fiyat (Düşükten Yükseğe)</option>
              <option value="price-desc">Fiyat (Yüksekten Düşüğe)</option>
            </select>
          </div>
          <h3 className="font-semibold text-foreground hidden sm:block">Katalogdaki Ürünler</h3>
        </div>
        <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead className="">Ürün</TableHead>
                <TableHead className="">Baz Fiyat</TableHead>
                <TableHead className="">Katalog Fiyatı (Özel)</TableHead>
                <TableHead className="text-right ">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="catalog-items" isDropDisabled={isDragDisabled}>
                {(provided) => (
                  <TableBody ref={provided.innerRef} {...provided.droppableProps}>
                    {displayedItems.map((item: any, index: number) => (
                      <div key={item.id} className="contents">
                      <Draggable draggableId={item.id} index={index} isDragDisabled={isDragDisabled}>
                        {(provided, snapshot) => (
                          <TableRow 
                            ref={provided.innerRef} 
                            {...provided.draggableProps}
                            className={snapshot.isDragging ? "bg-muted/40" : ""}
                          >
                            <TableCell className="w-12 text-center pointer-events-auto">
                              <div 
                                {...provided.dragHandleProps} 
                                className={`inline-flex p-1 ${isDragDisabled ? "text-muted-foreground/30 cursor-not-allowed" : "cursor-grab active:cursor-grabbing text-muted-foreground/60 hover:text-primary"}`}
                              >
                                <GripVertical className="w-5 h-5" />
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-muted rounded border overflow-hidden shrink-0 flex items-center justify-center pointer-events-none">
                                  {item.product?.images?.[0] ? (
                                    <img src={item.product.images[0].thumbUrl || item.product.images[0].originalUrl} className="w-full h-full object-cover" alt="img" />
                                  ) : (
                                    <ImageIcon className="w-4 h-4 text-muted-foreground/60" />
                                  )}
                                </div>
                                <div>
                                  <div className="font-medium text-foreground line-clamp-2">{item.product?.name || "Bilinmeyen Ürün"}</div>
                                  <div className="text-xs text-muted-foreground truncate max-w-[150px] sm:max-w-none">{item.product?.barcode || "-"}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              ₺{item.product?.price?.toFixed(2)}
                            </TableCell>
                            <TableCell>
                              {isBulkEditing ? (
                                <div className="flex flex-col gap-1">
                                  <Input
                                    type="number"
                                    className="w-24 sm:w-32 h-8 text-sm"
                                    value={bulkPrices[item.id] ?? ""}
                                    onChange={(e) => setBulkPrices({ ...bulkPrices, [item.id]: e.target.value })}
                                    placeholder={item.product?.price?.toString()}
                                  />
                                </div>
                              ) : editingItem?.id === item.id ? (
                                <div className="flex flex-col gap-1">
                                  <Input
                                    type="number"
                                    className="w-24 sm:w-32 h-8 text-sm"
                                    value={editingItem.price}
                                    onChange={(e) => setEditingItem({ ...editingItem, price: e.target.value })}
                                    placeholder={item.product?.price?.toString()}
                                  />
                                  <span className="text-[10px] text-muted-foreground text-left whitespace-nowrap">Boş bırakılırsa baz fiyatı kullanılır</span>
                                </div>
                              ) : (
                                <div className="font-semibold text-primary">
                                  {item.customPrice ? `₺${item.customPrice.toFixed(2)}` : <span className="text-muted-foreground/60 font-normal italic">Yok (Baz fiyattan)</span>}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                                {isBulkEditing ? null : (
                                  <>
                                    {editingItem?.id === item.id ? (
                                      <>
                                        <Button variant="ghost" size="sm" onClick={() => handleUpdatePrice(item.id)} className="h-8 text-secondary hover:text-secondary/90 hover:bg-secondary/10">
                                          <Save className="w-4 h-4 mr-1" /> Kaydet
                                        </Button>
                                        <Button variant="destructive" size="sm" onClick={() => setEditingItem(null)} className="h-8">
                                          İptal
                                        </Button>
                                      </>
                                    ) : (
                                      <>
                                        <Button variant="ghost" size="sm" onClick={() => setEditingItem({ id: item.id, price: item.customPrice?.toString() || "" })} className="h-8 px-2 text-primary hover:text-primary/90 hover:bg-primary/10">
                                          Fiyatı Düzenle
                                        </Button>
                                        <Button variant="ghost" size="sm" onClick={() => handleRemoveItem(item.id)} className="h-8 px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-transparent">
                                          <Trash2 className="w-4 h-4" />
                                        </Button>
                                      </>
                                    )}
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </Draggable>
                      </div>
                    ))}
                    {provided.placeholder}
                    {(!displayedItems || displayedItems.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                          {catalog.items?.length === 0 ? "Bu katalogda henüz ürün bulunmuyor." : "Arama kriterlerine uygun ürün bulunamadı."}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                )}
              </Droppable>
            </DragDropContext>
          </Table>
      </div>

      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Kataloğa Ürün Ekle</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Ürün Seçin</label>
                <span className="text-xs text-muted-foreground">{selectedProductIds.length} ürün seçildi</span>
              </div>
              <div className="relative flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Ürün Ara..."
                    className="pl-9 h-9"
                    value={addSearchTerm}
                    onChange={e => setAddSearchTerm(e.target.value)}
                  />
                </div>
                <Button 
                  type="button" 
                  variant="outline" 
                  className="h-9 px-3 text-xs"
                  onClick={() => {
                    const filtered = productOptions.filter(p => p.name?.toLowerCase().includes(addSearchTerm.toLowerCase()) || p.barcode?.toLowerCase().includes(addSearchTerm.toLowerCase()));
                    const allSelected = filtered.every(p => selectedProductIds.includes(p.id));
                    if (allSelected) {
                      const filteredIds = filtered.map(p => p.id);
                      setSelectedProductIds(prev => prev.filter(id => !filteredIds.includes(id)));
                    } else {
                      const newIds = filtered.map(p => p.id).filter(id => !selectedProductIds.includes(id));
                      setSelectedProductIds(prev => [...prev, ...newIds]);
                    }
                  }}
                >
                  Tümünü Seç / Kaldır
                </Button>
              </div>
              <div className="border rounded-md max-h-[300px] overflow-y-auto p-2 space-y-1">
                {productOptions.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">Tüm ürünler bu katalogda zaten mevcut veya ürün yok.</p>
                ) : (
                  productOptions
                    .filter(p => p.name?.toLowerCase().includes(addSearchTerm.toLowerCase()) || p.barcode?.toLowerCase().includes(addSearchTerm.toLowerCase()))
                    .map(p => (
                      <label key={p.id} className="flex items-center gap-3 p-2 hover:bg-muted/40 rounded cursor-pointer border border-transparent hover:border-border transition-colors">
                        <input
                          type="checkbox"
                          className="rounded border-input text-primary focus:ring-ring focus:ring-offset-0 w-4 h-4 cursor-pointer"
                          checked={selectedProductIds.includes(p.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedProductIds(prev => [...prev, p.id]);
                            } else {
                              setSelectedProductIds(prev => prev.filter(id => id !== p.id));
                            }
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-foreground truncate">{p.name}</div>
                          <div className="text-xs text-muted-foreground">{p.barcode || "Barkodsuz"}</div>
                        </div>
                        <div className="text-sm font-semibold text-foreground/80 whitespace-nowrap">
                          ₺{p.price?.toFixed(2)}
                        </div>
                      </label>
                    ))
                )}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Özel Katalog Fiyatı (Opsiyonel)</label>
              <Input
                type="number"
                placeholder="Boş bırakılırsa ürünlerin baz fiyatı geçerli olur"
                value={newCustomPrice}
                onChange={e => setNewCustomPrice(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Not: Eğer birden fazla ürün seçtiyseniz, girilen özel fiyat tümüne uygulanacaktır.</p>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="destructive" onClick={() => setIsAddModalOpen(false)}>İptal</Button>
              <Button onClick={handleAddItem} disabled={selectedProductIds.length === 0}>Ekle</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}