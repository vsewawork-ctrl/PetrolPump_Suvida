// ============================================
// MAIN APP MODULE
// Application initialization and orchestration
// ============================================

const App = (function() {
  'use strict';

  // Private state
  let currentDate = null;
  let isInitialized = false;

  /**
   * Initialize the application
   */
  async function init() {
    if (isInitialized) return;

    try {
      // 1. Initialize storage
      await StorageManager.initSupabase();
      await StorageManager.loadFromCloud();

      // 2. Setup UI
      setupUIDefaults();
      refreshDropdowns();
      renderFuelTable();

      // 3. Bind events
      EventHandlers.init();

      // 4. Set date and load data
      setDefaultDate();
      handleDateChange();
      updateAll();

      isInitialized = true;
      UIUtils.showMessage('App ready', 'info');
    } catch (err) {
      console.error('Initialization error:', err);
      UIUtils.showMessage('Error initializing app', 'error');
    }
  }

  /**
   * Setup UI defaults
   */
  function setupUIDefaults() {
    // Set default values from config
    UIUtils.setValue('openingCash', DEFAULTS.OPENING_CASH);
    UIUtils.setValue('openingBank', DEFAULTS.OPENING_BANK);
    UIUtils.setValue('prabhuOpeningBal', DEFAULTS.OPENING_BANK);
    UIUtils.setValue('petrolRate', DEFAULTS.PETROL_RATE);
    UIUtils.setValue('dieselRate', DEFAULTS.DIESEL_RATE);
    UIUtils.setValue('outPetrolLtr', 0);
    UIUtils.setValue('outDieselLtr', 0);
  }

  /**
   * Set default date (next working day after last posted)
   */
  function setDefaultDate() {
    const postedDays = DataManager.get('postedDays') || [];
    let targetDate;

    if (postedDays.length > 0) {
      const lastPosted = postedDays.reduce((latest, d) => 
        d.date > latest ? d.date : latest, postedDays[0].date
      );
      const next = new Date(lastPosted);
      next.setDate(next.getDate() + 1);
      targetDate = next.toISOString().split('T')[0];
    } else {
      targetDate = new Date().toISOString().split('T')[0];
    }

    UIUtils.setValue('currentDate', targetDate);
    updateDateInfo();
  }

  /**
   * Update date info display
   */
  function updateDateInfo() {
    const postedDays = DataManager.get('postedDays') || [];
    const current = UIUtils.getValue('currentDate');
    const lastPosted = postedDays.length > 0 
      ? postedDays.reduce((latest, d) => d.date > latest ? d.date : latest, postedDays[0].date)
      : null;

    const infoText = lastPosted 
      ? `(Posted up to: ${lastPosted} → Next: ${current})`
      : `(No posted days – starting fresh)`;

    const infoEl = document.getElementById('dateInfo');
    if (infoEl) infoEl.innerText = infoText;
  }

  /**
   * Handle date change
   */
  function handleDateChange() {
    const today = UIUtils.getValue('currentDate');
    currentDate = today;
    updateDateInfo();

    if (today && !DataManager.isDateLocked(today)) {
      // Load previous day's closing as today's opening
      const postedDays = DataManager.get('postedDays') || [];
      const prev = new Date(today);
      prev.setDate(prev.getDate() - 1);
      const prevStr = prev.toISOString().split('T')[0];
      const prevPosted = postedDays.find(p => p.date === prevStr);

      if (prevPosted) {
        UIUtils.setValue('openingCash', prevPosted.closingCash);
        UIUtils.setValue('openingBank', prevPosted.closingBank);
        UIUtils.setValue('prabhuOpeningBal', prevPosted.closingBank);

        // Carry forward nozzle readings
        if (prevPosted.nozzles && prevPosted.nozzles.length === NOZZLES.length) {
          prevPosted.nozzles.forEach((n, i) => {
            NOZZLES[i].open = n.close;
          });
        }
      }
    }

    updateUIForLocked();
    updateAll();
  }

  /**
   * Update UI based on lock status
   */
  function updateUIForLocked() {
    const today = UIUtils.getValue('currentDate');
    const locked = DataManager.isDateLocked(today);

    UIUtils.toggleDisplay('lockedInfo', locked);
    UIUtils.toggleDisplay('addAdjustmentBtn', locked);

    // Disable editing buttons when locked
    document.querySelectorAll('.card button:not(.btn-outline)').forEach(btn => {
      const isLocked = locked && 
        !['addAdjustmentBtn', 'postTodayBtn', 'postStockBtn', 'dayBookBtn', 'exportCsvBtn', 'ledgerBtn'].includes(btn.id);
      btn.disabled = isLocked;
    });
  }

  /**
   * Refresh all dropdowns
   */
  function refreshDropdowns() {
    const debtors = DataManager.get('debtorsList') || [];
    const expenses = DataManager.get('expenseCategories') || [];

    UIUtils.initSearchableDropdown('creditDebtorSearch', 'creditDebtorList', debtors);
    UIUtils.initSearchableDropdown('collectionDebtorSearch', 'collectionDebtorList', debtors);
    UIUtils.initSearchableDropdown('expenseSearch', 'expenseList', expenses);
  }

  /**
   * Render fuel table
   */
  function renderFuelTable() {
    const nozzles = NOZZLES || DataManager.get('nozzles') || [];
    const tbody = document.getElementById('fuelBody');
    if (!tbody) return;

    tbody.innerHTML = '';
    nozzles.forEach((nozzle, idx) => {
      const row = tbody.insertRow();
      row.insertCell(0).innerText = nozzle.id;

      const opInp = document.createElement('input');
      opInp.type = 'number';
      opInp.value = nozzle.open;
      opInp.readOnly = true;
      opInp.style.background = '#f1f5f9';
      row.insertCell(1).appendChild(opInp);

      const clInp = document.createElement('input');
      clInp.type = 'number';
      clInp.value = nozzle.close;
      clInp.addEventListener('change', e => {
        nozzles[idx].close = parseFloat(e.target.value) || 0;
        updateFuelCells();
        updateAll();
      });
      row.insertCell(2).appendChild(clInp);

      updateFuelRow(row, nozzle);
    });
  }

  /**
   * Update fuel table row display
   */
  function updateFuelRow(row, nozzle) {
    const pRate = parseFloat(UIUtils.getValue('petrolRate')) || 0;
    const dRate = parseFloat(UIUtils.getValue('dieselRate')) || 0;
    const rate = nozzle.type === 'petrol' ? pRate : dRate;
    const litres = Math.max(0, nozzle.close - nozzle.open);

    row.cells[3].innerText = litres.toFixed(3);
    row.cells[4].innerText = FormattingUtils.formatRs(rate);
    row.cells[5].innerText = FormattingUtils.formatRs(litres * rate);
  }

  /**
   * Update all fuel cells
   */
  function updateFuelCells() {
    document.querySelectorAll('#fuelBody tr').forEach((row, i) => {
      const nozzles = NOZZLES || [];
      if (nozzles[i]) updateFuelRow(row, nozzles[i]);
    });
  }

  /**
   * Update all displays
   */
  function updateAll() {
    displayTodayEntries();
    updateBankDisplay();
    updateReconciliation();
    updateStockAndNOC();
  }

  /**
   * Display today's entries
   */
  function displayTodayEntries() {
    const today = UIUtils.getValue('currentDate');
    const locked = DataManager.isDateLocked(today);

    // Credit sales
    const tCredits = DataManager.getForDate('creditSales', today);
    const crTbody = document.querySelector('#todayCreditTable tbody');
    if (crTbody) {
      crTbody.innerHTML = '';
      tCredits.forEach(c => {
        const row = crTbody.insertRow();
        row.insertCell(0).innerText = c.debtor;
        row.insertCell(1).innerText = FormattingUtils.formatRs(c.amount);
        if (!locked) {
          const del = row.insertCell(2);
          const btn = document.createElement('button');
          btn.className = 'delete-btn btn-sm';
          btn.innerText = '✖';
          btn.onclick = () => {
            DataManager.remove('creditSales', c);
            StorageManager.saveToCloud();
            displayTodayEntries();
          };
          del.appendChild(btn);
        }
      });
    }

    // Collections
    const tColls = DataManager.getForDate('collections', today);
    const colTbody = document.querySelector('#todayCollectionTable tbody');
    if (colTbody) {
      colTbody.innerHTML = '';
      tColls.forEach(c => {
        const row = colTbody.insertRow();
        row.insertCell(0).innerText = c.debtor;
        row.insertCell(1).innerText = FormattingUtils.formatRs(c.amount);
        if (!locked) {
          const del = row.insertCell(2);
          const btn = document.createElement('button');
          btn.className = 'delete-btn btn-sm';
          btn.innerText = '✖';
          btn.onclick = () => {
            DataManager.remove('collections', c);
            StorageManager.saveToCloud();
            displayTodayEntries();
          };
          del.appendChild(btn);
        }
      });
    }

    // Expenses
    const tExp = DataManager.getForDate('expensesList', today);
    const expTbody = document.querySelector('#todayExpenseTable tbody');
    if (expTbody) {
      expTbody.innerHTML = '';
      tExp.forEach(e => {
        const row = expTbody.insertRow();
        row.insertCell(0).innerText = e.category;
        row.insertCell(1).innerText = FormattingUtils.formatRs(e.amount);
        if (!locked) {
          const del = row.insertCell(2);
          const btn = document.createElement('button');
          btn.className = 'delete-btn btn-sm';
          btn.innerText = '✖';
          btn.onclick = () => {
            DataManager.remove('expensesList', e);
            StorageManager.saveToCloud();
            displayTodayEntries();
          };
          del.appendChild(btn);
        }
      });
    }
  }

  /**
   * Update bank display
   */
  function updateBankDisplay() {
    const deposits = DataManager.get('deposits') || [];
    const withdrawals = DataManager.get('withdrawals') || [];
    const charges = DataManager.get('bankCharges') || [];

    const totalDep = deposits.reduce((s, d) => s + d.amount, 0);
    const totalWit = withdrawals.reduce((s, w) => s + w.amount, 0);
    const totalChg = charges.reduce((s, c) => s + c.amount, 0);

    const opening = parseFloat(UIUtils.getValue('prabhuOpeningBal')) || 0;
    const closing = opening + totalDep - totalWit - totalChg;

    UIUtils.setText('bankClosing', FormattingUtils.formatRs(closing));
    UIUtils.setText('bankDepTotal', FormattingUtils.formatRs(totalDep));
    UIUtils.setText('bankWitTotal', FormattingUtils.formatRs(totalWit));
    UIUtils.setText('bankChgTotal', FormattingUtils.formatRs(totalChg));
  }

  /**
   * Update reconciliation
   */
  function updateReconciliation() {
    const openingCash = parseFloat(UIUtils.getValue('openingCash')) || 0;
    const today = UIUtils.getValue('currentDate');

    const sales = FuelManager.calculateNozzleSales(
      NOZZLES || [],
      parseFloat(UIUtils.getValue('petrolRate')) || 0,
      parseFloat(UIUtils.getValue('dieselRate')) || 0,
      parseFloat(UIUtils.getValue('outPetrolLtr')) || 0,
      parseFloat(UIUtils.getValue('outDieselLtr')) || 0
    );

    const creditSales = DataManager.getForDate('creditSales', today);
    const collections = DataManager.getForDate('collections', today);
    const expenses = DataManager.getForDate('expensesList', today);
    const deposits = DataManager.get('deposits') || [];

    const totalCredits = creditSales.reduce((s, t) => s + t.amount, 0);
    const totalColls = collections.reduce((s, t) => s + t.amount, 0);
    const totalExp = expenses.reduce((s, t) => s + t.amount, 0);
    const totalDep = deposits.reduce((s, d) => s + d.amount, 0);

    const inflows = sales.total + totalColls;
    const outflows = totalCredits + totalExp + totalDep;
    const net = inflows - outflows;
    const closing = openingCash + net;

    UIUtils.setText('recOpenCash', FormattingUtils.formatRs(openingCash));
    UIUtils.setText('recInflows', FormattingUtils.formatRs(inflows));
    UIUtils.setText('recOutflows', FormattingUtils.formatRs(outflows));
    UIUtils.setText('recNetChange', FormattingUtils.formatRs(net));
    UIUtils.setText('recClosingCash', FormattingUtils.formatRs(closing));
    UIUtils.setText('recStatus', closing < 0 ? '⚠️ Negative' : '✅ Balanced');
  }

  /**
   * Update stock and NOC display
   */
  function updateStockAndNOC() {
    // Implementation for stock/NOC update
    // This is a placeholder - implement as needed
  }

  /**
   * Post today's data
   */
  function postToday() {
    const today = UIUtils.getValue('currentDate');
    if (!today) {
      UIUtils.showMessage('Select a date', 'error');
      return;
    }
    if (DataManager.isDateLocked(today)) {
      UIUtils.showMessage('Already locked', 'error');
      return;
    }

    // Create snapshot and lock date
    const snapshot = createDaySnapshot();
    DataManager.add('postedDays', snapshot);
    DataManager.add('lockedDates', today);
    StorageManager.saveToCloud();

    updateUIForLocked();
    updateAll();
    setDefaultDate();
    handleDateChange();

    UIUtils.showMessage('Day posted and locked', 'success');
  }

  /**
   * Create snapshot of day data
   */
  function createDaySnapshot() {
    const today = UIUtils.getValue('currentDate');
    const sales = FuelManager.calculateNozzleSales(
      NOZZLES || [],
      parseFloat(UIUtils.getValue('petrolRate')) || 0,
      parseFloat(UIUtils.getValue('dieselRate')) || 0,
      parseFloat(UIUtils.getValue('outPetrolLtr')) || 0,
      parseFloat(UIUtils.getValue('outDieselLtr')) || 0
    );

    return {
      date: today,
      timestamp: new Date().toISOString(),
      openingCash: parseFloat(UIUtils.getValue('openingCash')) || 0,
      closingCash: 0, // Calculate
      openingBank: parseFloat(UIUtils.getValue('openingBank')) || 0,
      closingBank: 0, // Calculate
      sales: sales,
      creditSales: DataManager.getForDate('creditSales', today),
      collections: DataManager.getForDate('collections', today),
      expenses: DataManager.getForDate('expensesList', today),
      deposits: DataManager.get('deposits') || [],
      withdrawals: DataManager.get('withdrawals') || [],
      charges: DataManager.get('bankCharges') || []
    };
  }

  /**
   * Post stock
   */
  function postStock() {
    // Implementation for stock posting
    UIUtils.showMessage('Stock posted', 'success');
  }

  /**
   * Show day book
   */
  function showDayBook(startDate, endDate) {
    const postedDays = DataManager.get('postedDays') || [];
    const dayBook = ReportingManager.generateDayBook(postedDays, startDate, endDate);

    if (!dayBook || dayBook.days.length === 0) {
      UIUtils.showMessage('No data in range', 'info');
      return;
    }

    // Generate and display report
    UIUtils.showMessage(`Day book: ${dayBook.days.length} days found`, 'info');
  }

  /**
   * Export CSV
   */
  function exportCSV() {
    const today = UIUtils.getValue('currentDate');
    const creditSales = DataManager.getForDate('creditSales', today);
    const collections = DataManager.getForDate('collections', today);
    const expenses = DataManager.getForDate('expensesList', today);

    const rows = [['Type', 'Name/Cat', 'Amount']];
    creditSales.forEach(c => rows.push(['Credit Sale', c.debtor, c.amount]));
    collections.forEach(c => rows.push(['Cash Collection', c.debtor, c.amount]));
    expenses.forEach(e => rows.push(['Expense', e.category, e.amount]));

    const csv = ReportingManager.generateCSV(rows.slice(1), rows[0]);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `DaySheet_${today}.csv`;
    a.click();
  }

  /**
   * Open ledger
   */
  function openLedger() {
    UIUtils.showMessage('Ledger feature coming soon', 'info');
  }

  /**
   * Show adjustment modal
   */
  function showAdjustmentModal() {
    UIUtils.showMessage('Adjustment feature coming soon', 'info');
  }

  /**
   * Add purchase
   */
  function addPurchase() {
    UIUtils.showMessage('Add purchase feature coming soon', 'info');
  }

  /**
   * Add NOC payment
   */
  function addNOCPayment() {
    UIUtils.showMessage('Add NOC payment feature coming soon', 'info');
  }

  /**
   * Paste NOC data
   */
  function pasteNOCData() {
    UIUtils.showMessage('Paste NOC feature coming soon', 'info');
  }

  /**
   * Export stock Excel
   */
  function exportStockExcel() {
    UIUtils.showMessage('Export stock feature coming soon', 'info');
  }

  /**
   * Print stock
   */
  function printStock() {
    UIUtils.showMessage('Print stock feature coming soon', 'info');
  }

  // Public API
  return {
    init,
    setDefaultDate,
    handleDateChange,
    refreshDropdowns,
    updateAll,
    displayTodayEntries,
    updateBankDisplay,
    updateReconciliation,
    updateStockAndNOC,
    postToday,
    postStock,
    showDayBook,
    exportCSV,
    openLedger,
    showAdjustmentModal,
    addPurchase,
    addNOCPayment,
    pasteNOCData,
    exportStockExcel,
    printStock
  };
})();

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => App.init());
} else {
  App.init();
}
