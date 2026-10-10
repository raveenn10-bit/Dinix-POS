import { Order, Invoice } from '@/types';

function escapeHtml(str: string): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Print thermal / slip receipt without popups using a hidden isolated iframe.
 * Works with both Order and Invoice objects.
 */
export function printOrderReceipt(
  target: Order | Invoice,
  options?: { title?: string; onComplete?: () => void; onError?: (err: unknown) => void }
): void {
  try {
    const isInvoice = 'invoiceNumber' in target && !('orderStatus' in target);
    const docNumber = isInvoice
      ? (target as Invoice).invoiceNumber
      : (target as Order).orderNumber;
    const createdAt = target.createdAt ? new Date(target.createdAt) : new Date();
    const dateFormatted = createdAt.toLocaleString('en-LK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const customerName = isInvoice
      ? (target as Invoice).customerSnapshot.name
      : (target as Order).customerName;
    const customerPhone = isInvoice
      ? (target as Invoice).customerSnapshot.phone
      : (target as Order).customerPhone;
    const customerAddress = isInvoice
      ? (target as Invoice).customerSnapshot.address || (target as Invoice).customerSnapshot.city || ''
      : (target as Order).customerAddress || '';

    const isWholesale =
      ('orderType' in target && (target as Order).orderType === 'wholesale') ||
      ('invoiceType' in target && (target as Invoice).invoiceType === 'wholesale');

    const statusText = isInvoice
      ? `INVOICE (${(target as Invoice).paymentStatus.toUpperCase()})`
      : `${(target as Order).orderStatus.toUpperCase()} • ${(target as Order).paymentStatus.toUpperCase()}`;

    const paymentMethodText = target.paymentMethod
      ? target.paymentMethod.replace('_', ' ').toUpperCase()
      : 'CASH';

    const items = target.items || [];
    const subtotal = target.subtotal || 0;
    const discount = target.discount || 0;
    const deliveryFee = target.deliveryFee || 0;
    const total = target.total || 0;
    const notes = target.notes || '';

    const itemsHtml = items
      .map(
        (item) => `
        <tr>
          <td style="padding: 5px 2px; border-bottom: 1px dashed #e2e8f0; font-weight: 600; color: #0b2545;">
            ${escapeHtml(item.productName)}
            <div style="font-size: 9.5px; font-weight: normal; color: #64748b; font-family: monospace;">
              SKU: ${escapeHtml(item.sku)}
            </div>
          </td>
          <td style="padding: 5px 2px; border-bottom: 1px dashed #e2e8f0; text-align: center; font-weight: 700;">
            ${item.quantity}
          </td>
          <td style="padding: 5px 2px; border-bottom: 1px dashed #e2e8f0; text-align: right; font-family: monospace;">
            ${item.unitPrice.toFixed(2)}
          </td>
          <td style="padding: 5px 2px; border-bottom: 1px dashed #e2e8f0; text-align: right; font-weight: 700; font-family: monospace;">
            ${item.lineTotal.toFixed(2)}
          </td>
        </tr>
      `
      )
      .join('');

    const printHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${escapeHtml(options?.title || `Receipt - ${docNumber}`)}</title>
          <style>
            @page {
              size: 80mm auto;
              margin: 4mm;
            }
            * {
              box-sizing: border-box;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            html, body {
              margin: 0;
              padding: 0;
              background: #ffffff;
              color: #0b2545;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              font-size: 11px;
              line-height: 1.35;
            }
            .receipt-container {
              width: 100%;
              max-width: 76mm;
              margin: 0 auto;
              padding: 4px;
            }
            .header {
              text-align: center;
              border-bottom: 2px dashed #0b2545;
              padding-bottom: 8px;
              margin-bottom: 8px;
            }
            .brand-name {
              font-size: 18px;
              font-weight: 900;
              letter-spacing: 1px;
              color: #0b2545;
              margin: 0;
            }
            .brand-name span {
              color: #f36f21;
            }
            .brand-sub {
              font-size: 9.5px;
              font-weight: 600;
              color: #475569;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin-top: 1px;
            }
            .brand-contact {
              font-size: 9px;
              color: #64748b;
              margin-top: 3px;
              line-height: 1.3;
            }
            .meta-box {
              font-size: 10.5px;
              border-bottom: 1px dashed #cbd5e1;
              padding-bottom: 6px;
              margin-bottom: 6px;
            }
            .meta-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 2px;
            }
            .meta-label {
              color: #64748b;
            }
            .meta-value {
              font-weight: 700;
              color: #0b2545;
            }
            .customer-box {
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 4px;
              padding: 5px 6px;
              font-size: 10px;
              margin-bottom: 8px;
            }
            .customer-title {
              font-weight: 800;
              font-size: 9px;
              color: #475569;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin-bottom: 2px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 10.5px;
              margin-bottom: 8px;
            }
            th {
              border-bottom: 1.5px solid #0b2545;
              padding: 4px 2px;
              font-size: 9.5px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              color: #0b2545;
            }
            .totals-table {
              width: 100%;
              border-top: 1.5px solid #0b2545;
              padding-top: 4px;
              margin-top: 4px;
            }
            .totals-row {
              display: flex;
              justify-content: space-between;
              padding: 2px 0;
              font-size: 10.5px;
            }
            .grand-total-row {
              display: flex;
              justify-content: space-between;
              border-top: 2px solid #0b2545;
              border-bottom: 2px solid #0b2545;
              padding: 6px 0;
              margin-top: 4px;
              margin-bottom: 4px;
              font-size: 14px;
              font-weight: 900;
              color: #0b2545;
            }
            .notes-box {
              margin-top: 6px;
              padding: 4px 6px;
              background: #f8fafc;
              border-left: 2px solid #f36f21;
              font-size: 9.5px;
              color: #334155;
            }
            .footer {
              text-align: center;
              font-size: 9px;
              color: #64748b;
              margin-top: 12px;
              border-top: 1px dashed #cbd5e1;
              padding-top: 8px;
              line-height: 1.4;
            }
            .barcode-text {
              font-family: monospace;
              font-size: 9px;
              font-weight: bold;
              text-align: center;
              margin-top: 6px;
              letter-spacing: 2px;
            }
            @media print {
              body {
                padding: 0;
              }
              .no-print {
                display: none !important;
              }
            }
          </style>
        </head>
        <body>
          <div class="receipt-container">
            <div class="header">
              <div class="brand-name">DANIX<span>.LK</span></div>
              <div class="brand-sub">${isWholesale ? 'Wholesale B2B Distribution & Supply' : 'Trusted Online Shopping & POS'}</div>
              <div class="brand-contact">
                Akmeemana, Galle, Sri Lanka<br>
                Hotline: 076 252 4671 | info@danix.lk<br>
                www.danix.lk
              </div>
            </div>

            <div class="meta-box">
              <div class="meta-row">
                <span class="meta-label">${isInvoice ? 'INVOICE #:' : 'ORDER #:'}</span>
                <span class="meta-value">${escapeHtml(docNumber)}</span>
              </div>
              <div class="meta-row">
                <span class="meta-label">Channel:</span>
                <span><strong>${isWholesale ? 'WHOLESALE (B2B)' : 'RETAIL SALE'}</strong></span>
              </div>
              <div class="meta-row">
                <span class="meta-label">Date & Time:</span>
                <span>${dateFormatted}</span>
              </div>
              <div class="meta-row">
                <span class="meta-label">Payment:</span>
                <span><strong>${escapeHtml(paymentMethodText)}</strong> (${escapeHtml(statusText)})</span>
              </div>
            </div>

            <div class="customer-box">
              <div class="customer-title">Customer Details</div>
              <div style="font-weight: 700; color: #0b2545;">${escapeHtml(customerName)}</div>
              <div>Tel: ${escapeHtml(customerPhone)}</div>
              ${customerAddress ? `<div>Address: ${escapeHtml(customerAddress)}</div>` : ''}
            </div>

            <table>
              <thead>
                <tr>
                  <th style="text-align: left;">Item</th>
                  <th style="text-align: center; width: 32px;">Qty</th>
                  <th style="text-align: right; width: 50px;">Price</th>
                  <th style="text-align: right; width: 58px;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>

            <div class="totals-table">
              <div class="totals-row">
                <span>Subtotal:</span>
                <span style="font-family: monospace;">Rs. ${subtotal.toFixed(2)}</span>
              </div>
              ${
                discount > 0
                  ? `<div class="totals-row" style="color: #e11d48;">
                      <span>Discount:</span>
                      <span style="font-family: monospace;">- Rs. ${discount.toFixed(2)}</span>
                    </div>`
                  : ''
              }
              <div class="totals-row">
                <span>Delivery Fee:</span>
                <span style="font-family: monospace;">Rs. ${deliveryFee.toFixed(2)}</span>
              </div>
              <div class="grand-total-row">
                <span>GRAND TOTAL:</span>
                <span style="font-family: monospace;">Rs. ${total.toFixed(2)}</span>
              </div>
            </div>

            ${
              notes
                ? `<div class="notes-box">
                    <strong>Remarks:</strong> ${escapeHtml(notes)}
                  </div>`
                : ''
            }

            <div class="footer">
              Thank you for shopping with DANIX.LK!<br>
              Items may be returned/exchanged within 7 days in original condition.<br>
              Software powered by Danix POS System
            </div>
            <div class="barcode-text">* ${escapeHtml(docNumber)} *</div>
          </div>
        </body>
      </html>
    `;

    // Popup-Free Direct Hidden Iframe Print
    let iframe = document.getElementById('danix-receipt-print-iframe') as HTMLIFrameElement | null;
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = 'danix-receipt-print-iframe';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.style.visibility = 'hidden';
      document.body.appendChild(iframe);
    }

    const iframeDoc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!iframeDoc) {
      window.print();
      return;
    }

    iframeDoc.open();
    iframeDoc.write(printHtml);
    iframeDoc.close();

    setTimeout(() => {
      try {
        iframe?.contentWindow?.focus();
        iframe?.contentWindow?.print();
        if (options?.onComplete) options.onComplete();
      } catch (err) {
        console.error('Iframe print error, falling back to window.print():', err);
        window.print();
        if (options?.onError) options.onError(err);
      }
    }, 250);
  } catch (err) {
    console.error('Error generating receipt print:', err);
    if (options?.onError) options.onError(err);
  }
}

/**
 * Print standard A4 Tax / Wholesale Invoice using a hidden isolated iframe.
 */
export function printA4InvoiceDocument(
  target: Invoice | Order,
  options?: { title?: string; onComplete?: () => void; onError?: (err: unknown) => void }
): void {
  try {
    const isInvoice = 'invoiceNumber' in target && !('orderStatus' in target);
    const invoiceNumber = isInvoice
      ? (target as Invoice).invoiceNumber
      : ((target as any).invoiceId || `INV-${(target as Order).orderNumber.replace(/^ORD-/, '')}`);
    const orderNumber = isInvoice ? (target as Invoice).orderNumber : (target as Order).orderNumber;
    const isWholesale =
      ('invoiceType' in target && (target as Invoice).invoiceType === 'wholesale') ||
      ('orderType' in target && (target as Order).orderType === 'wholesale');
    const createdAt = target.createdAt ? new Date(target.createdAt) : new Date();
    const dateFormatted = createdAt.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    const customerSnapshot = isInvoice
      ? (target as Invoice).customerSnapshot
      : {
          name: (target as Order).customerName || 'Customer',
          phone: (target as Order).customerPhone || '',
          address: (target as Order).customerAddress || '',
          city: '',
        };

    const items = target.items || [];
    const subtotal = target.subtotal || 0;
    const discount = target.discount || 0;
    const deliveryFee = target.deliveryFee || 0;
    const total = target.total || 0;
    const paidAmount = ('paidAmount' in target ? Number((target as any).paidAmount) : 0) || (target.paymentStatus === 'paid' ? total : 0);
    const balanceDue = Math.max(0, total - paidAmount);
    const paymentStatus = target.paymentStatus || 'unpaid';
    const paymentMethod = target.paymentMethod || 'cash';
    const dueDate = (target as any).dueDate;
    const notes = (target as any).notes || '';
    const createdBy = target.createdBy || 'Danix POS';

    const itemsHtml = items
      .map(
        (item, idx) => `
        <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
          <td style="padding: 8px 6px; text-align: center; color: #64748b;">${idx + 1}</td>
          <td style="padding: 8px 6px; font-weight: 600; color: #0b2545;">
            ${escapeHtml(item.productName)}
            <div style="font-size: 10px; color: #64748b; font-family: monospace;">SKU: ${escapeHtml(item.sku)}</div>
          </td>
          <td style="padding: 8px 6px; text-align: center; font-weight: 700;">${item.quantity}</td>
          <td style="padding: 8px 6px; text-align: right; font-family: monospace;">Rs. ${item.unitPrice.toFixed(2)}</td>
          <td style="padding: 8px 6px; text-align: right; color: #e11d48; font-family: monospace;">
            ${item.discount > 0 ? `- Rs. ${item.discount.toFixed(2)}` : 'Rs. 0.00'}
          </td>
          <td style="padding: 8px 6px; text-align: right; font-weight: 700; font-family: monospace;">
            Rs. ${item.lineTotal.toFixed(2)}
          </td>
        </tr>
      `
      )
      .join('');

    const printHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${escapeHtml(options?.title || `Invoice - ${invoiceNumber}`)}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 12mm 10mm;
            }
            * {
              box-sizing: border-box;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            body {
              margin: 0;
              padding: 0;
              background: #ffffff;
              color: #0b2545;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            }
            .a4-container {
              max-width: 210mm;
              margin: 0 auto;
              padding: 12px;
            }
            .header-table {
              width: 100%;
              border-bottom: 2.5px solid #0b2545;
              padding-bottom: 12px;
              margin-bottom: 16px;
            }
            .brand-h1 {
              font-size: 26px;
              font-weight: 900;
              margin: 0;
              color: #0b2545;
            }
            .brand-h1 span {
              color: #f36f21;
            }
            .inv-badge {
              display: inline-block;
              background: #0b2545;
              color: #ffffff;
              padding: 4px 10px;
              border-radius: 4px;
              font-size: 13px;
              font-weight: 800;
              letter-spacing: 1px;
            }
            .info-grid {
              display: flex;
              justify-content: space-between;
              margin-bottom: 16px;
              font-size: 11.5px;
            }
            .box {
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 6px;
              padding: 10px 12px;
              width: 48%;
            }
            table.items {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 16px;
            }
            table.items th {
              background: #0b2545;
              color: #ffffff;
              font-size: 10.5px;
              text-transform: uppercase;
              padding: 8px 6px;
              font-weight: 700;
            }
            .summary-table {
              width: 100%;
              max-width: 320px;
              margin-left: auto;
              font-size: 12px;
            }
            .summary-table td {
              padding: 4px 0;
            }
            .grand-total {
              border-top: 2px solid #0b2545;
              border-bottom: 2px solid #0b2545;
              font-size: 15px;
              font-weight: 900;
              color: #0b2545;
              padding: 6px 0 !important;
            }
            .footer {
              margin-top: 30px;
              border-top: 1px solid #cbd5e1;
              padding-top: 12px;
              font-size: 10px;
              color: #64748b;
              text-align: center;
              line-height: 1.5;
            }
          </style>
        </head>
        <body>
          <div class="a4-container">
            <table class="header-table">
              <tr>
                <td style="vertical-align: top;">
                  <div class="brand-h1">DANIX<span>.LK</span></div>
                  <div style="font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">
                    Trusted Online Shopping Management System
                  </div>
                  <div style="font-size: 10.5px; color: #475569; margin-top: 4px; line-height: 1.3;">
                    Akmeemana, Galle, Sri Lanka 80054<br>
                    Hotline: 076 252 4671 | Email: danixlkstore@gmail.com | Web: https://danix.lk
                  </div>
                </td>
                <td style="vertical-align: top; text-align: right;">
                  <div class="inv-badge">
                    ${isWholesale ? 'COMMERCIAL WHOLESALE INVOICE' : 'RETAIL TAX INVOICE'}
                  </div>
                  <div style="margin-top: 8px; font-size: 12px;">
                    <div><strong>Invoice No:</strong> <span style="font-family: monospace; font-size: 13px; font-weight: 700;">${escapeHtml(invoiceNumber)}</span></div>
                    ${orderNumber ? `<div><strong>Order Ref:</strong> <span style="font-family: monospace;">${escapeHtml(orderNumber)}</span></div>` : ''}
                    <div><strong>Date:</strong> ${dateFormatted}</div>
                    <div><strong>Status:</strong> <span style="font-weight: 700; color: ${paymentStatus === 'paid' ? '#059669' : '#e11d48'}; text-transform: uppercase;">${paymentStatus}</span></div>
                  </div>
                </td>
              </tr>
            </table>

            <div class="info-grid">
              <div class="box">
                <div style="font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; margin-bottom: 4px;">Bill To / Customer</div>
                <div style="font-size: 13px; font-weight: 800; color: #0b2545;">${escapeHtml(customerSnapshot.name)}</div>
                <div style="margin-top: 2px;">Phone: <strong>${escapeHtml(customerSnapshot.phone)}</strong></div>
                ${customerSnapshot.address ? `<div>Address: ${escapeHtml(customerSnapshot.address)}</div>` : ''}
                ${customerSnapshot.city ? `<div>City: ${escapeHtml(customerSnapshot.city)}</div>` : ''}
              </div>

              <div class="box">
                <div style="font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; margin-bottom: 4px;">Payment & Delivery</div>
                <div>Payment Method: <strong>${escapeHtml(paymentMethod.toUpperCase())}</strong></div>
                <div>Payment Status: <strong>${escapeHtml(paymentStatus.toUpperCase())}</strong></div>
                ${dueDate ? `<div>Due Date: <strong>${new Date(dueDate).toLocaleDateString('en-GB')}</strong></div>` : ''}
                <div>Issued By: <strong>${escapeHtml(createdBy)}</strong></div>
              </div>
            </div>

            <table class="items">
              <thead>
                <tr>
                  <th style="width: 35px; text-align: center;">#</th>
                  <th style="text-align: left;">Item Description</th>
                  <th style="width: 45px; text-align: center;">Qty</th>
                  <th style="width: 80px; text-align: right;">Unit Price</th>
                  <th style="width: 70px; text-align: right;">Discount</th>
                  <th style="width: 90px; text-align: right;">Total (LKR)</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>

            <table class="summary-table">
              <tr>
                <td style="color: #64748b;">Subtotal:</td>
                <td style="text-align: right; font-family: monospace; font-weight: 600;">Rs. ${subtotal.toFixed(2)}</td>
              </tr>
              ${
                discount > 0
                  ? `<tr>
                      <td style="color: #e11d48;">Discount:</td>
                      <td style="text-align: right; font-family: monospace; color: #e11d48; font-weight: 600;">- Rs. ${discount.toFixed(2)}</td>
                    </tr>`
                  : ''
              }
              <tr>
                <td style="color: #64748b;">Delivery Fee:</td>
                <td style="text-align: right; font-family: monospace; font-weight: 600;">Rs. ${deliveryFee.toFixed(2)}</td>
              </tr>
              <tr class="grand-total">
                <td>GRAND TOTAL:</td>
                <td style="text-align: right; font-family: monospace;">Rs. ${total.toFixed(2)}</td>
              </tr>
              <tr>
                <td style="color: #059669; font-weight: 600;">Amount Paid:</td>
                <td style="text-align: right; font-family: monospace; color: #059669; font-weight: 700;">Rs. ${paidAmount.toFixed(2)}</td>
              </tr>
              ${
                balanceDue > 0
                  ? `<tr>
                      <td style="color: #e11d48; font-weight: 700;">Balance Due:</td>
                      <td style="text-align: right; font-family: monospace; color: #e11d48; font-weight: 800;">Rs. ${balanceDue.toFixed(2)}</td>
                    </tr>`
                  : ''
              }
            </table>

            ${
              notes
                ? `<div style="margin-top: 14px; padding: 8px 10px; background: #f8fafc; border-left: 3px solid #f36f21; font-size: 11px;">
                    <strong>Invoice Notes:</strong> ${escapeHtml(notes)}
                  </div>`
                : ''
            }

            <div class="footer">
              Thank you for your business with DANIX.LK!<br>
              Goods once sold can be returned/exchanged within 7 days in original condition with valid invoice.<br>
              This is a computer generated document and does not require an authorized signature.
            </div>
          </div>
        </body>
      </html>
    `;

    let iframe = document.getElementById('danix-a4-print-iframe') as HTMLIFrameElement | null;
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = 'danix-a4-print-iframe';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.style.visibility = 'hidden';
      document.body.appendChild(iframe);
    }

    const iframeDoc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!iframeDoc) {
      window.print();
      return;
    }

    iframeDoc.open();
    iframeDoc.write(printHtml);
    iframeDoc.close();

    setTimeout(() => {
      try {
        iframe?.contentWindow?.focus();
        iframe?.contentWindow?.print();
        if (options?.onComplete) options.onComplete();
      } catch (err) {
        console.error('Iframe print error, falling back to window.print():', err);
        window.print();
        if (options?.onError) options.onError(err);
      }
    }, 250);
  } catch (err) {
    console.error('Error generating A4 invoice print:', err);
    if (options?.onError) options.onError(err);
  }
}
