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
    return <div className="p-4 text-center text-muted-foreground">Super Admin yÃ¶netemez.</div>;
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex justify-end">
        <Link to="/admin/customers/new">
          <Button className="brand-gradient border-0 shadow-md shadow-secondary/20 hover:opacity-90 transition-opacity h-11 px-5 font-semibold gap-2">
            <Plus className="w-4 h-4" /> Yeni MÃ¼ÅŸteri
          </Button>
        </Link>
      </div>

            {/* Mobile Cards */}
      <div className="md:hidden space-y-2.5">
        {customers.map((c: any) => (
          <div key={c.id} className="bg-card rounded-lg border border-border/80 p-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <div className="flex items-start justify-between gap-2 mb-2.5">
              <div className="flex items-center gap-3">
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
            </div>
            <div className="space-y-1.5 text-[11px] text-muted-foreground mb-2.5">
              <div className="flex items-center gap-1.5 truncate">
                <Mail className="w-3 h-3 shrink-0" />
                <span className="truncate">{c.email || "-"}</span>
              </div>
              <div className="flex items-center gap-1.5 truncate">
                <Phone className="w-3 h-3 shrink-0" />
                <span className="truncate">{c.phone || "-"}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 border-t border-border/80 pt-2.5">
              <Link to={`/admin/customers/edit/${c.id}`} className="flex-1 text-center py-1.5 rounded-md text-[11px] font-medium border border-border hover:bg-muted transition-colors">
                Düzenle
              </Link>
              <Link to={`/admin/customers/${c.id}`} className="flex-1 text-center py-1.5 rounded-md text-[11px] font-medium border border-secondary/30 text-secondary hover:bg-secondary/10 transition-colors">
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
                <TableHead>KullanÄ±cÄ± AdÄ±</TableHead>
                <TableHead className="text-right">Ä°ÅŸlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((c: any) => (
                <TableRow key={c.id} className="hover:bg-muted/20">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full brand-gradient flex items-center justify-center text-white font-bold text-[10px] shrink-0">
                        {c.name?.slice(0, 2)?.toUpperCase() || "MÃœ"}
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
                      DÃ¼zenle
                    </Link>
                    <Link to={`/admin/customers/${c.id}`} className="inline-flex items-center justify-center h-9 px-3 rounded-lg text-sm bg-secondary/10 text-secondary hover:bg-secondary/20 transition-colors touch-target">
                      Detay
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
              {customers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground h-24">BulunamadÄ±</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
      </div>
    </div>
  );
}

