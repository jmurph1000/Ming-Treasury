/**
 * Treasury Flash Dashboard
 * Loads corporate and gustomer cash data, calculates KPIs,
 * renders Chart.js line charts and account detail tables.
 *
 * Data source priority:
 * 1. Google Apps Script web app (live from Google Sheet) if APPS_SCRIPT_URL is set
 * 2. Static JSON files (data/corporate_cash.json, data/gustomer_cash.json) as fallback
 */

(function () {
  'use strict';

  // ===== Data Source Configuration =====
  //
  // After deploying the Apps Script (see apps-script/sheet_data_api.gs),
  // paste the deployed web app URL here. Set to null to use static JSON only.
  //
  // Example: 'https://script.google.com/macros/s/AKfycbx.../exec'
  var APPS_SCRIPT_URL = 'https://script.google.com/a/macros/gusto.com/s/AKfycbwPVAD6xflKgIhcgb7OJOd43QllgB3wqfs-iWv8U3yrsx_J5kDvHMk0UYbzPJ_SgZCfeg/exec';

  // Number of business days to fetch from the Apps Script (ignored for static JSON)
  var APPS_SCRIPT_DAYS = 12;

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
   * Fetch data from the Apps Script web app.
   * Returns a promise that resolves to {corporate: [...], gustomer: [...]}.
   */
  function fetchFromAppsScript(url, days) {
    var fullUrl = url + '?days=' + (days || APPS_SCRIPT_DAYS);
    return fetch(fullUrl)
      .then(function (res) {
        if (!res.ok) throw new Error('Apps Script returned HTTP ' + res.status);
        return res.json();
      })
      .then(function (data) {
        if (data.error) {
          throw new Error('Apps Script error: ' + data.error);
        }
        return {
          corporate: data.corporate || [],
          gustomer: data.gustomer || []
        };
      });
  }

  /**
   * Fetch data from static JSON files (original approach).
   * Returns a promise that resolves to {corporate: [...], gustomer: [...]}.
   */
  function fetchFromStaticJSON() {
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

  /**
   * Load dashboard data with fallback:
   *   1. Try Apps Script URL if configured
   *   2. Fall back to static JSON files on failure
   */
  function loadDashboardData() {
    if (APPS_SCRIPT_URL) {
      var usedFallback = false;
      return fetchFromAppsScript(APPS_SCRIPT_URL, APPS_SCRIPT_DAYS)
        .catch(function (err) {
          console.warn('Apps Script fetch failed, falling back to static JSON:', err.message);
          usedFallback = true;
          updateDataSourceIndicator('static', err.message);
          return fetchFromStaticJSON();
        })
        .then(function (data) {
          if (!usedFallback) {
            updateDataSourceIndicator('live');
          }
          return data;
        });
    }
    updateDataSourceIndicator('static');
    return fetchFromStaticJSON();
  }

  /**
   * Update a small indicator in the UI showing the data source.
   */
  function updateDataSourceIndicator(source, errorMsg) {
    var el = document.getElementById('data-source-indicator');
    if (!el) return;
    if (source === 'live') {
      el.textContent = 'Live data from Google Sheet';
      el.className = 'data-source-live';
    } else {
      el.textContent = 'Static JSON data' + (errorMsg ? ' (live fetch failed)' : '');
      el.className = 'data-source-static';
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
        var corpData = data.corporate;
        var gustData = data.gustomer;

        // Aggregated time series
        var corpSeries = aggregateByDate(corpData);
        var gustSeries = aggregateByDate(gustData);

        // Latest date data
        var corpLatest = getLatestDateRecords(corpData);
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
        if (corpSub) corpSub.textContent = corpLatest.records.length + ' accounts as of ' + formatDate(corpLatest.date);
        var gustSub = document.getElementById('kpi-gust-sub');
        if (gustSub) gustSub.textContent = gustLatest.records.length + ' accounts as of ' + formatDate(gustLatest.date);

        // Update table date headers
        var corpDateEl = document.getElementById('corp-table-date');
        if (corpDateEl && corpLatest.date) corpDateEl.textContent = formatDate(corpLatest.date);
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

        // Render Tables
        renderTable('tbody-corporate', corpLatest.records);
        renderTable('tbody-gustomer', gustLatest.records);
      })
      .catch(function (err) {
        console.error('Dashboard error:', err);
        var dash = document.querySelector('.dashboard');
        if (dash) {
          dash.innerHTML =
            '<div class="loading" style="color:#ef4444;">Error loading data. ' +
            (APPS_SCRIPT_URL
              ? 'Check Apps Script URL and sheet permissions. '
              : 'Make sure JSON files are accessible. ') +
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
