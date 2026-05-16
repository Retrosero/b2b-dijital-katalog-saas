import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Package, Search, Settings2, Plus, ChevronRight } from "lucide-react";

export default function Products() {
  const { token, user } = useAuthStore();
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [sortBy, setSortBy] = useState("name-asc");
  const [isColumnMenuOpen, setIsColumnMenuOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    barcode: true,
    sku: true,
    category: true,
    piecesPerBox: true,
    packagingType: true,
    stock: true,
    price: true
  });

  const columnStorageKey = "products-table-visible-columns:v1";

  const fetchData = async () => {
    const resProd = await fetch("/api/products", { headers: { Authorization: `Bearer ${token}` } });
    if (resProd.ok) setProducts(await resProd.json());

    const resCat = await fetch("/api/categories", { headers: { Authorization: `Bearer ${token}` } });
    if (resCat.ok) {
      const data = await resCat.json();
      setCategories(data.categories || []);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(columnStorageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        setVisibleColumns((prev) => ({ ...prev, ...parsed }));
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(columnStorageKey, JSON.stringify(visibleColumns));
    } catch (e) {}
  }, [visibleColumns]);

  const flattenCategories = (cats: any[], prefix = ""): any[] => {
    let result: any[] = [];
    cats.forEach(c => {
      result.push({ id: c.id, name: prefix + c.name });
      if (c.children && c.children.length > 0) {
        result = result.concat(flattenCategories(c.children, prefix + "-- "));
      }
    });
    return result;
  };

  const flatCategories = flattenCategories(categories.filter(c => !c.parentId));

  if (user?.role === "SUPER_ADMIN") {
    return <div className="p-4 text-center text-muted-foreground">Super Admin ürün yönetemez. Firmalar menüsünden işlem yapın.</div>;
  }

  const displayedProducts = [...products]
    .filter((p) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        p.name?.toLowerCase().includes(q) ||
        p.barcode?.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q) ||
        p.category?.name?.toLowerCase().includes(q)
      );
    })
    .filter((p) => !categoryFilter || p.categoryId === categoryFilter)
    .sort((a, b) => {
      if (sortBy === "name-asc") return (a.name || "").localeCompare(b.name || "");
      if (sortBy === "name-desc") return (b.name || "").localeCompare(a.name || "");
      if (sortBy === "price-asc") return (a.price || 0) - (b.price || 0);
      if (sortBy === "price-desc") return (b.price || 0) - (a.price || 0);
      if (sortBy === "stock-asc") return (a.stock || 0) - (b.stock || 0);
      if (sortBy === "stock-desc") return (b.stock || 0) - (a.stock || 0);
      return 0;
    });

  const columnCount = useMemo(() => {
    let count = 2; // ürün + işlemler
    if (visibleColumns.barcode) count += 1;
    if (visibleColumns.sku) count += 1;
    if (visibleColumns.category) count += 1;
    if (visibleColumns.piecesPerBox) count += 1;
    if (visibleColumns.packagingType) count += 1;
    if (visibleColumns.stock) count += 1;
    if (visibleColumns.price) count += 1;
    return count;
  }, [visibleColumns]);

  const toggleColumn = (key: string) => {
    setVisibleColumns((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex justify-end">
        <Link to="/admin/products/new">
          <Button className="brand-gradient border-0 shadow-md shadow-secondary/20 hover:opacity-90 transition-opacity h-11 px-5 font-semibold gap-2">
            <Plus className="w-4 h-4" /> Yeni Ürün Ekle
          </Button>
        </Link>
      </div>

      <div className="rounded-xl border border-border bg-card p-3 md:p-4 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/50" />
            <Input
              type="text"
              placeholder="Ürün adı, barkod, stok kodu veya kategori ara..."
              className="pl-10 h-11 bg-muted/30 border-border"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <select
            className="h-11 w-full lg:w-56 rounded-lg border border-border bg-card px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring touch-target"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="">Tüm Kategoriler</option>
            {flatCategories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <select
            className="h-11 w-full lg:w-64 rounded-lg border border-border bg-card px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring touch-target"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="name-asc">İsim (A-Z)</option>
            <option value="name-desc">İsim (Z-A)</option>
            <option value="price-asc">Fiyat (Düşükten Yükseğe)</option>
            <option value="price-desc">Fiyat (Yüksekten Düşüğe)</option>
            <option value="stock-asc">Stok (Düşükten Yükseğe)</option>
            <option value="stock-desc">Stok (Yüksekten Düşüğe)</option>
          </select>
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {displayedProducts.map(p => (
          <Link to={`/admin/products/${p.id}`} key={p.id} className="block bg-card rounded-xl border border-border p-3 shadow-sm card-hover">
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 bg-muted/50 rounded-lg overflow-hidden shrink-0 border border-border">
                {p.images && p.images.length > 0 ? (
                  <img src={p.images[0].thumbUrl || p.images[0].originalUrl} className="w-full h-full object-cover" alt="primary" />
                ) : (
                  <span className="w-full h-full flex items-center justify-center text-muted-foreground/30">
                    <Package className="w-6 h-6" />
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-foreground line-clamp-2 leading-tight">{p.name}</div>
                {p.category?.name && <div className="text-xs text-muted-foreground mt-1">{p.category.name}</div>}
                <div className="flex items-center gap-3 mt-2">
                  <span className="font-bold text-foreground">₺{Number(p.price || 0).toFixed(2)}</span>
                  <span className={`status-badge ${p.stock <= (p.stockThreshold || 0) ? "status-cancelled" : "status-active"}`}>
                    Stok: {p.stock ?? 0}
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground/30 shrink-0" />
            </div>
          </Link>
        ))}
        {displayedProducts.length === 0 && (
          <div className="text-center py-16">
            <Package className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">
              {products.length === 0 ? "Kayıtlı ürün bulunamadı." : "Arama kriterlerine uygun ürün bulunamadı."}
            </p>
          </div>
        )}
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block border rounded-xl bg-card overflow-hidden shadow-sm">
        <div className="flex justify-end p-3 border-b bg-muted/20 relative">
          <Button variant="outline" size="sm" className="gap-2 touch-target" onClick={() => setIsColumnMenuOpen((v) => !v)}>
            <Settings2 className="w-4 h-4" />
            Alanlar
          </Button>
          {isColumnMenuOpen && (
            <div className="absolute right-3 top-12 z-20 w-64 rounded-xl border border-border bg-card shadow-lg p-4 space-y-2.5">
              <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" className="rounded" checked={visibleColumns.barcode} onChange={() => toggleColumn("barcode")} /> Barkod</label>
              <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" className="rounded" checked={visibleColumns.sku} onChange={() => toggleColumn("sku")} /> Kod</label>
              <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" className="rounded" checked={visibleColumns.category} onChange={() => toggleColumn("category")} /> Kategori</label>
              <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" className="rounded" checked={visibleColumns.piecesPerBox} onChange={() => toggleColumn("piecesPerBox")} /> Koli</label>
              <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" className="rounded" checked={visibleColumns.packagingType} onChange={() => toggleColumn("packagingType")} /> Ambalaj</label>
              <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" className="rounded" checked={visibleColumns.stock} onChange={() => toggleColumn("stock")} /> Stok</label>
              <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" className="rounded" checked={visibleColumns.price} onChange={() => toggleColumn("price")} /> Fiyat</label>
            </div>
          )}
        </div>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="min-w-[280px]">Ürün</TableHead>
              {visibleColumns.barcode && <TableHead>Barkod</TableHead>}
              {visibleColumns.sku && <TableHead>Kod</TableHead>}
              {visibleColumns.category && <TableHead>Kategori</TableHead>}
              {visibleColumns.piecesPerBox && <TableHead>Koli</TableHead>}
              {visibleColumns.packagingType && <TableHead>Ambalaj</TableHead>}
              {visibleColumns.stock && <TableHead>Stok</TableHead>}
              {visibleColumns.price && <TableHead>Fiyat</TableHead>}
              <TableHead className="text-right">İşlemler</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayedProducts.map(p => (
              <TableRow key={p.id} className="hover:bg-muted/20">
                <TableCell className="py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-muted/50 rounded-lg overflow-hidden shrink-0 border border-border">
                      {p.images && p.images.length > 0 ? (
                        <img src={p.images[0].thumbUrl || p.images[0].originalUrl} className="w-full h-full object-cover" alt="primary" />
                      ) : (
                        <span className="w-full h-full flex items-center justify-center text-muted-foreground/30">
                          <Package className="w-5 h-5" />
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-sm line-clamp-2 text-foreground">{p.name}</div>
                    </div>
                  </div>
                </TableCell>
                {visibleColumns.barcode && <TableCell className="py-3.5 text-sm text-muted-foreground">{p.barcode || "-"}</TableCell>}
                {visibleColumns.sku && <TableCell className="py-3.5 text-sm text-muted-foreground">{p.sku || "-"}</TableCell>}
                {visibleColumns.category && <TableCell className="py-3.5 text-sm text-muted-foreground">{p.category?.name || "-"}</TableCell>}
                {visibleColumns.piecesPerBox && <TableCell className="py-3.5 text-sm text-muted-foreground">{p.piecesPerBox || "-"}</TableCell>}
                {visibleColumns.packagingType && <TableCell className="py-3.5 text-sm text-muted-foreground">{p.packagingType || "-"}</TableCell>}
                {visibleColumns.stock && (
                  <TableCell className="py-3.5">
                    <span className={`status-badge ${p.stock <= (p.stockThreshold || 0) ? "status-cancelled" : "status-active"}`}>
                      {p.stock ?? 0}
                    </span>
                  </TableCell>
                )}
                {visibleColumns.price && <TableCell className="py-3.5 font-bold text-sm text-foreground">₺{Number(p.price || 0).toFixed(2)}</TableCell>}
                <TableCell className="text-right">
                  <Link to={`/admin/products/${p.id}`} className="inline-flex items-center gap-1 rounded-lg text-sm h-9 px-3 hover:bg-muted font-medium transition-colors border border-border touch-target">
                    Detay <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </TableCell>
              </TableRow>
            ))}
            {displayedProducts.length === 0 && (
              <TableRow>
                <TableCell colSpan={columnCount} className="text-center text-muted-foreground h-24">
                  {products.length === 0 ? "Kayıtlı ürün bulunamadı." : "Arama kriterlerine uygun ürün bulunamadı."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
