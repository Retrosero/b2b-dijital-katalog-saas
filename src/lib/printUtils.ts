/**
 * satSatma B2B - Modern Yazdırma Yardımcıları
 */

// Sayıyı Türkçe kelimelere çevirir (Para birimi formatında)
export function numberToWords(amount: number): string {
  const ones = ["", "Bir", "İki", "Üç", "Dört", "Beş", "Altı", "Yedi", "Sekiz", "Dokuz"];
  const tens = ["", "On", "Yirmi", "Otuz", "Kırk", "Elli", "Altmış", "Yetmiş", "Seksen", "Doksan"];
  const thousands = ["", "Bin", "Milyon", "Milyar", "Trilyon"];

  if (amount === 0) return "Sıfır Türk Lirası";

  const parts = Math.abs(amount).toFixed(2).split(".");
  const wholePart = parseInt(parts[0], 10);
  const decimalPart = parseInt(parts[1], 10);

  const convertGroup = (n: number): string => {
    let text = "";
    const h = Math.floor(n / 100);
    const t = Math.floor((n % 100) / 10);
    const o = n % 10;

    if (h > 0) {
      if (h === 1) text += " Yüz";
      else text += " " + ones[h] + " Yüz";
    }
    if (t > 0) text += " " + tens[t];
    if (o > 0) text += " " + ones[o];
    return text.trim();
  };

  const convertNumber = (n: number): string => {
    if (n === 0) return "";
    let text = "";
    let temp = n;
    let groupIdx = 0;

    while (temp > 0) {
      const remainder = temp % 1000;
      if (remainder > 0) {
        let groupText = convertGroup(remainder);
        // Türkçe dil kuralları: "Bir Bin" yerine sadece "Bin" denir.
        if (groupIdx === 1 && remainder === 1) {
          groupText = "";
        }
        text = (groupText + " " + thousands[groupIdx]).trim() + " " + text;
      }
      temp = Math.floor(temp / 1000);
      groupIdx++;
    }
    return text.trim();
  };

  let wholeText = convertNumber(wholePart);
  if (!wholeText) wholeText = "Sıfır";
  wholeText += " Türk Lirası";

  let decimalText = "";
  if (decimalPart > 0) {
    decimalText = " " + convertGroup(decimalPart) + " Kuruş";
  }

  // Çift boşlukları temizle
  const cleaned = `${wholeText}${decimalText}`.replace(/\s+/g, " ").trim();

  return `Yalnız # ${cleaned} #`;
}

const formatPrice = (price: number) => {
  return price.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " TL";
};

const formatDate = (dateString: string | Date) => {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
};

const paymentTypeMap: Record<string, string> = {
  CASH: "Nakit",
  CREDIT_CARD: "Kredi Kartı",
  TRANSFER: "Havale / EFT"
};

