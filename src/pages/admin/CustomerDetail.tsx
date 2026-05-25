import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuthStore } from "@/store/useAuthStore";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit3, User, KeyRound, MessageCircle, ChevronRight, ShoppingCart, Link2, Copy, Check, ExternalLink, Download, Wallet, Building, Plus, Trash2, CalendarDays, ArrowRightLeft, Printer, Pencil, Eye, EyeOff } from "lucide-react";
import { usePageHeaderStore } from "@/store/usePageHeaderStore";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { printCollectionReceipt, printInvoice } from "@/lib/printUtils";
import { useToastActions } from "@/components/ui/toast";

const createUsernameBase = (name: string) => {
  return name
    .toLocaleLowerCase("tr-TR")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 32) || "musteri";
};

const formatPrice = (price: number) => {
  return price.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " TL";
};

const paymentTypeMap: Record<string, { label: string; className: string }> = {
  CASH: { label: "Nakit", className: "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" },
  CREDIT_CARD: { label: "Kredi Kartı", className: "bg-blue-500/10 text-blue-500 border border-blue-500/20" },
  TRANSFER: { label: "Havale / EFT", className: "bg-purple-500/10 text-purple-500 border border-purple-500/20" },
};

export default function CustomerDetail() {
  const { id } = useParams();
  const { token, user } = useAuthStore();
  const { setHeader, resetHeader } = usePageHeaderStore();
  const toast = useToastActions();
  const [customer, setCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [catalogs, setCatalogs] = useState<any[]>([]);
  
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [updatingAuth, setUpdatingAuth] = useState(false);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<string>("ALL");
  const [activeTab, setActiveTab] = useState<"ledger" | "orders" | "collections">("ledger");

  // Collection Dialog Form State
  const [isCollectionModalOpen, setIsCollectionModalOpen] = useState(false);
  const [collectionAmount, setCollectionAmount] = useState("");
  const [collectionPaymentType, setCollectionPaymentType] = useState("CASH");
  const [collectionBankName, setCollectionBankName] = useState("");
  const [collectionNotes, setCollectionNotes] = useState("");
  const [isCollectionLoading, setIsCollectionLoading] = useState(false);
  
  // Edit collection state
  const [editingCollection, setEditingCollection] = useState<any>(null);
  const [editCollectionAmount, setEditCollectionAmount] = useState("");
  const [editCollectionPaymentType, setEditCollectionPaymentType] = useState("CASH");
  const [editCollectionBankName, setEditCollectionBankName] = useState("");
  const [editCollectionNotes, setEditCollectionNotes] = useState("");
  const [isEditCollectionLoading, setIsEditCollectionLoading] = useState(false);
  const passwordStorageKey = id ? `customer-generated-password:${id}` : "";

  const handlePrintLedgerItem = (item: any) => {
    if (item.type === "ORDER") {
      printInvoice(item.original, customer, user?.tenant);
    } else if (item.type === "COLLECTION") {
      printCollectionReceipt(item.original, customer, user?.tenant);
    }
  };

  const tenantBanks = useMemo<string[]>(() => {
    if (!user?.tenant?.banks) return [];
    try {
      return JSON.parse(user.tenant.banks);
    } catch (e) {
      return [];
    }
  }, [user]);

  const fetchCustomerData = async () => {
    try {
      const [resCustomer, resCatalogs] = await Promise.all([
        fetch(`/api/customers/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch("/api/catalogs", {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      if (resCustomer.ok && resCatalogs.ok) {
        const customerData = await resCustomer.json();
        const catalogsData = await resCatalogs.json();
        setCustomer(customerData);
        setCatalogs(catalogsData);
      }
    } catch (e) {
      console.error("Error loading customer details:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id && token) {
      fetchCustomerData();
    }
  }, [id, token]);

  useEffect(() => {
    if (!passwordStorageKey) return;
    try {
      const saved = localStorage.getItem(passwordStorageKey);
      if (saved) setGeneratedPassword(saved);
    } catch (e) {}
  }, [passwordStorageKey]);

  useEffect(() => {
    setHeader({
      title: customer?.name || "Müşteri Detayı",
      subtitle: customer ? "Müşteri bilgileri, katalog girişi ve sipariş geçmişi" : null,
      backTo: "/admin/customers",
      actions: id ? [
        {
          key: "edit-customer",
          label: "Düzenle",
          to: `/admin/customers/edit/${id}`,
          icon: <Edit3 className="w-5 h-5" />,
          variant: "secondary"
        }
      ] : []
    });
    return resetHeader;
  }, [id, customer, setHeader, resetHeader]);

  const getUniqueSuffix = (baseName: string, phone: string | null, existingUsernames: string[]) => {
    if (phone) {
      const cleanPhone = phone.replace(/[^0-9]/g, "");
      const last4 = cleanPhone.slice(-4);
      if (last4 && last4.length === 4) {
        const candidate = `${baseName}${last4}`;
        if (!existingUsernames.includes(candidate)) return last4;
      }
    }
    return Math.floor(1000 + Math.random() * 9000).toString();
  };

  const handleGenerateAuth = async () => {
    let newUsername = customer.username || createUsernameBase(customer.name);
    if (!customer.username) {
      try {
        const res = await fetch("/api/customers", {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const customers = await res.json();
          const allUsernames = customers.map((c: any) => c.username).filter(Boolean);
          const exists = allUsernames.includes(newUsername) || allUsernames.some(u => u.startsWith(`${newUsername}`));
          if (exists) {
            const suffix = getUniqueSuffix(newUsername, customer.phone, allUsernames);
            newUsername = `${newUsername}${suffix}`;
          }
        }
      } catch(e) {}
    }
    const newPassword = Math.random().toString(36).substring(2, 8) + "!";
    
    setUpdatingAuth(true);
    const res = await fetch(`/api/customers/${id}`, {
      method: "PUT",
      headers: { 
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}` 
      },
      body: JSON.stringify({
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
        taxOffice: customer.taxOffice,
        taxNumber: customer.taxNumber,
        assignedUserId: customer.assignedUserId,
        priceListId: customer.priceListId,
        username: newUsername,
        password: newPassword,
      })
    });
    
    if (res.ok) {
      const updated = await res.json();
      setGeneratedPassword(newPassword);
      try {
        if (passwordStorageKey) localStorage.setItem(passwordStorageKey, newPassword);
      } catch (e) {}
      fetchCustomerData();
} else {
        toast.error("Hata", "Bilgiler oluşturulamadı.");
      }
    setUpdatingAuth(false);
  };

  const handleShareWhatsapp = () => {
    const cleanPhone = String(customer?.phone || "").replace(/[^0-9]/g, "");
    if (!cleanPhone) {
      toast.warning("Eksik Bilgi", "Müşterinin telefon numarası kayıtlı değil.");
      return;
    }
    
    if (!generatedPassword) {
      toast.warning("Eksik Bilgi", "Önce 'Şifre Yenile' ile yeni şifre oluşturunuz.");
      return;
    }

    const catalogSlug = customer.tenant?.catalogs?.[0]?.slug || "";
    const baseUrl = window.location.origin;
    const loginLink = `${baseUrl}/c/${catalogSlug}?customer=${customer.username}`;
    
    const text = `Merhaba ${customer.name},\n\nSistemimize giriş bilgileriniz aşağıdadır:\n\nKullanıcı Adı: ${customer.username}\nŞifre: ${generatedPassword}\n\nSipariş vermek ve kataloğumuzu incelemek için aşağıdaki linke tıklayabilirsiniz:\n${loginLink}`;
    const encodedText = encodeURIComponent(text);
    
    window.open(`https://wa.me/${cleanPhone}?text=${encodedText}`, '_blank');
  };

  const buildLedgerStatementHtml = () => {
    const totalDebit = ledgerItems.reduce((sum: number, item: any) => sum + Number(item.debit || 0), 0);
    const totalCredit = ledgerItems.reduce((sum: number, item: any) => sum + Number(item.credit || 0), 0);
    const balance = totalDebit - totalCredit;
    const rowsHtml = ledgerItems.map((item: any, idx: number) => `
      <tr>
        <td>${idx + 1}</td>
        <td>${new Date(item.date).toLocaleDateString("tr-TR")}</td>
        <td>${item.type === "ORDER" ? "Sipariş" : "Tahsilat"}</td>
        <td>${item.number || "-"}</td>
        <td>${item.notes || "-"}</td>
        <td>${item.debit > 0 ? `₺${Number(item.debit).toFixed(2)}` : "-"}</td>
        <td>${item.credit > 0 ? `₺${Number(item.credit).toFixed(2)}` : "-"}</td>
        <td>₺${Number(item.runningBalance || 0).toFixed(2)}</td>
      </tr>
    `).join("");

    return `
      <!doctype html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Cari Hesap Ekstresi</title>
        <style>
          :root {
            --ink: #0f172a;
            --muted: #64748b;
            --line: #dbe3ee;
            --soft: #f8fafc;
            --brand: #0f4c81;
          }
          * { box-sizing: border-box; }
          body {
            font-family: "Segoe UI", Arial, sans-serif;
            margin: 0;
            padding: 28px;
            color: var(--ink);
            background: #eef3f8;
          }
          h1 {
            margin: 0 0 6px;
            font-size: 24px;
            letter-spacing: 0.2px;
          }
          .meta {
            margin-bottom: 14px;
            font-size: 12px;
            color: var(--muted);
          }
          .stats {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 10px;
            margin-bottom: 16px;
          }
          .stat {
            border: 1px solid var(--line);
            border-radius: 10px;
            padding: 10px 12px;
            background: var(--soft);
          }
          .stat strong {
            display: block;
            font-size: 11px;
            color: var(--muted);
            margin-bottom: 4px;
          }
          .stat span {
            font-size: 16px;
            font-weight: 800;
            color: var(--brand);
          }
          table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;
            border: 1px solid var(--line);
            border-radius: 10px;
            overflow: hidden;
            background: #fff;
          }
          thead tr { background: #f1f5f9; }
          th, td {
            border-bottom: 1px solid #edf2f7;
            padding: 10px;
            font-size: 12px;
            text-align: left;
            vertical-align: top;
          }
          tbody tr:nth-child(even) { background: #fcfdff; }
          tbody tr:last-child td { border-bottom: 0; }
          th:nth-last-child(-n+3), td:nth-last-child(-n+3) { text-align: right; font-variant-numeric: tabular-nums; }
          .empty { text-align: center; color: var(--muted); padding: 18px 10px; }
          @media print {
            body { padding: 0; background: #fff; }
          }
        </style>
      </head>
      <body>
        <h1>Cari Hesap Ekstresi</h1>
        <div class="meta">${customer.name} - ${new Date().toLocaleDateString("tr-TR")}</div>
        <div class="stats">
          <div class="stat"><strong>Toplam Borç</strong><span>₺${totalDebit.toFixed(2)}</span></div>
          <div class="stat"><strong>Toplam Alacak</strong><span>₺${totalCredit.toFixed(2)}</span></div>
          <div class="stat"><strong>Bakiye</strong><span>₺${Math.abs(balance).toFixed(2)}</span></div>
        </div>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Tarih</th>
              <th>Tür</th>
              <th>Evrak No</th>
              <th>Açıklama</th>
              <th>Borç</th>
              <th>Alacak</th>
              <th>Bakiye</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || `<tr><td class="empty" colspan="8">Cari hesap hareketi bulunmamaktadır.</td></tr>`}
          </tbody>
        </table>
      </body>
      </html>
    `;
  };

  const handleExportLedgerPdf = () => {
    if (!ledgerItems.length) {
      toast.warning("Eksik Bilgi", "PDF için cari hareket bulunamadı.");
      return;
    }
    const html = buildLedgerStatementHtml();
    const printWindow = window.open("", "_blank", "width=1024,height=768");
    if (!printWindow) return;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 200);
  };

  const handleShareLedgerWhatsapp = () => {
    const cleanPhone = String(customer?.phone || "").replace(/[^0-9]/g, "");
    if (!cleanPhone) {
      toast.warning("Eksik Bilgi", "Müşterinin telefon numarası kayıtlı değil.");
      return;
    }
    const totalDebit = ledgerItems.reduce((sum: number, item: any) => sum + Number(item.debit || 0), 0);
    const totalCredit = ledgerItems.reduce((sum: number, item: any) => sum + Number(item.credit || 0), 0);
    const balance = totalDebit - totalCredit;
    const text = `Merhaba ${customer.name},\n\nCari hesap özetiniz:\nToplam Borç: ${formatPrice(totalDebit)}\nToplam Alacak: ${formatPrice(totalCredit)}\nBakiye: ${formatPrice(Math.abs(balance))}\n\nDetaylı PDF ekstre yönetim panelinden oluşturulmuştur.`;
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`, "_blank");
  };

  const copyToClipboard = (text: string, slug: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  const handleAddCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(collectionAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.warning("Eksik Bilgi", "Lütfen geçerli bir tahsilat tutarı giriniz.");
      return;
    }

    if ((collectionPaymentType === "CREDIT_CARD" || collectionPaymentType === "TRANSFER") && tenantBanks.length > 0 && !collectionBankName) {
      toast.warning("Eksik Bilgi", "Lütfen banka seçimi yapınız.");
      return;
    }

    setIsCollectionLoading(true);
    try {
      const res = await fetch("/api/collections", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          customerId: id,
          amount: parsedAmount,
          paymentType: collectionPaymentType,
          bankName: (collectionPaymentType === "CREDIT_CARD" || collectionPaymentType === "TRANSFER") ? collectionBankName : null,
          notes: collectionNotes
        })
      });

      if (res.ok) {
        toast.success("Başarılı", "Tahsilat kaydı başarıyla eklendi.");
        setIsCollectionModalOpen(false);
        setCollectionAmount("");
        setCollectionPaymentType("CASH");
        setCollectionBankName("");
        setCollectionNotes("");
        fetchCustomerData();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error("Hata", err.error || "Tahsilat kaydedilirken hata oluştu.");
      }
    } catch (err: any) {
      toast.error("Hata", "Bir hata oluştu: " + err.message);
    } finally {
      setIsCollectionLoading(false);
    }
  };

  const handleDeleteCollection = async (colId: string, receiptNumber: string) => {
    if (!window.confirm(`${receiptNumber} nolu tahsilat makbuzunu silmek istediğinize emin misiniz?`)) return;

    try {
      const res = await fetch(`/api/collections/${colId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        toast.success("Silindi", "Tahsilat kaydı silindi.");
        fetchCustomerData();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error("Hata", err.error || "Tahsilat silinirken hata oluştu.");
      }
    } catch (err: any) {
      toast.error("Hata", "Bir hata oluştu: " + err.message);
    }
  };

  const handleOpenEditCollection = (collection: any) => {
    setEditingCollection(collection);
    setEditCollectionAmount(String(collection.amount));
    setEditCollectionPaymentType(collection.paymentType);
    setEditCollectionBankName(collection.bankName || "");
    setEditCollectionNotes(collection.notes || "");
  };

  const handleUpdateCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCollection) return;

    const parsedAmount = parseFloat(editCollectionAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.warning("Eksik Bilgi", "Lütfen geçerli bir tahsilat tutarı giriniz.");
      return;
    }

    if ((editCollectionPaymentType === "CREDIT_CARD" || editCollectionPaymentType === "TRANSFER") && tenantBanks.length > 0 && !editCollectionBankName) {
      toast.warning("Eksik Bilgi", "Lütfen banka seçimi yapınız.");
      return;
    }

    setIsEditCollectionLoading(true);
    try {
      const res = await fetch(`/api/collections/${editingCollection.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: parsedAmount,
          paymentType: editCollectionPaymentType,
          bankName: (editCollectionPaymentType === "CREDIT_CARD" || editCollectionPaymentType === "TRANSFER") ? editCollectionBankName : null,
          notes: editCollectionNotes
        })
      });

      if (res.ok) {
        toast.success("Güncellendi", "Tahsilat kaydı başarıyla güncellendi.");
        setEditingCollection(null);
        fetchCustomerData();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error("Hata", err.error || "Tahsilat güncellenirken hata oluştu.");
      }
    } catch (err: any) {
      toast.error("Hata", "Bir hata oluştu: " + err.message);
    } finally {
      setIsEditCollectionLoading(false);
    }
  };

  // Get customer-specific catalog or all tenant catalogs
  const getCustomerCatalogs = () => {
    if (!catalogs || catalogs.length === 0) return [];
    const customerCatalogs = catalogs.filter((c: any) => c.customerId === customer.id);
    if (customerCatalogs.length > 0) return customerCatalogs;
    return catalogs.filter((c: any) => !c.customerId);
  };

  const customerCatalogs = getCustomerCatalogs();
  const customerOrders = customer?.orders || [];

  const ledgerItems = useMemo(() => {
    if (!customer) return [];
    const orders = (customer.orders || []).map((o: any) => ({
      id: o.id,
      date: new Date(o.createdAt),
      type: "ORDER",
      number: o.orderNumber,
      notes: o.notes || "Satış Siparişi",
      debit: Number(o.totalAmount) || 0,
      credit: 0,
      paymentType: o.paymentType,
      bankName: o.bankName,
      original: o
    }));

    const collections = (customer.collections || []).map((c: any) => ({
      id: c.id,
      date: new Date(c.createdAt),
      type: "COLLECTION",
      number: c.receiptNumber,
      notes: c.notes || `${paymentTypeMap[c.paymentType]?.label || c.paymentType} Tahsilatı`,
      debit: 0,
      credit: Number(c.amount) || 0,
      paymentType: c.paymentType,
      bankName: c.bankName,
      original: c
    }));

    // Combine and sort ascending to compute running balance correctly
    const combined = [...orders, ...collections].sort((a, b) => a.date.getTime() - b.date.getTime());

    let runningBalance = 0;
    const calculated = combined.map((item) => {
      runningBalance += item.debit - item.credit;
      return {
        ...item,
        runningBalance
      };
    });

    return calculated.reverse();
  }, [customer]);

  const orderYears = useMemo<number[]>(() => {
    const years = customerOrders
      .map((o: any) => Number(new Date(o.createdAt).getFullYear()))
      .filter((year: number) => Number.isFinite(year));
    return Array.from(new Set<number>(years)).sort((a, b) => b - a);
  }, [customerOrders]);

  const filteredOrders = useMemo(() => {
    if (selectedYear === "ALL") return customerOrders;
    return customerOrders.filter((o: any) => new Date(o.createdAt).getFullYear() === Number(selectedYear));
  }, [customerOrders, selectedYear]);

  const handleExportOrdersPdf = () => {
    const totalAmount = filteredOrders.reduce((sum: number, o: any) => sum + Number(o.totalAmount || 0), 0);
    const rowsHtml = filteredOrders.map((o: any, idx: number) => `
      <tr>
        <td>${idx + 1}</td>
        <td>${o.orderNumber || "-"}</td>
        <td>${new Date(o.createdAt).toLocaleDateString("tr-TR")}</td>
        <td>₺${Number(o.totalAmount || 0).toFixed(2)}</td>
        <td><span class="status">Yeni</span></td>
      </tr>
    `).join("");

    const html = `
      <!doctype html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Geçmiş Siparişler</title>
        <style>
          :root { color-scheme: light; }
          * { box-sizing: border-box; }
          body {
            font-family: "Nunito Variable", Arial, sans-serif;
            margin: 0;
            padding: 28px;
            background: #f8fafc;
            color: #0f172a;
          }
          .sheet {
            background: #ffffff;
            border: 1px solid #dbeafe;
            border-radius: 14px;
            padding: 20px;
          }
          .top {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 12px;
            margin-bottom: 14px;
          }
          h1 { font-size: 20px; margin: 0; letter-spacing: .2px; }
          .sub { margin-top: 4px; font-size: 12px; color: #64748b; }
          .meta-badge {
            background: #eef2ff;
            color: #1e40af;
            border: 1px solid #c7d2fe;
            border-radius: 999px;
            font-size: 12px;
            padding: 6px 10px;
            font-weight: 700;
            white-space: nowrap;
          }
          .stats {
            display: flex;
            gap: 8px;
            margin: 10px 0 16px;
          }
          .stat {
            border: 1px solid #dbeafe;
            background: #f8fbff;
            border-radius: 10px;
            padding: 8px 10px;
            min-width: 130px;
          }
          .stat-label { font-size: 11px; color: #64748b; }
          .stat-value { margin-top: 2px; font-size: 15px; font-weight: 800; color: #0f172a; }
          table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            overflow: hidden;
          }
          thead tr { background: #f1f5f9; }
          th, td { padding: 11px 12px; border-bottom: 1px solid #eef2f7; font-size: 12.5px; text-align: left; }
          tbody tr:nth-child(even) { background: #fcfdff; }
          tbody tr:last-child td { border-bottom: 0; }
          .index { width: 42px; color: #64748b; }
          .amount { font-weight: 800; color: #0f172a; }
          .status {
            display: inline-block;
            font-size: 11px;
            font-weight: 700;
            color: #0f766e;
            background: #ecfeff;
            border: 1px solid #a5f3fc;
            padding: 3px 8px;
            border-radius: 999px;
          }
          .empty {
            text-align: center;
            color: #64748b;
            padding: 18px 12px;
          }
          @media print {
            body { padding: 0; background: #fff; }
            .sheet { border: 0; border-radius: 0; }
          }
        </style>
      </head>
      <body>
        <div class="sheet">
          <div class="top">
            <div>
              <h1>Geçmiş Siparişler</h1>
              <div class="sub">${customer.name}</div>
            </div>
            <div class="meta-badge">${selectedYear === "ALL" ? "Tüm Yıllar" : selectedYear}</div>
          </div>
          <div class="stats">
            <div class="stat">
              <div class="stat-label">Sipariş Adedi</div>
              <div class="stat-value">${filteredOrders.length}</div>
            </div>
            <div class="stat">
              <div class="stat-label">Toplam Tutar</div>
              <div class="stat-value">₺${totalAmount.toFixed(2)}</div>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th class="index">#</th>
                <th>Sipariş No</th>
                <th>Tarih</th>
                <th>Tutar</th>
                <th>Durum</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml || `<tr><td class="empty" colspan="5">Henüz sipariş bulunmamaktadır.</td></tr>`}
            </tbody>
          </table>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open("", "_blank", "width=1024,height=768");
    if (!printWindow) return;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 200);
  };

  if (loading) return <div className="p-4 text-muted-foreground">Yükleniyor...</div>;
  if (!customer) return <div className="p-4 text-destructive">Müşteri bulunamadı</div>;

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      {/* Top Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-4">
        {/* Customer Address Card */}
        <div className="bg-card p-4 md:p-5 rounded-xl border border-border shadow-sm flex items-start gap-4">
          <div className="w-12 h-12 rounded-full brand-gradient flex items-center justify-center text-white shrink-0 shadow-md">
            <User className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-foreground">{customer.name}</h3>
            <div className="text-sm text-muted-foreground mt-2 space-y-1.5">
              {customer.phone && (
                <p>
                  <strong className="text-foreground">Telefon:</strong>{" "}
                  <a href={`tel:${customer.phone}`} className="text-primary hover:underline">{customer.phone}</a>
                </p>
              )}
              {customer.email && (
                <p>
                  <strong className="text-foreground">E-posta:</strong>{" "}
                  <a href={`mailto:${customer.email}`} className="text-primary hover:underline">{customer.email}</a>
                </p>
              )}
              {customer.taxOffice && <p><strong className="text-foreground">Vergi Dairesi:</strong> {customer.taxOffice}</p>}
              {customer.taxNumber && (
                <p>
                  <strong className="text-foreground">{String(customer.taxNumber).replace(/[^0-9]/g, "").length === 11 ? "TCKN" : "VKN"}:</strong> {customer.taxNumber}
                </p>
              )}
              <p><strong className="text-foreground">Adres:</strong> {customer.address || "-"}</p>
              <p><strong className="text-foreground">İskonto:</strong> %{customer.discountRate || 0}</p>
              <p><strong className="text-foreground">Kayıt:</strong> {new Date(customer.createdAt).toLocaleDateString("tr-TR")}</p>
            </div>
          </div>
        </div>
        
        {/* Auth Credentials Card */}
        <div className="bg-card p-4 md:p-5 rounded-xl border border-border shadow-sm flex flex-col gap-3">
          <div className="flex items-center gap-2 text-foreground border-b border-border pb-3">
            <KeyRound className="w-5 h-5 text-secondary" />
            <h3 className="font-bold">Katalog & Giriş Bilgileri</h3>
          </div>
          
          <div className="flex-1 flex flex-col justify-center">
            {customer.username ? (
              <div className="text-sm space-y-2 mb-3">
                <div className="flex items-center justify-between">
                  <p><strong className="text-foreground">Kullanıcı:</strong> <span className="font-medium text-foreground font-mono">{customer.username}</span></p>
                  <button
                    onClick={() => copyToClipboard(customer.username, 'username')}
                    className={cn(
                      "h-7 px-2 rounded border font-medium text-xs flex items-center gap-1 transition-all",
                      copiedSlug === 'username'
                        ? "bg-chart-2/10 border-chart-2/30 text-chart-2"
                        : "bg-card border-border hover:bg-muted text-muted-foreground hover:text-foreground"
                    )}
                    title="Kullanıcı adını kopyala"
                  >
                    {copiedSlug === 'username' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p><strong className="text-foreground">Şifre:</strong> <span className="font-medium text-chart-2 bg-chart-2/10 px-1.5 py-0.5 rounded font-mono">{generatedPassword ? (showPassword ? generatedPassword : "********") : "-"}</span></p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        if (!generatedPassword) {
                          toast.warning("Eksik Bilgi", "Sifreyi gormek icin once 'Sifre Yenile' yapiniz.");
                          return;
                        }
                        setShowPassword((prev) => !prev);
                      }}
                      className="h-7 w-7 inline-flex items-center justify-center rounded border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
                      title={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => {
                        if (!generatedPassword) return;
                        copyToClipboard(generatedPassword, "password");
                      }}
                      className={cn(
                        "h-7 px-2 rounded border font-medium text-xs flex items-center gap-1 transition-all",
                        copiedSlug === "password"
                          ? "bg-chart-2/10 border-chart-2/30 text-chart-2"
                          : "bg-card border-border hover:bg-muted text-muted-foreground hover:text-foreground"
                      )}
                      title="Şifreyi kopyala"
                    >
                      {copiedSlug === "password" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
                {customerCatalogs.length > 0 && (
                  <div className="pt-2 border-t border-border">
                    <p className="text-xs text-muted-foreground mb-2">Katalog Linkleri:</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-xs bg-muted/50 px-2 py-1 rounded truncate">
                        /c/{customerCatalogs[0].slug}
                      </code>
                      <button
                        onClick={() => {
                          const url = `${window.location.origin}/c/${customerCatalogs[0].slug}?customer=${customer.username}`;
                          copyToClipboard(url, `catalog-${customerCatalogs[0].slug}`);
                        }}
                        className={cn(
                          "h-7 px-2 rounded border font-medium text-xs flex items-center gap-1 transition-all shrink-0",
                          copiedSlug === `catalog-${customerCatalogs[0].slug}`
                            ? "bg-chart-2/10 border-chart-2/30 text-chart-2"
                            : "bg-card border-border hover:bg-muted text-muted-foreground hover:text-foreground"
                        )}
                        title="Linki kopyala"
                      >
                        {copiedSlug === `catalog-${customerCatalogs[0].slug}` ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      </button>
                      <a
                        href={`/c/${customerCatalogs[0].slug}?customer=${customer.username}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="h-7 px-2 rounded border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground font-medium text-xs flex items-center gap-1 transition-all shrink-0"
                        title="Yeni sekmede aç"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground mb-3">Bu müşteri için henüz giriş bilgisi oluşturulmamış.</p>
            )}
            
            <div className="flex gap-2 mt-auto flex-wrap">
              <Button size="sm" variant="outline" onClick={handleGenerateAuth} disabled={updatingAuth} className="touch-target">
                {customer.username ? "Şifre Yenile" : "Kayıt Oluştur"}
              </Button>
              {customer.username && (
                <Button size="sm" variant="ghost" className="bg-[#25D366] hover:bg-[#20bd5a] text-white hover:text-white touch-target" onClick={handleShareWhatsapp}>
                  <MessageCircle className="w-4 h-4 mr-2" />
                  WhatsApp ile İlet
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Cari Hesap Bakiyesi Card */}
        <div className="bg-card p-4 md:p-5 rounded-xl border border-border shadow-sm flex flex-col justify-between min-h-[160px]">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Cari Hesap Bakiyesi</span>
                <span className={cn(
                  "text-xl font-bold block mt-1",
                  (customer.balance || 0) > 0 ? "text-destructive" : (customer.balance || 0) < 0 ? "text-emerald-500" : "text-muted-foreground"
                )}>
                  {formatPrice(Math.abs(customer.balance || 0))}
                </span>
              </div>
            </div>
            <div>
              <span className={cn(
                "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold",
                (customer.balance || 0) > 0 
                  ? "bg-destructive/10 text-destructive border border-destructive/20" 
                  : (customer.balance || 0) < 0 
                    ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" 
                    : "bg-muted text-muted-foreground border border-border"
              )}>
                {(customer.balance || 0) > 0 ? "Borçlu" : (customer.balance || 0) < 0 ? "Alacaklı" : "Dengede"}
              </span>
            </div>
          </div>
          
          <div className="mt-4 flex gap-2">
            <Button 
              onClick={() => setIsCollectionModalOpen(true)}
              className="w-full h-9 bg-primary hover:bg-primary/95 text-white font-medium text-xs flex items-center justify-center gap-1.5 shadow-sm touch-target"
            >
              <Plus className="w-3.5 h-3.5" />
              Tahsilat Ekle
            </Button>
          </div>
        </div>
      </div>

      {/* Sleek Tab Navigation */}
      <div className="border-b border-border flex items-center gap-2 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab("ledger")}
          className={cn(
            "px-4 py-2.5 font-bold text-sm border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap touch-target",
            activeTab === "ledger" 
              ? "border-primary text-primary" 
              : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
          )}
        >
          <ArrowRightLeft className="w-4 h-4" />
          Cari Hesap Hareketleri
        </button>
        <button
          onClick={() => setActiveTab("orders")}
          className={cn(
            "px-4 py-2.5 font-bold text-sm border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap touch-target",
            activeTab === "orders" 
              ? "border-primary text-primary" 
              : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
          )}
        >
          <ShoppingCart className="w-4 h-4" />
          Sipariş Geçmişi
        </button>
        <button
          onClick={() => setActiveTab("collections")}
          className={cn(
            "px-4 py-2.5 font-bold text-sm border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap touch-target",
            activeTab === "collections" 
              ? "border-primary text-primary" 
              : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
          )}
        >
          <Wallet className="w-4 h-4" />
          Tahsilat Geçmişi
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === "ledger" && (
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden animate-fade-in">
          <div className="p-4 border-b border-border bg-muted/30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h3 className="font-bold text-foreground flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 text-secondary" />
              Cari Hesap Ekstresi
            </h3>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={handleExportLedgerPdf} className="h-9 gap-1.5">
                <Download className="w-3.5 h-3.5" />
                PDF Kaydet
              </Button>
              <Button size="sm" variant="ghost" onClick={handleShareLedgerWhatsapp} className="h-9 gap-1.5 bg-[#25D366] hover:bg-[#20bd5a] text-white hover:text-white">
                <MessageCircle className="w-3.5 h-3.5" />
                WhatsApp
              </Button>
            </div>
          </div>

          {/* Desktop view */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/20">
                  <TableHead>Tarih</TableHead>
                  <TableHead>İşlem Türü</TableHead>
                  <TableHead>Evrak No</TableHead>
                  <TableHead>Açıklama</TableHead>
                  <TableHead>Borç (Giriş)</TableHead>
                  <TableHead>Alacak (Çıkış)</TableHead>
                  <TableHead className="text-right">Bakiye</TableHead>
                  <TableHead className="w-12 text-center">Yazdır</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ledgerItems.map((item: any) => (
                  <TableRow key={`${item.type}-${item.id}`} className="hover:bg-muted/20">
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(item.date).toLocaleDateString("tr-TR")}
                    </TableCell>
                    <TableCell>
                      <span className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold",
                        item.type === "ORDER" 
                          ? "bg-blue-500/10 text-blue-500" 
                          : "bg-emerald-500/10 text-emerald-500"
                      )}>
                        {item.type === "ORDER" ? "Sipariş (Fatura)" : "Tahsilat"}
                      </span>
                    </TableCell>
                    <TableCell className="font-semibold text-secondary">
                      {item.type === "ORDER" ? (
                        <Link to={`/admin/orders/${item.id}`} className="hover:underline flex items-center gap-1">
                          {item.number}
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      ) : (
                        item.number
                      )}
                    </TableCell>
                    <TableCell className="text-sm max-w-[200px] truncate text-foreground" title={item.notes}>
                      {item.notes}
                      {item.bankName && (
                        <span className="text-xs text-muted-foreground block font-medium">Banka: {item.bankName}</span>
                      )}
                    </TableCell>
                    <TableCell className="font-semibold text-destructive">
                      {item.debit > 0 ? formatPrice(item.debit) : "-"}
                    </TableCell>
                    <TableCell className="font-semibold text-emerald-500">
                      {item.credit > 0 ? formatPrice(item.credit) : "-"}
                    </TableCell>
                    <TableCell className={cn(
                      "text-right font-bold",
                      item.runningBalance > 0 ? "text-destructive" : item.runningBalance < 0 ? "text-emerald-500" : "text-muted-foreground"
                    )}>
                      {formatPrice(Math.abs(item.runningBalance))}
                    </TableCell>
<TableCell className="text-center">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary transition-all rounded-lg"
                        onClick={() => handlePrintLedgerItem(item)}
                        title="Yazdır"
                      >
                        <Printer className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {ledgerItems.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      Cari hesap hareketi bulunmamaktadır.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile view */}
          <div className="md:hidden divide-y divide-border">
            {ledgerItems.map((item: any) => (
              <div key={`${item.type}-${item.id}`} className="p-4 hover:bg-muted/10 transition-colors">
                <div className="flex justify-between items-start gap-2 mb-1.5">
                  <div>
                    <span className="text-xs text-muted-foreground block">{new Date(item.date).toLocaleDateString("tr-TR")}</span>
                    <span className="font-bold text-secondary text-sm mt-0.5 flex items-center gap-1">
                      {item.type === "ORDER" ? (
                        <Link to={`/admin/orders/${item.id}`} className="hover:underline flex items-center gap-1">
                          {item.number}
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      ) : (
                        item.number
                      )}
                    </span>
                  </div>
                  <span className={cn(
                    "inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold",
                    item.type === "ORDER" 
                      ? "bg-blue-500/10 text-blue-500" 
                      : "bg-emerald-500/10 text-emerald-500"
                  )}>
                    {item.type === "ORDER" ? "Sipariş" : "Tahsilat"}
                  </span>
                </div>
                <p className="text-sm text-foreground mb-3">{item.notes}</p>
                {item.bankName && (
                  <span className="text-xs text-muted-foreground block mb-2 font-medium">Banka: {item.bankName}</span>
                )}
                <div className="flex justify-between items-center bg-muted/30 p-2.5 rounded-lg border border-border/50 text-xs">
                  <div>
                    <span className="text-muted-foreground block">Tutar</span>
                    <span className={cn(
                      "font-bold",
                      item.type === "ORDER" ? "text-destructive" : "text-emerald-500"
                    )}>
                      {item.type === "ORDER" ? `+ ${formatPrice(item.debit)}` : `- ${formatPrice(item.credit)}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 px-2.5 text-xs font-semibold flex items-center gap-1 hover:bg-primary/10 hover:text-primary transition-all rounded-lg"
                      onClick={() => handlePrintLedgerItem(item)}
                    >
                      <Printer className="w-3.5 h-3.5" />
                      Yazdır
                    </Button>
                    <div className="text-right">
                      <span className="text-muted-foreground block">Bakiye</span>
                      <span className={cn(
                        "font-bold",
                        item.runningBalance > 0 ? "text-destructive" : item.runningBalance < 0 ? "text-emerald-500" : "text-muted-foreground"
                      )}>
                        {formatPrice(Math.abs(item.runningBalance))}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {ledgerItems.length === 0 && (
              <div className="text-center py-10 text-muted-foreground text-sm">
                Cari hesap hareketi bulunmamaktadır.
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "orders" && (
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden animate-fade-in">
          <div className="p-4 border-b border-border bg-muted/30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h3 className="font-bold text-foreground flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-secondary" />
              Geçmiş Siparişler
            </h3>
            <div className="flex items-center gap-2">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="h-9 min-w-[120px] rounded-lg border border-border bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
              >
                <option value="ALL">Tüm Yıllar</option>
                {orderYears.map((year) => (
                  <option key={year} value={String(year)}>{year}</option>
                ))}
              </select>
              <Button size="sm" variant="outline" onClick={handleExportOrdersPdf} className="h-9 gap-1.5">
                <Download className="w-3.5 h-3.5" />
                PDF Kaydet
              </Button>
            </div>
          </div>

          {/* Mobile view */}
          <div className="md:hidden divide-y divide-border">
            {filteredOrders.map((o: any) => (
              <Link to={`/admin/orders/edit/${o.id}`} key={o.id} className="block p-4 hover:bg-muted/20 transition-colors">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div>
                    <div className="text-xs text-secondary font-bold">{o.orderNumber}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{new Date(o.createdAt).toLocaleDateString("tr-TR")}</div>
                  </div>
                  <span className="status-badge status-pending">Yeni</span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="font-bold text-foreground">₺{o.totalAmount.toFixed(2)}</span>
                  <span className="text-xs text-secondary font-medium flex items-center gap-1">Düzenle <Pencil className="w-3 h-3" /></span>
                </div>
              </Link>
            ))}
            {filteredOrders.length === 0 && (
              <div className="text-center py-10">
                <ShoppingCart className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">Henüz sipariş bulunmamaktadır.</p>
              </div>
            )}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/20">
                  <TableHead>Sipariş No</TableHead>
                  <TableHead>Tarih</TableHead>
                  <TableHead>Tutar</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead className="text-right">İçerik</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((o: any) => (
                  <TableRow key={o.id} className="hover:bg-muted/20">
                    <TableCell className="font-semibold text-secondary">{o.orderNumber}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{new Date(o.createdAt).toLocaleDateString("tr-TR")}</TableCell>
                    <TableCell className="font-bold text-foreground">₺{o.totalAmount.toFixed(2)}</TableCell>
                    <TableCell>
                      <span className="status-badge status-pending">Yeni</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link to={`/admin/orders/edit/${o.id}`} className="inline-flex items-center gap-1 rounded-lg text-sm h-9 px-3 hover:bg-muted font-medium transition-colors border border-border touch-target">
                        Düzenle <Pencil className="w-3.5 h-3.5" />
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredOrders.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Henüz sipariş bulunmamaktadır.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {activeTab === "collections" && (
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden animate-fade-in">
          <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
            <h3 className="font-bold text-foreground flex items-center gap-2">
              <Wallet className="w-4 h-4 text-secondary" />
              Tahsilat Geçmişi
            </h3>
            <Button size="sm" onClick={() => setIsCollectionModalOpen(true)} className="h-9 gap-1.5">
              <Plus className="w-3.5 h-3.5" />
              Tahsilat Ekle
            </Button>
          </div>

          {/* Desktop view */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/20">
                  <TableHead>Tarih</TableHead>
                  <TableHead>Makbuz No</TableHead>
                  <TableHead>Ödeme Türü</TableHead>
                  <TableHead>Banka</TableHead>
                  <TableHead>Açıklama</TableHead>
                  <TableHead>Tutar</TableHead>
                  <TableHead className="text-right">İşlem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(customer.collections || []).map((col: any) => (
                  <TableRow key={col.id} className="hover:bg-muted/20">
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(col.createdAt).toLocaleDateString("tr-TR")}
                    </TableCell>
                    <TableCell className="font-semibold text-secondary">{col.receiptNumber}</TableCell>
                    <TableCell>
                      <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold", paymentTypeMap[col.paymentType]?.className)}>
                        {paymentTypeMap[col.paymentType]?.label || col.paymentType}
                      </span>
                    </TableCell>
                    <TableCell className="text-foreground text-sm font-medium">{col.bankName || "-"}</TableCell>
                    <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate" title={col.notes}>{col.notes || "-"}</TableCell>
                    <TableCell className="font-bold text-emerald-500">{formatPrice(col.amount)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEditCollection(col)}
                          className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors touch-target inline-flex items-center justify-center"
                          title="Düzenle"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => printCollectionReceipt(col, customer, user?.tenant)}
                          className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors touch-target inline-flex items-center justify-center"
                          title="Yazdır"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCollection(col.id, col.receiptNumber)}
                          className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors touch-target inline-flex items-center justify-center"
                          title="Sil"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {(customer.collections || []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      Henüz tahsilat kaydı bulunmamaktadır.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile view */}
          <div className="md:hidden divide-y divide-border">
            {(customer.collections || []).map((col: any) => (
              <div key={col.id} className="p-4 hover:bg-muted/10 transition-colors">
                <div className="flex justify-between items-start gap-2 mb-1.5">
                  <div>
                    <span className="text-xs text-muted-foreground block">{new Date(col.createdAt).toLocaleDateString("tr-TR")}</span>
                    <span className="font-bold text-secondary text-sm mt-0.5">{col.receiptNumber}</span>
                  </div>
                  <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold", paymentTypeMap[col.paymentType]?.className)}>
                    {paymentTypeMap[col.paymentType]?.label || col.paymentType}
                  </span>
                </div>
                <p className="text-sm text-foreground mb-3">{col.notes || "Açıklama belirtilmemiş"}</p>
                {col.bankName && (
                  <span className="text-xs text-muted-foreground block mb-2 font-medium">Banka: {col.bankName}</span>
                )}
                <div className="flex justify-between items-center bg-muted/30 p-2.5 rounded-lg border border-border/50 text-xs">
                  <div>
                    <span className="text-muted-foreground block">Tutar</span>
                    <span className="font-bold text-emerald-500">{formatPrice(col.amount)}</span>
                  </div>
                  <div className="text-right flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenEditCollection(col)}
                      className="p-1 px-2 text-xs text-primary hover:bg-primary/10 border border-transparent hover:border-primary/20 rounded font-bold transition-all inline-flex items-center gap-1"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Düzenle
                    </button>
                    <button
                      type="button"
                      onClick={() => printCollectionReceipt(col, customer, user?.tenant)}
                      className="p-1 px-2 text-xs text-primary hover:bg-primary/10 border border-transparent hover:border-primary/20 rounded font-bold transition-all inline-flex items-center gap-1"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      Yazdır
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteCollection(col.id, col.receiptNumber)}
                      className="p-1 px-2 text-xs text-destructive hover:bg-destructive/10 border border-transparent hover:border-destructive/20 rounded font-bold transition-all inline-flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Sil
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {(customer.collections || []).length === 0 && (
              <div className="text-center py-10 text-muted-foreground text-sm">
                Henüz tahsilat kaydı bulunmamaktadır.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sleek Yeni Tahsilat Ekle Dialog */}
      <Dialog open={isCollectionModalOpen} onOpenChange={setIsCollectionModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground font-bold">
              <Wallet className="w-5 h-5 text-secondary" />
              Yeni Tahsilat Ekle
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddCollection} className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase block mb-1.5">Tutar (TL) *</label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="Örn: 1500.00"
                value={collectionAmount}
                onChange={(e) => setCollectionAmount(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm font-semibold"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase block mb-1.5">Ödeme Türü *</label>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(paymentTypeMap).map(([type, value]) => {
                  const selected = collectionPaymentType === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        setCollectionPaymentType(type);
                        if (type === "CASH") setCollectionBankName("");
                      }}
                      className={cn(
                        "h-10 rounded-lg border text-xs font-bold transition-all touch-target cursor-pointer",
                        selected 
                          ? "border-primary bg-primary/10 text-primary" 
                          : "border-border bg-card text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                      )}
                    >
                      {value.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {(collectionPaymentType === "CREDIT_CARD" || collectionPaymentType === "TRANSFER") && tenantBanks.length > 0 && (
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase block mb-1.5">Banka Seçimi *</label>
                <select
                  required
                  value={collectionBankName}
                  onChange={(e) => setCollectionBankName(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm font-medium"
                >
                  <option value="">Banka Seçiniz...</option>
                  {tenantBanks.map((bank) => (
                    <option key={bank} value={bank}>{bank}</option>
                  ))}
                </select>
              </div>
            )}

            {(collectionPaymentType === "CREDIT_CARD" || collectionPaymentType === "TRANSFER") && tenantBanks.length === 0 && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-lg text-xs leading-relaxed">
                Ayarlar sayfasında henüz banka hesabı tanımlanmamış. Tanımlanana kadar banka adı olmadan kaydedebilirsiniz veya ayarlardan banka ekleyebilirsiniz.
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase block mb-1.5">Açıklama / Notlar</label>
              <textarea
                rows={3}
                placeholder="Örn: Cari ödeme alındı..."
                value={collectionNotes}
                onChange={(e) => setCollectionNotes(e.target.value)}
                className="w-full p-3 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm placeholder:text-muted-foreground/50"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border mt-6">
              <Button type="button" variant="outline" onClick={() => setIsCollectionModalOpen(false)} className="h-10 text-xs font-semibold touch-target">
                Vazgeç
              </Button>
              <Button type="submit" disabled={isCollectionLoading} className="h-10 bg-primary hover:bg-primary/95 text-white text-xs font-semibold touch-target shadow-sm">
                {isCollectionLoading ? "Kaydediliyor..." : "Tahsilat Kaydet"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Tahsilat Düzenleme Dialog */}
      <Dialog open={!!editingCollection} onOpenChange={(open) => !open && setEditingCollection(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground font-bold">
              <Pencil className="w-5 h-5 text-secondary" />
              Tahsilat Düzenle
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateCollection} className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase block mb-1.5">Tutar (TL) *</label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="Örn: 1500.00"
                value={editCollectionAmount}
                onChange={(e) => setEditCollectionAmount(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm font-semibold"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase block mb-1.5">Ödeme Türü *</label>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(paymentTypeMap).map(([type, value]) => {
                  const selected = editCollectionPaymentType === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        setEditCollectionPaymentType(type);
                        if (type === "CASH") setEditCollectionBankName("");
                      }}
                      className={cn(
                        "h-10 rounded-lg border text-xs font-bold transition-all touch-target cursor-pointer",
                        selected 
                          ? "border-primary bg-primary/10 text-primary" 
                          : "border-border bg-card text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                      )}
                    >
                      {value.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {(editCollectionPaymentType === "CREDIT_CARD" || editCollectionPaymentType === "TRANSFER") && tenantBanks.length > 0 && (
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase block mb-1.5">Banka Seçimi *</label>
                <select
                  value={editCollectionBankName}
                  onChange={(e) => setEditCollectionBankName(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm font-medium"
                >
                  <option value="">Banka Seçiniz...</option>
                  {tenantBanks.map((bank) => (
                    <option key={bank} value={bank}>{bank}</option>
                  ))}
                </select>
              </div>
            )}

            {(editCollectionPaymentType === "CREDIT_CARD" || editCollectionPaymentType === "TRANSFER") && tenantBanks.length === 0 && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-lg text-xs leading-relaxed">
                Ayarlar sayfasında henüz banka hesabı tanımlanmamış.
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase block mb-1.5">Açıklama / Notlar</label>
              <textarea
                rows={3}
                placeholder="Örn: Cari ödeme alındı..."
                value={editCollectionNotes}
                onChange={(e) => setEditCollectionNotes(e.target.value)}
                className="w-full p-3 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm placeholder:text-muted-foreground/50"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border mt-6">
              <Button type="button" variant="outline" onClick={() => setEditingCollection(null)} className="h-10 text-xs font-semibold touch-target">
                Vazgeç
              </Button>
              <Button type="submit" disabled={isEditCollectionLoading} className="h-10 bg-primary hover:bg-primary/95 text-white text-xs font-semibold touch-target shadow-sm">
                {isEditCollectionLoading ? "Kaydediliyor..." : "Güncelle"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
