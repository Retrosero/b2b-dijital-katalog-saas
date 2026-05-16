import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export default function Users() {
  const { token, user } = useAuthStore();
  const [users, setUsers] = useState<any[]>([]);
  
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [formData, setFormData] = useState<any>({});

  const fetchUsers = async () => {
    const res = await fetch("/api/users", {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) setUsers(await res.json());
  };

  useEffect(() => {
    fetchUsers();
  }, [token]);

  const openEditModal = (u: any) => {
    setSelectedUser(u);
    setFormData({
      role: u.role,
      customerAccess: u.customerAccess || "ALL",
      allowedPagesArr: u.allowedPages ? JSON.parse(u.allowedPages) : null,
      fastSalesSettings: u.fastSalesSettings ? JSON.parse(u.fastSalesSettings) : {
        sku: true, barcode: true, category: true, piecesPerBox: true, packagingType: true, stock: true, description: true
      }
    });
    setIsEditModalOpen(true);
  };

  const handleUpdate = async () => {
    const res = await fetch(`/api/users/${selectedUser.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        role: formData.role,
        customerAccess: formData.customerAccess,
        allowedPages: formData.allowedPagesArr ? JSON.stringify(formData.allowedPagesArr) : null,
        fastSalesSettings: JSON.stringify(formData.fastSalesSettings)
      })
    });
    
    if (res.ok) {
      setIsEditModalOpen(false);
      fetchUsers();
    } else {
      alert("Hata oluştu.");
    }
  };

  if (user?.role === "SUPER_ADMIN") {
    return <div className="p-4 text-center">Super Admin kullanıcıları Tenants (Firmalar) sayfasından yönetir.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="border rounded-md bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ad Soyad</TableHead>
              <TableHead>E-posta</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Müşteri Erişimi</TableHead>
              <TableHead>İşlem</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((c: any) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell>{c.email}</TableCell>
                <TableCell>{c.role}</TableCell>
                <TableCell>{c.customerAccess === "OWN" ? "Sadece Atanan" : "Tümü"}</TableCell>
                <TableCell>
                  <Button variant="outline" size="sm" onClick={() => openEditModal(c)}>Düzenle</Button>
                </TableCell>
              </TableRow>
            ))}
            {users.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground h-24">Bulunamadı</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
         <DialogContent className="max-w-[100vw] w-screen h-[100dvh] p-0 m-0 rounded-none border-0 flex flex-col bg-slate-50 !gap-0">
            <DialogHeader className="px-6 py-5 bg-white border-b shadow-sm sticky top-0 z-10">
               <DialogTitle className="text-2xl font-bold flex justify-between items-center w-full pr-8">
                 Kullanıcı Düzenle
                 <Button onClick={handleUpdate} size="lg" className="px-8 shadow-md hover:shadow-lg">Kaydet</Button>
               </DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto p-4 md:p-10">
              <div className="max-w-4xl mx-auto bg-white p-8 rounded-xl border shadow-sm space-y-8">
                 <div className="grid md:grid-cols-2 gap-8">
                   <div className="space-y-2">
                     <label className="block text-sm font-semibold tracking-tight">Kullanıcı Yetki Rolü</label>
                     <select 
                       className="flex h-12 w-full rounded-md border border-input bg-slate-50 px-4 py-2 text-sm shadow-sm transition-colors focus:ring-2 focus:ring-indigo-500 outline-none"
                       value={formData.role || "SALES_USER"} 
                       onChange={(e) => setFormData({...formData, role: e.target.value})}
                     >
                       <option value="TENANT_ADMIN">Yönetici (TENANT_ADMIN)</option>
                       <option value="SALES_USER">Satış Temsilcisi (SALES_USER)</option>
                     </select>
                   </div>
                   
                   <div className="space-y-2">
                     <label className="block text-sm font-semibold tracking-tight">Müşteri Data Erişimi</label>
                     <select 
                       className="flex h-12 w-full rounded-md border border-input bg-slate-50 px-4 py-2 text-sm shadow-sm transition-colors focus:ring-2 focus:ring-indigo-500 outline-none"
                       value={formData.customerAccess || "ALL"} 
                       onChange={(e) => setFormData({...formData, customerAccess: e.target.value})}
                     >
                       <option value="ALL">Tüm Müşteriler</option>
                       <option value="OWN">Sadece Kendisine Atananlar</option>
                     </select>
                   </div>
                 </div>

                 <div className="pt-6 border-t">
                   <h3 className="text-lg font-bold mb-4">Erişilebilecek Sayfalar</h3>
                   <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                     {[
                       { key: "/admin/products", label: "Ürünler Yönetimi" },
                       { key: "/admin/categories", label: "Kategoriler" },
                       { key: "/admin/catalogs", label: "Kataloglar" },
                       { key: "/admin/fast-sales", label: "Hızlı Satış Modülü" },
                       { key: "/admin/orders", label: "Siparişler Listesi" },
                       { key: "/admin/warehouse", label: "Depo Envanteri" },
                       { key: "/admin/customers", label: "Müşteri Portföyü" },
                     ].map((page) => {
                       const isChecked = !formData.allowedPagesArr ? true : formData.allowedPagesArr.includes(page.key);
                       return (
                         <label key={page.key} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-slate-50 cursor-pointer transition-colors bg-white">
                           <input type="checkbox" className="w-4 h-4 cursor-pointer text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" checked={isChecked} 
                             onChange={(e) => {
                               let arr = formData.allowedPagesArr || [
                                 "/admin/products", "/admin/categories", "/admin/catalogs", 
                                 "/admin/fast-sales", "/admin/orders", "/admin/warehouse", "/admin/customers"
                               ];
                               if (e.target.checked) setFormData({ ...formData, allowedPagesArr: [...arr, page.key] });
                               else setFormData({ ...formData, allowedPagesArr: arr.filter((a: string) => a !== page.key) });
                             }}
                           />
                           <span className="font-medium text-slate-700">{page.label}</span>
                         </label>
                       );
                     })}
                   </div>
                 </div>

                 <div className="pt-6 border-t">
                   <h3 className="text-lg font-bold mb-4">Hızlı Satış Alanı Sütun Görünümleri</h3>
                   <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 text-sm">
                     {["sku", "barcode", "category", "piecesPerBox", "packagingType", "stock", "description"].map((key) => {
                       const labels: any = {
                         sku: "Ürün Kodu", barcode: "Barkod", category: "Kategori",
                         piecesPerBox: "Koli Adeti", packagingType: "Ambalaj", stock: "Stok", description: "Açıklama"
                       };
                       return (
                         <label key={key} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-slate-50 cursor-pointer transition-colors bg-white">
                           <input type="checkbox" className="w-4 h-4 cursor-pointer text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" checked={formData.fastSalesSettings?.[key] || false} 
                             onChange={(e) => setFormData({
                               ...formData, 
                               fastSalesSettings: { ...formData.fastSalesSettings, [key]: e.target.checked }
                             })}
                           />
                           <span className="font-medium text-slate-700">{labels[key]}</span>
                         </label>
                       );
                     })}
                   </div>
                 </div>
              </div>
            </div>
         </DialogContent>
      </Dialog>
    </div>
  );
}
