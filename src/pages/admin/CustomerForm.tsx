import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, User, Building, Percent } from "lucide-react";

export default function CustomerForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuthStore();
  const isEdit = !!id;

  const [loading, setLoading] = useState(isEdit);
  const [categories, setCategories] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    taxOffice: "",
    taxNumber: "",
    discountRate: "0",
    categoryDiscounts: {} as Record<string, string>
  });

  const fetchData = async () => {
    // Categories for individual discounts
    const resCat = await fetch("/api/categories", { headers: { Authorization: `Bearer ${token}` } });
    if (resCat.ok) {
       const data = await resCat.json();
       setCategories(data.categories || []);
    }

    if (isEdit) {
      const res = await fetch(`/api/customers/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const c = await res.json();
        setFormData({
          name: c.name || "",
          email: c.email || "",
          phone: c.phone || "",
          address: c.address || "",
          taxOffice: c.taxOffice || "",
          taxNumber: c.taxNumber || "",
          discountRate: c.discountRate?.toString() || "0",
          categoryDiscounts: c.categoryDiscounts ? JSON.parse(c.categoryDiscounts) : {}
        });
      }
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id, token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = isEdit ? `/api/customers/${id}` : "/api/customers";
    const method = isEdit ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        ...formData,
        categoryDiscounts: JSON.stringify(formData.categoryDiscounts)
      })
    });

    if (res.ok) {
      navigate("/admin/customers");
    } else {
      alert("Hata oluştu");
    }
  };

  if (loading) return <div className="p-8 text-muted-foreground">Yükleniyor...</div>;

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 md:px-5 py-3 md:py-4 shadow-sm">
        <Link to="/admin/customers" className="inline-flex items-center justify-center size-10 border border-border rounded-lg bg-card hover:bg-muted shadow-sm transition-all touch-target">
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </Link>
        <Button onClick={handleSubmit} className="brand-gradient border-0 shadow-md hover:opacity-90 px-6 md:px-8 h-10 md:h-11 text-sm md:text-base font-semibold">
          {isEdit ? "Güncelle" : "Kaydet"}
        </Button>
      </div>

      <div className="grid xl:grid-cols-12 gap-4 md:gap-6 items-start">
        <div className="xl:col-span-8 space-y-4 md:space-y-6">
           {/* Kimlik Bilgileri */}
           <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-border flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center">
                  <User className="w-4 h-4 text-secondary" />
                </div>
                <h3 className="font-bold text-foreground">Kimlik & İletişim Bilgileri</h3>
              </div>
              <div className="p-4 md:p-6">
                <div className="grid md:grid-cols-2 gap-4 md:gap-6">
                  <div className="space-y-2 md:col-span-2">
                     <Label className="text-sm font-semibold text-foreground">Müşteri / Cari Ünvanı *</Label>
                     <Input required className="h-11 border-border" placeholder="Örn: ABC Tekstil LTD ŞTİ" value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                     <Label className="text-sm font-semibold text-foreground">E-posta Adresi</Label>
                     <Input type="email" className="h-11 border-border" value={formData.email} onChange={e=>setFormData({...formData, email: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                     <Label className="text-sm font-semibold text-foreground">Telefon Numarası</Label>
                     <Input className="h-11 border-border" value={formData.phone} onChange={e=>setFormData({...formData, phone: e.target.value})} />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                     <Label className="text-sm font-semibold text-foreground">Açık Adres</Label>
                     <Textarea className="min-h-[100px] border-border" value={formData.address} onChange={e=>setFormData({...formData, address: e.target.value})} />
                  </div>
                </div>
              </div>
           </div>

           {/* Vergi Bilgileri */}
           <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-border flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                  <Building className="w-4 h-4 text-muted-foreground" />
                </div>
                <h3 className="font-bold text-foreground">Vergi Bilgileri</h3>
              </div>
              <div className="p-4 md:p-6">
                <div className="grid md:grid-cols-2 gap-4 md:gap-6">
                  <div className="space-y-2">
                     <Label className="text-sm font-semibold text-foreground">Vergi Dairesi</Label>
                     <Input className="h-11 border-border" value={formData.taxOffice} onChange={e=>setFormData({...formData, taxOffice: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                     <Label className="text-sm font-semibold text-foreground">Vergi Numarası / TCKN</Label>
                     <Input className="h-11 border-border" value={formData.taxNumber} onChange={e=>setFormData({...formData, taxNumber: e.target.value})} />
                  </div>
                </div>
              </div>
           </div>
        </div>

        <div className="xl:col-span-4 space-y-4 md:space-y-6">
           {/* Finansal Ayarlar */}
           <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-border flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-chart-2/10 flex items-center justify-center">
                  <Percent className="w-4 h-4 text-chart-2" />
                </div>
                <h3 className="font-bold text-foreground">Ticari Ayarlar</h3>
              </div>
              <div className="p-4 md:p-6 space-y-4">
                <div className="space-y-2">
                   <Label className="text-sm font-semibold text-foreground">Genel İskonto Oranı (%)</Label>
                   <Input type="number" className="h-11 border-border" value={formData.discountRate} onChange={e=>setFormData({...formData, discountRate: e.target.value})} />
                   <p className="text-xs text-muted-foreground">Tüm ürünlerde varsayılan olarak uygulanır.</p>
                </div>
                
                <div className="pt-4 space-y-4">
                  <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Kategori Bazlı İskontolar</Label>
                  <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
                    {categories.map((c) => (
                      <div key={c.id} className="flex items-center justify-between gap-3 p-3 bg-muted/30 rounded-lg border border-border">
                        <Label className="text-xs font-medium text-foreground truncate flex-1">{c.name}</Label>
                        <div className="flex items-center gap-1 w-20">
                          <Input 
                            type="number" 
                            className="h-8 text-xs text-center p-1 border-border" 
                            placeholder="0"
                            value={formData.categoryDiscounts[c.id] || ""}
                            onChange={e => setFormData({
                              ...formData, 
                              categoryDiscounts: {...formData.categoryDiscounts, [c.id]: e.target.value}
                            })}
                          />
                          <span className="text-[10px] text-muted-foreground font-bold">%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
