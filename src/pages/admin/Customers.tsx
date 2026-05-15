import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronRight } from "lucide-react";

export default function Customers() {
  const { token, user } = useAuthStore();
  const [customers, setCustomers] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState<any>({ 
    name: "", email: "", phone: "", address: "", username: "", password: "", assignedUserId: "", 
    discountRate: 0, discount2: 0, discount3: 0, discount4: 0, discount5: 0, categoryDiscounts: {} 
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  const fetchCustomers = async () => {
    const res = await fetch("/api/customers", { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setCustomers(await res.json());
  };

  const fetchUsers = async () => {
     const res = await fetch("/api/users", { headers: { Authorization: `Bearer ${token}` }});
     if (res.ok) setUsersList(await res.json());
  };

  const fetchCategories = async () => {
    const res = await fetch("/api/categories", { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) {
      const data = await res.json();
      setCategories(Array.isArray(data) ? data : (data.categories || []));
    }
  };

  useEffect(() => {
    fetchCustomers();
    fetchUsers();
    fetchCategories();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingId ? `/api/customers/${editingId}` : "/api/customers";
    const method = editingId ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(formData)
    });
    if (res.ok) {
      setOpen(false);
      setEditingId(null);
      setFormData({ 
        name: "", email: "", phone: "", address: "", username: "", password: "", assignedUserId: "", 
        discountRate: 0, discount2: 0, discount3: 0, discount4: 0, discount5: 0, categoryDiscounts: {} 
      });
      fetchCustomers();
    } else {
      const data = await res.json();
      alert(data.error || "Hata oluştu");
    }
  };

  const handleEdit = (customer: any) => {
    let pd = {}
    try { pd = customer.categoryDiscounts ? JSON.parse(customer.categoryDiscounts) : {} } catch(e){}
    setFormData({
      name: customer.name || "",
      email: customer.email || "",
      phone: customer.phone || "",
      address: customer.address || "",
      username: customer.username || "",
      password: "",
      assignedUserId: customer.assignedUser?.id || "",
      discountRate: customer.discountRate || 0,
      discount2: customer.discount2 || 0,
      discount3: customer.discount3 || 0,
      discount4: customer.discount4 || 0,
      discount5: customer.discount5 || 0,
      categoryDiscounts: pd
    });
    setEditingId(customer.id);
    setOpen(true);
  };

  const handleAddNew = () => {
    setFormData({ 
      name: "", email: "", phone: "", address: "", username: "", password: "", assignedUserId: "",
      discountRate: 0, discount2: 0, discount3: 0, discount4: 0, discount5: 0, categoryDiscounts: {} 
    });
    setEditingId(null);
    setOpen(true);
  };

  if (user?.role === "SUPER_ADMIN") {
    return <div className="p-4 text-center">Super Admin yönetemez.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Müşteriler</h2>
          <p className="text-muted-foreground">Sistemde kayıtlı müşterileriniz.</p>
        </div>
        <Link to="/admin/customers/new">
          <Button className="shrink-0 bg-emerald-500 hover:bg-emerald-600 shadow-md transform active:scale-95 transition-all text-white font-bold h-11 px-6">
            + Yeni Müşteri Ekle
          </Button>
        </Link>
      </div>

      <div className="border rounded-md bg-white overflow-hidden">
        <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="">Ad</TableHead>
                <TableHead>E-posta</TableHead>
                <TableHead>Telefon</TableHead>
                <TableHead>Temsilci</TableHead>
                <TableHead>Kullanıcı Adı</TableHead>
                <TableHead className="text-right ">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>{c.email || "-"}</TableCell>
                  <TableCell>{c.phone || "-"}</TableCell>
                  <TableCell>{c.assignedUser ? c.assignedUser.name : "-"}</TableCell>
                  <TableCell>{c.username || "-"}</TableCell>
                  <TableCell className="text-right space-x-2 whitespace-nowrap">
                    <Link to={`/admin/customers/edit/${c.id}`} className="inline-flex items-center justify-center h-8 px-3 rounded-md text-sm border hover:bg-muted hover:text-foreground transition-colors">
                      Düzenle
                    </Link>
                    <Link to={`/admin/customers/${c.id}`} className="inline-flex items-center justify-center h-8 px-3 rounded-md text-sm border hover:bg-muted hover:text-foreground transition-colors">
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
