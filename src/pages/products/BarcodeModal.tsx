import React, { useEffect, useRef, useState } from 'react';
import JsBarcode from 'jsbarcode';
import { X, Printer, Copy, Check, Download, Layers, Sparkles } from 'lucide-react';
import { Product } from '@/types';
import { useNotification } from '@/context/NotificationContext';

interface BarcodeModalProps {
  product: Product;
  onClose: () => void;
}

export const BarcodeModal: React.FC<BarcodeModalProps> = ({ product, onClose }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [copied, setCopied] = useState(false);
  const [printLayout, setPrintLayout] = useState<'thermal' | 'a4'>('thermal');
  const [labelCount, setLabelCount] = useState<number>(1);
  const { notifySuccess, notifyError } = useNotification();

  const barcodeValue = product.barcode || product.sku;

  useEffect(() => {
    if (svgRef.current && barcodeValue) {
      try {
        JsBarcode(svgRef.current, barcodeValue, {
          format: 'CODE128',
          lineColor: '#000000',
          width: 1.8,
          height: 55,
          displayValue: true,
          font: 'JetBrains Mono',
          fontSize: 13,
          textMargin: 4,
          background: '#ffffff',
          margin: 4,
        });
      } catch (err) {
        console.error('JsBarcode rendering error:', err);
      }
    }
  }, [barcodeValue]);

  const handleCopyBarcode = () => {
    navigator.clipboard.writeText(barcodeValue);
    setCopied(true);
    notifySuccess(`Barcode ${barcodeValue} copied to clipboard!`);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = '0';
    document.body.appendChild(printFrame);

    const frameDoc = printFrame.contentWindow?.document;
    if (!frameDoc) {
      notifyError('Failed to initialize print engine.');
      return;
    }

    const svgHtml = svgRef.current ? svgRef.current.outerHTML : '';
    const formattedPrice = `Rs. ${product.sellingPrice.toLocaleString('en-LK', { minimumFractionDigits: 2 })}`;

    let contentHtml = '';

    if (printLayout === 'thermal') {
      // Thermal Roll (50mm x 30mm)
      let labelsHtml = '';
      for (let i = 0; i < labelCount; i++) {
        labelsHtml += `
          <div class="thermal-label">
            <div class="brand">DANIX.LK</div>
            <div class="name">${product.name}</div>
            <div class="barcode-wrap">${svgHtml}</div>
            <div class="price-sku">
              <span class="sku">${product.sku}</span>
              <span class="price">${formattedPrice}</span>
            </div>
          </div>
        `;
      }
      contentHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Print Barcode - ${product.sku}</title>
            <style>
              @page {
                size: 50mm 30mm;
                margin: 0;
              }
              body {
                margin: 0;
                padding: 0;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                background: #fff;
              }
              .thermal-label {
                width: 48mm;
                height: 28mm;
                box-sizing: border-box;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: space-between;
                padding: 1.5mm;
                page-break-after: always;
                text-align: center;
                overflow: hidden;
              }
              .brand {
                font-size: 7.5pt;
                font-weight: 800;
                color: #f36f21;
                letter-spacing: 0.5px;
                line-height: 1;
              }
              .name {
                font-size: 7pt;
                font-weight: 700;
                color: #000;
                max-width: 46mm;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                line-height: 1.1;
                margin-top: 0.5mm;
              }
              .barcode-wrap svg {
                max-width: 44mm;
                height: 14mm !important;
              }
              .price-sku {
                display: flex;
                justify-content: space-between;
                width: 100%;
                font-size: 7pt;
                line-height: 1;
                padding: 0 1mm;
              }
              .sku {
                font-family: monospace;
                color: #444;
              }
              .price {
                font-weight: 800;
                color: #000;
              }
            </style>
          </head>
          <body>${labelsHtml}</body>
        </html>
      `;
    } else {
      // A4 Sticker Sheet (Grid 3 columns x 8 rows = 24 labels per sheet)
      let labelsHtml = '';
      for (let i = 0; i < labelCount; i++) {
        labelsHtml += `
          <div class="a4-label">
            <div class="brand">DANIX.LK</div>
            <div class="name">${product.name}</div>
            <div class="barcode-wrap">${svgHtml}</div>
            <div class="price-sku">
              <span class="sku">${product.sku}</span>
              <span class="price">${formattedPrice}</span>
            </div>
          </div>
        `;
      }
      contentHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>A4 Barcode Sheet - ${product.sku}</title>
            <style>
              @page {
                size: A4 portrait;
                margin: 8mm 6mm;
              }
              body {
                margin: 0;
                padding: 0;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                background: #fff;
              }
              .sheet-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 3mm;
                width: 100%;
              }
              .a4-label {
                height: 33mm;
                border: 1px dashed #e2e8f0;
                box-sizing: border-box;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: space-between;
                padding: 2mm 3mm;
                text-align: center;
                overflow: hidden;
              }
              .brand {
                font-size: 8pt;
                font-weight: 800;
                color: #f36f21;
                letter-spacing: 0.5px;
                line-height: 1;
              }
              .name {
                font-size: 7.5pt;
                font-weight: 700;
                color: #000;
                max-width: 60mm;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                line-height: 1.1;
                margin-top: 1mm;
              }
              .barcode-wrap svg {
                max-width: 58mm;
                height: 16mm !important;
              }
              .price-sku {
                display: flex;
                justify-content: space-between;
                width: 100%;
                font-size: 8pt;
                line-height: 1;
                border-top: 1px solid #f1f5f9;
                padding-top: 1mm;
              }
              .sku {
                font-family: monospace;
                color: #475569;
              }
              .price {
                font-weight: 800;
                color: #000;
              }
            </style>
          </head>
          <body>
            <div class="sheet-grid">${labelsHtml}</div>
          </body>
        </html>
      `;
    }

    frameDoc.open();
    frameDoc.write(contentHtml);
    frameDoc.close();

    setTimeout(() => {
      printFrame.contentWindow?.focus();
      printFrame.contentWindow?.print();
      setTimeout(() => {
        document.body.removeChild(printFrame);
      }, 1000);
    }, 400);
  };

  const handleDownload = () => {
    if (!svgRef.current) return;
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);
    const downloadLink = document.createElement('a');
    downloadLink.href = svgUrl;
    downloadLink.download = `barcode-${product.sku}.svg`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(svgUrl);
    notifySuccess('Barcode downloaded as SVG');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/70 p-4 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-navy-900 px-6 py-4 text-white">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500 text-white shadow-md">
              <Printer className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Product Barcode Label Printer</h3>
              <p className="text-xs text-slate-300">Generate, customize & print barcodes</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-300 hover:bg-navy-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Product details */}
          <div className="flex items-start justify-between bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-brand-600 bg-brand-50 px-2 py-0.5 rounded border border-brand-200">
                {product.category}
              </span>
              <h4 className="mt-1 text-sm font-bold text-navy-900">
                {product.name}
              </h4>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                SKU: <span className="font-semibold text-slate-800">{product.sku}</span>
              </p>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-slate-400 block">Retail Price</span>
              <span className="text-base font-extrabold text-navy-950">
                Rs. {product.sellingPrice.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Barcode Render Preview */}
          <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <span className="text-[10px] font-bold text-brand-600 uppercase tracking-widest mb-1">
              DANIX.LK
            </span>
            <div className="w-full flex justify-center py-1">
              <svg ref={svgRef} className="max-w-full h-auto" />
            </div>
            <div className="flex items-center justify-between w-full px-2 pt-2 border-t border-slate-100 text-xs text-slate-600 font-mono">
              <span>{product.sku}</span>
              <span className="font-bold text-slate-900">
                Rs. {product.sellingPrice.toLocaleString('en-LK')}
              </span>
            </div>
          </div>

          {/* Print Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Layout selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Paper / Printer Layout
              </label>
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs">
                <button
                  type="button"
                  onClick={() => setPrintLayout('thermal')}
                  className={`py-1.5 px-2 rounded-lg font-semibold transition-all text-center ${
                    printLayout === 'thermal'
                      ? 'bg-white text-navy-950 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Thermal (50x30mm)
                </button>
                <button
                  type="button"
                  onClick={() => setPrintLayout('a4')}
                  className={`py-1.5 px-2 rounded-lg font-semibold transition-all text-center ${
                    printLayout === 'a4'
                      ? 'bg-white text-navy-950 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  A4 Sheet (Grid)
                </button>
              </div>
            </div>

            {/* Copies selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Quantity of Labels
              </label>
              <div className="flex items-center gap-1.5">
                {[1, 5, 10, 24].map((cnt) => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => setLabelCount(cnt)}
                    className={`flex-1 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                      labelCount === cnt
                        ? 'bg-navy-900 text-white border-navy-900 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {cnt}
                  </button>
                ))}
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={labelCount}
                  onChange={(e) => setLabelCount(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-16 rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-center font-bold text-slate-900 focus:border-brand-500 focus:outline-none"
                  title="Custom copies"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={handlePrint}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-5 py-3 text-xs font-bold text-white hover:bg-brand-600 transition-colors shadow-lg shadow-brand-500/25"
            >
              <Printer className="h-4 w-4" />
              <span>Print {labelCount} {labelCount === 1 ? 'Label' : 'Labels'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
            >
              <Download className="h-4 w-4" />
              <span>SVG</span>
            </button>

            <button
              type="button"
              onClick={handleCopyBarcode}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
