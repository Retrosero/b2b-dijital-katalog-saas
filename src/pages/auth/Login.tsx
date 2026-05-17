import React, { useState, useEffect } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { Lock, Mail, ArrowRight, Loader2 } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const login = useAuthStore((state) => state.login);
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate("/admin");
    }
  }, [user, navigate]);

  if (user) {
    return <div className="min-h-screen flex items-center justify-center">Yonlendiriliyor...</div>;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const raw = await res.text();
      let data: any = null;
      try {
        data = raw ? JSON.parse(raw) : null;
      } catch {
        throw new Error(`Sunucu beklenmeyen yanit dondurdu (HTTP ${res.status}).`);
      }

      if (!res.ok) {
        throw new Error(data?.error || `Giris basarisiz (HTTP ${res.status})`);
      }

      login(data.user, data.token, rememberMe);
      window.location.href = "/admin";
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[100dvh] w-full">
      <div className="hidden lg:flex lg:w-1/2 bg-[var(--sidebar)] relative overflow-hidden">
        <div className="relative z-10 flex flex-col justify-center px-16 xl:px-20 w-full">
          <BrandLogo className="mb-10" iconClassName="w-12 h-12 rounded-xl" textClassName="text-3xl" />
          <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-6">
            Dijital Katalogunuz,<br />
            <span className="text-secondary">Tek Platformda.</span>
          </h1>
          <p className="text-sidebar-foreground/60 text-lg leading-relaxed max-w-md">
            Katalog olusturmadan hizli satisa, siparis takibinden depo yonetimine kadar
            tum B2B sureclerinizi kolayca yonetin.
          </p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-background">
        <div className="w-full max-w-[420px]">
          <BrandLogo className="lg:hidden mb-10" iconClassName="w-11 h-11 rounded-xl" />

          <div className="mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Hos Geldiniz</h2>
            <p className="text-muted-foreground">Yonetim paneline giris yaparak devam edin.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-semibold">E-posta Adresi</Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                <Input
                  id="email"
                  type="email"
                  placeholder="ornek@firma.com"
                  className="pl-10 h-12 bg-muted/30 border-border focus:bg-card transition-colors"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-semibold">Sifre</Label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
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
              className="w-full h-12 text-base font-semibold brand-gradient border-0 hover:opacity-90 transition-opacity shadow-lg shadow-secondary/20"
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
    </div>
  );
}
