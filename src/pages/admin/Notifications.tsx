import { useEffect, useMemo, useState } from "react";
import { Bell, CheckCheck, CheckCircle2, Search, CalendarDays } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { usePageHeaderStore } from "@/store/usePageHeaderStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { fixMojibake } from "@/lib/text";

const PAGE_SIZE = 20;

const TYPE_LABELS: Record<string, string> = {
  INFO: "Bilgi",
  LOW_STOCK: "Düşük stok",
  NEW_ORDER: "Yeni sipariş",
  ORDER_SHIPPED: "Sipariş gönderildi"
};

export default function Notifications() {
  const { token } = useAuthStore();
  const { setHeader, resetHeader } = usePageHeaderStore();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [readFilter, setReadFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [isDatePanelOpen, setIsDatePanelOpen] = useState(false);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(PAGE_SIZE));
    if (search.trim()) params.set("search", search.trim());
    if (readFilter !== "ALL") params.set("isRead", readFilter);
    if (typeFilter !== "ALL") params.set("type", typeFilter);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    return params.toString();
  }, [page, search, readFilter, typeFilter, dateFrom, dateTo]);

  const fetchNotifications = async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/notifications?${queryString}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Bildirimler alınamadı.");
      const data = await res.json();
      setItems(data.items || []);
      setTotal(Number(data.total || 0));
      setTotalPages(Math.max(1, Number(data.totalPages || 1)));
    } catch (e: any) {
      setError(e?.message || "Bildirimler alınamadı.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [token, queryString]);

  useEffect(() => {
    setPage(1);
  }, [search, readFilter, typeFilter, dateFrom, dateTo]);

  const markAsRead = async (id: string) => {
    await fetch(`/api/notifications/${id}/read`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` }
    });
    fetchNotifications();
  };

  const markAllAsRead = async () => {
    await fetch("/api/notifications/read-all", {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` }
    });
    fetchNotifications();
  };

  useEffect(() => {
    setHeader({
      title: "Bildirimler",
      subtitle: "Okundu durumu, tip ve tarih filtreleriyle bildirim takibi",
      backTo: "/admin",
      actions: [
        {
          key: "mark-all-read",
          label: "Tümünü okundu yap",
          onClick: () => void markAllAsRead(),
          icon: <CheckCheck className="w-5 h-5" />,
          variant: "secondary"
        }
      ]
    });
    return resetHeader;
  }, [setHeader, resetHeader, queryString, token]);

  const notificationTypes = useMemo(() => {
    const types = new Set(items.map((item) => item.type).filter(Boolean));
    ["INFO", "LOW_STOCK", "NEW_ORDER", "ORDER_SHIPPED"].forEach((type) => types.add(type));
    return Array.from(types).sort();
  }, [items]);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="bg-card border border-border rounded-xl shadow-sm p-4 space-y-3">
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Bildirim ara..."
              className="h-11 pl-9"
            />
          </div>
          <div className="overflow-x-auto">
            <div className="flex w-max min-w-full items-center gap-2">
              <select className="h-11 min-w-[160px] rounded-lg border border-border bg-card px-3 text-sm" value={readFilter} onChange={(e) => setReadFilter(e.target.value)}>
                <option value="ALL">Tüm durumlar</option>
                <option value="false">Okunmadı</option>
                <option value="true">Okundu</option>
              </select>
              <select className="h-11 min-w-[170px] rounded-lg border border-border bg-card px-3 text-sm" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                <option value="ALL">Tüm tipler</option>
                {notificationTypes.map((type) => (
                  <option key={type} value={type}>{TYPE_LABELS[type] || type}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setIsDatePanelOpen((prev) => !prev)}
                className={cn(
                  "h-11 w-11 inline-flex items-center justify-center rounded-lg border transition-colors shrink-0",
                  (isDatePanelOpen || dateFrom || dateTo) ? "bg-primary/10 text-primary border-primary/20" : "bg-card border-border text-foreground hover:bg-muted"
                )}
                title="Tarih aralığı"
                aria-label="Tarih aralığı"
              >
                <CalendarDays className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
        {isDatePanelOpen && (
          <div className="rounded-xl border border-border bg-card p-3">
            <div className="flex items-center gap-2">
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-11" />
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-11" />
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">Bildirimler yükleniyor...</div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <Bell className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
          <div className="font-semibold text-foreground">Bildirim bulunamadı</div>
          <p className="text-sm text-muted-foreground mt-1">Filtreleri değiştirerek tekrar deneyebilirsiniz.</p>
        </div>
      ) : (
        <>
          <div className="md:hidden space-y-3">
            {items.map((item) => (
              <div key={item.id} className={cn("rounded-xl border p-4 bg-card shadow-sm", !item.isRead && "border-secondary/30 bg-secondary/5")}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-secondary">{TYPE_LABELS[item.type] || item.type}</div>
                    <p className="mt-1 text-sm font-medium text-foreground break-words">{fixMojibake(item.message)}</p>
                    <p className="mt-2 text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString("tr-TR")}</p>
                  </div>
                  {!item.isRead && (
                    <Button size="icon" variant="ghost" aria-label="Okundu olarak işaretle" onClick={() => markAsRead(item.id)} className="shrink-0">
                      <CheckCircle2 className="w-5 h-5 text-secondary" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="hidden md:block border border-border rounded-xl bg-card overflow-hidden shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>Bildirim</TableHead>
                  <TableHead>Tip</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>Tarih</TableHead>
                  <TableHead className="text-right">İşlem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id} className={!item.isRead ? "bg-secondary/5" : undefined}>
                    <TableCell className="font-medium max-w-[520px]">
                      <span className="break-words">{fixMojibake(item.message)}</span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{TYPE_LABELS[item.type] || item.type}</TableCell>
                    <TableCell>
                      <span className={cn("status-badge", item.isRead ? "status-completed" : "status-pending")}>
                        {item.isRead ? "Okundu" : "Okunmadı"}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{new Date(item.createdAt).toLocaleString("tr-TR")}</TableCell>
                    <TableCell className="text-right">
                      {!item.isRead && (
                        <Button variant="outline" size="sm" onClick={() => markAsRead(item.id)}>
                          Okundu yap
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
        <span>{total} bildirim</span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((prev) => Math.max(1, prev - 1))}>
            Önceki
          </Button>
          <span className="px-2">Sayfa {page} / {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}>
            Sonraki
          </Button>
        </div>
      </div>
    </div>
  );
}