// Tahsilat Makbuzu Yazdırma Şablonu
export function printCollectionReceipt(collection: any, customer: any, tenant: any) {
  const words = numberToWords(Number(collection.amount));

  const renderSingleReceiptCopy = (copyLabel: string) => {
    return `
      <div class="receipt-copy">
        <div class="header">
          <div class="company-info">
            <h1>${tenant?.name || "Firma Adı"}</h1>
            <p>B2B Satış ve Tahsilat Sistemi</p>
          </div>
          <div class="title-block">
            <h2>TAHSİLAT MAKBUZU <span style="font-size: 9px; font-weight: bold; color: #3b82f6; border: 1px solid #3b82f6; padding: 1px 4px; border-radius: 3px; vertical-align: middle; margin-left: 6px; text-transform: uppercase;">${copyLabel}</span></h2>
            <div class="meta-info">
              <table>
                <tr>
                  <td>Makbuz No:</td>
                  <td><strong>${collection.receiptNumber}</strong></td>
                </tr>
                <tr>
                  <td>Tarih:</td>
                  <td>${formatDate(collection.createdAt)}</td>
                </tr>
              </table>
            </div>
          </div>
        </div>

        <div class="parties-section">
          <div class="party-column">
            <div class="party-label">ALICI (TAHSİL EDEN)</div>
            <div class="party-name"><strong>${tenant?.name || "Firma Adı"}</strong></div>
            <div class="party-sub" style="color: #64748b; font-weight: bold; margin-top: 4px;">Cari Tahsilat İş Ortağı</div>
          </div>
          <div class="party-column" style="border-left: 1px solid #cbd5e1; padding-left: 14px;">
            <div class="party-label">ÖDEYEN (MÜŞTERİ)</div>
            <div class="party-name"><strong>${customer?.name || "Müşteri Adı"}</strong></div>
            ${customer?.phone ? `<div class="party-sub">Tel: ${customer.phone}</div>` : ""}
            ${customer?.address ? `<div class="party-sub" style="max-height: 24px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">Adres: ${customer.address}</div>` : ""}
          </div>
        </div>

        <table class="receipt-details-table">
          <thead>
            <tr>
              <th style="width: 25%;">Ödeme Türü</th>
              <th style="width: 35%;">Banka Tanımı</th>
              <th>Açıklama / Not</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>${paymentTypeMap[collection.paymentType] || collection.paymentType}</strong></td>
              <td>${collection.bankName || "-"}</td>
              <td>${collection.notes || "Cari Hesap Tahsilatı"}</td>
            </tr>
            <tr class="amount-row">
              <td colspan="2" style="text-align: right; vertical-align: middle;">TOPLAM TAHSİLAT TUTARI:</td>
              <td class="amount-value">${formatPrice(Number(collection.amount))}</td>
            </tr>
          </tbody>
        </table>

        <div class="words-section">
          ${words}
        </div>

        <div class="signature-section">
          <div class="signature-box">
            <p>Ödeyen (Teslim Eden)</p>
            <div class="signature-line">${customer?.name?.substring(0, 30) || "Müşteri Yetkilisi"}</div>
          </div>
          <div class="signature-box">
            <p>Tahsildar (Teslim Alan)</p>
            <div class="signature-line">${tenant?.name?.substring(0, 30) || "Firma Yetkilisi"}</div>
          </div>
        </div>

        <div class="footer-note">
          Bu makbuz satSatma B2B Katalog sistemi tarafından dijital olarak üretilmiştir.
        </div>
      </div>
    `;
  };
  
  const html = `
    <!DOCTYPE html>
    <html lang="tr">
    <head>
      <meta charset="UTF-8">
      <title>Tahsilat Makbuzu - ${collection.receiptNumber}</title>
      <style>
        :root { color-scheme: light; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: Arial, sans-serif;
          background: #ffffff;
          color: #1e293b;
          line-height: 1.3;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .a4-container {
          width: 210mm;
          height: 297mm;
          padding: 8mm;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          box-sizing: border-box;
          background: #ffffff;
          margin: 0 auto;
        }
        .receipt-copy {
          height: 130mm;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          border: 1.5px solid #cbd5e1;
          border-radius: 8px;
          padding: 16px;
          box-sizing: border-box;
          background: #ffffff;
          position: relative;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 2px solid #3b82f6;
          padding-bottom: 6px;
          margin-bottom: 8px;
        }
        .company-info h1 {
          font-size: 15px;
          font-weight: 800;
          color: #1e3a8a;
          margin-bottom: 1px;
        }
        .company-info p {
          font-size: 9px;
          color: #64748b;
        }
        .title-block {
          text-align: right;
        }
        .title-block h2 {
          font-size: 15px;
          font-weight: 900;
          color: #3b82f6;
          letter-spacing: 0.5px;
          display: flex;
          align-items: center;
          justify-content: flex-end;
        }
        .meta-info {
          margin-top: 2px;
          font-size: 10px;
          color: #334155;
          text-align: right;
        }
        .meta-info table {
          margin-left: auto;
          border-collapse: collapse;
        }
        .meta-info td {
          padding: 1px 3px;
          text-align: left;
        }
        .meta-info td:first-child {
          font-weight: bold;
          color: #64748b;
        }
        .parties-section {
          display: grid;
          grid-template-cols: 1fr 1fr;
          gap: 12px;
          margin-bottom: 8px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 8px 12px;
        }
        .party-column {
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
        }
        .party-label {
          font-size: 8px;
          font-weight: 800;
          color: #475569;
          letter-spacing: 0.5px;
          margin-bottom: 3px;
          text-transform: uppercase;
        }
        .party-name {
          font-size: 11px;
          color: #0f172a;
        }
        .party-sub {
          font-size: 9.5px;
          color: #64748b;
          margin-top: 1px;
        }
        .receipt-details-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 8px;
        }
        .receipt-details-table th, .receipt-details-table td {
          border: 1px solid #e2e8f0;
          padding: 5px 6px;
          text-align: left;
          font-size: 10.5px;
        }
        .receipt-details-table th {
          background: #f8fafc;
          font-weight: bold;
          color: #334155;
        }
        .amount-row {
          background: #eff6ff !important;
          font-weight: bold;
        }
        .amount-value {
          font-size: 13px;
          color: #1d4ed8;
          font-weight: 800;
        }
        .words-section {
          background: #f8fafc;
          border: 1px dashed #cbd5e1;
          border-radius: 4px;
          padding: 5px;
          font-size: 10px;
          font-style: italic;
          color: #1e293b;
          text-align: center;
          font-weight: 600;
          margin-bottom: 8px;
        }
        .signature-section {
          display: flex;
          justify-content: space-between;
          margin-top: 6px;
        }
        .signature-box {
          width: 220px;
          text-align: center;
          font-size: 10px;
        }
        .signature-line {
          border-top: 1px solid #94a3b8;
          margin-top: 22px;
          padding-top: 3px;
          font-weight: bold;
          color: #475569;
          font-size: 9.5px;
        }
        .scissor-separator {
          border-top: 2px dashed #cbd5e1;
          margin: 8px 0;
          text-align: center;
          position: relative;
          color: #64748b;
          font-size: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 10px;
        }
        .scissor-separator span {
          background: #ffffff;
          padding: 0 10px;
          position: relative;
          top: 0px;
          font-weight: bold;
        }
        .footer-note {
          text-align: center;
          font-size: 8px;
          color: #94a3b8;
          border-top: 1px solid #f1f5f9;
          padding-top: 3px;
          margin-top: 2px;
        }
        @media print {
          body { padding: 0; background: #ffffff; margin: 0; }
          .a4-container { border: 0; padding: 8mm; width: 210mm; height: 297mm; }
        }
        @page {
          size: A4;
          margin: 0;
        }
      </style>
    </head>
    <body>
      <div class="a4-container">
        ${renderSingleReceiptCopy("ASIL (YAZIHANEDE KALACAK)")}
        
        <div class="scissor-separator">
          <span>✂ Makbuz Kesim Çizgisi (Makbuzu buradan ikiye katlayıp kesebilirsiniz) ✂</span>
        </div>
        
        ${renderSingleReceiptCopy("MÜŞTERİ NÜSHASI (MÜŞTERİYE VERİLECEK)")}
      </div>
    </body>
    </html>
  `;

  const printWindow = window.open("", "_blank", "width=900,height=700");
  if (!printWindow) return;
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 250);
}

