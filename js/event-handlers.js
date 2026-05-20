// ============================================
// EVENT HANDLERS MODULE
// Centralized event binding and handlers
// ============================================

const EventHandlers = (function() {
  'use strict';

  /**
   * Bind all button click events
   */
  function bindButtonEvents() {
    const handlers = {
      'toggleViewBtn': () => UIUtils.toggleView(),
      'exportDbBtn': () => StorageManager.exportDatabase(),
      'importDbBtn': () => StorageManager.importDatabase(),
      'recordCreditBtn': () => handleRecordCredit(),
      'recordCollectionBtn': () => handleRecordCollection(),
      'recordExpenseBtn': () => handleRecordExpense(),
      'addDebtorBtn': () => handleAddNewDebtor(),
      'addCollectionDebtorBtn': () => handleAddNewDebtor(),
      'addExpenseCatBtn': () => handleAddNewExpenseCategory(),
      'addBankDepBtn': () => handleAddBankDeposit(),
      'addBankWitBtn': () => handleAddBankWithdrawal(),
      'addBankChgBtn': () => handleAddBankCharge(),
      'recalcBtn': () => App.updateAll(),
      'postTodayBtn': () => handlePostToday(),
      'postStockBtn': () => handlePostStock(),
      'dayBookBtn': () => handleShowDayBook(),
      'exportCsvBtn': () => handleExportCSV(),
      'ledgerBtn': () => handleOpenLedger(),
      'addAdjustmentBtn': () => handleShowAdjustmentModal(),
      'addPurchaseBtn': () => handleAddPurchase(),
      'addNocPaymentBtn': () => handleAddNOCPayment(),
      'pasteNocBtn': () => handlePasteNOCData(),
      'exportStockExcelBtn': () => handleExportStockExcel(),
      'printStockBtn': () => handlePrintStock(),
      'modalClose': () => UIUtils.hideModal()
    };

    Object.entries(handlers).forEach(([id, handler]) => {
      const element = document.getElementById(id);
      if (element) element.onclick = handler;
    });
  }

  /**
   * Bind input change events
   */
  function bindInputEvents() {
    const inputHandlers = {
      'petrolRate': () => { FuelManager.handleRateChange(); },
      'dieselRate': () => { FuelManager.handleRateChange(); },
      'outPetrolLtr': () => App.updateAll(),
      'outDieselLtr': () => App.updateAll(),
      'openingCash': () => App.updateAll(),
      'openingBank': () => {
        UIUtils.setValue('prabhuOpeningBal', UIUtils.getValue('openingBank'));
        App.updateAll();
      },
      'currentDate': () => App.handleDateChange(),
      'stockOpenPetrolInput': () => App.updateStockAndNOC(),
      'stockOpenDieselInput': () => App.updateStockAndNOC()
    };

    Object.entries(inputHandlers).forEach(([id, handler]) => {
      const element = document.getElementById(id);
      if (element) element.addEventListener('input', handler);
    });
  }

  /**
   * Bind keyboard events
   */
  function bindKeyboardEvents() {
    // Enter key to submit
    document.getElementById('creditAmount')?.addEventListener('keypress', e => {
      if (e.key === 'Enter') handleRecordCredit();
    });
    document.getElementById('collectionAmount')?.addEventListener('keypress', e => {
      if (e.key === 'Enter') handleRecordCollection();
    });
    document.getElementById('expenseAmount')?.addEventListener('keypress', e => {
      if (e.key === 'Enter') handleRecordExpense();
    });

    // Prevent scroll on number inputs
    document.addEventListener('wheel', e => {
      if (e.target.tagName === 'INPUT' && e.target.type === 'number' && !e.ctrlKey) {
        e.preventDefault();
      }
    }, { passive: false });
  }

  /**
   * Handle record credit sale
   */
  function handleRecordCredit() {
    try {
      const debtor = UIUtils.getValue('creditDebtorSearch').trim();
      const amount = parseFloat(UIUtils.getValue('creditAmount'));
      const date = UIUtils.getValue('currentDate');

      if (!debtor || !amount || isNaN(amount)) {
        UIUtils.showMessage('Invalid debtor or amount', 'error');
        return;
      }

      if (DataManager.isDateLocked(date)) {
        UIUtils.showMessage('This date is locked', 'warning');
        return;
      }

      const transaction = TransactionManager.createCreditSale(date, debtor, amount);
      DataManager.add('creditSales', transaction);
      StorageManager.saveToCloud();
      App.updateAll();

      UIUtils.setValue('creditDebtorSearch', '');
      UIUtils.setValue('creditAmount', '');
      UIUtils.showMessage(`Credit sale recorded: ${debtor} - Rs ${amount}`, 'success');
    } catch (err) {
      UIUtils.showMessage(err.message, 'error');
    }
  }

  /**
   * Handle record collection
   */
  function handleRecordCollection() {
    try {
      const debtor = UIUtils.getValue('collectionDebtorSearch').trim();
      const amount = parseFloat(UIUtils.getValue('collectionAmount'));
      const date = UIUtils.getValue('currentDate');

      if (!debtor || !amount || isNaN(amount)) {
        UIUtils.showMessage('Invalid debtor or amount', 'error');
        return;
      }

      if (DataManager.isDateLocked(date)) {
        UIUtils.showMessage('This date is locked', 'warning');
        return;
      }

      const transaction = TransactionManager.createCollection(date, debtor, amount);
      DataManager.add('collections', transaction);
      StorageManager.saveToCloud();
      App.updateAll();

      UIUtils.setValue('collectionDebtorSearch', '');
      UIUtils.setValue('collectionAmount', '');
      UIUtils.showMessage(`Collection recorded: ${debtor} - Rs ${amount}`, 'success');
    } catch (err) {
      UIUtils.showMessage(err.message, 'error');
    }
  }

  /**
   * Handle record expense
   */
  function handleRecordExpense() {
    try {
      const category = UIUtils.getValue('expenseSearch').trim();
      const amount = parseFloat(UIUtils.getValue('expenseAmount'));
      const date = UIUtils.getValue('currentDate');

      if (!category || isNaN(amount)) {
        UIUtils.showMessage('Invalid category or amount', 'error');
        return;
      }

      if (DataManager.isDateLocked(date)) {
        UIUtils.showMessage('This date is locked', 'warning');
        return;
      }

      const transaction = TransactionManager.createExpense(date, category, amount);
      DataManager.add('expensesList', transaction);
      StorageManager.saveToCloud();
      App.updateAll();

      UIUtils.setValue('expenseSearch', '');
      UIUtils.setValue('expenseAmount', '');
      UIUtils.showMessage(`Expense recorded: ${category} - Rs ${amount}`, 'success');
    } catch (err) {
      UIUtils.showMessage(err.message, 'error');
    }
  }

  /**
   * Handle add new debtor
   */
  function handleAddNewDebtor() {
    const name = prompt('Enter new debtor name:');
    if (name && name.trim()) {
      const debtors = DataManager.get('debtorsList');
      if (!debtors.includes(name)) {
        debtors.push(name);
        DataManager.set('debtorsList', debtors);
        StorageManager.saveToCloud();
        App.refreshDropdowns();
        UIUtils.showMessage(`Debtor added: ${name}`, 'success');
      } else {
        UIUtils.showMessage('Debtor already exists', 'warning');
      }
    }
  }

  /**
   * Handle add new expense category
   */
  function handleAddNewExpenseCategory() {
    const category = prompt('Enter new expense category:');
    if (category && category.trim()) {
      const categories = DataManager.get('expenseCategories');
      if (!categories.includes(category)) {
        categories.push(category);
        DataManager.set('expenseCategories', categories);
        StorageManager.saveToCloud();
        App.refreshDropdowns();
        UIUtils.showMessage(`Category added: ${category}`, 'success');
      } else {
        UIUtils.showMessage('Category already exists', 'warning');
      }
    }
  }

  /**
   * Handle add bank deposit
   */
  function handleAddBankDeposit() {
    try {
      const desc = UIUtils.getValue('bankDepDesc').trim() || 'Deposit';
      const amount = parseFloat(UIUtils.getValue('bankDepAmt'));

      if (isNaN(amount) || amount <= 0) {
        UIUtils.showMessage('Invalid amount', 'error');
        return;
      }

      const deposit = BankManager.createDeposit(desc, amount);
      DataManager.add('deposits', deposit);
      StorageManager.saveToCloud();
      App.updateAll();

      UIUtils.setValue('bankDepDesc', '');
      UIUtils.setValue('bankDepAmt', '');
      UIUtils.showMessage(`Deposit recorded: Rs ${amount}`, 'success');
    } catch (err) {
      UIUtils.showMessage(err.message, 'error');
    }
  }

  /**
   * Handle add bank withdrawal
   */
  function handleAddBankWithdrawal() {
    try {
      const desc = UIUtils.getValue('bankWitDesc').trim() || 'Withdrawal';
      const amount = parseFloat(UIUtils.getValue('bankWitAmt'));

      if (isNaN(amount) || amount <= 0) {
        UIUtils.showMessage('Invalid amount', 'error');
        return;
      }

      const withdrawal = BankManager.createWithdrawal(desc, amount);
      DataManager.add('withdrawals', withdrawal);
      StorageManager.saveToCloud();
      App.updateAll();

      UIUtils.setValue('bankWitDesc', '');
      UIUtils.setValue('bankWitAmt', '');
      UIUtils.showMessage(`Withdrawal recorded: Rs ${amount}`, 'success');
    } catch (err) {
      UIUtils.showMessage(err.message, 'error');
    }
  }

  /**
   * Handle add bank charge
   */
  function handleAddBankCharge() {
    try {
      const desc = UIUtils.getValue('bankChgDesc').trim() || 'Bank Charge';
      const amount = parseFloat(UIUtils.getValue('bankChgAmt'));

      if (isNaN(amount) || amount <= 0) {
        UIUtils.showMessage('Invalid amount', 'error');
        return;
      }

      const charge = BankManager.createCharge(desc, amount);
      DataManager.add('bankCharges', charge);
      StorageManager.saveToCloud();
      App.updateAll();

      UIUtils.setValue('bankChgDesc', '');
      UIUtils.setValue('bankChgAmt', '');
      UIUtils.showMessage(`Charge recorded: Rs ${amount}`, 'success');
    } catch (err) {
      UIUtils.showMessage(err.message, 'error');
    }
  }

  /**
   * Handle post today
   */
  function handlePostToday() {
    const date = UIUtils.getValue('currentDate');
    if (!date) {
      UIUtils.showMessage('Select a date', 'error');
      return;
    }
    if (DataManager.isDateLocked(date)) {
      UIUtils.showMessage('Already locked', 'error');
      return;
    }
    if (!confirm('Post today? Editing will be locked for this date.')) return;

    // Implementation in App module
    if (App.postToday) App.postToday();
  }

  /**
   * Handle post stock
   */
  function handlePostStock() {
    if (!confirm('Post stock? Readings will be reset.')) return;
    if (App.postStock) App.postStock();
  }

  /**
   * Handle show day book
   */
  function handleShowDayBook() {
    const startDate = prompt('Start date (YYYY-MM-DD):', '');
    if (!startDate) return;
    const endDate = prompt('End date (YYYY-MM-DD):', startDate);
    if (!endDate) return;

    if (App.showDayBook) App.showDayBook(startDate, endDate);
  }

  /**
   * Handle export CSV
   */
  function handleExportCSV() {
    if (App.exportCSV) App.exportCSV();
  }

  /**
   * Handle open ledger
   */
  function handleOpenLedger() {
    if (App.openLedger) App.openLedger();
  }

  /**
   * Handle show adjustment modal
   */
  function handleShowAdjustmentModal() {
    if (App.showAdjustmentModal) App.showAdjustmentModal();
  }

  /**
   * Handle add purchase
   */
  function handleAddPurchase() {
    if (App.addPurchase) App.addPurchase();
  }

  /**
   * Handle add NOC payment
   */
  function handleAddNOCPayment() {
    if (App.addNOCPayment) App.addNOCPayment();
  }

  /**
   * Handle paste NOC data
   */
  function handlePasteNOCData() {
    if (App.pasteNOCData) App.pasteNOCData();
  }

  /**
   * Handle export stock Excel
   */
  function handleExportStockExcel() {
    if (App.exportStockExcel) App.exportStockExcel();
  }

  /**
   * Handle print stock
   */
  function handlePrintStock() {
    if (App.printStock) App.printStock();
  }

  /**
   * Initialize all event handlers
   */
  function init() {
    bindButtonEvents();
    bindInputEvents();
    bindKeyboardEvents();
  }

  // Public API
  return {
    init,
    bindButtonEvents,
    bindInputEvents,
    bindKeyboardEvents
  };
})();
