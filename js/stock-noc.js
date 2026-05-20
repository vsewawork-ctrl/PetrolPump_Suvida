// ============================================
// STOCK & NOC MODULE
// Handles stock tracking and NOC ledger
// ============================================

const StockNOCManager = (function() {
  'use strict';

  /**
   * Create a fuel purchase record
   * @param {string} date - Purchase date
   * @param {number} petrolLitres - Petrol quantity
   * @param {number} dieselLitres - Diesel quantity
   * @param {number} amount - Purchase amount
   * @returns {Object} Purchase object
   */
  function createPurchase(date, petrolLitres, dieselLitres, amount) {
    if (!date || (isNaN(petrolLitres) && isNaN(dieselLitres)) || isNaN(amount)) {
      throw new Error('Invalid purchase parameters');
    }
    return {
      date: date,
      petrolLitres: parseFloat(petrolLitres) || 0,
      dieselLitres: parseFloat(dieselLitres) || 0,
      amount: parseFloat(amount),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Create a NOC payment record
   * @param {string} date - Payment date
   * @param {number} amount - Payment amount
   * @param {string} description - Payment description
   * @returns {Object} Payment object
   */
  function createNOCPayment(date, amount, description) {
    if (!date || isNaN(amount) || amount <= 0) {
      throw new Error('Invalid NOC payment parameters');
    }
    return {
      date: date,
      amount: parseFloat(amount),
      desc: (description || 'NOC Payment').trim(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Calculate closing stock for fuel type
   * @param {number} openingStock - Opening stock
   * @param {number} purchases - Total purchases
   * @param {number} sales - Total sales
   * @returns {number} Closing stock
   */
  function calculateClosingStock(openingStock, purchases, sales) {
    return openingStock + purchases - sales;
  }

  /**
   * Get stock summary for a date
   * @param {string} date - Summary date
   * @param {number} openingPetrol - Opening petrol stock
   * @param {number} openingDiesel - Opening diesel stock
   * @param {Array} purchases - Purchases array
   * @param {Object} sales - Sales object with petrolLtr, dieselLtr
   * @returns {Object} Stock summary
   */
  function getStockSummary(date, openingPetrol, openingDiesel, purchases, sales) {
    const dayPurchases = purchases.filter(p => p.date === date);
    const petrolPurch = dayPurchases.reduce((s, p) => s + p.petrolLitres, 0);
    const dieselPurch = dayPurchases.reduce((s, p) => s + p.dieselLitres, 0);
    const purchAmount = dayPurchases.reduce((s, p) => s + p.amount, 0);

    const closingPetrol = calculateClosingStock(openingPetrol, petrolPurch, sales.petrolLtr);
    const closingDiesel = calculateClosingStock(openingDiesel, dieselPurch, sales.dieselLtr);

    return {
      date: date,
      petrol: {
        opening: openingPetrol,
        purchases: petrolPurch,
        sales: sales.petrolLtr,
        closing: closingPetrol
      },
      diesel: {
        opening: openingDiesel,
        purchases: dieselPurch,
        sales: sales.dieselLtr,
        closing: closingDiesel
      },
      purchaseAmount: purchAmount,
      purchases: dayPurchases
    };
  }

  /**
   * Calculate NOC account balance
   * @param {number} openingBalance - Opening balance
   * @param {Array} purchases - Purchases array
   * @param {Array} payments - Payments array
   * @returns {number} Closing balance
   */
  function calculateNOCBalance(openingBalance, purchases, payments) {
    const totalPurchases = purchases.reduce((s, p) => s + p.amount, 0);
    const totalPayments = payments.reduce((s, p) => s + p.amount, 0);
    return openingBalance + totalPurchases - totalPayments;
  }

  /**
   * Get NOC ledger for date range
   * @param {string} startDate - Start date
   * @param {string} endDate - End date
   * @param {Array} purchases - Purchases array
   * @param {Array} payments - Payments array
   * @returns {Object} NOC ledger
   */
  function getNOCLedger(startDate, endDate, purchases, payments) {
    const filteredPurch = purchases.filter(p => p.date >= startDate && p.date <= endDate);
    const filteredPayments = payments.filter(p => p.date >= startDate && p.date <= endDate);

    const totalPurch = filteredPurch.reduce((s, p) => s + p.amount, 0);
    const totalPayments = filteredPayments.reduce((s, p) => s + p.amount, 0);

    return {
      startDate: startDate,
      endDate: endDate,
      purchases: filteredPurch,
      payments: filteredPayments,
      totalPurchases: totalPurch,
      totalPayments: totalPayments,
      netChange: totalPurch - totalPayments
    };
  }

  /**
   * Get NOC ledger entries in order
   * @param {Array} purchases - Purchases array
   * @param {Array} payments - Payments array
   * @param {number} openingBalance - Opening balance
   * @returns {Array} Ledger entries
   */
  function generateNOCLedgerEntries(purchases, payments, openingBalance) {
    const entries = [
      { date: '0000-01-01', type: 'opening', desc: 'Opening Balance', debit: 0, credit: 0, balance: openingBalance }
    ];

    const all = [
      ...purchases.map(p => ({ ...p, type: 'purchase', desc: 'NOC Purchase', debit: p.amount, credit: 0 })),
      ...payments.map(p => ({ ...p, type: 'payment', desc: p.desc || 'Payment', debit: 0, credit: p.amount }))
    ].sort((a, b) => new Date(a.date) - new Date(b.date));

    let balance = openingBalance;
    all.forEach(entry => {
      balance = balance + entry.debit - entry.credit;
      entries.push({
        date: entry.date,
        type: entry.type,
        desc: entry.desc,
        debit: entry.debit,
        credit: entry.credit,
        balance: balance
      });
    });

    return entries;
  }

  /**
   * Validate purchase record
   * @param {Object} purchase - Purchase object
   * @returns {Object} Validation result
   */
  function validatePurchase(purchase) {
    if (!purchase.date) return { valid: false, error: 'Date required' };
    if (purchase.petrolLitres < 0 || purchase.dieselLitres < 0) {
      return { valid: false, error: 'Quantities cannot be negative' };
    }
    if (purchase.petrolLitres === 0 && purchase.dieselLitres === 0) {
      return { valid: false, error: 'At least one fuel type quantity required' };
    }
    if (isNaN(purchase.amount) || purchase.amount <= 0) {
      return { valid: false, error: 'Amount must be greater than zero' };
    }
    return { valid: true };
  }

  /**
   * Get average purchase price per litre
   * @param {Array} purchases - Purchases array
   * @returns {Object} Average prices
   */
  function getAveragePrices(purchases) {
    if (purchases.length === 0) return { petrol: 0, diesel: 0 };

    let totalPetrolLtr = 0, totalPetrolCost = 0;
    let totalDieselLtr = 0, totalDieselCost = 0;

    purchases.forEach(p => {
      if (p.petrolLitres > 0) {
        totalPetrolLtr += p.petrolLitres;
      }
      if (p.dieselLitres > 0) {
        totalDieselLtr += p.dieselLitres;
      }
      // Assuming cost is distributed proportionally
      const totalLtr = p.petrolLitres + p.dieselLitres;
      if (totalLtr > 0) {
        totalPetrolCost += (p.petrolLitres / totalLtr) * p.amount;
        totalDieselCost += (p.dieselLitres / totalLtr) * p.amount;
      }
    });

    return {
      petrol: totalPetrolLtr > 0 ? totalPetrolCost / totalPetrolLtr : 0,
      diesel: totalDieselLtr > 0 ? totalDieselCost / totalDieselLtr : 0
    };
  }

  // Public API
  return {
    createPurchase,
    createNOCPayment,
    calculateClosingStock,
    getStockSummary,
    calculateNOCBalance,
    getNOCLedger,
    generateNOCLedgerEntries,
    validatePurchase,
    getAveragePrices
  };
})();
