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

    // GH Program -> Grasshopper
    if (/^GH Program/i.test(desc)) return 'Grasshopper';

    return 'Other';
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
   * Holt-Winters additive method with 21-day (monthly) seasonality.
   * Captures payroll-cycle driven swings and long-term growth trend.
   */
  function holtWinters(y, seasonLen, alpha, beta, gamma) {
    var n = y.length;

    if (n < seasonLen * 2) {
      var slope = n > 21 ? (y[n - 1] - y[0]) / (n - 1) : 0;
      return {
        level: y[n - 1], trend: slope,
        seasonal: new Array(seasonLen).fill(0),
        residualStdDev: 0, lastSeasonIndex: (n - 1) % seasonLen
      };
    }

    var seasonal = new Array(seasonLen).fill(0);
    var nFullSeasons = Math.floor(n / seasonLen);
    var initSeasons = Math.min(nFullSeasons, 4);
    for (var j = 0; j < seasonLen; j++) {
      var sum = 0, cnt = 0;
      for (var k = 0; k < initSeasons; k++) {
        var idx = k * seasonLen + j;
        if (idx < n) {
          var blockSum = 0;
          for (var b = 0; b < seasonLen; b++) {
            var bi = k * seasonLen + b;
            blockSum += bi < n ? y[bi] : y[n - 1];
          }
          sum += y[idx] - blockSum / seasonLen;
          cnt++;
        }
      }
      seasonal[j] = cnt > 0 ? sum / cnt : 0;
    }

    var level = 0;
    for (var i = 0; i < seasonLen; i++) level += y[i];
    level /= seasonLen;

    var trend = 0;
    for (var t = 0; t < seasonLen; t++) {
      if (t + seasonLen < n) trend += (y[t + seasonLen] - y[t]);
    }
    trend /= (seasonLen * seasonLen);

    var residuals = [];
    for (var t = seasonLen; t < n; t++) {
      var si = t % seasonLen;
      var forecast = level + trend + seasonal[si];
      residuals.push(y[t] - forecast);
      var prevLevel = level;
      level = alpha * (y[t] - seasonal[si]) + (1 - alpha) * (level + trend);
      trend = beta * (level - prevLevel) + (1 - beta) * trend;
      seasonal[si] = gamma * (y[t] - level) + (1 - gamma) * seasonal[si];
    }

    var sumSq = 0;
    for (var r = 0; r < residuals.length; r++) sumSq += residuals[r] * residuals[r];
    var stdDev = residuals.length > 2 ? Math.sqrt(sumSq / residuals.length) : 0;

    return {
      level: level, trend: trend,
      seasonal: seasonal.slice(),
      residualStdDev: stdDev,
      lastSeasonIndex: (n - 1) % seasonLen
    };
  }

  function optimizeHoltWinters(y, seasonLen) {
    var bestRmse = Infinity, bestParams = { alpha: 0.3, beta: 0.02, gamma: 0.3 };
    var alphas = [0.15, 0.3, 0.5];
    var betas = [0.01, 0.03];
    var gammas = [0.15, 0.3, 0.5];

    for (var ai = 0; ai < alphas.length; ai++) {
      for (var bi = 0; bi < betas.length; bi++) {
        for (var gi = 0; gi < gammas.length; gi++) {
          var hw = holtWinters(y, seasonLen, alphas[ai], betas[bi], gammas[gi]);
          if (hw.residualStdDev < bestRmse) {
            bestRmse = hw.residualStdDev;
            bestParams = { alpha: alphas[ai], beta: betas[bi], gamma: gammas[gi] };
          }
        }
      }
    }
    return bestParams;
  }

  function generateForecast(historicalSeries, forecastDays) {
    var seasonLen = 21;
    var y = historicalSeries.map(function (d) { return d.total; });
    var n = y.length;

    var params = optimizeHoltWinters(y, seasonLen);
    var hw = holtWinters(y, seasonLen, params.alpha, params.beta, params.gamma);

    var lastDate = new Date(historicalSeries[n - 1].date + 'T00:00:00');

    var forecastPoints = [];
    for (var i = 1; i <= forecastDays; i++) {
      var futureDate = addBusinessDays(lastDate, i);
      var si = (hw.lastSeasonIndex + i) % seasonLen;
      var predicted = hw.level + hw.trend * i + hw.seasonal[si];
      var band = 1.96 * hw.residualStdDev * Math.sqrt(i / seasonLen);
      forecastPoints.push({
        date: toDateStr(futureDate),
        predicted: predicted,
        upper: predicted + band,
        lower: predicted - band,
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

  function renderTable(tbodyId, records) {
    var tbody = document.getElementById(tbodyId);
    if (!tbody) return;
    tbody.innerHTML = '';

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

      var tdBankVal = document.createElement('td');
      tdBankVal.textContent = formatCurrencyFull(bankTotal);

      trBank.appendChild(tdBankName);
      trBank.appendChild(tdBankVal);
      tbody.appendChild(trBank);

      // Account rows (hidden by default unless expanded)
      var accountRows = [];
      bankAccounts.forEach(function (row) {
        var tr = document.createElement('tr');
        tr.className = 'account-row' + (isExpanded ? ' visible' : '');
        var tdName = document.createElement('td');
        tdName.textContent = row.account_description;
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

        // Update table date headers
        var corpDateEl = document.getElementById('corp-table-date');
        if (corpDateEl && corpLatestAll.date) corpDateEl.textContent = formatDate(corpLatestAll.date);
        var gustDateEl = document.getElementById('gust-table-date');
        if (gustDateEl && gustLatest.date) gustDateEl.textContent = formatDate(gustLatest.date);

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

        function setupRangeButtons(containerId, chart, series) {
          var container = document.getElementById(containerId);
          if (!container) { console.error('Range buttons container not found:', containerId); return; }
          var buttons = Array.prototype.slice.call(container.querySelectorAll('button'));
          console.log('Setting up', buttons.length, 'range buttons for', containerId, 'with', series.length, 'data points');
          for (var i = 0; i < buttons.length; i++) {
            (function (btn) {
              btn.addEventListener('click', function (e) {
                e.preventDefault();
                for (var j = 0; j < buttons.length; j++) {
                  buttons[j].classList.remove('active');
                }
                btn.classList.add('active');
                var days = parseInt(btn.getAttribute('data-days'));
                console.log('Range button clicked:', btn.textContent, 'days:', days);
                updateChartData(chart, series, days);
              });
            })(buttons[i]);
          }
        }

        setupRangeButtons('range-buttons-corporate', corpChart, corpSeries);
        setupRangeButtons('range-buttons-gustomer', gustChart, gustSeries);

        // Apply default 1W view on initial load
        updateChartData(corpChart, corpSeries, 5);
        updateChartData(gustChart, gustSeries, 5);

        // Render Forecast Charts after a short delay so trend charts stay responsive
        var corpFcColor = 'rgba(245, 158, 11, 1)';
        var gustFcColor = 'rgba(167, 139, 250, 1)';

        setTimeout(function () {
          var corpFcChart = createForecastChart(
            'chart-corporate-forecast', 'Corporate Cash',
            corpSeries, 252, '#22d3ee', corpFcColor
          );
          setupForecastButtons('range-buttons-corp-forecast', corpFcChart, corpSeries, '#22d3ee', corpFcColor);

          var gustFcChart = createForecastChart(
            'chart-gustomer-forecast', 'Gustomer Cash',
            gustSeries, 252, '#10b981', gustFcColor
          );
          setupForecastButtons('range-buttons-gust-forecast', gustFcChart, gustSeries, '#10b981', gustFcColor);
        }, 50);

        // Render Tables (show all accounts including Gusto Capital section)
        renderTable('tbody-corporate', corpLatestAll.records);
        renderTable('tbody-gustomer', gustLatest.records);
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
