import { useAuthStore } from "@/store/useAuthStore";

export default function Dashboard() {
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid lg:grid-cols-4 md:grid-cols-2 grid-cols-1 gap-6">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">{isSuperAdmin ? "Toplam Firma" : "Toplam Sipariş"}</div>
          <div className="text-2xl font-bold text-slate-900">{isSuperAdmin ? "12" : "1,284"}</div>
          <div className="mt-2 flex items-center text-emerald-600 text-xs font-medium">
            <span>{isSuperAdmin ? "+2 bu ay" : "+12.5% geçen aya göre"}</span>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Aktif Kataloglar</div>
          <div className="text-2xl font-bold text-slate-900">8</div>
          <div className="mt-2 flex items-center text-slate-400 text-xs">
            <span>4 adet süresi dolmak üzere</span>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Bekleyen Siparişler</div>
          <div className="text-2xl font-bold text-rose-600">24</div>
          <div className="mt-2 flex items-center text-slate-400 text-xs">
            <span>Acil müdahale bekliyor</span>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Toplam Ciro (TL)</div>
          <div className="text-2xl font-bold text-slate-900">₺452,850</div>
          <div className="mt-2 flex items-center text-emerald-600 text-xs font-medium">
            <span>+8% hedef artışı</span>
          </div>
        </div>
      </div>

      {/* Main Visual Grid */}
      <div className="grid lg:grid-cols-3 grid-cols-1 gap-6 flex-1 items-start">
        {/* Recent Orders Table */}
        <div className="col-span-1 lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-800">Son Siparişler</h3>
            <a href="#" className="text-indigo-600 text-xs font-semibold hover:underline">Tümünü Gör</a>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-4 sm:px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Müşteri</th>
                  <th className="px-4 sm:px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Katalog</th>
                  <th className="px-4 sm:px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Tarih</th>
                  <th className="px-4 sm:px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Tutar</th>
                  <th className="px-4 sm:px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right whitespace-nowrap">Durum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="px-4 sm:px-6 py-3 text-sm font-medium text-slate-900 whitespace-nowrap">Arda Marketler Zinciri</td>
                  <td className="px-4 sm:px-6 py-3 text-sm text-slate-500 whitespace-nowrap">Yaz Sezonu 2024</td>
                  <td className="px-4 sm:px-6 py-3 text-sm text-slate-500 whitespace-nowrap">10:45</td>
                  <td className="px-4 sm:px-6 py-3 text-sm font-semibold whitespace-nowrap">₺14,250</td>
                  <td className="px-4 sm:px-6 py-3 text-right whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">Beklemede</span>
                  </td>
                </tr>
                <tr>
                  <td className="px-4 sm:px-6 py-3 text-sm font-medium text-slate-900 whitespace-nowrap">Özlem Restoran Grubu</td>
                  <td className="px-4 sm:px-6 py-3 text-sm text-slate-500 whitespace-nowrap">Endüstriyel Gıda</td>
                  <td className="px-4 sm:px-6 py-3 text-sm text-slate-500 whitespace-nowrap">09:12</td>
                  <td className="px-4 sm:px-6 py-3 text-sm font-semibold whitespace-nowrap">₺4,890</td>
                  <td className="px-4 sm:px-6 py-3 text-right whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Onaylandı</span>
                  </td>
                </tr>
                <tr>
                  <td className="px-4 sm:px-6 py-3 text-sm font-medium text-slate-900 whitespace-nowrap">Global Lojistik A.Ş.</td>
                  <td className="px-4 sm:px-6 py-3 text-sm text-slate-500 whitespace-nowrap">Yaz Sezonu 2024</td>
                  <td className="px-4 sm:px-6 py-3 text-sm text-slate-500 whitespace-nowrap">Dün</td>
                  <td className="px-4 sm:px-6 py-3 text-sm font-semibold whitespace-nowrap">₺22,100</td>
                  <td className="px-4 sm:px-6 py-3 text-right whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">Hazırlandı</span>
                  </td>
                </tr>
                <tr>
                  <td className="px-4 sm:px-6 py-3 text-sm font-medium text-slate-900 whitespace-nowrap">Zirve Kantin İşletmeleri</td>
                  <td className="px-4 sm:px-6 py-3 text-sm text-slate-500 whitespace-nowrap">Atıştırmalıklar</td>
                  <td className="px-4 sm:px-6 py-3 text-sm text-slate-500 whitespace-nowrap">Dün</td>
                  <td className="px-4 sm:px-6 py-3 text-sm font-semibold whitespace-nowrap">₺1,450</td>
                  <td className="px-4 sm:px-6 py-3 text-right whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">İptal</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions & Catalog Links */}
        <div className="space-y-6">
          <div className="bg-indigo-700 rounded-xl p-5 text-white shadow-lg">
            <h4 className="font-bold mb-2">Hızlı Katalog Paylaşımı</h4>
            <p className="text-indigo-100 text-xs mb-4">En çok tercih edilen kataloğunuzun linkini hemen kopyalayın.</p>
            <div className="flex gap-2 mb-4">
              <input type="text" readOnly value="ecatalog.com/tekno-gida/yaz24" className="flex-1 min-w-0 bg-indigo-800/50 border border-indigo-500 text-xs p-2 rounded text-indigo-50" />
              <button className="bg-white text-indigo-700 px-3 rounded font-bold text-xs shrink-0">Kopyala</button>
            </div>
            <button className="w-full py-2 bg-indigo-500 rounded font-medium text-sm hover:bg-indigo-400 transition-colors">Katalog Ayarlarını Yönet</button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h4 className="font-bold text-slate-800 mb-4">Sistem Limitleri</h4>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-500">Ürün Sayısı</span>
                  <span className="text-slate-900 font-medium">452 / 1000</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500" style={{ width: "45%" }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-500">Aktif Kataloglar</span>
                  <span className="text-slate-900 font-medium">8 / 10</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500" style={{ width: "80%" }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-500">Kullanıcılar</span>
                  <span className="text-slate-900 font-medium">3 / 5</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500" style={{ width: "60%" }}></div>
                </div>
              </div>
            </div>
            <button className="w-full mt-4 text-center text-xs text-indigo-600 font-semibold">Üst Pakete Geç &rarr;</button>
          </div>
        </div>
      </div>
    </div>
  );
}
