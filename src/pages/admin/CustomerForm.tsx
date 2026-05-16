import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft } from "lucide-react";

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

  if (loading) return <div className="p-8">Yükleniyor...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between rounded-lg border bg-white px-5 py-4 shadow-sm">
        <div className="flex items-center gap-4">
          <Link to="/admin/customers" className="inline-flex items-center justify-center size-9 border rounded-lg bg-white hover:bg-slate-50 shadow-sm transition-all">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Link>
        </div>
        <Button onClick={handleSubmit} className="shadow-sm px-8 h-11 text-base font-semibold">
          {isEdit ? "Güncelle" : "Kaydet"}
        </Button>
      </div>

      <div className="grid xl:grid-cols-12 gap-6 items-start">
        <div className="xl:col-span-8 space-y-6">
           {/* Kimlik Bilgileri */}
           <div className="bg-white p-6 rounded-lg border shadow-sm space-y-6">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 border-b pb-4">
                <span className="w-1.5 h-6 bg-indigo-500 rounded-full"></span>
                Kimlik & İletişim Bilgileri
              </h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2 md:col-span-2">
                   <Label className="text-sm font-bold text-slate-700">Müşteri / Cari Ünvanı *</Label>
                   <Input required className="h-12 border-slate-200" placeholder="Örn: ABC Tekstil LTD ŞTİ" value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} />
                </div>
                <div className="space-y-2">
                   <Label className="text-sm font-bold text-slate-700">E-posta Adresi</Label>
                   <Input type="email" className="h-12 border-slate-200" value={formData.email} onChange={e=>setFormData({...formData, email: e.target.value})} />
                </div>
                <div className="space-y-2">
                   <Label className="text-sm font-bold text-slate-700">Telefon Numarası</Label>
                   <Input className="h-12 border-slate-200" value={formData.phone} onChange={e=>setFormData({...formData, phone: e.target.value})} />
                </div>
                <div className="space-y-2 md:col-span-2">
                   <Label className="text-sm font-bold text-slate-700">Açık Adres</Label>
                   <Textarea className="min-h-[100px] border-slate-200" value={formData.address} onChange={e=>setFormData({...formData, address: e.target.value})} />
                </div>
              </div>
           </div>

           {/* Vergi Bilgileri */}
           <div className="bg-white p-6 rounded-lg border shadow-sm space-y-6">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 border-b pb-4">
                <span className="w-1.5 h-6 bg-slate-400 rounded-full"></span>
                Vergi Bilgileri
              </h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                   <Label className="text-sm font-bold text-slate-700">Vergi Dairesi</Label>
                   <Input className="h-12 border-slate-200" value={formData.taxOffice} onChange={e=>setFormData({...formData, taxOffice: e.target.value})} />
                </div>
                <div className="space-y-2">
                   <Label className="text-sm font-bold text-slate-700">Vergi Numarası / TCKN</Label>
                   <Input className="h-12 border-slate-200" value={formData.taxNumber} onChange={e=>setFormData({...formData, taxNumber: e.target.value})} />
                </div>
              </div>
           </div>
        </div>

        <div className="xl:col-span-4 space-y-6">
           {/* Finansal Ayarlar */}
           <div className="bg-white p-6 rounded-lg border shadow-sm space-y-6">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 border-b pb-4">
                <span className="w-1.5 h-6 bg-emerald-500 rounded-full"></span>
                Ticari Ayarlar
              </h3>
              <div className="space-y-4">
                <div className="space-y-2">
                   <Label className="text-sm font-bold text-slate-700">Genel İskonto Oranı (%)</Label>
                   <Input type="number" className="h-12 border-slate-200" value={formData.discountRate} onChange={e=>setFormData({...formData, discountRate: e.target.value})} />
                   <p className="text-xs text-slate-400">Tüm ürünlerde varsayılan olarak uygulanır.</p>
                </div>
                
                <div className="pt-4 space-y-4">
                  <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Kategori Bazlı İskontolar</Label>
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {categories.map((c) => (
                      <div key={c.id} className="flex items-center justify-between gap-4 p-3 bg-slate-50 rounded-lg border border-slate-100">
                        <Label className="text-xs font-semibold text-slate-600 truncate flex-1">{c.name}</Label>
                        <div className="flex items-center gap-1 w-20">
                          <Input 
                            type="number" 
                            className="h-8 text-xs text-center p-1" 
                            placeholder="0"
                            value={formData.categoryDiscounts[c.id] || ""}
                            onChange={e => setFormData({
                              ...formData, 
                              categoryDiscounts: {...formData.categoryDiscounts, [c.id]: e.target.value}
                            })}
                          />
                          <span className="text-[10px] text-slate-400 font-bold">%</span>
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
