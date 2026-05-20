// ============================================
// TRANSACTIONS MODULE
// Handles credit sales, collections, expenses
// ============================================

const TransactionManager = (function() {
  'use strict';

  /**
   * Record a credit sale
   * @param {string} date - Transaction date
   * @param {string} debtor - Debtor name
   * @param {number} amount - Sale amount
   * @returns {Object} Transaction object
   */
  function createCreditSale(date, debtor, amount) {
    if (!date || !debtor || isNaN(amount) || amount <= 0) {
      throw new Error('Invalid credit sale parameters');
    }
    return {
      date: date,
      debtor: debtor.trim(),
      amount: parseFloat(amount),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Record a collection from debtor
   * @param {string} date - Transaction date
   * @param {string} debtor - Debtor name
   * @param {number} amount - Collection amount
   * @returns {Object} Transaction object
   */
  function createCollection(date, debtor, amount) {
    if (!date || !debtor || isNaN(amount) || amount <= 0) {
      throw new Error('Invalid collection parameters');
    }
    return {
      date: date,
      debtor: debtor.trim(),
      amount: parseFloat(amount),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Record an expense
   * @param {string} date - Transaction date
   * @param {string} category - Expense category
   * @param {number} amount - Expense amount (negative for income)
   * @returns {Object} Transaction object
   */
  function createExpense(date, category, amount) {
    if (!date || !category || isNaN(amount)) {
      throw new Error('Invalid expense parameters');
    }
    return {
      date: date,
      category: category.trim(),
      amount: parseFloat(amount),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get debtor's outstanding balance
   * @param {string} debtor - Debtor name
   * @param {Array} creditSales - Credit sales array
   * @param {Array} collections - Collections array
   * @returns {number} Outstanding balance
   */
  function getDebtorBalance(debtor, creditSales, collections) {
    const credits = creditSales
      .filter(t => t.debtor === debtor)
      .reduce((sum, t) => sum + t.amount, 0);

    const collects = collections
      .filter(t => t.debtor === debtor)
      .reduce((sum, t) => sum + t.amount, 0);

    return credits - collects;
  }

  /**
   * Get all debtors with balances
   * @param {Array} creditSales - Credit sales array
   * @param {Array} collections - Collections array
   * @param {Array} debtorsList - List of all debtors
   * @returns {Array} Debtors with balances
   */
  function getDebtorsWithBalances(creditSales, collections, debtorsList) {
    return debtorsList.map(debtor => ({
      name: debtor,
      balance: getDebtorBalance(debtor, creditSales, collections)
    })).filter(d => d.balance > 0);
  }

  /**
   * Get transaction summary for a date range
   * @param {Array} transactions - Transactions array
   * @param {string} startDate - Start date (YYYY-MM-DD)
   * @param {string} endDate - End date (YYYY-MM-DD)
   * @returns {Object} Summary object
   */
  function getTransactionSummary(transactions, startDate, endDate) {
    const filtered = transactions.filter(t => 
      t.date >= startDate && t.date <= endDate
    );

    const total = filtered.reduce((sum, t) => sum + t.amount, 0);
    const count = filtered.length;
    const avg = count > 0 ? total / count : 0;

    return {
      transactions: filtered,
      total: total,
      count: count,
      average: avg,
      byDate: groupByDate(filtered)
    };
  }

  /**
   * Group transactions by date
   * @param {Array} transactions - Transactions array
   * @returns {Object} Transactions grouped by date
   */
  function groupByDate(transactions) {
    return transactions.reduce((acc, t) => {
      if (!acc[t.date]) acc[t.date] = [];
      acc[t.date].push(t);
      return acc;
    }, {});
  }

  /**
   * Validate transaction
   * @param {Object} transaction - Transaction object
   * @returns {Object} Validation result
   */
  function validateTransaction(transaction) {
    if (!transaction.date || !/^\d{4}-\d{2}-\d{2}$/.test(transaction.date)) {
      return { valid: false, error: 'Invalid date format' };
    }
    if (!transaction.amount || isNaN(transaction.amount)) {
      return { valid: false, error: 'Invalid amount' };
    }
    if (transaction.amount === 0) {
      return { valid: false, error: 'Amount cannot be zero' };
    }
    return { valid: true };
  }

  /**
   * Get highest transaction amount
   * @param {Array} transactions - Transactions array
   * @returns {Object} Transaction with highest amount
   */
  function getHighestTransaction(transactions) {
    if (transactions.length === 0) return null;
    return transactions.reduce((max, t) => 
      Math.abs(t.amount) > Math.abs(max.amount) ? t : max
    );
  }

  /**
   * Calculate running balance for debtor
   * @param {string} debtor - Debtor name
   * @param {Array} creditSales - Credit sales array
   * @param {Array} collections - Collections array
   * @returns {Array} Running balance history
   */
  function getDebtorRunningBalance(debtor, creditSales, collections) {
    const transactions = [
      ...creditSales.filter(t => t.debtor === debtor).map(t => ({ ...t, type: 'credit' })),
      ...collections.filter(t => t.debtor === debtor).map(t => ({ ...t, type: 'collection', amount: -t.amount }))
    ].sort((a, b) => new Date(a.date) - new Date(b.date));

    let balance = 0;
    return transactions.map(t => {
      balance += t.amount;
      return { ...t, runningBalance: balance };
    });
  }

  // Public API
  return {
    createCreditSale,
    createCollection,
    createExpense,
    getDebtorBalance,
    getDebtorsWithBalances,
    getTransactionSummary,
    groupByDate,
    validateTransaction,
    getHighestTransaction,
    getDebtorRunningBalance
  };
})();
