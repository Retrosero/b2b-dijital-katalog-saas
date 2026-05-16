import React, { useState, useEffect } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { Lock, Mail, ArrowRight, Loader2 } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  
  const login = useAuthStore(state => state.login);
  const user = useAuthStore(state => state.user);
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate("/admin");
    }
  }, [user, navigate]);

  if (user) {
    return <div className="min-h-screen flex items-center justify-center">Yönlendiriliyor...</div>;
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

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Giriş başarısız");
      }

      login(data.user, data.token);
      window.location.href = "/admin";
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[100dvh] w-full">
      {/* Sol Panel - Marka */}
      <div className="hidden lg:flex lg:w-1/2 bg-[var(--sidebar)] relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 -left-20 w-80 h-80 rounded-full bg-secondary/30 blur-3xl" />
          <div className="absolute bottom-20 right-0 w-96 h-96 rounded-full bg-secondary/20 blur-3xl" />
        </div>
        <div className="relative z-10 flex flex-col justify-center px-16 xl:px-20 w-full">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-12 h-12 brand-gradient rounded-xl flex items-center justify-center shadow-lg">
              <span className="font-bold text-white text-xl">K</span>
            </div>
            <span className="text-white font-bold text-2xl tracking-tight">KatalogSaaS</span>
          </div>
          <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-6">
            Dijital Kataloğunuz,<br />
            <span className="text-secondary">Tek Platformda.</span>
          </h1>
          <p className="text-sidebar-foreground/60 text-lg leading-relaxed max-w-md">
            Katalog oluşturmadan hızlı satışa, sipariş takibinden depo yönetimine kadar 
            tüm B2B süreçlerinizi kolayca yönetin.
          </p>
          <div className="mt-12 flex gap-8">
            <div>
              <div className="text-3xl font-bold text-white">500+</div>
              <div className="text-sm text-sidebar-foreground/40 mt-1">Aktif Firma</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white">50K+</div>
              <div className="text-sm text-sidebar-foreground/40 mt-1">Ürün Kataloğu</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white">%99.9</div>
              <div className="text-sm text-sidebar-foreground/40 mt-1">Uptime</div>
            </div>
          </div>
        </div>
      </div>

      {/* Sağ Panel - Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-background">
        <div className="w-full max-w-[420px]">
          {/* Mobil Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-11 h-11 brand-gradient rounded-xl flex items-center justify-center shadow-lg">
              <span className="font-bold text-white text-lg">K</span>
            </div>
            <span className="text-foreground font-bold text-xl tracking-tight">KatalogSaaS</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Hoş Geldiniz</h2>
            <p className="text-muted-foreground">Yönetim paneline giriş yaparak devam edin.</p>
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
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-semibold">Şifre</Label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="••••••••"
                  className="pl-10 h-12 bg-muted/30 border-border focus:bg-card transition-colors"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>
            
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
                <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Giriş yapılıyor...</>
              ) : (
                <>Giriş Yap <ArrowRight className="w-4 h-4 ml-2" /></>
              )}
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground/50 mt-8">
            © {new Date().getFullYear()} KatalogSaaS — B2B Dijital Katalog Platformu
          </p>
        </div>
      </div>
    </div>
  );
}
