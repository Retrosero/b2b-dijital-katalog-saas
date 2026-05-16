import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Users as UsersIcon, ChevronRight, Plus, Mail, Phone } from "lucide-react";

export default function Customers() {
  const { token, user } = useAuthStore();
  const [customers, setCustomers] = useState<any[]>([]);

  const fetchCustomers = async () => {
    const res = await fetch("/api/customers", { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setCustomers(await res.json());
  };

  useEffect(() => {
    fetchCustomers();
  }, [token]);

  if (user?.role === "SUPER_ADMIN") {
    return <div className="p-4 text-center text-muted-foreground">Super Admin yönetemez.</div>;
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex justify-end">
        <Link to="/admin/customers/new">
          <Button className="brand-gradient border-0 shadow-md shadow-secondary/20 hover:opacity-90 transition-opacity h-11 px-5 font-semibold gap-2">
            <Plus className="w-4 h-4" /> Yeni Müşteri
          </Button>
        </Link>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {customers.map((c: any) => (
          <div key={c.id} className="bg-card rounded-xl border border-border p-4 shadow-sm card-hover">
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full brand-gradient flex items-center justify-center text-white font-bold text-xs shrink-0">
                  {c.name?.slice(0, 2)?.toUpperCase() || "MÜ"}
                </div>
                <div>
                  <div className="font-semibold text-foreground">{c.name}</div>
                  {c.assignedUser && <div className="text-xs text-muted-foreground">Temsilci: {c.assignedUser.name}</div>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
              {c.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {c.email}</span>}
              {c.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {c.phone}</span>}
            </div>
            <div className="flex items-center gap-2 border-t border-border pt-3">
              <Link to={`/admin/customers/edit/${c.id}`} className="flex-1 text-center py-2 rounded-lg text-xs font-medium border border-border hover:bg-muted transition-colors touch-target">
                Düzenle
              </Link>
              <Link to={`/admin/customers/${c.id}`} className="flex-1 text-center py-2 rounded-lg text-xs font-medium bg-secondary/10 text-secondary hover:bg-secondary/20 transition-colors touch-target">
                Detay
              </Link>
            </div>
          </div>
        ))}
        {customers.length === 0 && (
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
                <TableHead className="text-right">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((c: any) => (
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
                  <TableCell className="text-right space-x-2 whitespace-nowrap">
                    <Link to={`/admin/customers/edit/${c.id}`} className="inline-flex items-center justify-center h-9 px-3 rounded-lg text-sm border border-border hover:bg-muted transition-colors touch-target">
                      Düzenle
                    </Link>
                    <Link to={`/admin/customers/${c.id}`} className="inline-flex items-center justify-center h-9 px-3 rounded-lg text-sm bg-secondary/10 text-secondary hover:bg-secondary/20 transition-colors touch-target">
                      Detay
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
              {customers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground h-24">Bulunamadı</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
      </div>
    </div>
  );
}
