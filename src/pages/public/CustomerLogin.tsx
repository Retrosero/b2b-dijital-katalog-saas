import React, { useState, useEffect } from "react";
import { useCustomerAuthStore } from "@/store/useCustomerAuthStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Lock, User, ArrowRight, Loader2 } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";

export default function CustomerLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const login = useCustomerAuthStore((state) => state.login);
  const customer = useCustomerAuthStore((state) => state.customer);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const nextPath = searchParams.get("next");

  useEffect(() => {
    if (customer) {
      navigate(nextPath || "/musteri/portal");
    }
  }, [customer, navigate, nextPath]);

  if (customer) {
    return <div className="min-h-screen flex items-center justify-center">Yonlendiriliyor...</div>;
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
        throw new Error(data?.error || "Giris basarisiz");
      }

      login(data.customer, data.token, rememberMe);
      navigate(nextPath || "/musteri/portal", { replace: true });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-background items-center justify-center p-4">
      <div className="w-full max-w-[420px] bg-card p-8 rounded-2xl shadow-xl border border-border">
        <div className="flex flex-col items-center gap-3 mb-8">
          <BrandLogo showIcon={false} textClassName="text-3xl" />
          <div className="w-14 h-14 brand-gradient rounded-2xl flex items-center justify-center shadow-lg shadow-secondary/30">
            <User className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Musteri Girisi</h1>
          <p className="text-muted-foreground text-sm text-center">Size ozel hazirlanan katalogu gormek ve siparis vermek icin giris yapin.</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="username" className="text-sm font-semibold text-foreground">Kullanici Adi</Label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
              <Input
                id="username"
                type="text"
                placeholder="Kullanici adiniz"
                className="pl-10 h-12 bg-muted/30 border-border focus:bg-card transition-colors"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-semibold text-foreground">Sifre</Label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                className="pl-10 h-12 bg-muted/30 border-border focus:bg-card transition-colors"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-muted-foreground select-none cursor-pointer">
            <input
              type="checkbox"
              className="accent-secondary w-4 h-4"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            Beni hatirla
          </label>

          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-destructive shrink-0" />
              {error}
            </div>
          )}

          <Button
            type="submit"
            className="w-full h-12 text-base font-semibold brand-gradient hover:opacity-90 text-white border-0 transition-opacity shadow-lg shadow-secondary/20 rounded-xl mt-4"
            disabled={loading}
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Giris yapiliyor...</>
            ) : (
              <>Giris Yap <ArrowRight className="w-4 h-4 ml-2" /></>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
