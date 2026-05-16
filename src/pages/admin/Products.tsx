import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Package, Search, Settings2 } from "lucide-react";

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
    return <div className="p-4 text-center">Super Admin ürün yönetemez. Firmalar menüsünden işlem yapın.</div>;
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
    <div className="space-y-6">
      <div className="flex justify-end">
        <Link to="/admin/products/new">
          <Button variant="secondary" className="shrink-0 shadow-sm text-white font-bold h-11 px-6">
            + Yeni Ürün Ekle
          </Button>
        </Link>
      </div>

      <div className="rounded-lg border bg-white p-4 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Ürün adı, barkod, stok kodu veya kategori ara..."
              className="pl-10 h-10 bg-slate-50 border-slate-200"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <select
            className="h-10 w-full lg:w-56 rounded-md border border-slate-200 bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="">Tüm Kategoriler</option>
            {flatCategories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <select
            className="h-10 w-full lg:w-64 rounded-md border border-slate-200 bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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

      <div className="border rounded-lg bg-white overflow-hidden shadow-sm">
        <div className="flex justify-end p-3 border-b bg-slate-50 relative">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setIsColumnMenuOpen((v) => !v)}>
            <Settings2 className="w-4 h-4" />
            Alanlar
          </Button>
          {isColumnMenuOpen && (
            <div className="absolute right-3 top-12 z-20 w-64 rounded-lg border bg-white shadow-lg p-3 space-y-2">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={visibleColumns.barcode} onChange={() => toggleColumn("barcode")} /> Barkod</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={visibleColumns.sku} onChange={() => toggleColumn("sku")} /> Kod</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={visibleColumns.category} onChange={() => toggleColumn("category")} /> Kategori</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={visibleColumns.piecesPerBox} onChange={() => toggleColumn("piecesPerBox")} /> Koli</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={visibleColumns.packagingType} onChange={() => toggleColumn("packagingType")} /> Ambalaj</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={visibleColumns.stock} onChange={() => toggleColumn("stock")} /> Stok</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={visibleColumns.price} onChange={() => toggleColumn("price")} /> Fiyat</label>
            </div>
          )}
        </div>
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
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
              <TableRow key={p.id} className="hover:bg-slate-50/80">
                <TableCell className="py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 bg-slate-100 rounded-md overflow-hidden shrink-0 border">
                      {p.images && p.images.length > 0 ? (
                        <img src={p.images[0].thumbUrl || p.images[0].originalUrl} className="w-full h-full object-cover" alt="primary" />
                      ) : (
                        <span className="w-full h-full flex items-center justify-center text-slate-400">
                          <Package className="w-5 h-5" />
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-sm sm:text-base line-clamp-2 text-slate-900">{p.name}</div>
                    </div>
                  </div>
                </TableCell>
                {visibleColumns.barcode && <TableCell className="py-4 text-sm">{p.barcode || "-"}</TableCell>}
                {visibleColumns.sku && <TableCell className="py-4 text-sm">{p.sku || "-"}</TableCell>}
                {visibleColumns.category && <TableCell className="py-4 text-sm">{p.category?.name || "-"}</TableCell>}
                {visibleColumns.piecesPerBox && <TableCell className="py-4 text-sm">{p.piecesPerBox || "-"}</TableCell>}
                {visibleColumns.packagingType && <TableCell className="py-4 text-sm">{p.packagingType || "-"}</TableCell>}
                {visibleColumns.stock && (
                  <TableCell className="py-4">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${p.stock <= (p.stockThreshold || 0) ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
                      {p.stock ?? 0}
                    </span>
                  </TableCell>
                )}
                {visibleColumns.price && <TableCell className="py-4 font-bold text-sm sm:text-base text-slate-900">₺{Number(p.price || 0).toFixed(2)}</TableCell>}
                <TableCell className="text-right">
                  <Link to={`/admin/products/${p.id}`} className="inline-flex items-center justify-center rounded-lg text-xs sm:text-[0.8rem] h-8 px-3 hover:bg-muted hover:text-foreground font-medium transition-colors border">
                    Detay
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
