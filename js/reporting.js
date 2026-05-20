// ============================================
// REPORTING MODULE
// Handles reports, exports, and reconciliation
// ============================================

const ReportingManager = (function() {
  'use strict';

  /**
   * Generate daily reconciliation report
   * @param {Object} daily - Daily data object
   * @returns {Object} Reconciliation report
   */
  function generateDailyReconciliation(daily) {
    const openingCash = parseFloat(daily.openingCash) || 0;
    const sales = daily.sales || { total: 0 };
    const collections = daily.collections || [];
    const creditSales = daily.creditSales || [];
    const expenses = daily.expenses || [];
    const deposits = daily.deposits || [];

    const totalCollections = collections.reduce((s, c) => s + c.amount, 0);
    const totalCredits = creditSales.reduce((s, c) => s + c.amount, 0);
    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
    const totalDeposits = deposits.reduce((s, d) => s + d.amount, 0);

    const inflows = sales.total + totalCollections;
    const outflows = totalCredits + totalExpenses + totalDeposits;
    const netChange = inflows - outflows;
    const closingCash = openingCash + netChange;

    return {
      openingCash: openingCash,
      sales: sales.total,
      collections: totalCollections,
      creditSales: totalCredits,
      expenses: totalExpenses,
      deposits: totalDeposits,
      inflows: inflows,
      outflows: outflows,
      netChange: netChange,
      closingCash: closingCash,
      isBalanced: closingCash >= 0,
      status: closingCash < 0 ? '⚠️ Negative' : '✅ Balanced'
    };
  }

  /**
   * Generate day book report
   * @param {Array} postedDays - Posted days array
   * @param {string} startDate - Start date
   * @param {string} endDate - End date
   * @returns {Object} Day book data
   */
  function generateDayBook(postedDays, startDate, endDate) {
    const days = postedDays
      .filter(d => d.date >= startDate && d.date <= endDate)
      .sort((a, b) => a.date.localeCompare(b.date));

    const summary = {
      startDate: startDate,
      endDate: endDate,
      totalDays: days.length,
      days: days,
      totals: {
        sales: 0,
        collections: 0,
        creditSales: 0,
        expenses: 0,
        deposits: 0,
        withdrawals: 0,
        charges: 0
      }
    };

    days.forEach(day => {
      summary.totals.sales += day.sales?.total || 0;
      summary.totals.collections += day.collections?.reduce((s, c) => s + c.amount, 0) || 0;
      summary.totals.creditSales += day.creditSales?.reduce((s, c) => s + c.amount, 0) || 0;
      summary.totals.expenses += day.expenses?.reduce((s, e) => s + e.amount, 0) || 0;
      summary.totals.deposits += day.deposits?.reduce((s, d) => s + d.amount, 0) || 0;
      summary.totals.withdrawals += day.withdrawals?.reduce((s, w) => s + w.amount, 0) || 0;
      summary.totals.charges += day.charges?.reduce((s, c) => s + c.amount, 0) || 0;
    });

    return summary;
  }

  /**
   * Generate debtor ledger
   * @param {string} debtor - Debtor name
   * @param {Array} creditSales - Credit sales array
   * @param {Array} collections - Collections array
   * @returns {Object} Debtor ledger
   */
  function generateDebtorLedger(debtor, creditSales, collections) {
    const credits = creditSales.filter(t => t.debtor === debtor).sort((a, b) => new Date(a.date) - new Date(b.date));
    const collects = collections.filter(t => t.debtor === debtor).sort((a, b) => new Date(a.date) - new Date(b.date));

    let balance = 0;
    const entries = [];

    // Merge and sort by date
    const all = [
      ...credits.map(c => ({ ...c, type: 'credit' })),
      ...collects.map(c => ({ ...c, type: 'collection' }))
    ].sort((a, b) => new Date(a.date) - new Date(b.date));

    all.forEach(entry => {
      if (entry.type === 'credit') {
        balance += entry.amount;
      } else {
        balance -= entry.amount;
      }
      entries.push({
        date: entry.date,
        type: entry.type,
        amount: entry.amount,
        balance: balance
      });
    });

    const totalCredit = credits.reduce((s, c) => s + c.amount, 0);
    const totalCollection = collects.reduce((s, c) => s + c.amount, 0);

    return {
      debtor: debtor,
      entries: entries,
      totalCredit: totalCredit,
      totalCollection: totalCollection,
      outstandingBalance: totalCredit - totalCollection
    };
  }

  /**
   * Generate expense category report
   * @param {string} category - Expense category
   * @param {Array} expenses - Expenses array
   * @param {string} startDate - Start date
   * @param {string} endDate - End date
   * @returns {Object} Category report
   */
  function generateExpenseReport(category, expenses, startDate, endDate) {
    const filtered = expenses
      .filter(e => e.category === category && e.date >= startDate && e.date <= endDate)
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    const total = filtered.reduce((s, e) => s + e.amount, 0);
    const count = filtered.length;
    const average = count > 0 ? total / count : 0;
    const highestExpense = filtered.length > 0 ? Math.max(...filtered.map(e => Math.abs(e.amount))) : 0;

    return {
      category: category,
      startDate: startDate,
      endDate: endDate,
      entries: filtered,
      total: total,
      count: count,
      average: average,
      highest: highestExpense
    };
  }

  /**
   * Export transactions to CSV format
   * @param {Array} transactions - Transactions array
   * @param {Array} headers - CSV headers
   * @returns {string} CSV content
   */
  function generateCSV(transactions, headers) {
    const rows = [headers];
    transactions.forEach(t => {
      const row = headers.map(h => {
        const value = t[h] || '';
        // Escape quotes and wrap in quotes if contains comma
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      });
      rows.push(row);
    });
    return '\uFEFF' + rows.map(r => r.join(',')).join('\n');
  }

  /**
   * Generate HTML report table
   * @param {Array} data - Data array
   * @param {Array} columns - Column definitions
   * @returns {string} HTML table
   */
  function generateHTMLTable(data, columns) {
    let html = '<table style="width:100%; border-collapse:collapse; margin:10px 0;">';
    html += '<thead style="background:#f1f5f9; font-weight:bold;">';
    html += '<tr>';
    columns.forEach(col => {
      html += `<th style="padding:8px; border:1px solid #ddd; text-align:${col.align || 'left'}">${col.label}</th>`;
    });
    html += '</tr></thead><tbody>';

    data.forEach(row => {
      html += '<tr>';
      columns.forEach(col => {
        const value = row[col.key] || '';
        const formatted = col.format ? col.format(value) : value;
        html += `<td style="padding:6px; border:1px solid #ddd; text-align:${col.align || 'left'}">${formatted}</td>`;
      });
      html += '</tr>';
    });
    html += '</tbody></table>';
    return html;
  }

  /**
   * Generate PDF-ready HTML
   * @param {string} title - Report title
   * @param {string} content - HTML content
   * @param {Object} metadata - Metadata object
   * @returns {string} Complete HTML
   */
  function generatePDFHTML(title, content, metadata) {
    const date = new Date().toLocaleString();
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title}</title>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
          .header h1 { margin: 0; font-size: 24px; }
          .metadata { font-size: 12px; color: #666; margin-top: 10px; }
          table { width: 100%; border-collapse: collapse; margin: 10px 0; }
          th, td { padding: 8px; border: 1px solid #ddd; text-align: left; }
          th { background: #f1f5f9; font-weight: bold; }
          .total-row { background: #e0e7ff; font-weight: bold; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${title}</h1>
          <div class="metadata">
            <p>⛽ Phatkeshwari Oil Stores, Zero Kilo</p>
            <p>Generated: ${date}</p>
            ${metadata ? Object.entries(metadata).map(([k, v]) => `<p>${k}: ${v}</p>`).join('') : ''}
          </div>
        </div>
        ${content}
      </body>
      </html>
    `;
  }

  /**
   * Get period summary
   * @param {Array} postedDays - Posted days
   * @param {string} startDate - Start date
   * @param {string} endDate - End date
   * @returns {Object} Summary
   */
  function getPeriodSummary(postedDays, startDate, endDate) {
    const days = postedDays.filter(d => d.date >= startDate && d.date <= endDate);
    if (days.length === 0) return null;

    const summary = {
      period: `${startDate} to ${endDate}`,
      daysCount: days.length,
      salesTotal: 0,
      collectionsTotal: 0,
      creditSalesTotal: 0,
      expensesTotal: 0,
      depositsTotal: 0,
      withdrawalsTotal: 0,
      chargesTotal: 0,
      openingCash: days[0]?.openingCash || 0,
      closingCash: days[days.length - 1]?.closingCash || 0
    };

    days.forEach(day => {
      summary.salesTotal += day.sales?.total || 0;
      summary.collectionsTotal += day.collections?.reduce((s, c) => s + c.amount, 0) || 0;
      summary.creditSalesTotal += day.creditSales?.reduce((s, c) => s + c.amount, 0) || 0;
      summary.expensesTotal += day.expenses?.reduce((s, e) => s + e.amount, 0) || 0;
      summary.depositsTotal += day.deposits?.reduce((s, d) => s + d.amount, 0) || 0;
      summary.withdrawalsTotal += day.withdrawals?.reduce((s, w) => s + w.amount, 0) || 0;
      summary.chargesTotal += day.charges?.reduce((s, c) => s + c.amount, 0) || 0;
    });

    summary.netCashFlow = summary.closingCash - summary.openingCash;

    return summary;
  }

  // Public API
  return {
    generateDailyReconciliation,
    generateDayBook,
    generateDebtorLedger,
    generateExpenseReport,
    generateCSV,
    generateHTMLTable,
    generatePDFHTML,
    getPeriodSummary
  };
})();
