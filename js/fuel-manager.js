// ============================================
// FUEL MANAGER MODULE
// Handles nozzle readings, fuel sales calculations
// ============================================

const FuelManager = (function() {
  'use strict';

  /**
   * Calculate nozzle sales for a given set of nozzles
   * @param {Array} nozzles - Array of nozzle objects with {id, type, open, close}
   * @param {number} petrolRate - Current petrol rate
   * @param {number} dieselRate - Current diesel rate
   * @param {number} outPetrolLtr - Out of nozzle petrol
   * @param {number} outDieselLtr - Out of nozzle diesel
   * @returns {Object} Sales breakdown
   */
  function calculateNozzleSales(nozzles, petrolRate, dieselRate, outPetrolLtr, outDieselLtr) {
    let petrolLtr = 0, dieselLtr = 0;

    // Calculate from nozzles
    nozzles.forEach(nozzle => {
      const litres = Math.max(0, nozzle.close - nozzle.open);
      if (nozzle.type === 'petrol') petrolLtr += litres;
      else if (nozzle.type === 'diesel') dieselLtr += litres;
    });

    // Add out-of-nozzle amounts
    petrolLtr += outPetrolLtr || 0;
    dieselLtr += outDieselLtr || 0;

    return {
      petrolLtr: petrolLtr,
      dieselLtr: dieselLtr,
      petrolAmt: petrolLtr * petrolRate,
      dieselAmt: dieselLtr * dieselRate,
      total: (petrolLtr * petrolRate) + (dieselLtr * dieselRate)
    };
  }

  /**
   * Calculate individual nozzle sale amount
   * @param {Object} nozzle - Nozzle object
   * @param {number} rate - Fuel rate (petrol or diesel)
   * @returns {number} Sale amount
   */
  function calculateNozzleAmount(nozzle, rate) {
    const litres = Math.max(0, nozzle.close - nozzle.open);
    return litres * rate;
  }

  /**
   * Validate nozzle readings
   * @param {Object} nozzle - Nozzle object
   * @returns {Object} Validation result {valid: bool, error: string}
   */
  function validateNozzleReading(nozzle) {
    if (!nozzle.open || isNaN(nozzle.open)) {
      return { valid: false, error: `${nozzle.id}: Invalid opening reading` };
    }
    if (!nozzle.close || isNaN(nozzle.close)) {
      return { valid: false, error: `${nozzle.id}: Invalid closing reading` };
    }
    if (nozzle.close < nozzle.open) {
      return { valid: false, error: `${nozzle.id}: Closing reading cannot be less than opening` };
    }
    return { valid: true };
  }

  /**
   * Validate all nozzles
   * @param {Array} nozzles - Array of nozzles
   * @returns {Object} Validation result
   */
  function validateAllNozzles(nozzles) {
    for (let nozzle of nozzles) {
      const result = validateNozzleReading(nozzle);
      if (!result.valid) return result;
    }
    return { valid: true };
  }

  /**
   * Get nozzle sales by type
   * @param {Array} nozzles - Array of nozzles
   * @returns {Object} Sales by type
   */
  function getSalesByType(nozzles) {
    let petrol = [], diesel = [];
    nozzles.forEach(nozzle => {
      const sale = {
        id: nozzle.id,
        litres: Math.max(0, nozzle.close - nozzle.open),
        amount: 0
      };
      if (nozzle.type === 'petrol') petrol.push(sale);
      else if (nozzle.type === 'diesel') diesel.push(sale);
    });
    return { petrol, diesel };
  }

  /**
   * Reset nozzle readings for next day
   * @param {Array} nozzles - Array of nozzles
   * @returns {Array} Updated nozzles with opening = closing
   */
  function resetNozzlesForNextDay(nozzles) {
    return nozzles.map(nozzle => ({
      ...nozzle,
      open: nozzle.close
    }));
  }

  /**
   * Calculate fuel stock changes
   * @param {number} openingStock - Opening stock in litres
   * @param {number} purchases - Purchases in litres
   * @param {number} sales - Sales in litres
   * @returns {number} Closing stock
   */
  function calculateClosingStock(openingStock, purchases, sales) {
    return openingStock + purchases - sales;
  }

  /**
   * Render fuel table rows
   * @param {Array} nozzles - Array of nozzles
   * @param {number} petrolRate - Petrol rate
   * @param {number} dieselRate - Diesel rate
   * @returns {Array} HTML rows
   */
  function generateFuelTableRows(nozzles, petrolRate, dieselRate) {
    return nozzles.map(nozzle => {
      const litres = Math.max(0, nozzle.close - nozzle.open);
      const rate = nozzle.type === 'petrol' ? petrolRate : dieselRate;
      const amount = litres * rate;

      return {
        id: nozzle.id,
        opening: nozzle.open,
        closing: nozzle.close,
        litres: litres.toFixed(3),
        rate: FormattingUtils.formatRs(rate),
        amount: FormattingUtils.formatRs(amount)
      };
    });
  }

  // Public API
  return {
    calculateNozzleSales,
    calculateNozzleAmount,
    validateNozzleReading,
    validateAllNozzles,
    getSalesByType,
    resetNozzlesForNextDay,
    calculateClosingStock,
    generateFuelTableRows
  };
})();
