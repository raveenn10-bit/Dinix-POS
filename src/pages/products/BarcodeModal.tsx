import React, { useEffect, useRef, useState } from 'react';
import JsBarcode from 'jsbarcode';
import {
  X,
  Printer,
  Copy,
  Check,
  Download,
  Tag,
  Grid,
  Plus,
  Minus,
  Sparkles,
  Layers,
  FileText,
  ShieldCheck,
} from 'lucide-react';
import clsx from 'clsx';
import { Product } from '@/types';
import { useNotification } from '@/context/NotificationContext';

interface BarcodeModalProps {
  product: Product;
  onClose: () => void;
}

type LabelLayout = 'thermal' | 'a4';

const escapeHtml = (str: string): string => {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

const escapeXml = (unsafe: string): string => {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '&':
        return '&amp;';
      case "'":
        return '&apos;';
      case '"':
        return '&quot;';
      default:
        return c;
    }
  });
};

export const BarcodeModal: React.FC<BarcodeModalProps> = ({ product, onClose }) => {
  const masterSvgRef = useRef<SVGSVGElement | null>(null);
  const [barcodeSvgHtml, setBarcodeSvgHtml] = useState<string>('');
  const [layout, setLayout] = useState<LabelLayout>('thermal');
  const [quantity, setQuantity] = useState<number>(1);
  const [showGuides, setShowGuides] = useState<boolean>(true);
  const [activePreviewTab, setActivePreviewTab] = useState<'sticker' | 'sheet'>('sticker');
  const [copied, setCopied] = useState<boolean>(false);
  const [isPrinting, setIsPrinting] = useState<boolean>(false);
  const { notifySuccess, notifyError } = useNotification();

  const barcodeValue =
    (product.barcode && product.barcode.trim()) ||
    product.sku ||
    product.id.slice(0, 10).toUpperCase();

  const formattedPrice = `Rs. ${product.sellingPrice.toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  // Render Barcode via JsBarcode into offscreen master SVG
  useEffect(() => {
    if (masterSvgRef.current && barcodeValue) {
      try {
        while (masterSvgRef.current.firstChild) {
          masterSvgRef.current.removeChild(masterSvgRef.current.firstChild);
        }

        JsBarcode(masterSvgRef.current, barcodeValue, {
          format: 'CODE128',
          lineColor: '#000000',
          width: 1.5,
          height: 38,
          displayValue: true,
          font: 'monospace',
          fontSize: 10.5,
          textMargin: 3,
          margin: 0,
          background: '#ffffff',
        });

        const widthAttr = masterSvgRef.current.getAttribute('width');
        const heightAttr = masterSvgRef.current.getAttribute('height');
        if (widthAttr && heightAttr) {
          masterSvgRef.current.setAttribute('viewBox', `0 0 ${widthAttr} ${heightAttr}`);
        }

        setBarcodeSvgHtml(masterSvgRef.current.outerHTML);
      } catch (err) {
        console.error('JsBarcode rendering error:', err);
        // Fallback: try sanitized alphanumeric
        try {
          const sanitized = barcodeValue.replace(/[^A-Za-z0-9]/g, '');
          if (sanitized && masterSvgRef.current) {
            JsBarcode(masterSvgRef.current, sanitized, {
              format: 'CODE128',
              lineColor: '#000000',
              width: 1.5,
              height: 38,
              displayValue: true,
              font: 'monospace',
              fontSize: 10.5,
              textMargin: 3,
              margin: 0,
              background: '#ffffff',
            });
            setBarcodeSvgHtml(masterSvgRef.current.outerHTML);
          }
        } catch (fallbackErr) {
          console.error('JsBarcode fallback error:', fallbackErr);
        }
      }
    }
  }, [barcodeValue]);

  const handleCopyBarcode = () => {
    navigator.clipboard.writeText(barcodeValue);
    setCopied(true);
    notifySuccess(`Barcode ${barcodeValue} copied to clipboard!`);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleQuantityChange = (val: number) => {
    const clamped = Math.max(1, Math.min(500, val || 1));
    setQuantity(clamped);
  };

  // High-Resolution 300 DPI PNG Download
  const handleDownloadPng = () => {
    if (!masterSvgRef.current) {
      notifyError('Barcode is not ready yet.');
      return;
    }
    const barcodeContent = masterSvgRef.current.innerHTML;

    const labelSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 300" width="1000" height="600">
      <defs>
        <style>
          .bg { fill: #ffffff; }
          .brand { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 20px; font-weight: 800; letter-spacing: 2px; fill: #0b2545; text-anchor: middle; }
          .name { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 21px; font-weight: 700; fill: #000000; text-anchor: middle; }
          .sku { font-family: monospace; font-size: 17px; font-weight: 600; fill: #333333; }
          .price { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 26px; font-weight: 800; fill: #000000; text-anchor: end; }
          .divider { stroke: #000000; stroke-width: 1.5; }
        </style>
      </defs>
      <rect width="500" height="300" class="bg" />
      <text x="250" y="32" class="brand">DANIX.LK</text>
      <text x="250" y="65" class="name">${escapeXml(product.name.length > 34 ? product.name.slice(0, 32) + '...' : product.name)}</text>
      <g transform="translate(40, 78) scale(0.85)">
        ${barcodeContent}
      </g>
      <line x1="20" y1="258" x2="480" y2="258" class="divider" />
      <text x="24" y="284" class="sku">SKU: ${escapeXml(product.sku)}</text>
      <text x="476" y="284" class="price">${formattedPrice}</text>
    </svg>`;

    const blob = new Blob([labelSvg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1000;
      canvas.height = 600;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const pngUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = pngUrl;
        link.download = `barcode-${product.sku}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        notifySuccess('Barcode label downloaded as PNG (300 DPI)');
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      notifyError('Failed to generate PNG image.');
    };
    img.src = url;
  };

  // Scalable Vector SVG Download
  const handleDownloadSvg = () => {
    if (!masterSvgRef.current) {
      notifyError('Barcode is not ready yet.');
      return;
    }
    const barcodeContent = masterSvgRef.current.innerHTML;

    const labelSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 300" width="50mm" height="30mm">
  <defs>
    <style>
      .bg { fill: #ffffff; }
      .brand { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 20px; font-weight: 800; letter-spacing: 2px; fill: #0b2545; text-anchor: middle; }
      .name { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 21px; font-weight: 700; fill: #000000; text-anchor: middle; }
      .sku { font-family: monospace; font-size: 17px; font-weight: 600; fill: #333333; }
      .price { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 26px; font-weight: 800; fill: #000000; text-anchor: end; }
      .divider { stroke: #000000; stroke-width: 1.5; }
    </style>
  </defs>
  <rect width="500" height="300" class="bg" rx="6" />
  <text x="250" y="32" class="brand">DANIX.LK</text>
  <text x="250" y="65" class="name">${escapeXml(product.name.length > 34 ? product.name.slice(0, 32) + '...' : product.name)}</text>
  <g transform="translate(40, 78) scale(0.85)">
    ${barcodeContent}
  </g>
  <line x1="20" y1="258" x2="480" y2="258" class="divider" />
  <text x="24" y="284" class="sku">SKU: ${escapeXml(product.sku)}</text>
  <text x="476" y="284" class="price">${formattedPrice}</text>
</svg>`;

    const blob = new Blob([labelSvg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `barcode-${product.sku}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    notifySuccess('Barcode label downloaded as vector SVG');
  };

  // Popup-Free Direct Printing via Isolated Iframe
  const handlePrint = () => {
    if (!barcodeSvgHtml) {
      notifyError('Barcode is still generating. Please try again.');
      return;
    }

    setIsPrinting(true);

    try {
      let printHtml = '';

      if (layout === 'thermal') {
        const labelsHtml = Array.from({ length: quantity })
          .map(
            () => `
            <div class="label-page">
              <div class="header-brand">DANIX.LK</div>
              <div class="product-title">${escapeHtml(product.name)}</div>
              <div class="barcode-wrapper">
                ${barcodeSvgHtml}
              </div>
              <div class="footer-row">
                <span class="footer-sku">SKU: ${escapeHtml(product.sku)}</span>
                <span class="footer-price">${formattedPrice}</span>
              </div>
            </div>
          `
          )
          .join('');

        printHtml = `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <title>DANIX POS - Print Barcode (${escapeHtml(product.sku)})</title>
              <style>
                @page {
                  size: 50mm 30mm;
                  margin: 0;
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
                  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                }
                .label-page {
                  width: 50mm;
                  height: 30mm;
                  max-width: 50mm;
                  max-height: 30mm;
                  padding: 1.8mm 2.2mm 1.5mm 2.2mm;
                  display: flex;
                  flex-direction: column;
                  justify-content: space-between;
                  align-items: center;
                  text-align: center;
                  overflow: hidden;
                  page-break-after: always;
                  break-after: page;
                  background: #ffffff;
                }
                .label-page:last-child {
                  page-break-after: auto;
                  break-after: auto;
                }
                .header-brand {
                  font-size: 8px;
                  font-weight: 800;
                  letter-spacing: 1.2px;
                  color: #0b2545;
                  text-transform: uppercase;
                  line-height: 1;
                  margin-bottom: 1px;
                }
                .product-title {
                  font-size: 9.5px;
                  font-weight: 700;
                  color: #000000;
                  line-height: 1.15;
                  max-height: 22px;
                  overflow: hidden;
                  display: -webkit-box;
                  -webkit-line-clamp: 2;
                  -webkit-box-orient: vertical;
                  word-break: break-word;
                  width: 100%;
                }
                .barcode-wrapper {
                  width: 100%;
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  margin: 0.5mm 0;
                  overflow: hidden;
                }
                .barcode-wrapper svg {
                  max-width: 100%;
                  height: 14mm;
                  display: block;
                }
                .footer-row {
                  width: 100%;
                  display: flex;
                  justify-content: space-between;
                  align-items: flex-end;
                  line-height: 1;
                  border-top: 0.5px solid #000000;
                  padding-top: 1mm;
                }
                .footer-sku {
                  font-family: "SFMono-Regular", Menlo, Consolas, monospace;
                  font-size: 7.5px;
                  font-weight: 600;
                  color: #222222;
                  white-space: nowrap;
                  overflow: hidden;
                  text-overflow: ellipsis;
                  max-width: 22mm;
                }
                .footer-price {
                  font-size: 10.5px;
                  font-weight: 800;
                  color: #000000;
                  white-space: nowrap;
                }
              </style>
            </head>
            <body>
              ${labelsHtml}
            </body>
          </html>
        `;
      } else {
        // A4 Layout: 3 cols x 8 rows = 24 labels per sheet
        const totalPages = Math.ceil(quantity / 24);
        let pagesHtml = '';
        let remaining = quantity;

        for (let p = 0; p < totalPages; p++) {
          const countThisPage = Math.min(remaining, 24);
          remaining -= countThisPage;

          let cellsHtml = '';
          for (let i = 0; i < countThisPage; i++) {
            cellsHtml += `
              <div class="a4-label">
                <div class="header-brand">DANIX.LK</div>
                <div class="product-title">${escapeHtml(product.name)}</div>
                <div class="barcode-wrapper">
                  ${barcodeSvgHtml}
                </div>
                <div class="footer-row">
                  <span class="footer-sku">SKU: ${escapeHtml(product.sku)}</span>
                  <span class="footer-price">${formattedPrice}</span>
                </div>
              </div>
            `;
          }
          for (let i = countThisPage; i < 24; i++) {
            cellsHtml += `<div class="a4-label a4-label-empty"></div>`;
          }

          pagesHtml += `<div class="a4-page">${cellsHtml}</div>`;
        }

        printHtml = `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <title>DANIX POS - Print A4 Labels (${escapeHtml(product.sku)})</title>
              <style>
                @page {
                  size: A4 portrait;
                  margin: 8mm 6mm;
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
                  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                }
                .a4-page {
                  width: 198mm;
                  height: 281mm;
                  display: grid;
                  grid-template-columns: repeat(3, 1fr);
                  grid-template-rows: repeat(8, 1fr);
                  gap: 2mm 3mm;
                  page-break-after: always;
                  break-after: page;
                  overflow: hidden;
                  box-sizing: border-box;
                }
                .a4-page:last-child {
                  page-break-after: auto;
                  break-after: auto;
                }
                .a4-label {
                  border: ${showGuides ? '1px dashed #94a3b8' : 'none'};
                  border-radius: 3px;
                  padding: 2mm 2.5mm 1.5mm 2.5mm;
                  display: flex;
                  flex-direction: column;
                  justify-content: space-between;
                  align-items: center;
                  text-align: center;
                  background: #ffffff;
                  overflow: hidden;
                  box-sizing: border-box;
                }
                .a4-label-empty {
                  border: ${showGuides ? '1px dashed #e2e8f0' : 'none'};
                  background: transparent;
                }
                .header-brand {
                  font-size: 8.5px;
                  font-weight: 800;
                  letter-spacing: 1.2px;
                  color: #0b2545;
                  text-transform: uppercase;
                  line-height: 1;
                }
                .product-title {
                  font-size: 10px;
                  font-weight: 700;
                  color: #000000;
                  line-height: 1.15;
                  max-height: 24px;
                  overflow: hidden;
                  display: -webkit-box;
                  -webkit-line-clamp: 2;
                  -webkit-box-orient: vertical;
                  word-break: break-word;
                  width: 100%;
                }
                .barcode-wrapper {
                  width: 100%;
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  margin: 1px 0;
                }
                .barcode-wrapper svg {
                  max-width: 100%;
                  height: 15mm;
                  display: block;
                }
                .footer-row {
                  width: 100%;
                  display: flex;
                  justify-content: space-between;
                  align-items: flex-end;
                  line-height: 1;
                  border-top: 0.5px solid #000000;
                  padding-top: 1.5px;
                }
                .footer-sku {
                  font-family: "SFMono-Regular", Menlo, Consolas, monospace;
                  font-size: 8px;
                  font-weight: 600;
                  color: #333333;
                  white-space: nowrap;
                  overflow: hidden;
                  text-overflow: ellipsis;
                  max-width: 30mm;
                }
                .footer-price {
                  font-size: 11px;
                  font-weight: 800;
                  color: #000000;
                  white-space: nowrap;
                }
              </style>
            </head>
            <body>
              ${pagesHtml}
            </body>
          </html>
        `;
      }

      // Hidden iframe printing ensures 100% popup-free instant printing!
      let iframe = document.getElementById('barcode-print-iframe') as HTMLIFrameElement | null;
      if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.id = 'barcode-print-iframe';
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
        setIsPrinting(false);
        try {
          iframe?.contentWindow?.focus();
          iframe?.contentWindow?.print();
          notifySuccess(`Sent ${quantity} label${quantity > 1 ? 's' : ''} to printer`);
        } catch (err) {
          console.error('Iframe print error, falling back to window.print():', err);
          window.print();
        }
      }, 250);
    } catch (error) {
      setIsPrinting(false);
      console.error('Printing error:', error);
      notifyError('Failed to trigger printer. Please try again.');
    }
  };

  const presets = layout === 'thermal' ? [1, 5, 10, 20, 50] : [1, 12, 24, 48, 72];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/75 p-3 sm:p-4 backdrop-blur-sm animate-in fade-in overflow-y-auto">
      {/* Offscreen master SVG used for JsBarcode vector extraction */}
      <svg ref={masterSvgRef} className="absolute -left-[9999px] -top-[9999px]" />

      <div className="relative w-full max-w-4xl my-auto rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[94vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-navy-800 bg-navy-900 px-5 sm:px-6 py-3.5 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500 text-white shadow-sm">
              <Printer className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white">Product Barcode & Labels</h3>
                <span className="text-[10px] font-extrabold uppercase tracking-wide bg-brand-500/20 text-brand-300 border border-brand-500/30 px-2 py-0.5 rounded-full">
                  DANIX.LK
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Thermal roll sticker or A4 multi-label sheet printing
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-300 hover:bg-navy-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Configuration Controls */}
            <div className="lg:col-span-7 space-y-5">
              {/* Product Info Banner */}
              <div className="flex items-start justify-between rounded-xl border border-slate-200 bg-slate-50/80 p-3.5">
                <div className="min-w-0 pr-3">
                  <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-brand-700 bg-brand-50 px-2 py-0.5 rounded-md border border-brand-200">
                    {product.category || 'General'}
                  </span>
                  <h4 className="mt-1 text-sm sm:text-base font-bold text-navy-900 truncate" title={product.name}>
                    {product.name}
                  </h4>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <span>
                      SKU: <strong className="text-slate-800 font-mono">{product.sku}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Retail Price: <strong className="text-navy-900 font-bold">{formattedPrice}</strong>
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCopyBarcode}
                  className="flex items-center gap-1 shrink-0 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-navy-900 transition-colors shadow-2xs"
                  title="Copy barcode number"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              {/* Requirement 1: Label Layout & Sizing Options */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                  1. Label Layout & Printer Sizing
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Thermal Roll Option */}
                  <button
                    type="button"
                    onClick={() => {
                      setLayout('thermal');
                      setActivePreviewTab('sticker');
                    }}
                    className={clsx(
                      'flex flex-col items-start p-3.5 rounded-xl border-2 text-left transition-all',
                      layout === 'thermal'
                        ? 'border-brand-500 bg-brand-50/40 shadow-xs ring-2 ring-brand-500/20'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    )}
                  >
                    <div className="flex items-center justify-between w-full mb-1.5">
                      <div
                        className={clsx(
                          'p-1.5 rounded-lg',
                          layout === 'thermal' ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-600'
                        )}
                      >
                        <Tag className="h-4 w-4" />
                      </div>
                      <span
                        className={clsx(
                          'text-[10px] font-bold px-2 py-0.5 rounded-full uppercase',
                          layout === 'thermal' ? 'bg-brand-100 text-brand-800' : 'bg-slate-100 text-slate-600'
                        )}
                      >
                        50mm × 30mm
                      </span>
                    </div>
                    <div className="font-bold text-xs sm:text-sm text-navy-900">Thermal Roll</div>
                    <div className="text-[11px] text-slate-500 mt-0.5 leading-tight">
                      Standard roll for thermal sticker printers (Xprinter, Zebra, Gprinter)
                    </div>
                  </button>

                  {/* A4 Sticker Sheet Option */}
                  <button
                    type="button"
                    onClick={() => {
                      setLayout('a4');
                      if (quantity === 1) setQuantity(24);
                    }}
                    className={clsx(
                      'flex flex-col items-start p-3.5 rounded-xl border-2 text-left transition-all',
                      layout === 'a4'
                        ? 'border-brand-500 bg-brand-50/40 shadow-xs ring-2 ring-brand-500/20'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    )}
                  >
                    <div className="flex items-center justify-between w-full mb-1.5">
                      <div
                        className={clsx(
                          'p-1.5 rounded-lg',
                          layout === 'a4' ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-600'
                        )}
                      >
                        <Grid className="h-4 w-4" />
                      </div>
                      <span
                        className={clsx(
                          'text-[10px] font-bold px-2 py-0.5 rounded-full uppercase',
                          layout === 'a4' ? 'bg-brand-100 text-brand-800' : 'bg-slate-100 text-slate-600'
                        )}
                      >
                        Grid 3×8 = 24
                      </span>
                    </div>
                    <div className="font-bold text-xs sm:text-sm text-navy-900">A4 Sticker Sheet</div>
                    <div className="text-[11px] text-slate-500 mt-0.5 leading-tight">
                      Standard A4 adhesive label sheets for laser & inkjet printers
                    </div>
                  </button>
                </div>
              </div>

              {/* Requirement 2: Quantity Selector */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    2. Quantity To Print
                  </label>
                  <span className="text-xs text-slate-500">
                    {layout === 'thermal'
                      ? `${quantity} continuous roll label${quantity > 1 ? 's' : ''}`
                      : `${quantity} labels (${Math.ceil(quantity / 24)} A4 sheet${Math.ceil(quantity / 24) > 1 ? 's' : ''})`}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 mb-3">
                  {presets.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setQuantity(preset)}
                      className={clsx(
                        'px-3 py-1.5 text-xs font-semibold rounded-lg transition-all',
                        quantity === preset
                          ? 'bg-navy-900 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      )}
                    >
                      {layout === 'a4' && preset === 24
                        ? '24 (1 Sheet)'
                        : layout === 'a4' && preset === 48
                        ? '48 (2 Sheets)'
                        : `${preset}`}
                    </button>
                  ))}
                </div>

                {/* Stepper & Custom Number Input */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleQuantityChange(quantity - 1)}
                    disabled={quantity <= 1}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 disabled:opacity-40 transition-colors shadow-2xs"
                  >
                    <Minus className="h-4 w-4" />
                  </button>

                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      max="500"
                      value={quantity}
                      onChange={(e) => handleQuantityChange(parseInt(e.target.value, 10) || 1)}
                      className="h-9 w-24 text-center font-bold text-sm text-navy-900 border border-slate-300 rounded-lg px-2 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleQuantityChange(quantity + 1)}
                    disabled={quantity >= 500}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 disabled:opacity-40 transition-colors shadow-2xs"
                  >
                    <Plus className="h-4 w-4" />
                  </button>

                  <span className="text-xs text-slate-500 ml-1">Copies (1 – 500)</span>
                </div>
              </div>

              {/* Extra Print Settings for A4 */}
              {layout === 'a4' && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-slate-800">Print Sheet Guides</span>
                    <p className="text-slate-500 text-[11px]">Dashed helper border for peel-and-cut alignment</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={showGuides}
                    onChange={(e) => setShowGuides(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-brand-500 focus:ring-brand-500"
                  />
                </div>
              )}
            </div>

            {/* Right Column: Live Interactive Print Preview */}
            <div className="lg:col-span-5 flex flex-col items-center">
              <div className="w-full flex items-center justify-between mb-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Live Preview
                </label>
                {layout === 'a4' && (
                  <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setActivePreviewTab('sticker')}
                      className={clsx(
                        'px-2.5 py-0.5 font-semibold rounded-md transition-all',
                        activePreviewTab === 'sticker' ? 'bg-white text-navy-900 shadow-2xs' : 'text-slate-600'
                      )}
                    >
                      Sticker
                    </button>
                    <button
                      type="button"
                      onClick={() => setActivePreviewTab('sheet')}
                      className={clsx(
                        'px-2.5 py-0.5 font-semibold rounded-md transition-all',
                        activePreviewTab === 'sheet' ? 'bg-white text-navy-900 shadow-2xs' : 'text-slate-600'
                      )}
                    >
                      A4 Sheet
                    </button>
                  </div>
                )}
              </div>

              {/* Live Preview Display Card */}
              {layout === 'thermal' || activePreviewTab === 'sticker' ? (
                /* Requirement 3: Professional Label Content Display */
                <div className="w-full flex flex-col items-center justify-center p-4 rounded-xl border border-slate-200 bg-slate-100/70 shadow-inner">
                  {/* Exact 50mm x 30mm Proportional Sticker Card */}
                  <div className="relative w-full max-w-[290px] h-[174px] rounded-lg bg-white border border-slate-300 shadow-md p-3 flex flex-col justify-between select-none">
                    {/* Header: DANIX.LK */}
                    <div className="text-center">
                      <div className="text-[10px] font-black uppercase tracking-[1.5px] text-navy-900">
                        DANIX.LK
                      </div>
                      {/* Product Name (clear, bold) */}
                      <div
                        className="text-[11px] font-bold text-slate-900 leading-tight line-clamp-1 mt-0.5"
                        title={product.name}
                      >
                        {product.name}
                      </div>
                    </div>

                    {/* Barcode rendered cleanly with jsbarcode (Code 128) */}
                    <div className="w-full flex justify-center items-center overflow-hidden my-0.5">
                      {barcodeSvgHtml ? (
                        <div
                          dangerouslySetInnerHTML={{ __html: barcodeSvgHtml }}
                          className="max-w-full flex justify-center [&>svg]:max-w-full [&>svg]:h-[56px]"
                        />
                      ) : (
                        <div className="h-12 w-full flex items-center justify-center text-xs text-slate-400">
                          Generating barcode...
                        </div>
                      )}
                    </div>

                    {/* Bottom: SKU and Retail Price */}
                    <div className="flex items-center justify-between border-t border-slate-900 pt-1 text-xs">
                      <span className="font-mono text-[10px] font-bold text-slate-700 truncate max-w-[120px]">
                        SKU: {product.sku}
                      </span>
                      <span className="font-black text-navy-950 text-xs">
                        {formattedPrice}
                      </span>
                    </div>
                  </div>

                  <div className="mt-2 text-[11px] text-slate-500 font-medium">
                    Actual label: 50mm × 30mm • Code 128
                  </div>
                </div>
              ) : (
                /* A4 Sheet Grid Miniature Preview (3x8 = 24 labels) */
                <div className="w-full flex flex-col items-center justify-center p-3 rounded-xl border border-slate-200 bg-slate-100/70 shadow-inner">
                  <div className="relative w-[210px] h-[297px] rounded bg-white border border-slate-300 shadow-md p-2 flex flex-col">
                    <div className="grid grid-cols-3 grid-rows-8 gap-1 h-full w-full">
                      {Array.from({ length: 24 }).map((_, idx) => {
                        const isFilled = idx < Math.min(quantity, 24);
                        return (
                          <div
                            key={idx}
                            className={clsx(
                              'rounded flex flex-col items-center justify-between p-0.5 text-[6px] overflow-hidden',
                              isFilled
                                ? 'bg-amber-50/50 border border-slate-300'
                                : 'border border-dashed border-slate-200 bg-slate-50/40 opacity-40'
                            )}
                          >
                            {isFilled ? (
                              <>
                                <span className="font-extrabold text-[5.5px] text-navy-900 uppercase">DANIX</span>
                                <div className="w-full h-2 bg-slate-800 rounded-2xs opacity-80" />
                                <span className="font-bold text-[5.5px] text-black">Rs.{Math.round(product.sellingPrice)}</span>
                              </>
                            ) : (
                              <span className="text-[6px] text-slate-300 m-auto">{idx + 1}</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-2 text-[11px] text-slate-600 font-medium text-center">
                    Page 1 of {Math.ceil(quantity / 24)} • {Math.min(quantity, 24)} labels on this sheet
                    {quantity > 24 && ` (+${quantity - 24} on next sheet)`}
                  </div>
                </div>
              )}

              {/* Quick Action Pills Under Preview */}
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadPng}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 hover:text-navy-900 transition-colors shadow-2xs"
                >
                  <Download className="h-3.5 w-3.5 text-slate-500" />
                  <span>PNG</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadSvg}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 hover:text-navy-900 transition-colors shadow-2xs"
                >
                  <Download className="h-3.5 w-3.5 text-slate-500" />
                  <span>SVG</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopyBarcode}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
                >
                  <Copy className="h-3.5 w-3.5 text-slate-500" />
                  <span>{barcodeValue}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer with Primary Print & Download Actions */}
        <div className="border-t border-slate-100 bg-slate-50/90 px-5 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadPng}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-navy-900 transition-colors shadow-2xs"
              title="Download high-resolution 300 DPI label"
            >
              <Download className="h-4 w-4 text-slate-500" />
              <span>Download PNG</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadSvg}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-navy-900 transition-colors shadow-2xs"
              title="Download scalable vector SVG label"
            >
              <Download className="h-4 w-4 text-slate-500" />
              <span>Download SVG</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors shadow-2xs"
            >
              Cancel
            </button>

            {/* Requirement 4: Print Barcode Labels button triggering instant popup-free print */}
            <button
              type="button"
              onClick={handlePrint}
              disabled={isPrinting}
              className="inline-flex items-center gap-2 rounded-xl bg-navy-900 px-5 py-2 text-xs font-bold text-white hover:bg-navy-800 transition-all shadow-sm hover:shadow-md active:scale-[0.99] disabled:opacity-60"
            >
              <Printer className="h-4 w-4 text-brand-400" />
              <span>{isPrinting ? 'Preparing Print...' : `Print Barcode Labels (${quantity})`}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
