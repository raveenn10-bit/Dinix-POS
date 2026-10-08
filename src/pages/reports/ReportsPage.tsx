import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  Download,
  Calendar,
  DollarSign,
  PackageCheck,
  Truck,
  Boxes,
  PieChart,
  RefreshCw,
  FileSpreadsheet,
  AlertTriangle,
  ArrowUpRight,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';
import {
  fetchSalesReport,
  fetchInventoryValuationReport,
  fetchCourierPerformanceReport,
  fetchProfitLossReport,
  fetchLowStockProducts,
  exportToCsv,
  SalesReportSummary,
  InventoryValuation,
  CourierPerformance,
  ProfitLossSummary,
} from '@/lib/dataService';
import { Product } from '@/types';

export const ReportsPage: React.FC = () => {
  const { isAdmin } = useAuth();
  const { notifySuccess } = useNotification();

  const [activeTab, setActiveTab] = useState<'sales' | 'inventory' | 'lowstock' | 'delivery' | 'profit'>('sales');
  const [salesPeriod, setSalesPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [salesReport, setSalesReport] = useState<SalesReportSummary | null>(null);
  const [inventoryReport, setInventoryReport] = useState<InventoryValuation | null>(null);
  const [courierReport, setCourierReport] = useState<CourierPerformance | null>(null);
  const [profitReport, setProfitReport] = useState<ProfitLossSummary | null>(null);
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);

  const loadAllReports = async (force: boolean = false) => {
    setIsLoading(true);
    try {
      const [sales, inv, cour, profit, lowStock] = await Promise.all([
        fetchSalesReport(salesPeriod, force),
        fetchInventoryValuationReport(force),
        fetchCourierPerformanceReport(force),
        fetchProfitLossReport(force),
        fetchLowStockProducts(100, force),
      ]);
      setSalesReport(sales);
      setInventoryReport(inv);
      setCourierReport(cour);
      setProfitReport(profit);
      setLowStockProducts(lowStock);
    } catch (err) {
      console.error('Error loading reports:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllReports(false);
  }, []);

  // When only sales period tab changes, only refresh the sales summary (zero extra reads if cached)
  useEffect(() => {
    let isCurrent = true;
    fetchSalesReport(salesPeriod, false).then((report) => {
      if (isCurrent) setSalesReport(report);
    });
    return () => {
      isCurrent = false;
    };
  }, [salesPeriod]);

  // CSV Export Handlers
  const handleExportSales = () => {
    if (!salesReport) return;
    const headers = ['Timeframe / Date', 'Sales Revenue (Rs.)', 'Total Orders'];
    const rows = salesReport.chartData.map((d) => [d.label, d.revenue, d.orders]);
    exportToCsv(`danix-sales-report-${salesPeriod}`, headers, rows);
    notifySuccess('Sales report exported to CSV successfully!');
  };

  const handleExportInventory = () => {
    if (!inventoryReport) return;
    const headers = ['Product Category', 'Total Stock Qty', 'Total Cost Value (Rs.)', 'Total Retail Value (Rs.)'];
    const rows = inventoryReport.categoryBreakdown.map((c) => [c.category, c.count, c.costVal, c.retailVal]);
    exportToCsv('danix-inventory-valuation-report', headers, rows);
    notifySuccess('Inventory valuation exported to CSV!');
  };

  const handleExportLowStock = () => {
    if (!lowStockProducts.length) return;
    const headers = ['SKU', 'Product Name', 'Category', 'Current Stock', 'Minimum Stock', 'Unit Cost (Rs.)', 'Unit Selling (Rs.)'];
    const rows = lowStockProducts.map((p) => [
      p.sku,
      p.name,
      p.category,
      p.stockQuantity,
      p.minimumStock,
      p.costPrice,
      p.sellingPrice,
    ]);
    exportToCsv('danix-low-stock-alert-report', headers, rows);
    notifySuccess('Low stock report exported to CSV!');
  };

  const handleExportCourier = () => {
    if (!courierReport) return;
    const headers = ['Courier Service', 'Total Dispatched', 'Delivered Successfully', 'Success Rate (%)'];
    const rows = courierReport.courierBreakdown.map((c) => [
      c.courier,
      c.total,
      c.delivered,
      `${c.successRate}%`,
    ]);
    exportToCsv('danix-courier-performance-report', headers, rows);
    notifySuccess('Courier performance report exported to CSV!');
  };

  const handleExportProfit = () => {
    if (!profitReport) return;
    const headers = ['Financial Metric', 'Amount (Rs.)', 'Notes'];
    const rows = [
      ['Total Sales Revenue', profitReport.salesRevenue, 'Paid customer orders'],
      ['Cost of Goods Sold (COGS)', profitReport.costOfGoodsSold, 'Direct product inventory costs'],
      ['Gross Profit', profitReport.grossProfit, 'Sales - COGS'],
      ['Operational Expenses', profitReport.totalExpenses, 'Rent, utilities, packaging, courier deposits'],
      ['Net Profit', profitReport.netProfit, 'Gross Profit - Operational Expenses'],
      ['Net Margin (%)', `${profitReport.netMarginPercent}%`, 'Net Profit / Sales Revenue'],
    ];
    exportToCsv('danix-profit-loss-statement', headers, rows);
    notifySuccess('Profit & Loss statement exported to CSV!');
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Page Title & Global Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1 rounded-full bg-navy-100 px-2.5 py-0.5 text-xs font-semibold text-navy-800">
              <ShieldCheck className="h-3.5 w-3.5 text-brand-500" />
              Executive Financials
            </span>
          </div>
          <h1 className="text-2xl font-bold text-navy-950 sm:text-3xl">
            Reports & Business Insights
          </h1>
          <p className="text-xs text-slate-500">
            Comprehensive sales summaries, stock valuation, courier tracking, and profit margins.
          </p>
        </div>

        <button
          type="button"
          onClick={() => loadAllReports(true)}
          disabled={isLoading}
          className="inline-flex items-center gap-2 self-start sm:self-auto rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Analytics</span>
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex overflow-x-auto border-b border-slate-200 bg-white rounded-xl p-1.5 shadow-sm scrollbar-none gap-1">
        {[
          { id: 'sales', label: 'Sales Summaries', icon: TrendingUp },
          { id: 'inventory', label: 'Inventory Valuation', icon: Boxes },
          { id: 'lowstock', label: 'Low Stock Alert', icon: AlertTriangle },
          { id: 'delivery', label: 'Courier Performance', icon: Truck },
          { id: 'profit', label: 'Profit & Loss', icon: DollarSign },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: SALES SUMMARIES */}
      {activeTab === 'sales' && salesReport && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Timeframe:
              </span>
              <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
                {(['daily', 'weekly', 'monthly'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setSalesPeriod(p)}
                    className={`rounded-md px-3 py-1 text-xs font-bold capitalize transition-all ${
                      salesPeriod === p
                        ? 'bg-white text-brand-600 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={handleExportSales}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition-colors"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>Export CSV</span>
            </button>
          </div>

          {/* Metric Highlights */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <span className="text-xs font-semibold uppercase text-slate-500">Total Period Revenue</span>
              <p className="mt-2 text-2xl font-extrabold text-navy-950">
                Rs. {salesReport.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
              <p className="mt-1 text-xs text-slate-500">From paid customer invoices</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <span className="text-xs font-semibold uppercase text-slate-500">Total Order Volume</span>
              <p className="mt-2 text-2xl font-extrabold text-slate-900">
                {salesReport.totalOrders} Orders
              </p>
              <p className="mt-1 text-xs text-emerald-600">
                {salesReport.paidOrdersCount} Paid • {salesReport.unpaidOrdersCount} Pending
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <span className="text-xs font-semibold uppercase text-slate-500">Average Order Value</span>
              <p className="mt-2 text-2xl font-extrabold text-brand-600">
                Rs. {salesReport.averageOrderValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
              <p className="mt-1 text-xs text-slate-500">Revenue per transaction</p>
            </div>
          </div>

          {/* Data Breakdown Table */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-slate-100 px-6 py-4">
              <h3 className="font-bold text-sm text-navy-950">Detailed Sales Chronology</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-3">Timeframe / Date</th>
                    <th className="px-6 py-3">Revenue (Rs.)</th>
                    <th className="px-6 py-3">Orders Count</th>
                    <th className="px-6 py-3">Sales Proportion</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {salesReport.chartData.map((row, idx) => {
                    const pct = salesReport.totalRevenue > 0 ? (row.revenue / salesReport.totalRevenue) * 100 : 0;
                    return (
                      <tr key={idx} className="hover:bg-slate-50/70">
                        <td className="px-6 py-3.5 font-semibold text-slate-900">{row.label}</td>
                        <td className="px-6 py-3.5 font-bold text-navy-950">
                          Rs. {row.revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-3.5 text-slate-600">{row.orders} orders</td>
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-28 rounded-full bg-slate-100 overflow-hidden">
                              <div className="h-full bg-brand-500 rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-slate-500 font-mono text-[11px]">
                              {Math.round(pct)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: INVENTORY VALUATION */}
      {activeTab === 'inventory' && inventoryReport && (
        <div className="space-y-6">
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div>
              <h3 className="font-bold text-sm text-navy-950">Stock Valuation & Margin Analysis</h3>
              <p className="text-xs text-slate-500">Warehouse cost basis vs potential retail yield</p>
            </div>
            <button
              type="button"
              onClick={handleExportInventory}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition-colors"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>Export CSV</span>
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <span className="text-xs font-semibold uppercase text-slate-500">Warehouse Cost Basis</span>
              <p className="mt-2 text-2xl font-extrabold text-slate-900">
                Rs. {inventoryReport.totalCostValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
              <p className="mt-1 text-xs text-slate-500">Purchase cost of current stock</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <span className="text-xs font-semibold uppercase text-slate-500">Retail Realization Value</span>
              <p className="mt-2 text-2xl font-extrabold text-navy-950">
                Rs. {inventoryReport.totalRetailValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
              <p className="mt-1 text-xs text-slate-500">Projected customer selling price</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <span className="text-xs font-semibold uppercase text-slate-500">Projected Margin</span>
              <p className="mt-2 text-2xl font-extrabold text-emerald-600">
                Rs. {inventoryReport.projectedGrossProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
              <p className="mt-1 text-xs text-emerald-600 font-semibold">
                {inventoryReport.projectedMarginPercent}% Gross Margin
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <span className="text-xs font-semibold uppercase text-slate-500">Total Units In Stock</span>
              <p className="mt-2 text-2xl font-extrabold text-brand-600">
                {inventoryReport.totalItemsCount.toLocaleString()} Units
              </p>
              <p className="mt-1 text-xs text-slate-500">Across all catalog lines</p>
            </div>
          </div>

          {/* Category Breakdown Table */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-slate-100 px-6 py-4">
              <h3 className="font-bold text-sm text-navy-950">Category Valuation Breakdown</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-3">Category</th>
                    <th className="px-6 py-3">Total Quantity</th>
                    <th className="px-6 py-3">Cost Value (Rs.)</th>
                    <th className="px-6 py-3">Retail Value (Rs.)</th>
                    <th className="px-6 py-3">Estimated Margin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {inventoryReport.categoryBreakdown.map((cat, idx) => {
                    const margin = cat.retailVal - cat.costVal;
                    const marginPct = cat.retailVal > 0 ? Math.round((margin / cat.retailVal) * 100) : 0;
                    return (
                      <tr key={idx} className="hover:bg-slate-50/70">
                        <td className="px-6 py-3.5 font-bold text-slate-900">{cat.category}</td>
                        <td className="px-6 py-3.5 font-medium text-slate-700">{cat.count} units</td>
                        <td className="px-6 py-3.5 text-slate-600">
                          Rs. {cat.costVal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-3.5 font-bold text-navy-950">
                          Rs. {cat.retailVal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-3.5 font-semibold text-emerald-600">
                          Rs. {margin.toLocaleString('en-US', { minimumFractionDigits: 2 })} ({marginPct}%)
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: LOW STOCK REPORT */}
      {activeTab === 'lowstock' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div>
              <h3 className="font-bold text-sm text-navy-950">Low Stock & Reorder Report</h3>
              <p className="text-xs text-slate-500">Products currently at or below minimum safety stock</p>
            </div>
            <button
              type="button"
              onClick={handleExportLowStock}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition-colors"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>Export CSV</span>
            </button>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-3">SKU</th>
                    <th className="px-6 py-3">Product Name</th>
                    <th className="px-6 py-3">Category</th>
                    <th className="px-6 py-3">Current Stock</th>
                    <th className="px-6 py-3">Min. Stock</th>
                    <th className="px-6 py-3">Cost Price (Rs.)</th>
                    <th className="px-6 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lowStockProducts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                        No low stock items! All items are adequately replenished.
                      </td>
                    </tr>
                  ) : (
                    lowStockProducts.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/70">
                        <td className="px-6 py-3.5 font-mono text-slate-500">{p.sku}</td>
                        <td className="px-6 py-3.5 font-bold text-slate-900">{p.name}</td>
                        <td className="px-6 py-3.5 text-slate-600">{p.category}</td>
                        <td className="px-6 py-3.5 font-extrabold text-rose-600">{p.stockQuantity}</td>
                        <td className="px-6 py-3.5 text-slate-500">{p.minimumStock}</td>
                        <td className="px-6 py-3.5 text-slate-700">Rs. {p.costPrice.toLocaleString()}</td>
                        <td className="px-6 py-3.5">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                            p.stockQuantity === 0
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}>
                            {p.stockQuantity === 0 ? 'Out of Stock' : 'Low Stock'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: COURIER PERFORMANCE */}
      {activeTab === 'delivery' && courierReport && (
        <div className="space-y-6">
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div>
              <h3 className="font-bold text-sm text-navy-950">Courier & Delivery Operations</h3>
              <p className="text-xs text-slate-500">Tracking success rates and courier partner efficiency</p>
            </div>
            <button
              type="button"
              onClick={handleExportCourier}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition-colors"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>Export CSV</span>
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <span className="text-xs font-semibold uppercase text-slate-500">Total Parcels Dispatched</span>
              <p className="mt-2 text-2xl font-extrabold text-slate-900">{courierReport.totalDeliveries}</p>
              <p className="mt-1 text-xs text-slate-500">Overall logistics workload</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <span className="text-xs font-semibold uppercase text-slate-500">Delivered Successfully</span>
              <p className="mt-2 text-2xl font-extrabold text-emerald-600">{courierReport.deliveredCount}</p>
              <p className="mt-1 text-xs text-emerald-700">Signed and confirmed</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <span className="text-xs font-semibold uppercase text-slate-500">In Transit / Pending</span>
              <p className="mt-2 text-2xl font-extrabold text-purple-600">{courierReport.pendingCount}</p>
              <p className="mt-1 text-xs text-purple-700">Currently out for delivery</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <span className="text-xs font-semibold uppercase text-slate-500">Overall Success Rate</span>
              <p className="mt-2 text-2xl font-extrabold text-brand-600">{courierReport.successRate}%</p>
              <p className="mt-1 text-xs text-slate-500">Delivery fulfillment metric</p>
            </div>
          </div>

          {/* Courier Breakdown Table */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-slate-100 px-6 py-4">
              <h3 className="font-bold text-sm text-navy-950">Courier Partner Breakdown</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-3">Courier Partner</th>
                    <th className="px-6 py-3">Total Assigned</th>
                    <th className="px-6 py-3">Delivered</th>
                    <th className="px-6 py-3">Success Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {courierReport.courierBreakdown.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70">
                      <td className="px-6 py-3.5 font-bold text-slate-900">{row.courier}</td>
                      <td className="px-6 py-3.5 text-slate-600">{row.total} parcels</td>
                      <td className="px-6 py-3.5 font-semibold text-emerald-600">{row.delivered} delivered</td>
                      <td className="px-6 py-3.5">
                        <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700">
                          {row.successRate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: PROFIT & LOSS */}
      {activeTab === 'profit' && profitReport && (
        <div className="space-y-6">
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div>
              <h3 className="font-bold text-sm text-navy-950">Profit & Loss (P&L) Statement</h3>
              <p className="text-xs text-slate-500">
                Sales Revenue - Cost of Goods Sold (COGS) - Operational Expenses = Net Profit
              </p>
            </div>
            <button
              type="button"
              onClick={handleExportProfit}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition-colors"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>Export CSV</span>
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <span className="text-xs font-semibold uppercase text-slate-500">Sales Revenue</span>
              <p className="mt-2 text-2xl font-extrabold text-navy-950">
                Rs. {profitReport.salesRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
              <p className="mt-1 text-xs text-slate-500">Gross sales inflow</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <span className="text-xs font-semibold uppercase text-slate-500">Gross Profit (After COGS)</span>
              <p className="mt-2 text-2xl font-extrabold text-emerald-600">
                Rs. {profitReport.grossProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                COGS: Rs. {profitReport.costOfGoodsSold.toLocaleString()}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <span className="text-xs font-semibold uppercase text-slate-500">Net Profit</span>
              <p className={`mt-2 text-2xl font-extrabold ${profitReport.netProfit >= 0 ? 'text-brand-600' : 'text-rose-600'}`}>
                Rs. {profitReport.netProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-600">
                {profitReport.netMarginPercent}% Net Margin
              </p>
            </div>
          </div>

          {/* Operational Expenses Breakdown */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-slate-100 px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-navy-950">Operational Expenses Breakdown</h3>
                <p className="text-xs text-slate-500">
                  Total Operational Overhead: Rs. {profitReport.totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-3">Expense Category</th>
                    <th className="px-6 py-3">Total Amount (Rs.)</th>
                    <th className="px-6 py-3">% of Operational Expenses</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {profitReport.expenseCategoryBreakdown.map((exp, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70">
                      <td className="px-6 py-3.5 font-bold text-slate-900">{exp.category}</td>
                      <td className="px-6 py-3.5 font-semibold text-navy-950">
                        Rs. {exp.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-28 rounded-full bg-slate-100 overflow-hidden">
                            <div className="h-full bg-navy-800 rounded-full" style={{ width: `${exp.percentage}%` }} />
                          </div>
                          <span className="text-slate-500 font-mono text-[11px]">{exp.percentage}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
