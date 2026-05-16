import React, { useState, useEffect } from "react";
import { useCustomerAuthStore } from "@/store/useCustomerAuthStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { Lock, User, ArrowRight, Loader2 } from "lucide-react";

export default function CustomerLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  
  const login = useCustomerAuthStore(state => state.login);
  const customer = useCustomerAuthStore(state => state.customer);
  const navigate = useNavigate();

  useEffect(() => {
    if (customer) {
      navigate("/musteri/portal");
    }
  }, [customer, navigate]);

  if (customer) {
    return <div className="min-h-screen flex items-center justify-center">Yönlendiriliyor...</div>;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/customer/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || `Giriş başarısız`);
      }

      login(data.customer, data.token);
      window.location.href = "/musteri/portal";
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-slate-50 items-center justify-center p-4">
      <div className="w-full max-w-[420px] bg-white p-8 rounded-2xl shadow-xl border border-slate-100">
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/30">
            <User className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Müşteri Girişi</h1>
          <p className="text-slate-500 text-sm text-center">Size özel hazırlanan kataloğu görmek ve sipariş vermek için giriş yapın.</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="username" className="text-sm font-semibold text-slate-700">Kullanıcı Adı</Label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                id="username"
                type="text"
                placeholder="Kullanıcı adınız"
                className="pl-10 h-12 bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-semibold text-slate-700">Şifre</Label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                className="pl-10 h-12 bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>
          </div>
          
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm font-medium flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-600 shrink-0" />
              {error}
            </div>
          )}

          <Button
            type="submit"
            className="w-full h-12 text-base font-semibold bg-indigo-600 hover:bg-indigo-700 text-white border-0 transition-colors shadow-lg shadow-indigo-600/20 rounded-xl mt-4"
            disabled={loading}
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Giriş yapılıyor...</>
            ) : (
              <>Giriş Yap <ArrowRight className="w-4 h-4 ml-2" /></>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
