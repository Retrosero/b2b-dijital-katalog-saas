import React, { useMemo, useState } from "react";
import { Rocket, Package, Users, BookOpen, HardDrive, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type PlanUpgradeDialogProps = {
  triggerLabel?: string;
};

const PLAN_PACKAGES = [
  {
    name: "Starter",
    badge: "Başlangıç",
    price: "₺1.490 / ay",
    products: 250,
    catalogs: 10,
    customers: 100,
    storage: "5 GB",
    support: "Standart Destek",
    featured: false,
  },
  {
    name: "Premium",
    badge: "Popüler",
    price: "₺2.990 / ay",
    products: 1000,
    catalogs: 100,
    customers: 10_000,
    storage: "20 GB",
    support: "Öncelikli Destek",
    featured: true,
  },
  {
    name: "Pro",
    badge: "Büyüme",
    price: "₺4.990 / ay",
    products: 2500,
    catalogs: 250,
    customers: 25_000,
    storage: "20 GB",
    support: "Öncelikli Destek",
    featured: false,
  },
  {
    name: "Enterprise",
    badge: "Kurumsal",
    price: "Özel Fiyat",
    products: 10_000,
    catalogs: 1000,
    customers: 100_000,
    storage: "100 GB",
    support: "Özel Destek Yöneticisi",
    featured: false,
  },
];

export default function PlanUpgradeDialog({ triggerLabel = "Plan Yükselt" }: PlanUpgradeDialogProps) {
  const [open, setOpen] = useState(false);
  const plans = useMemo(() => PLAN_PACKAGES, []);

  return (
    <>
      <Button
        type="button"
        onClick={() => setOpen(true)}
        className="h-11 px-5 font-semibold gap-2 bg-amber-500 hover:bg-amber-600 text-white"
      >
        <Rocket className="w-4 h-4" />
        {triggerLabel}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-5xl border-0 bg-transparent shadow-none p-0">
          <div className="rounded-2xl border border-cyan-200/50 bg-gradient-to-br from-slate-900 via-cyan-950 to-slate-900 p-5 sm:p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white text-xl">
              <Sparkles className="w-5 h-5 text-cyan-300" />
              Paket Karşılaştırma ve Fiyatlar
            </DialogTitle>
            <p className="text-xs sm:text-sm text-cyan-100/80 mt-1">
              Mevcut 3 paket + Enterprise içerikleri aşağıda listelenmiştir.
            </p>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl border p-4 sm:p-5 backdrop-blur-md transition-all ${
                  plan.featured
                    ? "border-cyan-300/70 bg-cyan-400/10 shadow-[0_0_0_1px_rgba(34,211,238,0.35),0_10px_40px_rgba(6,182,212,0.2)]"
                    : "border-white/15 bg-white/5"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h4 className="text-lg font-bold text-white">{plan.name}</h4>
                    <span className="inline-flex mt-1 text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-cyan-100 border border-white/20">
                      {plan.badge}
                    </span>
                  </div>
                  <span className="text-sm font-bold text-cyan-200">{plan.price}</span>
                </div>
                <div className="mt-4 space-y-2.5 text-sm">
                  <div className="flex items-center gap-2 text-cyan-100/90">
                    <Package className="w-4 h-4 text-cyan-300" />
                    Ürün: <strong className="text-white">{plan.products.toLocaleString("tr-TR")}</strong>
                  </div>
                  <div className="flex items-center gap-2 text-cyan-100/90">
                    <BookOpen className="w-4 h-4 text-cyan-300" />
                    Katalog: <strong className="text-white">{plan.catalogs.toLocaleString("tr-TR")}</strong>
                  </div>
                  <div className="flex items-center gap-2 text-cyan-100/90">
                    <Users className="w-4 h-4 text-cyan-300" />
                    Müşteri: <strong className="text-white">{plan.customers.toLocaleString("tr-TR")}</strong>
                  </div>
                  <div className="flex items-center gap-2 text-cyan-100/90">
                    <HardDrive className="w-4 h-4 text-cyan-300" />
                    Depolama: <strong className="text-white">{plan.storage}</strong>
                  </div>
                  <div className="flex items-center gap-2 text-cyan-100/90">
                    <ShieldCheck className="w-4 h-4 text-cyan-300" />
                    Destek: <strong className="text-white">{plan.support}</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
