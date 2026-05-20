// ============================================
// BANK MANAGER MODULE
// Handles bank deposits, withdrawals, charges
// ============================================

const BankManager = (function() {
  'use strict';

  /**
   * Create a bank deposit transaction
   * @param {string} description - Deposit description
   * @param {number} amount - Deposit amount
   * @param {string} date - Transaction date
   * @returns {Object} Deposit object
   */
  function createDeposit(description, amount, date) {
    if (!description || isNaN(amount) || amount <= 0) {
      throw new Error('Invalid deposit parameters');
    }
    return {
      type: 'deposit',
      desc: description.trim(),
      amount: parseFloat(amount),
      date: date || new Date().toISOString().split('T')[0],
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Create a bank withdrawal transaction
   * @param {string} description - Withdrawal description
   * @param {number} amount - Withdrawal amount
   * @param {string} date - Transaction date
   * @returns {Object} Withdrawal object
   */
  function createWithdrawal(description, amount, date) {
    if (!description || isNaN(amount) || amount <= 0) {
      throw new Error('Invalid withdrawal parameters');
    }
    return {
      type: 'withdrawal',
      desc: description.trim(),
      amount: parseFloat(amount),
      date: date || new Date().toISOString().split('T')[0],
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Create a bank charge transaction
   * @param {string} description - Charge description
   * @param {number} amount - Charge amount
   * @param {string} date - Transaction date
   * @returns {Object} Charge object
   */
  function createCharge(description, amount, date) {
    if (!description || isNaN(amount) || amount <= 0) {
      throw new Error('Invalid charge parameters');
    }
    return {
      type: 'charge',
      desc: description.trim(),
      amount: parseFloat(amount),
      date: date || new Date().toISOString().split('T')[0],
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Calculate closing bank balance
   * @param {number} openingBalance - Opening balance
   * @param {Array} deposits - Deposits array
   * @param {Array} withdrawals - Withdrawals array
   * @param {Array} charges - Charges array
   * @returns {number} Closing balance
   */
  function calculateClosingBalance(openingBalance, deposits, withdrawals, charges) {
    const totalDeposits = deposits.reduce((sum, d) => sum + d.amount, 0);
    const totalWithdrawals = withdrawals.reduce((sum, w) => sum + w.amount, 0);
    const totalCharges = charges.reduce((sum, c) => sum + c.amount, 0);

    return openingBalance + totalDeposits - totalWithdrawals - totalCharges;
  }

  /**
   * Get bank summary for a date
   * @param {string} date - Summary date
   * @param {Array} deposits - Deposits array
   * @param {Array} withdrawals - Withdrawals array
   * @param {Array} charges - Charges array
   * @returns {Object} Summary object
   */
  function getBankSummary(date, deposits, withdrawals, charges) {
    const dayDeposits = deposits.filter(d => d.date === date);
    const dayWithdrawals = withdrawals.filter(w => w.date === date);
    const dayCharges = charges.filter(c => c.date === date);

    const totalDep = dayDeposits.reduce((sum, d) => sum + d.amount, 0);
    const totalWit = dayWithdrawals.reduce((sum, w) => sum + w.amount, 0);
    const totalChg = dayCharges.reduce((sum, c) => sum + c.amount, 0);

    return {
      date: date,
      deposits: dayDeposits,
      withdrawals: dayWithdrawals,
      charges: dayCharges,
      totalDeposits: totalDep,
      totalWithdrawals: totalWit,
      totalCharges: totalChg,
      netChange: totalDep - totalWit - totalChg
    };
  }

  /**
   * Get bank transactions for date range
   * @param {string} startDate - Start date
   * @param {string} endDate - End date
   * @param {Array} deposits - Deposits array
   * @param {Array} withdrawals - Withdrawals array
   * @param {Array} charges - Charges array
   * @returns {Object} Transactions grouped by type
   */
  function getTransactionsByDateRange(startDate, endDate, deposits, withdrawals, charges) {
    const filterByDate = (arr) => arr.filter(t => t.date >= startDate && t.date <= endDate);

    const dep = filterByDate(deposits);
    const wit = filterByDate(withdrawals);
    const chg = filterByDate(charges);

    return {
      startDate: startDate,
      endDate: endDate,
      deposits: dep,
      withdrawals: wit,
      charges: chg,
      totalDeposits: dep.reduce((s, d) => s + d.amount, 0),
      totalWithdrawals: wit.reduce((s, w) => s + w.amount, 0),
      totalCharges: chg.reduce((s, c) => s + c.amount, 0)
    };
  }

  /**
   * Validate bank transaction
   * @param {Object} transaction - Transaction object
   * @returns {Object} Validation result
   */
  function validateTransaction(transaction) {
    if (!transaction.type || !['deposit', 'withdrawal', 'charge'].includes(transaction.type)) {
      return { valid: false, error: 'Invalid transaction type' };
    }
    if (!transaction.desc || transaction.desc.trim() === '') {
      return { valid: false, error: 'Description required' };
    }
    if (isNaN(transaction.amount) || transaction.amount <= 0) {
      return { valid: false, error: 'Amount must be greater than zero' };
    }
    return { valid: true };
  }

  /**
   * Generate bank reconciliation report
   * @param {number} openingBalance - Opening balance
   * @param {Array} deposits - Deposits array
   * @param {Array} withdrawals - Withdrawals array
   * @param {Array} charges - Charges array
   * @param {number} expectedClosing - Expected closing balance
   * @returns {Object} Reconciliation report
   */
  function generateReconciliation(openingBalance, deposits, withdrawals, charges, expectedClosing) {
    const calculated = calculateClosingBalance(openingBalance, deposits, withdrawals, charges);
    const variance = expectedClosing - calculated;
    const isBalanced = Math.abs(variance) < 0.01; // Allow for rounding errors

    return {
      openingBalance: openingBalance,
      totalDeposits: deposits.reduce((s, d) => s + d.amount, 0),
      totalWithdrawals: withdrawals.reduce((s, w) => s + w.amount, 0),
      totalCharges: charges.reduce((s, c) => s + c.amount, 0),
      calculated: calculated,
      expected: expectedClosing,
      variance: variance,
      isBalanced: isBalanced,
      status: isBalanced ? '✅ Balanced' : '⚠️ Variance: ' + FormattingUtils.formatRs(variance)
    };
  }

  /**
   * Get bank charge analysis
   * @param {Array} charges - Charges array
   * @returns {Object} Analysis object
   */
  function analyzeCharges(charges) {
    if (charges.length === 0) return { total: 0, average: 0, count: 0, byType: {} };

    const total = charges.reduce((s, c) => s + c.amount, 0);
    const byType = {};

    charges.forEach(c => {
      if (!byType[c.desc]) byType[c.desc] = 0;
      byType[c.desc] += c.amount;
    });

    return {
      total: total,
      count: charges.length,
      average: total / charges.length,
      byType: byType,
      highestCharge: Math.max(...charges.map(c => c.amount))
    };
  }

  // Public API
  return {
    createDeposit,
    createWithdrawal,
    createCharge,
    calculateClosingBalance,
    getBankSummary,
    getTransactionsByDateRange,
    validateTransaction,
    generateReconciliation,
    analyzeCharges
  };
})();
