/**
 * Treasury Flash Dashboard
 * Loads corporate and gustomer cash data, calculates KPIs,
 * renders Chart.js line charts and account detail tables.
 *
 * Data source: Static JSON files (data/corporate_cash.json, data/gustomer_cash.json)
 * kept up-to-date by the Apps Script pipeline pushing to GitHub.
 */

(function () {
  'use strict';

  // ===== Utility Functions =====

  /**
   * Format a number as USD currency string with commas.
   */
  function formatCurrency(value) {
    if (value == null || isNaN(value)) return '$0.00';
    const abs = Math.abs(value);
    let formatted;
    if (abs >= 1e9) {
      formatted = '$' + (value / 1e9).toFixed(2) + 'B';
    } else if (abs >= 1e6) {
      formatted = '$' + (value / 1e6).toFixed(2) + 'M';
    } else {
      formatted = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value);
    }
    return formatted;
  }

  /**
   * Format a number as full USD (no abbreviation) for table rows.
   */
  function formatCurrencyFull(value) {
    if (value == null || isNaN(value)) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }

  /**
   * Format a date string nicely.
   */
  function formatDate(dateStr) {
    var d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  /**
   * Aggregate data: sum values by reporting_date.
   * Returns sorted array of {date, total}.
   */
  function aggregateByDate(data) {
    var map = {};
    data.forEach(function (row) {
      var d = row.reporting_date;
      if (!map[d]) map[d] = 0;
      map[d] += row.value;
    });
    return Object.keys(map)
      .sort()
      .map(function (d) {
        return { date: d, total: map[d] };
      });
  }

  /**
   * Get records for the latest date in the dataset.
   */
  function getLatestDateRecords(data) {
    if (!data.length) return { date: null, records: [] };
    var dates = data.map(function (r) { return r.reporting_date; });
    var latest = dates.sort().pop();
    var records = data.filter(function (r) { return r.reporting_date === latest; });
    records.sort(function (a, b) { return b.value - a.value; });
    return { date: latest, records: records };
  }

  /**
   * Generate CSV string from data filtered by date range and type.
   */
  function generateCSV(corpData, gustData, startDate, endDate, dataType) {
    var tagged = [];
    if (dataType === 'all' || dataType === 'corporate') {
      corpData.forEach(function (r) {
        if (r.reporting_date >= startDate && r.reporting_date <= endDate) {
          tagged.push({ r: r, type: 'Corporate' });
        }
      });
    }
    if (dataType === 'all' || dataType === 'gustomer') {
      gustData.forEach(function (r) {
        if (r.reporting_date >= startDate && r.reporting_date <= endDate) {
          tagged.push({ r: r, type: 'Customer' });
        }
      });
    }
    tagged.sort(function (a, b) {
      if (a.r.reporting_date < b.r.reporting_date) return -1;
      if (a.r.reporting_date > b.r.reporting_date) return 1;
      if (a.r.account_description < b.r.account_description) return -1;
      if (a.r.account_description > b.r.account_description) return 1;
      return 0;
    });

    var csv = 'Date,Type,Bank,Account,Balance\n';
    tagged.forEach(function (t) {
      var r = t.r;
      var bank = getBankName(r.account_description);
      var acct = r.account_description.indexOf(',') !== -1 ?
        '"' + r.account_description + '"' : r.account_description;
      csv += r.reporting_date + ',' + t.type + ',' + bank + ',' + acct + ',' + r.value + '\n';
    });
    return csv;
  }

  function downloadCSV(csv, filename) {
    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    var link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  /**
   * Get all unique dates from the dataset, sorted descending (most recent first).
   */
  function getUniqueDates(data) {
    var dateSet = {};
    data.forEach(function (r) { dateSet[r.reporting_date] = true; });
    return Object.keys(dateSet).sort().reverse();
  }

  /**
   * Get records for a specific date in the dataset.
   * Returns { date, records } similar to getLatestDateRecords.
   */
  function getRecordsForDate(data, dateStr) {
    var records = data.filter(function (r) { return r.reporting_date === dateStr; });
    records.sort(function (a, b) { return b.value - a.value; });
    return { date: dateStr, records: records };
  }

  /**
   * Populate a <select> date picker with available dates.
   * @param {string} selectId - the ID of the <select> element
   * @param {string[]} dates - array of date strings sorted descending
   * @param {string} selectedDate - the currently selected date
   * @param {function} onChange - callback when user selects a new date
   */
  function populateDatePicker(selectId, dates, selectedDate, onChange) {
    var sel = document.getElementById(selectId);
    if (!sel) return;
    sel.innerHTML = '';
    dates.forEach(function (d) {
      var opt = document.createElement('option');
      opt.value = d;
      opt.textContent = formatDate(d);
      if (d === selectedDate) opt.selected = true;
      sel.appendChild(opt);
    });
    sel.addEventListener('change', function () {
      onChange(sel.value);
    });
  }

  /**
   * Determine staleness for each bank group on a given date.
   * Compares the selected date's values to the previous date's values.
   * Returns a map: { bankName: { stale: true/false, lastChangedDate: string } }
   */
  function computeStaleness(fullData, selectedDate, allDatesSorted) {
    // allDatesSorted is descending; find the previous date
    var selectedIdx = allDatesSorted.indexOf(selectedDate);
    if (selectedIdx < 0 || selectedIdx >= allDatesSorted.length - 1) {
      // No previous date available; can't determine staleness
      return {};
    }

    var prevDate = allDatesSorted[selectedIdx + 1];
    var selectedRecords = fullData.filter(function (r) { return r.reporting_date === selectedDate; });
    var prevRecords = fullData.filter(function (r) { return r.reporting_date === prevDate; });

    // Build lookup: account -> value for each date
    var selectedMap = {};
    selectedRecords.forEach(function (r) { selectedMap[r.account_description] = r.value; });
    var prevMap = {};
    prevRecords.forEach(function (r) { prevMap[r.account_description] = r.value; });

    // Group accounts by bank
    var bankAccounts = {};
    selectedRecords.forEach(function (r) {
      var bank = getBankName(r.account_description);
      if (!bankAccounts[bank]) bankAccounts[bank] = [];
      bankAccounts[bank].push(r.account_description);
    });

    var result = {};
    var accountStale = {};
    Object.keys(bankAccounts).forEach(function (bank) {
      var accounts = bankAccounts[bank];
      var allIdentical = accounts.every(function (acct) {
        return prevMap.hasOwnProperty(acct) && selectedMap[acct] === prevMap[acct];
      });

      if (allIdentical && accounts.length > 0) {
        var lastChanged = findLastChangedDate(fullData, bank, selectedDate, allDatesSorted);
        result[bank] = { stale: true, lastChangedDate: lastChanged };
        accounts.forEach(function (acct) { accountStale[acct] = true; });
      } else {
        result[bank] = { stale: false, lastChangedDate: null };
        accounts.forEach(function (acct) {
          var unchanged = prevMap.hasOwnProperty(acct) && selectedMap[acct] === prevMap[acct];
          accountStale[acct] = unchanged;
        });
      }
    });

    result._accountStale = accountStale;
    return result;
  }

  /**
   * Walk backwards through dates to find when a bank's values last changed.
   */
  function findLastChangedDate(fullData, bankName, selectedDate, allDatesSorted) {
    var selectedIdx = allDatesSorted.indexOf(selectedDate);
    if (selectedIdx < 0) return selectedDate;

    // Build a map of date -> { account: value } for this bank
    var dateAccountValues = {};
    fullData.forEach(function (r) {
      if (getBankName(r.account_description) === bankName) {
        if (!dateAccountValues[r.reporting_date]) dateAccountValues[r.reporting_date] = {};
        dateAccountValues[r.reporting_date][r.account_description] = r.value;
      }
    });

    // Walk backwards comparing each date to its predecessor
    for (var i = selectedIdx; i < allDatesSorted.length - 1; i++) {
      var curDate = allDatesSorted[i];
      var prevDate = allDatesSorted[i + 1];
      var curVals = dateAccountValues[curDate] || {};
      var prevVals = dateAccountValues[prevDate] || {};

      var curAccounts = Object.keys(curVals);
      var anyDifferent = curAccounts.some(function (acct) {
        return !prevVals.hasOwnProperty(acct) || curVals[acct] !== prevVals[acct];
      });

      if (anyDifferent) {
        return curDate;
      }
    }

    // If we walked all the way back, return the earliest date
    return allDatesSorted[allDatesSorted.length - 1];
  }

  // ===== Bank Name Mapping =====

  /**
   * Maps an account description to its bank name for grouping.
   */
  function getBankName(desc) {
    if (!desc) return 'Other';

    // BNY: Guideline BNY specifically
    if (/^Guideline BNY/i.test(desc)) return 'BNY';

    // Guideline Stripe -> Stripe
    if (/^Guideline Stripe/i.test(desc)) return 'Stripe';

    // JPM: Chase, JPM, Gusto PEO, GustoHR, Sunrise, Guideline (non-BNY/Stripe) accounts
    if (/^Chase/i.test(desc) || /^Sunrise/i.test(desc) ||
        desc.indexOf('FBO 0302') !== -1 ||
        desc.indexOf('Gusto Capital, LLC 3962') !== -1 ||
        desc.indexOf('Flex Pay Revenue') !== -1 ||
        desc.indexOf('(JPM)') !== -1 || /^JPM/i.test(desc) || /^JPMChase/i.test(desc) ||
        /^Gusto PEO/i.test(desc) || /^GustoHR/i.test(desc) ||
        /^Guideline/i.test(desc) || /^Guidleine/i.test(desc)) {
      return 'JPM';
    }

    // NBKC
    if (/^NBKC/i.test(desc)) return 'NBKC';

    // SVB or COLLATERAL MMA
    if (/^SVB/i.test(desc) || /^COLLATERAL MMA/i.test(desc)) return 'SVB';

    // PNC
    if (/^PNC/i.test(desc)) return 'PNC';

    // Bank Leumi
    if (/^Bank Leumi/i.test(desc)) return 'Bank Leumi';

    // BofA
    if (/^BofA/i.test(desc)) return 'BofA';

    // BBVA
    if (/^BBVA/i.test(desc)) return 'BBVA';

    // BRB
    if (/^BRB/i.test(desc)) return 'BRB';

    // Grasshopper (contains "Grasshopper" or "MRB Processing")
    if (desc.indexOf('Grasshopper') !== -1 || desc.indexOf('MRB Processing') !== -1) return 'Grasshopper';

    // MidFirst / Midfirst / Symmetry
    if (/^MidFirst/i.test(desc) || /^Midfirst/i.test(desc) || /^Symmetry/i.test(desc)) return 'MidFirst';

    // BTC (Benefit Trust Company): "BTC", "GDL", "IRA PASS"
    // All BTC accounts now start with "BTC"; keeping "GDL" and "IRA PASS" for backward compat with live API
    if (/^BTC/i.test(desc) || /^GDL/i.test(desc) || /^IRA PASS/i.test(desc)) {
      return 'BTC';
    }


    // Scotiabank
    if (/^Scotiabank/i.test(desc)) return 'Scotiabank';

    // Stripe (contains "Stripe" but NOT "Guideline")
    if (desc.indexOf('Stripe') !== -1 && desc.indexOf('Guideline') === -1) return 'Stripe';

    // Morgan Stanley
    if (desc.indexOf('Morgan Stanley') !== -1) return 'Morgan Stanley';

    // Pathward
    if (/^Pathward/i.test(desc)) return 'Pathward';

    // GH Program / Recovery Wire In -> Grasshopper
    if (/^GH Program/i.test(desc) || /^Recovery Wire In/i.test(desc)) return 'Grasshopper';

    return 'Other';
  }

  var BANK_ABBREV = {
    'JPM': 'JPM', 'PNC': 'PNC', 'NBKC': 'NBK', 'BRB': 'BRB', 'BTC': 'BTC',
    'BNY': 'BNY', 'SVB': 'SVB', 'BBVA': 'BBV', 'BofA': 'BoA', 'MidFirst': 'MDF',
    'Morgan Stanley': 'MST', 'Grasshopper': 'GRS', 'Scotiabank': 'SCO',
    'Stripe': 'STR', 'Bank Leumi': 'LMI', 'Pathward': 'PTH', 'Other': 'OTH'
  };

  function getAbbrev(bankName) {
    return BANK_ABBREV[bankName] || bankName.substring(0, 3).toUpperCase();
  }

  function discoverBanks(rawData) {
    var bankSet = {};
    rawData.forEach(function (r) {
      var b = getBankName(r.account_description);
      bankSet[b] = true;
    });
    return Object.keys(bankSet).sort();
  }

  function filterByBanks(rawData, selectedBanks) {
    if (!selectedBanks || selectedBanks.length === 0) return rawData;
    var set = {};
    selectedBanks.forEach(function (b) { set[b] = true; });
    return rawData.filter(function (r) {
      return set[getBankName(r.account_description)];
    });
  }

  function setupBankFilter(containerId, banks, onChange) {
    var container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    var allBtn = document.createElement('button');
    allBtn.className = 'bank-all-btn active';
    allBtn.textContent = 'ALL';
    container.appendChild(allBtn);

    var bankBtns = [];
    banks.forEach(function (bank) {
      var btn = document.createElement('button');
      btn.textContent = getAbbrev(bank);
      btn.setAttribute('data-bank', bank);
      btn.title = bank;
      container.appendChild(btn);
      bankBtns.push(btn);
    });

    var allMode = true;

    function getSelected() {
      if (allMode) return null;
      var sel = [];
      bankBtns.forEach(function (b) {
        if (b.classList.contains('active')) sel.push(b.getAttribute('data-bank'));
      });
      return sel.length > 0 ? sel : null;
    }

    allBtn.addEventListener('click', function () {
      allMode = true;
      allBtn.classList.add('active');
      bankBtns.forEach(function (b) { b.classList.remove('active'); });
      onChange(null);
    });

    bankBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        allMode = false;
        allBtn.classList.remove('active');
        btn.classList.toggle('active');
        var sel = getSelected();
        if (!sel) {
          allMode = true;
          allBtn.classList.add('active');
        }
        onChange(sel);
      });
    });
  }

  // ===== Data Loading =====

  function fetchJSON(url) {
    return fetch(url).then(function (res) {
      if (!res.ok) throw new Error('Failed to load ' + url);
      return res.json();
    });
  }

  /**
   * Load dashboard data from static JSON files.
   * The JSON files are kept up-to-date by the Apps Script pipeline
   * which commits directly to GitHub.
   *
   * Returns a promise that resolves to {corporate: [...], gustomer: [...]}.
   */
  function loadDashboardData() {
    return Promise.all([
      fetchJSON('data/corporate_cash.json'),
      fetchJSON('data/gustomer_cash.json')
    ]).then(function (results) {
      return {
        corporate: results[0],
        gustomer: results[1]
      };
    });
  }

  // ===== Forecasting =====

  function addBusinessDays(startDate, n) {
    var d = new Date(startDate);
    var added = 0;
    while (added < n) {
      d.setDate(d.getDate() + 1);
      var dow = d.getDay();
      if (dow !== 0 && dow !== 6) added++;
    }
    return d;
  }

  function toDateStr(d) {
    var y = d.getFullYear();
    var m = ('0' + (d.getMonth() + 1)).slice(-2);
    var day = ('0' + d.getDate()).slice(-2);
    return y + '-' + m + '-' + day;
  }

  /**
   * Monte Carlo forecast with deterministic replay center line.
   *
   * Center line: replays the most recent historical daily % changes
   * in a loop (cycles the last year of moves forward), plus a growth
   * drift. This preserves the exact day-to-day volatility pattern.
   *
   * Bands: 200 block-bootstrap simulations provide the 10th/90th
   * percentile envelope for uncertainty.
   */
  function generateForecast(historicalSeries, forecastDays) {
    var y = historicalSeries.map(function (d) { return d.total; });
    var n = y.length;
    var lastVal = y[n - 1];
    var lastDate = new Date(historicalSeries[n - 1].date + 'T00:00:00');

    var pctChanges = [];
    for (var i = 1; i < n; i++) {
      pctChanges.push(y[i - 1] !== 0 ? (y[i] - y[i - 1]) / Math.abs(y[i - 1]) : 0);
    }
    var nChanges = pctChanges.length;

    var dailyDrift = n > 21 ? (y[n - 1] / y[0] - 1) / (n - 1) : 0;

    // Center line: cycle the actual daily changes forward from where
    // history left off, adding growth drift each day
    var centerPath = new Array(forecastDays);
    var current = lastVal;
    for (var i = 0; i < forecastDays; i++) {
      var histChange = pctChanges[i % nChanges];
      current = current * (1 + histChange + dailyDrift);
      centerPath[i] = current;
    }

    // Monte Carlo bands: block bootstrap for uncertainty envelope
    var blockLen = 21;
    var nSims = 200;
    var maxStartIdx = nChanges - blockLen;
    if (maxStartIdx < 1) maxStartIdx = 1;

    var allPaths = [];
    var seed = 42;
    function lcgRand() {
      seed = (seed * 1664525 + 1013904223) & 0x7fffffff;
      return seed / 0x7fffffff;
    }

    for (var s = 0; s < nSims; s++) {
      var path = new Array(forecastDays);
      var cur = lastVal;
      var pos = 0;
      while (pos < forecastDays) {
        var blockStart = Math.floor(lcgRand() * maxStartIdx);
        for (var b = 0; b < blockLen && pos < forecastDays; b++) {
          cur = cur * (1 + pctChanges[blockStart + b] + dailyDrift);
          path[pos] = cur;
          pos++;
        }
      }
      allPaths.push(path);
    }

    var forecastPoints = [];
    for (var d = 0; d < forecastDays; d++) {
      var vals = new Array(nSims);
      for (var si = 0; si < nSims; si++) vals[si] = allPaths[si][d];
      vals.sort(function (a, b) { return a - b; });

      forecastPoints.push({
        date: toDateStr(addBusinessDays(lastDate, d + 1)),
        predicted: centerPath[d],
        upper: vals[Math.floor(nSims * 0.9)],
        lower: vals[Math.floor(nSims * 0.1)],
      });
    }
    return forecastPoints;
  }

  function buildForecastDatasets(historicalSeries, forecastDays, histColor, forecastColor) {
    var forecast = generateForecast(historicalSeries, forecastDays);
    var trailDays = Math.min(63, historicalSeries.length);
    var histTail = historicalSeries.slice(-trailDays);

    var allLabels = histTail.map(function (d) { return d.date; })
      .concat(forecast.map(function (d) { return d.date; }));

    var histValues = histTail.map(function (d) { return d.total; });
    var nHist = histTail.length;
    var nFore = forecast.length;

    var forecastValues = new Array(nHist).fill(null);
    forecastValues[nHist - 1] = histTail[nHist - 1].total;
    forecastValues = forecastValues.concat(forecast.map(function (d) { return d.predicted; }));

    var upperBand = new Array(nHist).fill(null);
    upperBand[nHist - 1] = histTail[nHist - 1].total;
    upperBand = upperBand.concat(forecast.map(function (d) { return d.upper; }));

    var lowerBand = new Array(nHist).fill(null);
    lowerBand[nHist - 1] = histTail[nHist - 1].total;
    lowerBand = lowerBand.concat(forecast.map(function (d) { return d.lower; }));

    var histData = histValues.concat(new Array(nFore).fill(null));

    return { labels: allLabels, histData: histData, forecastValues: forecastValues, upperBand: upperBand, lowerBand: lowerBand };
  }

  function createForecastChart(canvasId, label, historicalSeries, forecastDays, histColor, forecastColor) {
    var ctx = document.getElementById(canvasId).getContext('2d');
    var ds = buildForecastDatasets(historicalSeries, forecastDays, histColor, forecastColor);

    return new Chart(ctx, {
      type: 'line',
      data: {
        labels: ds.labels,
        datasets: [
          {
            label: label + ' (Historical)',
            data: ds.histData,
            borderColor: histColor,
            borderWidth: 2,
            pointRadius: 0,
            fill: false,
            tension: 0.3,
            order: 2,
          },
          {
            label: label + ' (Forecast)',
            data: ds.forecastValues,
            borderColor: forecastColor,
            borderWidth: 2.5,
            pointRadius: 0,
            fill: false,
            tension: 0.1,
            order: 1,
          },
          {
            label: '95% Upper',
            data: ds.upperBand,
            borderColor: 'transparent',
            backgroundColor: 'transparent',
            pointRadius: 0,
            fill: false,
            tension: 0.1,
            order: 3,
          },
          {
            label: '95% Lower',
            data: ds.lowerBand,
            borderColor: 'transparent',
            backgroundColor: forecastColor.replace('1)', '0.08)'),
            pointRadius: 0,
            fill: '-1',
            tension: 0.1,
            order: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { intersect: false, mode: 'index' },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              color: '#8a9bb8',
              font: { size: 11 },
              usePointStyle: true,
              pointStyle: 'line',
              filter: function (item) {
                return item.text.indexOf('95%') === -1;
              },
            },
          },
          tooltip: {
            backgroundColor: '#1a2744',
            titleColor: '#e8ecf4',
            bodyColor: '#8a9bb8',
            borderColor: '#1e3054',
            borderWidth: 1,
            padding: 12,
            displayColors: false,
            callbacks: {
              title: function (items) { return formatDate(items[0].label); },
              label: function (item) {
                if (item.raw == null) return null;
                var prefix = item.datasetIndex === 0 ? 'Actual' : 'Forecast';
                if (item.datasetIndex === 2) prefix = 'Upper 95%';
                if (item.datasetIndex === 3) prefix = 'Lower 95%';
                return prefix + ': ' + formatCurrency(item.raw);
              },
            },
          },
        },
        scales: {
          x: {
            grid: { color: 'rgba(30,48,84,0.3)', drawBorder: false },
            ticks: {
              color: '#5a6f8f',
              font: { size: 11, weight: 'bold' },
              maxTicksLimit: 12,
              callback: function (val) {
                var d = this.getLabelForValue(val);
                var p = d.split('-');
                return p[1] + '/' + p[2] + '/' + p[0];
              },
            },
          },
          y: {
            beginAtZero: false,
            grid: { color: 'rgba(30,48,84,0.3)', drawBorder: false },
            ticks: {
              color: '#5a6f8f',
              font: { size: 13, weight: 'bold' },
              callback: function (value) {
                if (Math.abs(value) >= 1e9) return '$' + (value / 1e9).toFixed(1) + 'B';
                return '$' + (value / 1e6).toFixed(0) + 'M';
              },
            },
          },
        },
      },
    });
  }

  function updateForecastChart(chart, historicalSeries, forecastDays, histColor, forecastColor) {
    var ds = buildForecastDatasets(historicalSeries, forecastDays, histColor, forecastColor);
    chart.data.labels = ds.labels;
    chart.data.datasets[0].data = ds.histData;
    chart.data.datasets[1].data = ds.forecastValues;
    chart.data.datasets[2].data = ds.upperBand;
    chart.data.datasets[3].data = ds.lowerBand;
    chart.update();
  }

  function setupForecastButtons(containerId, chart, series, histColor, forecastColor) {
    var container = document.getElementById(containerId);
    if (!container) return;
    var buttons = Array.prototype.slice.call(container.querySelectorAll('button'));
    for (var i = 0; i < buttons.length; i++) {
      (function (btn) {
        btn.addEventListener('click', function (e) {
          e.preventDefault();
          for (var j = 0; j < buttons.length; j++) {
            buttons[j].classList.remove('active');
          }
          btn.classList.add('active');
          var days = parseInt(btn.getAttribute('data-days'));
          updateForecastChart(chart, series, days, histColor, forecastColor);
        });
      })(buttons[i]);
    }
  }

  // ===== Chart Rendering =====

  function createLineChart(canvasId, label, seriesData, color, bgColor) {
    var ctx = document.getElementById(canvasId).getContext('2d');

    var gradient = ctx.createLinearGradient(0, 0, 0, 280);
    gradient.addColorStop(0, bgColor);
    gradient.addColorStop(1, 'rgba(0,0,0,0)');

    return new Chart(ctx, {
      type: 'line',
      data: {
        labels: seriesData.map(function (d) { return d.date; }),
        datasets: [
          {
            label: label,
            data: seriesData.map(function (d) { return d.total; }),
            borderColor: color,
            backgroundColor: gradient,
            borderWidth: 2.5,
            pointBackgroundColor: color,
            pointBorderColor: '#0b1121',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
            fill: true,
            tension: 0.35,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          intersect: false,
          mode: 'index',
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1a2744',
            titleColor: '#e8ecf4',
            bodyColor: '#8a9bb8',
            borderColor: '#1e3054',
            borderWidth: 1,
            padding: 12,
            displayColors: false,
            callbacks: {
              title: function (items) {
                return formatDate(items[0].label);
              },
              label: function (item) {
                return label + ': ' + formatCurrency(item.raw);
              },
            },
          },
        },
        scales: {
          x: {
            grid: { color: 'rgba(30,48,84,0.3)', drawBorder: false },
            ticks: {
              color: '#5a6f8f',
              font: { size: 13, weight: 'bold' },
              callback: function (val, i) {
                var d = this.getLabelForValue(val);
                var parts = d.split('-');
                return parts[1] + '/' + parts[2] + '/' + parts[0];
              },
            },
          },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(30,48,84,0.3)', drawBorder: false },
            ticks: {
              color: '#5a6f8f',
              font: { size: 13, weight: 'bold' },
              callback: function (value) {
                return '$' + (value / 1e6).toFixed(1) + 'M';
              },
            },
          },
        },
      },
    });
  }

  // ===== Table Rendering (Grouped by Bank) =====

  // Track expanded state per table
  var expandedBanks = {};

  function renderTable(tbodyId, records, stalenessInfo) {
    var tbody = document.getElementById(tbodyId);
    if (!tbody) return;
    tbody.innerHTML = '';

    // stalenessInfo is optional: { bankName: { stale, lastChangedDate } }
    var staleMap = stalenessInfo || {};

    // Initialize expanded state tracker for this table if not present
    if (!expandedBanks[tbodyId]) {
      expandedBanks[tbodyId] = {};
    }

    // Group records by bank name
    var bankGroups = {};
    var bankOrder = [];
    records.forEach(function (row) {
      var bank = getBankName(row.account_description);
      if (!bankGroups[bank]) {
        bankGroups[bank] = [];
        bankOrder.push(bank);
      }
      bankGroups[bank].push(row);
    });

    // Calculate total for each bank
    var bankTotals = {};
    bankOrder.forEach(function (bank) {
      bankTotals[bank] = bankGroups[bank].reduce(function (sum, r) { return sum + r.value; }, 0);
    });

    // Sort banks by total balance descending
    bankOrder.sort(function (a, b) {
      return bankTotals[b] - bankTotals[a];
    });

    // Grand total row (at top of table)
    var total = records.reduce(function (s, r) { return s + r.value; }, 0);
    var trTotal = document.createElement('tr');
    trTotal.className = 'grand-total-row';
    trTotal.style.fontWeight = '700';
    trTotal.style.borderBottom = '2px solid #1e3054';
    var tdLabel = document.createElement('td');
    tdLabel.textContent = 'Total';
    tdLabel.style.color = '#e8ecf4';
    var tdTotalVal = document.createElement('td');
    tdTotalVal.textContent = formatCurrencyFull(total);
    tdTotalVal.style.color = '#e8ecf4';
    trTotal.appendChild(tdLabel);
    trTotal.appendChild(tdTotalVal);
    tbody.appendChild(trTotal);

    // Render each bank group
    bankOrder.forEach(function (bank) {
      var bankAccounts = bankGroups[bank];
      var bankTotal = bankTotals[bank];
      var isExpanded = expandedBanks[tbodyId][bank] || false;

      // Bank header row
      var trBank = document.createElement('tr');
      trBank.className = 'bank-row';
      if (isExpanded) trBank.classList.add('expanded');

      var tdBankName = document.createElement('td');
      var chevron = document.createElement('span');
      chevron.className = 'chevron';
      chevron.textContent = isExpanded ? '\u25BC' : '\u25B6';
      tdBankName.appendChild(chevron);

      var bankNameText = document.createTextNode(' ' + bank + ' ');
      tdBankName.appendChild(bankNameText);

      var badge = document.createElement('span');
      badge.className = 'account-count';
      badge.textContent = bankAccounts.length;
      tdBankName.appendChild(badge);

      // Stale balance alert icon
      if (staleMap[bank] && staleMap[bank].stale) {
        var staleIcon = document.createElement('span');
        staleIcon.className = 'stale-icon';
        staleIcon.textContent = '⚠';
        staleIcon.title = 'Balance unchanged since ' + formatDate(staleMap[bank].lastChangedDate);
        tdBankName.appendChild(staleIcon);
      }

      var tdBankVal = document.createElement('td');
      tdBankVal.textContent = formatCurrencyFull(bankTotal);

      trBank.appendChild(tdBankName);
      trBank.appendChild(tdBankVal);
      tbody.appendChild(trBank);

      // Account rows (hidden by default unless expanded)
      var accountRows = [];
      var acctStaleMap = staleMap._accountStale || {};
      bankAccounts.forEach(function (row) {
        var tr = document.createElement('tr');
        tr.className = 'account-row' + (isExpanded ? ' visible' : '');
        var tdName = document.createElement('td');
        tdName.textContent = row.account_description;
        if (acctStaleMap[row.account_description]) {
          var acctIcon = document.createElement('span');
          acctIcon.className = 'stale-icon';
          acctIcon.textContent = '⚠';
          acctIcon.title = 'Balance unchanged from prior day';
          tdName.appendChild(acctIcon);
        }
        var tdVal = document.createElement('td');
        tdVal.textContent = formatCurrencyFull(row.value);
        tr.appendChild(tdName);
        tr.appendChild(tdVal);
        tbody.appendChild(tr);
        accountRows.push(tr);
      });

      // Click handler for bank row to toggle expand/collapse
      (function (bankKey, chevronEl, rows, bankRow) {
        trBank.addEventListener('click', function () {
          var nowExpanded = !expandedBanks[tbodyId][bankKey];
          expandedBanks[tbodyId][bankKey] = nowExpanded;

          if (nowExpanded) {
            bankRow.classList.add('expanded');
            chevronEl.textContent = '\u25BC';
            rows.forEach(function (r) { r.classList.add('visible'); });
          } else {
            bankRow.classList.remove('expanded');
            chevronEl.textContent = '\u25B6';
            rows.forEach(function (r) { r.classList.remove('visible'); });
          }
        });
      })(bank, chevron, accountRows, trBank);
    });

  }

  // ===== KPI Rendering =====

  function setKPI(id, value) {
    var el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  // ===== Main Initialization =====

  function init() {
    loadDashboardData()
      .then(function (data) {
        var corpDataAll = data.corporate;
        var gustData = data.gustomer;

        // The sheet's grand total excludes the Gusto Capital LLC section
        // (rows 2-11). Filter them from aggregation/KPIs so totals match
        // the sheet, but keep them in the detail table for visibility.
        var gustoCapitalAccounts = {
          'Chase Flex Pay Revenue Gusto Capital LLC 0393': true,
          'Chase DDA 0195': true,
          'Chase Gusto Capital, LLC 3962': true,
          'NBKC ACH Risk Reserve -7431': true,
          'NBKC Rev Share (Inbound) -7432': true,
          'NBKC Tabapay Reserve -2280 (Gusto Capital LLC)': true,
          'NBKC Corepro Reserve -6131 (Gusto Capital LLC)': true,
          'NBKC Corepro Incentives -6666 (Gusto Capital LLC)': true,
          'NBKC Corepro Tabapay -5431 (Gusto Capital LLC)': true,
          'Chase Gusto Canada ULC -(CAD) 1602': true,
          'NBKC Sunrise Reserve Account 4319': true,
        };
        var corpData = corpDataAll.filter(function (r) {
          return !gustoCapitalAccounts[r.account_description];
        });

        // Aggregated time series
        var corpSeries = aggregateByDate(corpData);
        var gustSeries = aggregateByDate(gustData);

        // Latest date data (use filtered for totals, all for table)
        var corpLatest = getLatestDateRecords(corpData);
        var corpLatestAll = getLatestDateRecords(corpDataAll);
        var gustLatest = getLatestDateRecords(gustData);

        var corpTotal = corpLatest.records.reduce(function (s, r) { return s + r.value; }, 0);
        var gustTotal = gustLatest.records.reduce(function (s, r) { return s + r.value; }, 0);
        var combined = corpTotal + gustTotal;

        // Daily change (compare last two dates in corporate series)
        var dailyChange = 0;
        if (corpSeries.length >= 2 && gustSeries.length >= 2) {
          var prevCorp = corpSeries[corpSeries.length - 2].total;
          var prevGust = gustSeries[gustSeries.length - 2].total;
          var prevCombined = prevCorp + prevGust;
          dailyChange = combined - prevCombined;
        }

        // Update KPI cards
        setKPI('kpi-corporate', formatCurrency(corpTotal));
        setKPI('kpi-gustomer', formatCurrency(gustTotal));
        setKPI('kpi-combined', formatCurrency(combined));

        var changeEl = document.getElementById('kpi-change');
        if (changeEl) {
          var sign = dailyChange >= 0 ? '+' : '';
          changeEl.textContent = sign + formatCurrency(dailyChange);
          changeEl.classList.add(dailyChange >= 0 ? 'positive' : 'negative');
        }

        // Sub labels with account counts
        var corpSub = document.getElementById('kpi-corp-sub');
        if (corpSub) corpSub.textContent = corpLatestAll.records.length + ' accounts as of ' + formatDate(corpLatest.date);
        var gustSub = document.getElementById('kpi-gust-sub');
        if (gustSub) gustSub.textContent = gustLatest.records.length + ' accounts as of ' + formatDate(gustLatest.date);

        // Collect all unique dates for date pickers
        var corpAllDates = getUniqueDates(corpDataAll);
        var gustAllDates = getUniqueDates(gustData);

        // Helper: render corporate table for a given date with staleness
        function renderCorpTableForDate(dateStr) {
          var dateRecords = getRecordsForDate(corpDataAll, dateStr);
          var staleness = computeStaleness(corpDataAll, dateStr, corpAllDates);
          renderTable('tbody-corporate', dateRecords.records, staleness);
        }

        // Helper: render gustomer table for a given date with staleness
        function renderGustTableForDate(dateStr) {
          var dateRecords = getRecordsForDate(gustData, dateStr);
          var staleness = computeStaleness(gustData, dateStr, gustAllDates);
          renderTable('tbody-gustomer', dateRecords.records, staleness);
        }

        // Populate date pickers
        populateDatePicker('corp-table-date', corpAllDates, corpLatestAll.date, function (newDate) {
          renderCorpTableForDate(newDate);
        });
        populateDatePicker('gust-table-date', gustAllDates, gustLatest.date, function (newDate) {
          renderGustTableForDate(newDate);
        });

        // Render Charts
        var corpChart = createLineChart(
          'chart-corporate',
          'Corporate Cash',
          corpSeries,
          '#22d3ee',
          'rgba(34,211,238,0.12)'
        );
        var gustChart = createLineChart(
          'chart-gustomer',
          'Gustomer Cash',
          gustSeries,
          '#10b981',
          'rgba(16,185,129,0.12)'
        );

        // Range button controls for chart time horizon
        function updateChartData(chart, fullSeries, days) {
          var available = Math.min(days, fullSeries.length);
          var sliced = fullSeries.slice(-available);
          chart.data.labels = sliced.map(function (d) { return d.date; });
          chart.data.datasets[0].data = sliced.map(function (d) { return d.total; });
          chart.update();
        }

        // State for each trend chart: current range days + selected banks
        var corpTrendState = { days: 5, banks: null };
        var gustTrendState = { days: 5, banks: null };

        function refreshTrendChart(chart, rawData, gcFilter, state) {
          var filtered = state.banks ? filterByBanks(rawData, state.banks) : rawData;
          if (gcFilter) {
            filtered = filtered.filter(function (r) { return !gcFilter[r.account_description]; });
          }
          var series = aggregateByDate(filtered);
          updateChartData(chart, series, state.days);
        }

        function setupRangeButtons(containerId, chart, rawData, gcFilter, state) {
          var container = document.getElementById(containerId);
          if (!container) return;
          var buttons = Array.prototype.slice.call(container.querySelectorAll('button'));
          for (var i = 0; i < buttons.length; i++) {
            (function (btn) {
              btn.addEventListener('click', function (e) {
                e.preventDefault();
                for (var j = 0; j < buttons.length; j++) buttons[j].classList.remove('active');
                btn.classList.add('active');
                state.days = parseInt(btn.getAttribute('data-days'));
                refreshTrendChart(chart, rawData, gcFilter, state);
              });
            })(buttons[i]);
          }
        }

        setupRangeButtons('range-buttons-corporate', corpChart, corpDataAll, gustoCapitalAccounts, corpTrendState);
        setupRangeButtons('range-buttons-gustomer', gustChart, gustData, null, gustTrendState);

        updateChartData(corpChart, corpSeries, 5);
        updateChartData(gustChart, gustSeries, 5);

        // Bank filters for trend charts
        var corpBanks = discoverBanks(corpData);
        var gustBanks = discoverBanks(gustData);

        setupBankFilter('bank-filter-corporate', corpBanks, function (sel) {
          corpTrendState.banks = sel;
          refreshTrendChart(corpChart, corpDataAll, gustoCapitalAccounts, corpTrendState);
        });
        setupBankFilter('bank-filter-gustomer', gustBanks, function (sel) {
          gustTrendState.banks = sel;
          refreshTrendChart(gustChart, gustData, null, gustTrendState);
        });

        // Forecast charts state
        var corpFcState = { days: 252, banks: null };
        var gustFcState = { days: 252, banks: null };
        var corpFcColor = 'rgba(245, 158, 11, 1)';
        var gustFcColor = 'rgba(167, 139, 250, 1)';

        function rebuildForecast(chart, rawData, gcFilter, state, histColor, fcColor) {
          var filtered = state.banks ? filterByBanks(rawData, state.banks) : rawData;
          if (gcFilter) {
            filtered = filtered.filter(function (r) { return !gcFilter[r.account_description]; });
          }
          var series = aggregateByDate(filtered);
          updateForecastChart(chart, series, state.days, histColor, fcColor);
        }

        function formatSliderLabel(valM) {
          return valM >= 1000 ? '$' + (valM / 1000).toFixed(1) + 'B' : '$' + valM + 'M';
        }

        function setupYSlider(sliderId, labelId, chart) {
          var slider = document.getElementById(sliderId);
          var label = document.getElementById(labelId);
          if (!slider || !chart) return;
          slider.addEventListener('input', function () {
            var maxVal = parseInt(slider.value) * 1e6;
            label.textContent = formatSliderLabel(parseInt(slider.value));
            chart.options.scales.y.max = maxVal;
            chart.options.scales.y.min = 0;
            chart.update();
          });
        }

        setTimeout(function () {
          var corpFcChart = createForecastChart(
            'chart-corporate-forecast', 'Corporate Cash',
            corpSeries, 252, '#22d3ee', corpFcColor
          );

          setupYSlider('yslider-corp-forecast', 'yslider-corp-val', corpFcChart);

          var corpFcContainer = document.getElementById('range-buttons-corp-forecast');
          if (corpFcContainer) {
            var btns = Array.prototype.slice.call(corpFcContainer.querySelectorAll('button'));
            btns.forEach(function (btn) {
              btn.addEventListener('click', function (e) {
                e.preventDefault();
                btns.forEach(function (b) { b.classList.remove('active'); });
                btn.classList.add('active');
                corpFcState.days = parseInt(btn.getAttribute('data-days'));
                rebuildForecast(corpFcChart, corpDataAll, gustoCapitalAccounts, corpFcState, '#22d3ee', corpFcColor);
              });
            });
          }

          setupBankFilter('bank-filter-corp-forecast', corpBanks, function (sel) {
            corpFcState.banks = sel;
            rebuildForecast(corpFcChart, corpDataAll, gustoCapitalAccounts, corpFcState, '#22d3ee', corpFcColor);
          });

          var gustFcChart = createForecastChart(
            'chart-gustomer-forecast', 'Gustomer Cash',
            gustSeries, 252, '#10b981', gustFcColor
          );

          setupYSlider('yslider-gust-forecast', 'yslider-gust-val', gustFcChart);

          var gustFcContainer = document.getElementById('range-buttons-gust-forecast');
          if (gustFcContainer) {
            var gBtns = Array.prototype.slice.call(gustFcContainer.querySelectorAll('button'));
            gBtns.forEach(function (btn) {
              btn.addEventListener('click', function (e) {
                e.preventDefault();
                gBtns.forEach(function (b) { b.classList.remove('active'); });
                btn.classList.add('active');
                gustFcState.days = parseInt(btn.getAttribute('data-days'));
                rebuildForecast(gustFcChart, gustData, null, gustFcState, '#10b981', gustFcColor);
              });
            });
          }

          setupBankFilter('bank-filter-gust-forecast', gustBanks, function (sel) {
            gustFcState.banks = sel;
            rebuildForecast(gustFcChart, gustData, null, gustFcState, '#10b981', gustFcColor);
          });
        }, 50);

        // Render Tables (show all accounts including Gusto Capital section)
        renderCorpTableForDate(corpLatestAll.date);
        renderGustTableForDate(gustLatest.date);

        // Export controls
        var allDatesAsc = corpAllDates.slice().reverse();
        var exportStart = document.getElementById('export-start');
        var exportEnd = document.getElementById('export-end');
        if (exportStart && exportEnd && allDatesAsc.length > 0) {
          exportStart.value = allDatesAsc[0];
          exportEnd.value = allDatesAsc[allDatesAsc.length - 1];
          exportStart.min = allDatesAsc[0];
          exportStart.max = allDatesAsc[allDatesAsc.length - 1];
          exportEnd.min = allDatesAsc[0];
          exportEnd.max = allDatesAsc[allDatesAsc.length - 1];
        }
        var exportBtn = document.getElementById('export-csv-btn');
        if (exportBtn) {
          exportBtn.addEventListener('click', function () {
            var typeEl = document.getElementById('export-type');
            var dataType = typeEl ? typeEl.value : 'all';
            var startDate = exportStart ? exportStart.value : allDatesAsc[0];
            var endDate = exportEnd ? exportEnd.value : allDatesAsc[allDatesAsc.length - 1];
            if (startDate > endDate) {
              var tmp = startDate;
              startDate = endDate;
              endDate = tmp;
            }
            var csv = generateCSV(corpDataAll, gustData, startDate, endDate, dataType);
            var filename = 'treasury_balances_' + startDate + '_to_' + endDate + '.csv';
            downloadCSV(csv, filename);
          });
        }
      })
      .catch(function (err) {
        console.error('Dashboard error:', err);
        var dash = document.querySelector('.dashboard');
        if (dash) {
          dash.innerHTML =
            '<div class="loading" style="color:#ef4444;">Error loading data. ' +
            'Make sure JSON files are accessible. ' +
            err.message +
            '</div>';
        }
      });
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
