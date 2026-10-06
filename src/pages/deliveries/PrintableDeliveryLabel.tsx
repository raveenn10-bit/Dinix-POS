import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import { Delivery } from '@/types';

interface PrintableDeliveryLabelProps {
  delivery: Delivery;
  id?: string;
  size?: '4x6' | 'a4';
  labelIndex?: number;
  totalLabels?: number;
}

export const PrintableDeliveryLabel: React.FC<PrintableDeliveryLabelProps> = ({
  delivery,
  id = 'danix-delivery-label',
  size = '4x6',
  labelIndex = 1,
  totalLabels = 1,
}) => {
  const barcodeRef = useRef<SVGSVGElement | null>(null);

  const trackingVal = delivery.trackingNumber || `DNX-${delivery.orderNumber || delivery.id}`;

  useEffect(() => {
    if (barcodeRef.current && trackingVal) {
      try {
        JsBarcode(barcodeRef.current, trackingVal, {
          format: 'CODE128',
          width: size === '4x6' ? 2.1 : 1.8,
          height: size === '4x6' ? 52 : 44,
          displayValue: true,
          font: 'monospace',
          fontSize: 14,
          fontOptions: 'bold',
          textMargin: 3,
          margin: 0,
        });
      } catch (err) {
        console.error('JsBarcode rendering error:', err);
      }
    }
  }, [trackingVal, size]);

  const isCod = Boolean(
    (delivery.serviceType && delivery.serviceType.toUpperCase() === 'COD') ||
      (delivery.codAmount && delivery.codAmount > 0)
  );

  const codAmount = delivery.codAmount || 0;

  return (
    <div
      id={id}
      className={`bg-white text-black font-sans select-text border-2 border-black p-4 box-border relative mx-auto print:border-2 print:border-black ${
        size === '4x6'
          ? 'w-[100mm] min-h-[150mm] max-w-[100mm]'
          : 'w-full max-w-[190mm] min-h-[130mm]'
      }`}
      style={{
        boxSizing: 'border-box',
        backgroundColor: '#ffffff',
        color: '#000000',
      }}
    >
      {/* 1. TOP HEADER: DANIX EXPRESS DISPATCH & COURIER BADGE */}
      <div className="flex items-center justify-between border-b-2 border-black pb-2.5">
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 shrink-0 border border-black bg-white p-0.5 overflow-hidden">
            <img
              src="/logo.jpg"
              alt="Danix Logo"
              className="h-full w-full object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-tight leading-none uppercase">
              DANIX.LK
            </h1>
            <p className="text-[10px] font-extrabold tracking-widest text-black uppercase mt-0.5">
              EXPRESS DISPATCH
            </p>
          </div>
        </div>

        {/* Right: Courier Partner & Package Index */}
        <div className="text-right">
          <div className="inline-block bg-black text-white px-2.5 py-1 text-xs font-black uppercase tracking-wider">
            {delivery.courier || 'EXPRESS COURIER'}
          </div>
          <div className="text-[9px] font-bold text-black mt-0.5 font-mono">
            PKG {labelIndex} / {totalLabels}
          </div>
        </div>
      </div>

      {/* 2. BARCODE & TRACKING NUMBER (HIGH CONTRAST) */}
      <div className="py-2.5 border-b-2 border-black flex flex-col items-center justify-center bg-white">
        <svg
          ref={barcodeRef}
          className="w-full max-w-[95%] h-auto overflow-visible"
        />
        <div className="flex justify-between w-full px-1 text-[10px] font-bold font-mono text-black mt-1">
          <span>ORD: {delivery.orderNumber || delivery.orderId}</span>
          <span>DATE: {new Date(delivery.createdAt).toLocaleDateString('en-GB')}</span>
        </div>
      </div>

      {/* 3. RECIPIENT INFORMATION (BIG & BOLD FOR COURIER RIDERS) */}
      <div className="py-2.5 border-b-2 border-black">
        <div className="flex items-center justify-between mb-1">
          <span className="bg-black text-white px-2 py-0.5 text-[9px] font-black uppercase tracking-wider">
            DELIVER TO (RECIPIENT)
          </span>
          {delivery.city && (
            <span className="text-xs font-black uppercase tracking-wide border-2 border-black px-2 py-0.5">
              {delivery.city}
            </span>
          )}
        </div>

        {/* Recipient Name */}
        <h2 className="text-base font-black text-black tracking-tight leading-tight uppercase">
          {delivery.customerName}
        </h2>

        {/* Contact Numbers (Prominent) */}
        <div className="my-1.5 flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1 font-mono font-black text-sm bg-slate-100 px-2 py-0.5 border border-black">
            <span>TEL 1:</span>
            <span>{delivery.phone}</span>
          </div>

          {delivery.phone2 && (
            <div className="flex items-center gap-1 font-mono font-bold text-xs bg-slate-50 px-2 py-0.5 border border-black">
              <span>TEL 2:</span>
              <span>{delivery.phone2}</span>
            </div>
          )}
        </div>

        {/* Full Delivery Address */}
        <p className="text-xs font-bold text-black whitespace-pre-line leading-snug mt-1">
          {delivery.address}
        </p>
      </div>

      {/* 4. COD AMOUNT BOX (MOST CRITICAL FOR COURIER DRIVERS) */}
      <div className="my-2.5">
        {isCod && codAmount > 0 ? (
          <div className="border-4 border-black p-2 bg-yellow-300 text-black text-center print:bg-yellow-300">
            <span className="text-[10px] font-black uppercase tracking-wider block">
              ⚠️ CASH ON DELIVERY (C.O.D.)
            </span>
            <div className="text-xl font-black font-mono tracking-tight mt-0.5">
              CASH TO COLLECT: Rs. {codAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[9px] font-bold uppercase tracking-wider block mt-0.5">
              DO NOT HANDOVER WITHOUT COLLECTING FULL CASH
            </span>
          </div>
        ) : (
          <div className="border-3 border-black p-2 bg-slate-100 text-black text-center">
            <span className="text-[10px] font-black uppercase tracking-wider block">
              ✓ PREPAID ORDER
            </span>
            <div className="text-base font-black font-mono tracking-tight mt-0.5">
              PAID - NO CASH COLLECTION
            </div>
            <span className="text-[9px] font-bold uppercase block mt-0.5">
              DIRECT HANDOVER TO RECIPIENT
            </span>
          </div>
        )}
      </div>

      {/* 5. NOTES & INSTRUCTIONS (IF ANY) */}
      {delivery.notes && (
        <div className="border border-black p-1.5 text-[10px] mb-2 leading-tight bg-slate-50">
          <span className="font-black uppercase">Courier Notes: </span>
          <span className="font-semibold">{delivery.notes}</span>
        </div>
      )}

      {/* 6. RETURN ADDRESS / SENDER INFO (FOOTER) */}
      <div className="border-t-2 border-black pt-2 mt-auto">
        <div className="flex justify-between items-end text-[9px] font-bold text-black leading-tight">
          <div>
            <p className="font-black uppercase tracking-wider text-[10px]">
              RETURN TO SENDER:
            </p>
            <p className="font-extrabold">DANIX LANKA EXPRESS DISPATCH</p>
            <p>Akmeemana, Galle, Sri Lanka 80054</p>
            <p>
              Dispatch Hotline: <span className="font-black font-mono">076 252 4671</span>
            </p>
          </div>

          {/* Verification Code */}
          <div className="text-right font-mono text-[9px]">
            <p>TRACKING ID</p>
            <p className="font-black text-[10px]">{trackingVal}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
