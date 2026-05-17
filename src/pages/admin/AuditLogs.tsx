import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { usePageHeaderStore } from "@/store/usePageHeaderStore";
import { Search, ChevronLeft, ChevronRight, Filter, X, AlertCircle, Info, AlertTriangle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface AuditLog {
  id: string;
  tenantId: string | null;
  userId: string | null;
  userName: string | null;
  userRole: string | null;
  module: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  entityName: string | null;
  description: string | null;
  status: string;
  severity: string;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: unknown;
  createdAt: string;
  tenant?: { id: string; name: string };
  user?: { id: string; name: string; email: string };
}

interface FilterOptions {
  tenants: { id: string; name: string }[];
  users: { id: string; name: string; email: string; tenantId: string }[];
  modules: string[];
  actions: string[];
}

const SEVERITY_CONFIG = {
  info: { label: "Bilgi", color: "bg-blue-100 text-blue-800 border-blue-200", icon: Info },
  warning: { label: "Uyarı", color: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: AlertTriangle },
  error: { label: "Hata", color: "bg-red-100 text-red-800 border-red-200", icon: AlertCircle },
  critical: { label: "Kritik", color: "bg-purple-100 text-purple-800 border-purple-200", icon: XCircle }
};

const STATUS_CONFIG = {
  success: { label: "Başarılı", color: "bg-green-100 text-green-800 border-green-200" },
  failed: { label: "Başarısız", color: "bg-red-100 text-red-800 border-red-200" },
  blocked: { label: "Engellendi", color: "bg-orange-100 text-orange-800 border-orange-200" }
};

export default function AuditLogs() {
  const { token, user } = useAuthStore();
  const { setHeader } = usePageHeaderStore();
  
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filters, setFilters] = useState<FilterOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Filter states
  const [search, setSearch] = useState("");
  const [tenantFilter, setTenantFilter] = useState("ALL");
  const [userFilter, setUserFilter] = useState("ALL");
  const [moduleFilter, setModuleFilter] = useState("ALL");
  const [actionFilter, setActionFilter] = useState("ALL");
  const [severityFilter, setSeverityFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  
  const limit = 20;
  
  const fetchLogs = useCallback(async () => {
    if (!token) return;
    
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(limit));
      if (search) params.set("search", search);
      if (tenantFilter !== "ALL") params.set("tenantId", tenantFilter);
      if (userFilter !== "ALL") params.set("userId", userFilter);
      if (moduleFilter !== "ALL") params.set("module", moduleFilter);
      if (actionFilter !== "ALL") params.set("action", actionFilter);
      if (severityFilter !== "ALL") params.set("severity", severityFilter);
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      
      const res = await fetch(`/api/admin/audit-logs?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        setLogs(data.items);
        setTotal(data.total);
        setTotalPages(data.totalPages);
        if (data.filters) {
          setFilters(data.filters);
        }
      }
    } catch (e) {
      console.error("Audit log fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, [token, page, search, tenantFilter, userFilter, moduleFilter, actionFilter, severityFilter, statusFilter, dateFrom, dateTo]);
  
  useEffect(() => {
    setHeader({ title: "Audit Loglar", subtitle: "Sistem logları ve denetim kayıtları", actions: [] });
  }, [setHeader]);
  
  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);
  
  const clearFilters = () => {
    setSearch("");
    setTenantFilter("ALL");
    setUserFilter("ALL");
    setModuleFilter("ALL");
    setActionFilter("ALL");
    setSeverityFilter("ALL");
    setStatusFilter("ALL");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };
  
  const hasActiveFilters = search || tenantFilter !== "ALL" || userFilter !== "ALL" || 
    moduleFilter !== "ALL" || actionFilter !== "ALL" || severityFilter !== "ALL" || 
    statusFilter !== "ALL" || dateFrom || dateTo;
  
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };
  
  const getSeverityBadge = (severity: string) => {
    const config = SEVERITY_CONFIG[severity as keyof typeof SEVERITY_CONFIG] || SEVERITY_CONFIG.info;
    return (
      <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border", config.color)}>
        <config.icon className="w-3 h-3" />
        {config.label}
      </span>
    );
  };
  
  const getStatusBadge = (status: string) => {
    const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.success;
    return (
      <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border", config.color)}>
        {config.label}
      </span>
    );
  };
  
  return (
    <div className="space-y-4">
      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Ara... (açıklama, kullanıcı adı, varlık adı)"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-10"
          />
          {search && (
            <button
              onClick={() => { setSearch(""); setPage(1); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-accent rounded"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors",
            showFilters || hasActiveFilters
              ? "bg-secondary text-secondary-foreground border-secondary"
              : "bg-card hover:bg-accent border-border"
          )}
        >
          <Filter className="w-4 h-4" />
          <span className="hidden sm:inline">Filtreler</span>
          {hasActiveFilters && (
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-secondary text-secondary-foreground text-xs">
              ?
            </span>
          )}
        </button>
      </div>
      
      {/* Filter Panel */}
      {showFilters && (
        <div className="p-4 bg-card rounded-xl border border-border space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Filtreler</h3>
            <button
              onClick={clearFilters}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Temizle
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Firma</label>
              <select
                value={tenantFilter}
                onChange={(e) => { setTenantFilter(e.target.value); setPage(1); }}
                className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm"
              >
                <option value="ALL">Tümü</option>
                {filters?.tenants.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Kullanıcı</label>
              <select
                value={userFilter}
                onChange={(e) => { setUserFilter(e.target.value); setPage(1); }}
                className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm"
              >
                <option value="ALL">Tümü</option>
                {filters?.users.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Modül</label>
              <select
                value={moduleFilter}
                onChange={(e) => { setModuleFilter(e.target.value); setActionFilter("ALL"); setPage(1); }}
                className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm"
              >
                <option value="ALL">Tümü</option>
                {filters?.modules.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">İşlem</label>
              <select
                value={actionFilter}
                onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
                className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm"
                disabled={!moduleFilter || moduleFilter === "ALL"}
              >
                <option value="ALL">Tümü</option>
                {filters?.actions.map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Seviye</label>
              <select
                value={severityFilter}
                onChange={(e) => { setSeverityFilter(e.target.value); setPage(1); }}
                className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm"
              >
                <option value="ALL">Tümü</option>
                <option value="info">Bilgi</option>
                <option value="warning">Uyarı</option>
                <option value="error">Hata</option>
                <option value="critical">Kritik</option>
              </select>
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Durum</label>
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm"
              >
                <option value="ALL">Tümü</option>
                <option value="success">Başarılı</option>
                <option value="failed">Başarısız</option>
                <option value="blocked">Engellendi</option>
              </select>
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Başlangıç</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm"
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Bitiş</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm"
              />
            </div>
          </div>
        </div>
      )}
      
      {/* Results Info */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{total} kayıt bulundu</span>
      </div>
      
      {/* Desktop Table */}
      <div className="hidden md:block bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Tarih</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Kullanıcı</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Modül</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">İşlem</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Varlık</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Durum</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Seviye</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-muted-foreground">
                    Yükleniyor...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-muted-foreground">
                    Kayıt bulunamadı
                  </td>
                </tr>
              ) : (
                logs.map(log => (
                  <tr key={log.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <span className="text-sm">{formatDate(log.createdAt)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm">
                        <span className="font-medium">{log.userName || "Sistem"}</span>
                        {log.tenant && (
                          <span className="block text-xs text-muted-foreground">{log.tenant.name}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm capitalize">{log.module}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm">{log.action}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm">
                        {log.entityType && <span className="capitalize">{log.entityType}</span>}
                        {log.entityName && (
                          <span className="block text-xs text-muted-foreground truncate max-w-[150px]">
                            {log.entityName}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(log.status)}
                    </td>
                    <td className="px-4 py-3">
                      {getSeverityBadge(log.severity)}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="text-sm text-secondary hover:underline"
                      >
                        Detay
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Yükleniyor...</div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">Kayıt bulunamadı</div>
        ) : (
          logs.map(log => (
            <div
              key={log.id}
              className="bg-card rounded-xl border border-border p-4 space-y-3 cursor-pointer hover:bg-muted/20 transition-colors"
              onClick={() => setSelectedLog(log)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-muted-foreground">{formatDate(log.createdAt)}</span>
                  </div>
                  <p className="font-medium text-sm truncate">{log.userName || "Sistem"}</p>
                  {log.tenant && (
                    <p className="text-xs text-muted-foreground">{log.tenant.name}</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1">
                  {getStatusBadge(log.status)}
                  {getSeverityBadge(log.severity)}
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="px-2 py-0.5 bg-muted rounded capitalize text-xs">{log.module}</span>
                <span className="text-muted-foreground">→</span>
                <span className="text-xs">{log.action}</span>
              </div>
              {log.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">{log.description}</p>
              )}
              <button className="text-sm text-secondary hover:underline">
                Detayları Gör
              </button>
            </div>
          ))
        )}
      </div>
      
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className={cn(
              "p-2 rounded-lg border transition-colors",
              page === 1
                ? "opacity-50 pointer-events-none"
                : "hover:bg-accent border-border"
            )}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm px-4">
            Sayfa {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className={cn(
              "p-2 rounded-lg border transition-colors",
              page === totalPages
                ? "opacity-50 pointer-events-none"
                : "hover:bg-accent border-border"
            )}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
      
      {/* Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <div className="space-y-4">
            <h3 className="font-bold text-lg">Log Detayı</h3>
            
            {selectedLog && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Tarih</label>
                    <p className="text-sm">{formatDate(selectedLog.createdAt)}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Modül</label>
                    <p className="text-sm capitalize">{selectedLog.module}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">İşlem</label>
                    <p className="text-sm">{selectedLog.action}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Durum</label>
                    <div className="mt-1">{getStatusBadge(selectedLog.status)}</div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Seviye</label>
                    <div className="mt-1">{getSeverityBadge(selectedLog.severity)}</div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Kullanıcı</label>
                    <p className="text-sm">{selectedLog.userName || "Sistem"}</p>
                    {selectedLog.userRole && (
                      <p className="text-xs text-muted-foreground">{selectedLog.userRole}</p>
                    )}
                  </div>
                </div>
                
                {selectedLog.tenant && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Firma</label>
                    <p className="text-sm">{selectedLog.tenant.name}</p>
                  </div>
                )}
                
                {selectedLog.entityType && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Varlık Türü</label>
                    <p className="text-sm capitalize">{selectedLog.entityType}</p>
                  </div>
                )}
                
                {selectedLog.entityName && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Varlık Adı</label>
                    <p className="text-sm">{selectedLog.entityName}</p>
                  </div>
                )}
                
                {selectedLog.ipAddress && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">IP Adresi</label>
                    <p className="text-sm font-mono">{selectedLog.ipAddress}</p>
                  </div>
                )}
                
                {selectedLog.description && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Açıklama</label>
                    <p className="text-sm">{selectedLog.description}</p>
                  </div>
                )}
                
                {selectedLog.metadata && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-2 block">Metadata</label>
                    <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto">
                      {JSON.stringify(selectedLog.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}