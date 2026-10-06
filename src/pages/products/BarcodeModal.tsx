import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import { X, Printer, Copy, Check, Download } from 'lucide-react';
import { Product } from '@/types';
import { useNotification } from '@/context/NotificationContext';

interface BarcodeModalProps {
  product: Product;
  onClose: () => void;
}

export const BarcodeModal: React.FC<BarcodeModalProps> = ({ product, onClose }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [copied, setCopied] = React.useState(false);
  const { notifySuccess, notifyError } = useNotification();

  const barcodeValue = product.barcode || product.sku;

  useEffect(() => {
    if (svgRef.current && barcodeValue) {
      try {
        JsBarcode(svgRef.current, barcodeValue, {
          format: 'CODE128',
          lineColor: '#0b2545',
          width: 2,
          height: 70,
          displayValue: true,
          font: 'JetBrains Mono',
          fontSize: 14,
          textMargin: 6,
          background: '#ffffff',
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
    const printWindow = window.open('', '_blank', 'width=500,height=400');
    if (!printWindow) {
      notifyError('Popup blocked! Please allow popups to print barcode.');
      return;
    }

    const svgHtml = svgRef.current ? svgRef.current.outerHTML : '';

    printWindow.document.write(`
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
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              padding: 8px;
              margin: 0;
              text-align: center;
            }
            .brand {
              font-size: 10px;
              font-weight: 800;
              letter-spacing: 1px;
              color: #f36f21;
              text-transform: uppercase;
              margin-bottom: 2px;
            }
            .name {
              font-size: 11px;
              font-weight: 700;
              color: #0b2545;
              max-width: 180px;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              margin-bottom: 4px;
            }
            .price {
              font-size: 12px;
              font-weight: 800;
              color: #000;
              margin-top: 4px;
            }
            svg {
              max-width: 100%;
              height: auto;
            }
          </style>
        </head>
        <body>
          <div class="brand">DANIX POS</div>
          <div class="name">${product.name}</div>
          ${svgHtml}
          <div class="price">Rs. ${product.sellingPrice.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
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
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-navy-900 px-6 py-4 text-white">
          <div>
            <h3 className="text-base font-bold text-white">Product Barcode</h3>
            <p className="text-xs text-slate-300">Scan label for inventory & POS</p>
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
        <div className="p-6 text-center">
          <div className="mb-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-brand-600 bg-brand-50 px-2.5 py-1 rounded-full border border-brand-200">
              {product.category}
            </span>
            <h4 className="mt-2 text-base font-bold text-navy-900 line-clamp-2">
              {product.name}
            </h4>
            <p className="text-xs text-slate-500 font-mono mt-1">
              SKU: <span className="font-semibold text-slate-700">{product.sku}</span>
            </p>
          </div>

          {/* Barcode Render Card */}
          <div className="mx-auto flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-4 shadow-inner">
            <div className="w-full flex justify-center">
              <svg ref={svgRef} className="max-w-full h-auto" />
            </div>
            <div className="mt-2 flex items-center justify-between w-full px-4 border-t border-slate-100 pt-2 text-xs">
              <span className="text-slate-500">Retail Price:</span>
              <span className="font-bold text-navy-900 text-sm">
                Rs. {product.sellingPrice.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex flex-wrap gap-2 justify-center">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-xl bg-navy-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-navy-800 transition-colors shadow-sm"
            >
              <Printer className="h-4 w-4" />
              <span>Print Sticker</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
            >
              <Download className="h-4 w-4" />
              <span>Save SVG</span>
            </button>

            <button
              type="button"
              onClick={handleCopyBarcode}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
              <span>{copied ? 'Copied!' : 'Copy Code'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
