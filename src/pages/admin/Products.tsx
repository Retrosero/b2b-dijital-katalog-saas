import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Trash2, ArrowUp, ArrowDown, Search } from "lucide-react";

export default function Products() {
  const { token, user } = useAuthStore();
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [sortBy, setSortBy] = useState("name-asc");

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

  const filteredAndSortedProducts = () => {
    let result = [...products];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        p =>
          p.name?.toLowerCase().includes(q) ||
          p.barcode?.toLowerCase().includes(q) ||
          p.category?.name?.toLowerCase().includes(q)
      );
    }

    if (categoryFilter) {
      result = result.filter(p => p.categoryId === categoryFilter);
    }

    if (sortBy === "name-asc") {
      result.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    } else if (sortBy === "name-desc") {
      result.sort((a, b) => (b.name || "").localeCompare(a.name || ""));
    } else if (sortBy === "price-asc") {
      result.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sortBy === "price-desc") {
      result.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (sortBy === "stock-asc") {
      result.sort((a, b) => (a.stock || 0) - (b.stock || 0));
    } else if (sortBy === "stock-desc") {
      result.sort((a, b) => (b.stock || 0) - (a.stock || 0));
    }

    return result;
  };

  const displayedProducts = filteredAndSortedProducts();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Ürün Yönetimi</h2>
          <p className="text-muted-foreground">Kataloğa eklenecek ana ürün veritabanını yönetin.</p>
        </div>
        <Link to="/admin/products/new">
          <Button className="shrink-0 bg-emerald-500 hover:bg-emerald-600 shadow-md transform active:scale-95 transition-all text-white font-bold h-11 px-6">
            + Yeni Ürün Ekle
          </Button>
        </Link>
      </div>
        
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            type="text"
            placeholder="Ürün adı, barkod..."
            className="pl-9 h-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <select
          className="h-9 w-full sm:w-auto rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="">Tüm Kategoriler</option>
          {flatCategories.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select
          className="h-9 w-full sm:w-auto rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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

      <div className="border rounded-md bg-white overflow-hidden">
        <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="">Ürün</TableHead>
                <TableHead className="">Genel Bilgi</TableHead>
                <TableHead className="">Fiyat</TableHead>
                <TableHead className="text-right ">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayedProducts.map(p => (
                <TableRow key={p.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-slate-100 rounded overflow-hidden shrink-0">
                        {p.images && p.images.length > 0 ? (
                          <img src={p.images[0].thumbUrl || p.images[0].originalUrl} className="w-full h-full object-cover" alt="primary" />
                        ) : <span className="text-[10px] sm:text-xs text-center w-full h-full flex items-center justify-center text-slate-400">Görsel Yok</span>}
                      </div>
                      <div>
                        <div className="font-medium text-sm sm:text-base line-clamp-2">{p.name}</div>
                        <div className="text-xs text-muted-foreground truncate max-w-[120px] sm:max-w-none">{p.barcode || "Barkodsuz"}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm line-clamp-1">{p.category?.name || "Kategori Yok"}</div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap">Koli: {p.piecesPerBox || "-"} | Amb: {p.packagingType || "-"}</div>
                  </TableCell>
                  <TableCell className="font-semibold text-sm sm:text-base">₺{p.price}</TableCell>
                  <TableCell className="text-right">
                    <Link to={`/admin/products/${p.id}`} className="inline-flex items-center justify-center rounded-lg text-xs sm:text-[0.8rem] h-7 px-2.5 hover:bg-muted hover:text-foreground font-medium transition-colors border">
                      Detay
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
              {displayedProducts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground h-24">
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