// Sipariş / Fatura Yazdırma Şablonu
export function printInvoice(order: any, customer: any, tenant: any) {
  const items = order.items || [];
  const subtotal = items.reduce((sum: number, item: any) => {
    return sum + (Number(item.quantity) * Number(item.unitPrice));
  }, 0) || 0;
  
  const showKdv = tenant?.showInvoiceKdv !== false;
  const kdvRate = 20;
  const kdvAmount = showKdv ? subtotal * (kdvRate / 100) : 0;
  const totalAmount = showKdv ? subtotal + kdvAmount : subtotal;

  const rowsHtml = items.map((item: any, idx: number) => `
    <tr>
      <td style="text-align: center;">${idx + 1}</td>
      <td>
        <strong style="color: #0f172a; font-size: 13px;">${item.product?.name || "Bilinmeyen Ürün"}</strong>
        ${item.note ? `<p style="font-size: 11px; color: #64748b; margin-top: 2px;">Not: ${item.note}</p>` : ""}
      </td>
      <td style="text-align: center; font-weight: bold;">${item.quantity}</td>
      <td style="text-align: right;">${formatPrice(Number(item.unitPrice))}</td>
      <td style="text-align: right; font-weight: bold;">${formatPrice(Number(item.quantity) * Number(item.unitPrice))}</td>
    </tr>
  `).join("");

  const html = `
    <!DOCTYPE html>
    <html lang="tr">
    <head>
      <meta charset="UTF-8">
      <title>Fatura - ${order.orderNumber}</title>
      <style>
        :root { color-scheme: light; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: Arial, sans-serif;
          background: #ffffff;
          color: #1e293b;
          padding: 40px;
          line-height: 1.5;
        }
        .invoice-container {
          max-width: 800px;
          margin: 0 auto;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          padding: 30px;
          background: #ffffff;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 2px solid #3b82f6;
          padding-bottom: 20px;
          margin-bottom: 25px;
        }
        .company-info h1 {
          font-size: 22px;
          font-weight: 800;
          color: #1e3a8a;
          margin-bottom: 4px;
        }
        .company-info p {
          font-size: 12px;
          color: #64748b;
        }
        .title-block {
          text-align: right;
        }
        .title-block h2 {
          font-size: 26px;
          font-weight: 900;
          color: #3b82f6;
          letter-spacing: 0.5px;
        }
        .meta-info {
          margin-top: 8px;
          font-size: 13px;
          color: #334155;
          text-align: right;
        }
        .meta-info table {
          margin-left: auto;
          border-collapse: collapse;
        }
        .meta-info td {
          padding: 3px 6px;
          text-align: left;
        }
        .meta-info td:first-child {
          font-weight: bold;
          color: #64748b;
        }
        .details-grid {
          display: grid;
          grid-template-cols: 1fr 1fr;
          gap: 20px;
          margin-bottom: 25px;
        }
        .card {
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          overflow: hidden;
        }
        .card-header {
          background: #f8fafc;
          padding: 8px 12px;
          font-size: 11px;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #475569;
          border-bottom: 1px solid #e2e8f0;
        }
        .card-body {
          padding: 12px;
          font-size: 13px;
          min-height: 90px;
        }
        .card-body p {
          margin-bottom: 4px;
        }
        .card-body strong {
          color: #0f172a;
        }
        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 25px;
        }
        .items-table th, .items-table td {
          border: 1px solid #e2e8f0;
          padding: 10px 12px;
          text-align: left;
          font-size: 13px;
        }
        .items-table th {
          background: #f8fafc;
          font-weight: bold;
          color: #334155;
        }
        .summary-container {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 30px;
        }
        .summary-table {
          width: 300px;
          border-collapse: collapse;
        }
        .summary-table td {
          padding: 6px 12px;
          font-size: 13px;
          border: 1px solid #e2e8f0;
        }
        .summary-table td:first-child {
          color: #64748b;
        }
        .summary-table td:last-child {
          text-align: right;
        }
        .total-row {
          background: #eff6ff;
          font-weight: bold;
        }
        .total-row td:last-child {
          font-size: 16px;
          color: #1d4ed8;
          font-weight: 800;
        }
        .note-card {
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          border-radius: 6px;
          padding: 12px;
          font-size: 12px;
          margin-bottom: 25px;
        }
        .note-card strong {
          display: block;
          margin-bottom: 4px;
          color: #475569;
          text-transform: uppercase;
          font-size: 10px;
          letter-spacing: 0.5px;
        }
        .footer-note {
          text-align: center;
          margin-top: 40px;
          font-size: 10px;
          color: #94a3b8;
          border-top: 1px solid #f1f5f9;
          padding-top: 10px;
        }
        @media print {
          body { padding: 0; background: #ffffff; }
          .invoice-container { border: 0; padding: 0; }
        }
      </style>
    </head>
    <body>
      <div class="invoice-container">
        <div class="header">
          <div class="company-info">
            <h1>${tenant?.name || "Firma Adı"}</h1>
            <p>B2B Satış ve Fatura Sistemi</p>
          </div>
          <div class="title-block">
            <h2>SATIS FATURASI</h2>
            <div class="meta-info">
              <table>
                <tr>
                  <td>Fatura No:</td>
                  <td><strong>${order.orderNumber}</strong></td>
                </tr>
                <tr>
                  <td>Tarih:</td>
                  <td>${formatDate(order.createdAt)}</td>
                </tr>
              </table>
            </div>
          </div>
        </div>

        <div class="details-grid">
          <div class="card">
            <div class="card-header">Satıcı Bilgileri</div>
            <div class="card-body">
              <p><strong>${tenant?.name || "Firma Adı"}</strong></p>
              <p>B2B Tedarikçi İş Ortağı</p>
            </div>
          </div>
          <div class="card">
            <div class="card-header">Alıcı Bilgileri</div>
            <div class="card-body">
              <p><strong>${customer?.name || "Müşteri Adı"}</strong></p>
              ${customer?.phone ? `<p>Tel: ${customer.phone}</p>` : ""}
              ${customer?.address ? `<p>Adres: ${customer.address}</p>` : ""}
            </div>
          </div>
        </div>

        <table class="items-table">
          <thead>
            <tr>
              <th style="width: 5%; text-align: center;">#</th>
              <th>Ürün Açıklaması</th>
              <th style="width: 10%; text-align: center;">Adet</th>
              <th style="width: 20%; text-align: right;">Birim Fiyat</th>
              <th style="width: 20%; text-align: right;">Toplam Fiyat</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || `<tr><td colspan="5" style="text-align: center; color: #64748b;">Kayıt bulunamadı.</td></tr>`}
          </tbody>
        </table>

        <div class="summary-container">
          <table class="summary-table">
            ${showKdv ? `
            <tr>
              <td>Ara Toplam</td>
              <td>${formatPrice(subtotal)}</td>
            </tr>
            <tr>
              <td>KDV (%${kdvRate})</td>
              <td>${formatPrice(kdvAmount)}</td>
            </tr>
            ` : ""}
            <tr class="total-row">
              <td>Genel Toplam</td>
              <td>${formatPrice(totalAmount)}</td>
            </tr>
          </table>
        </div>

        ${order.notes ? `
          <div class="note-card">
            <strong>Sipariş / Fatura Notu</strong>
            <p>${order.notes}</p>
          </div>
        ` : ""}

        <div class="footer-note">
          Bu fatura satSatma B2B Katalog sistemi tarafından dijital olarak üretilmiştir.
        </div>
      </div>
    </body>
    </html>
  `;

  const printWindow = window.open("", "_blank", "width=900,height=700");
  if (!printWindow) return;
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 250);
}
