import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users as UsersIcon, Plus, Mail, Phone, Search, Wallet } from "lucide-react";

const formatPrice = (value: number) => {
  return value.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " TL";
};

export default function Customers() {
  const { token, user } = useAuthStore();
  const [customers, setCustomers] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  const fetchCustomers = async () => {
    const res = await fetch("/api/customers", { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setCustomers(await res.json());
  };

  useEffect(() => {
    fetchCustomers();
  }, [token]);

  const filteredCustomers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c: any) =>
      [c.name, c.email, c.phone, c.username, c.assignedUser?.name]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [customers, search]);

  if (user?.role === "SUPER_ADMIN") {
    return <div className="p-4 text-center text-muted-foreground">Super Admin yönetemez.</div>;
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="sticky top-0 z-20 bg-background py-2 flex items-center gap-2.5">
        <div className="relative flex-1 md:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Müşteri ara..."
            className="pl-9"
          />
        </div>
        <Link to="/admin/customers/new">
          <Button className="brand-gradient border-0 shadow-md shadow-secondary/20 hover:opacity-90 transition-opacity h-11 px-3 font-semibold gap-1.5 whitespace-nowrap">
            <Plus className="w-4 h-4" /> + Ekle
          </Button>
        </Link>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-2.5">
        {filteredCustomers.map((c: any) => (
          <Link
            key={c.id}
            to={`/admin/customers/${c.id}`}
            className="block bg-card rounded-lg border border-border/80 p-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)] active:scale-[0.995] transition-transform"
          >
            <div className="flex items-start justify-between gap-2 mb-2.5">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-md bg-secondary/10 border border-secondary/20 flex items-center justify-center text-secondary font-semibold text-[11px] shrink-0">
                  {c.name?.slice(0, 2)?.toUpperCase() || "MÜ"}
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-[13px] text-foreground truncate">{c.name}</div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {c.assignedUser ? `Temsilci: ${c.assignedUser.name}` : "Temsilci atanmadı"}
                  </div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-[10px] text-muted-foreground">Bakiye</div>
                <div className="text-[12px] font-semibold text-secondary">{formatPrice(Number(c.balance) || 0)}</div>
              </div>
            </div>
            <div className="space-y-1.5 text-[11px] text-muted-foreground">
              <div className="flex items-center gap-1.5 truncate">
                <Mail className="w-3 h-3 shrink-0" />
                <span className="truncate">{c.email || "-"}</span>
              </div>
              <div className="flex items-center gap-1.5 truncate">
                <Phone className="w-3 h-3 shrink-0" />
                <span className="truncate">{c.phone || "-"}</span>
              </div>
              <div className="flex items-center gap-1.5 truncate">
                <Wallet className="w-3 h-3 shrink-0" />
                <span className="truncate">Cari bakiye: {formatPrice(Number(c.balance) || 0)}</span>
              </div>
            </div>
          </Link>
        ))}
        {filteredCustomers.length === 0 && (
          <div className="text-center py-16">
            <UsersIcon className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">Kayıtlı müşteri bulunamadı.</p>
          </div>
        )}
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block border rounded-xl bg-card overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead>Ad</TableHead>
              <TableHead>E-posta</TableHead>
              <TableHead>Telefon</TableHead>
              <TableHead>Temsilci</TableHead>
              <TableHead>Kullanıcı Adı</TableHead>
              <TableHead>Bakiye</TableHead>
              <TableHead className="text-right">Detay</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCustomers.map((c: any) => (
              <TableRow key={c.id} className="hover:bg-muted/20">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full brand-gradient flex items-center justify-center text-white font-bold text-[10px] shrink-0">
                      {c.name?.slice(0, 2)?.toUpperCase() || "MÜ"}
                    </div>
                    <span className="font-medium">{c.name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">{c.email || "-"}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{c.phone || "-"}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{c.assignedUser ? c.assignedUser.name : "-"}</TableCell>
                <TableCell className="text-muted-foreground text-sm font-mono">{c.username || "-"}</TableCell>
                <TableCell className="text-muted-foreground text-sm font-medium">{formatPrice(Number(c.balance) || 0)}</TableCell>
                <TableCell className="text-right whitespace-nowrap">
                  <Link to={`/admin/customers/${c.id}`} className="inline-flex items-center justify-center h-9 px-3 rounded-lg text-sm border border-secondary/30 text-secondary hover:bg-secondary/10 transition-colors touch-target">
                    Detay
                  </Link>
                </TableCell>
              </TableRow>
            ))}
            {filteredCustomers.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground h-24">Bulunamadı</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
