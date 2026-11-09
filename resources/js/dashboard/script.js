import ApexCharts from 'apexcharts';

export function initializeDashboard() {
  // ============================================================
  // MOBILE NAVIGATION CONFIGURATION
  // ============================================================
  const mobileMainCollapses = {
    participantMobile: [
      'createParticipantMobile',
      'updateParticipantMobile',
      'detailsParticipantMobile',
    ],
    trainingMobile: [
      'createTrainingMobile',
      'updateTrainingMobile',
      'detailsTrainingMobile',
    ],
    evaluationMobile: [
      'createEvaluationMobile',
      'encodeEvaluationMobile',
      'detailsEvaluationMobile',
    ],
    administrationMobile: [
      'createAdministrationMobile',
      'updateAdministrationMobile',
      'detailsAdministrationMobile',
    ],
  };

  // ============================================================
  // DESKTOP HEADER NAVIGATION CONFIGURATION
  // ============================================================
  const headerMainCollapses = {
    participantHeaderCollapse: [
      'createParticipantHeaderCollapse',
      'updateParticipantHeaderCollapse',
      'detailsParticipantHeaderCollapse',
    ],
    trainingHeaderCollapse: [
      'createTrainingHeaderCollapse',
      'updateTrainingHeaderCollapse',
      'detailsTrainingHeaderCollapse',
    ],
    evaluationHeaderCollapse: [
      'createEvaluationHeaderCollapse',
      'encodeEvaluationHeaderCollapse',
      'detailsEvaluationHeaderCollapse',
    ],
    administrationHeaderCollapse: [
      'createAdministrationHeaderCollapse',
      'updateAdministrationHeaderCollapse',
      'detailsAdministrationHeaderCollapse',
    ],
  };

  // ============================================================
  // NOTIFICATION DROPDOWN AND DETAIL MODAL
  // Each dropdown item supplies its own content through data attributes.
  // ============================================================
  const notificationDetailModal = document.getElementById(
    'notificationDetailModal'
  );

  // ============================================================
  // DASHBOARD REPORT MODAL
  // One reusable DataTable is populated from the summary control selected.
  // Replace these sample rows with reporting data from the database as needed.
  // ============================================================
  const dashboardReports = {
    activities: {
      title: 'Total Capacity-Building Activities Conducted',
      exportName: 'Capacity-Building-Activities',
      description: 'Detailed capacity-building activities conducted from January to December.',
      icon: 'bi-mortarboard-fill',
      total: '32 activities',
      headers: ['Activity', 'District', 'Municipality', 'Schedule', 'Participants', 'Status'],
      rows: [
        ['Sustainable Rice Production', 'District I', 'Santa Maria', '15 Jan 2026', '28', 'Completed'],
        ['Organic Vegetable Farming', 'District II', 'San Isidro', '12 Feb 2026', '24', 'Completed'],
        ['Livestock Health Management', 'District III', 'San Miguel', '18 Mar 2026', '20', 'Completed'],
        ['Post-Harvest Handling', 'District IV', 'San Rafael', '22 Apr 2026', '26', 'Completed'],
        ['Farm Enterprise Planning', 'District V', 'San Jose', '09 May 2026', '22', 'Completed'],
      ],
    },
    participants: {
      title: 'Total Participants',
      exportName: 'Total-Participants',
      description: 'Farmer participants trained across all capacity-building activities.',
      icon: 'bi-people-fill',
      total: '120 participants',
      headers: ['Participant', 'Sex', 'Age Group', 'District', 'Activity', 'Attendance'],
      rows: [
        ['Maria Santos', 'Female', 'Adult', 'District I', 'Sustainable Rice Production', 'Present'],
        ['Juan Dela Cruz', 'Male', 'Adult', 'District II', 'Organic Vegetable Farming', 'Present'],
        ['Ana Reyes', 'Female', 'Youth', 'District III', 'Livestock Health Management', 'Present'],
        ['Pedro Garcia', 'Male', 'Senior', 'District IV', 'Post-Harvest Handling', 'Present'],
        ['Liza Mendoza', 'Female', 'Adult', 'District V', 'Farm Enterprise Planning', 'Present'],
      ],
    },
    fca: {
      title: 'Total FCA',
      exportName: 'Total-FCA',
      description: 'Farmer Cooperative and Association records uploaded across municipalities.',
      icon: 'bi-diagram-3-fill',
      total: '37 FCA records',
      headers: ['FCA Name', 'District', 'Municipality', 'Members', 'Commodity', 'Record Status'],
      rows: [
        ['Santa Maria Farmers Association', 'District I', 'Santa Maria', '42', 'Rice', 'Verified'],
        ['San Isidro Growers Cooperative', 'District II', 'San Isidro', '38', 'Vegetables', 'Verified'],
        ['San Miguel Livestock Raisers', 'District III', 'San Miguel', '31', 'Livestock', 'Pending review'],
        ['San Rafael Agri Producers', 'District IV', 'San Rafael', '47', 'Corn', 'Verified'],
        ['San Jose Organic Farmers', 'District V', 'San Jose', '29', 'Organic crops', 'Verified'],
      ],
    },
    budget: {
      title: 'Allocated Budget by District',
      exportName: 'Allocated-Budget-by-District',
      description: 'Total training funds allocated to each beneficiary district.',
      icon: 'bi-cash-coin',
      total: '₱950,000 allocated',
      headers: ['District', 'Allocated Budget', 'Released', 'Balance', 'Activities', 'Utilization'],
      rows: [
        ['District I', '₱180,000', '₱125,000', '₱55,000', '5', '69%'],
        ['District II', '₱155,000', '₱110,000', '₱45,000', '4', '71%'],
        ['District III', '₱140,000', '₱84,000', '₱56,000', '4', '60%'],
        ['District IV', '₱125,000', '₱88,000', '₱37,000', '3', '70%'],
        ['District V', '₱110,000', '₱66,000', '₱44,000', '3', '60%'],
        ['District VI', '₱95,000', '₱51,000', '₱44,000', '2', '54%'],
        ['District VII', '₱80,000', '₱40,000', '₱40,000', '2', '50%'],
        ['District VIII', '₱65,000', '₱20,000', '₱45,000', '1', '31%'],
      ],
    },
    provinceBudget: {
      title: 'Allocated Training Funds by Province',
      exportName: 'Allocated-Training-Funds-by-Province',
      description: 'Training fund allocation across Quezon, Laguna, and Batangas.',
      icon: 'bi-map-fill',
      total: '₱2.78M allocated',
      headers: ['Province', 'Allocated Funds', 'Municipalities Covered', 'Activities', 'Utilization'],
      rows: [
        ['Quezon', '₱1,736,142', '4', '14', '68%'],
        ['Laguna', '₱725,410', '2', '7', '63%'],
        ['Batangas', '₱315,013', '1', '3', '57%'],
      ],
    },
    municipalityBudget: {
      title: 'Allocated Training Funds by Municipality',
      exportName: 'Allocated-Training-Funds-by-Municipality',
      description: 'Training fund allocation for every covered beneficiary municipality.',
      icon: 'bi-geo-alt-fill',
      total: '₱2.78M allocated',
      headers: ['Municipality', 'Province', 'Allocated Funds', 'Activities', 'Utilization'],
      rows: [
        ['Quezon', 'Quezon', '₱525,012', '5', '72%'],
        ['Alabat', 'Quezon', '₱450,310', '4', '65%'],
        ['Perez', 'Quezon', '₱290,310', '3', '61%'],
        ['Jomalig', 'Quezon', '₱210,500', '2', '55%'],
        ['Pakil', 'Laguna', '₱385,010', '4', '69%'],
        ['Rizal', 'Laguna', '₱340,400', '3', '58%'],
        ['Tingloy', 'Batangas', '₱315,013', '3', '57%'],
      ],
    },
    ageSex: {
      title: 'Beneficiaries by Age and Sex',
      exportName: 'Beneficiaries-by-Age-and-Sex',
      description: 'Beneficiary distribution by age group and sex.',
      icon: 'bi-bar-chart-fill',
      total: '120 beneficiaries',
      headers: ['Age Group', 'Male', 'Female', 'Total', 'Share'],
      rows: [
        ['Youth (18–30)', '18', '22', '40', '33%'],
        ['Adult (31–59)', '35', '31', '66', '55%'],
        ['Senior (60+)', '12', '2', '14', '12%'],
      ],
    },
    sex: {
      title: 'Beneficiaries by Sex',
      exportName: 'Beneficiaries-by-Sex',
      description: 'Beneficiary distribution by sex across all districts.',
      icon: 'bi-pie-chart-fill',
      total: '120 beneficiaries',
      headers: ['Sex', 'Beneficiaries', 'Share', 'Primary District', 'Trend'],
      rows: [
        ['Male', '65', '54%', 'District II', 'Increasing'],
        ['Female', '55', '46%', 'District I', 'Increasing'],
      ],
    },
    groups: {
      title: 'Beneficiary Groups',
      exportName: 'Beneficiary-Groups',
      description: 'Beneficiary distribution across priority groups.',
      icon: 'bi-people-fill',
      total: '120 beneficiaries',
      headers: ['Beneficiary Group', 'Beneficiaries', 'Share', 'District Coverage', 'Support Focus'],
      rows: [
        ['4Ps', '48', '40%', '8 districts', 'Livelihood'],
        ['Indigenous Peoples', '30', '25%', '5 districts', 'Inclusive training'],
        ['Persons with Disabilities', '18', '15%', '4 districts', 'Accessible learning'],
        ['Senior Citizens', '24', '20%', '6 districts', 'Farm support'],
      ],
    },
  };

  const dashboardReportModal = document.getElementById('dashboardReportModal');
  const dashboardReportTable = document.getElementById('dashboardReportTable');
  let dashboardReportDataTable;

  if (dashboardReportModal && dashboardReportTable && typeof DataTable !== 'undefined') {
    dashboardReportModal.addEventListener('show.bs.modal', (event) => {
      const reportKey = event.relatedTarget?.dataset.reportKey;
      const report = dashboardReports[reportKey];
      if (!report) return;

      document.getElementById('dashboardReportModalTitle').textContent = report.title;
      document.getElementById('dashboardReportDescription').textContent = report.description;
      document.getElementById('dashboardReportTotal').textContent = report.total;
      document.getElementById('dashboardReportIcon').className = `bi ${report.icon}`;

      if (dashboardReportDataTable) dashboardReportDataTable.destroy();
      dashboardReportTable.replaceChildren();

      const tableHead = document.createElement('thead');
      const headerRow = document.createElement('tr');
      report.headers.forEach((header) => {
        const cell = document.createElement('th');
        cell.textContent = header;
        headerRow.appendChild(cell);
      });
      tableHead.appendChild(headerRow);

      const tableBody = document.createElement('tbody');
      report.rows.forEach((row) => {
        const tableRow = document.createElement('tr');
        row.forEach((value) => {
          const cell = document.createElement('td');
          cell.textContent = value;
          tableRow.appendChild(cell);
        });
        tableBody.appendChild(tableRow);
      });
      dashboardReportTable.append(tableHead, tableBody);

      dashboardReportDataTable = new DataTable(dashboardReportTable, {
        layout: {
          top: 'pageLength',
          topStart: {
            buttons: [
              {
                extend: 'excelHtml5',
                text: '<i class="bi bi-file-earmark-excel-fill" aria-hidden="true"></i><span>Export Excel</span>',
                titleAttr: 'Export this report to Excel',
                className: 'dashboard-report-excel',
                filename: report.exportName,
                title: report.title,
                sheetName: report.exportName,
              },
            ],
          },
          topEnd: 'search',
          bottomStart: ['pageLength', 'info'],
          bottomEnd: 'paging',
        },
        pageLength: 5,
        scrollX: true,
        scrollY: '42dvh',
        scrollCollapse: true,
        lengthMenu: [
          [5, 10, 50, 100, 500, 1000, -1],
          [5, 10, 50, 100, 500, 1000, 'All'],
        ],
        language: {
          search: 'Search records:',
          searchPlaceholder: 'Type to search',
          emptyTable: 'No records available for this report.',
        },
      });

      const reportTableContainer = dashboardReportTable.closest('.dt-container');
      const pageLengthControls = reportTableContainer?.querySelectorAll('.dt-length');
      const topPageLength = pageLengthControls?.[0];

      if (topPageLength) {
        const pageLengthRow = topPageLength.closest('.dt-layout-row');
        const pageLengthCell = topPageLength.closest('.dt-layout-cell');
        const toolbarRow = [...reportTableContainer.querySelectorAll('.dt-layout-row')]
          .find((row) => row.querySelector('.dt-buttons'));

        if (pageLengthCell && toolbarRow && pageLengthRow !== toolbarRow) {
          topPageLength.classList.add('dashboard-report-length-top');
          toolbarRow.appendChild(pageLengthCell);
          pageLengthRow?.remove();
        }
      }
    });
  }

  if (dashboardReportModal) {
    dashboardReportModal.addEventListener('show.bs.modal', () => {
      document.body.classList.add('dashboard-report-modal-open');
    });

    dashboardReportModal.addEventListener('hidden.bs.modal', () => {
      document.body.classList.remove('dashboard-report-modal-open');
    });
  }

  const updateUnreadNotificationCount = () => {
    const unreadCount = document.querySelectorAll(
      '.notification-menu-item.is-unread'
    ).length;
    const notificationCount = document.querySelector('.notification-count');
    const notificationSubtitle = document.querySelector(
      '.notification-menu-subtitle'
    );

    if (notificationCount) {
      notificationCount.textContent = unreadCount;
      notificationCount.hidden = unreadCount === 0;
    }

    if (notificationSubtitle) {
      notificationSubtitle.textContent = `${unreadCount} unread update${unreadCount === 1 ? '' : 's'}`;
    }
  };

  document.querySelectorAll('.notification-menu-item').forEach((item) => {
    item.addEventListener('click', () => {
      const { notificationType, notificationTime, notificationTitle, notificationDescription, notificationAction } = item.dataset;

      document.getElementById('notificationDetailType').textContent = notificationType;
      document.getElementById('notificationDetailTime').textContent = notificationTime;
      document.getElementById('notificationDetailModalLabel').textContent = notificationTitle;
      document.getElementById('notificationDetailDescription').textContent = notificationDescription;
      document.getElementById('notificationDetailAction').textContent = notificationAction;
      item.classList.remove('is-unread');
      updateUnreadNotificationCount();
    });
  });

  document
    .querySelector('.notification-mark-read')
    ?.addEventListener('click', () => {
      document
        .querySelectorAll('.notification-menu-item.is-unread')
        .forEach((item) => item.classList.remove('is-unread'));
      updateUnreadNotificationCount();
    });

  document.querySelector('.notification-clear-all')?.addEventListener('click', () => {
    const notificationMenuList = document.querySelector('.notification-menu-list');

    if (!notificationMenuList) return;

    notificationMenuList.replaceChildren();
    const emptyState = document.createElement('p');
    emptyState.className = 'notification-empty-state';
    emptyState.textContent = 'You have no notifications.';
    notificationMenuList.append(emptyState);
    updateUnreadNotificationCount();
  });

  if (notificationDetailModal) {
    notificationDetailModal.addEventListener('show.bs.modal', () => {
      document.body.classList.add('notification-modal-open');
    });

    notificationDetailModal.addEventListener('hidden.bs.modal', () => {
      document.body.classList.remove('notification-modal-open');
      document.querySelector('.notification-btn')?.focus();
    });
  }

  // ============================================================
  // TOTAL TRAININGS CHART DATA
  // Change the values below when connecting the chart to the database.
  // Each array follows the month order from January through December.
  // ============================================================
  const trainingMonths = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];

  const trainingByMunicipality = {
    Tingloy: {
      2026: [3, 4, 2, 5, 4, 6, 5, 7, 6, 8, 7, 9],
      2025: [2, 3, 3, 4, 3, 5, 4, 5, 5, 6, 6, 7],
    },
    Pakil: {
      2026: [4, 5, 4, 6, 5, 7, 6, 8, 7, 9, 8, 10],
      2025: [3, 4, 3, 5, 4, 6, 5, 6, 6, 7, 7, 8],
    },
    'Rizal (Laguna)': {
      2026: [2, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 9],
      2025: [2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 6, 7],
    },
    Alabat: {
      2026: [5, 4, 6, 5, 7, 6, 8, 7, 9, 8, 10, 9],
      2025: [4, 3, 5, 4, 6, 5, 7, 6, 8, 7, 8, 8],
    },
    Perez: {
      2026: [3, 2, 4, 3, 5, 4, 6, 5, 7, 6, 8, 7],
      2025: [2, 2, 3, 2, 4, 3, 5, 4, 6, 5, 6, 6],
    },
    'Quezon (Quezon)': {
      2026: [6, 7, 5, 8, 7, 9, 8, 10, 9, 11, 10, 12],
      2025: [5, 6, 4, 7, 6, 8, 7, 8, 8, 9, 9, 10],
    },
    Patnanungan: {
      2026: [2, 3, 2, 4, 3, 5, 4, 6, 5, 7, 6, 8],
      2025: [1, 2, 2, 3, 2, 4, 3, 4, 4, 5, 5, 6],
    },
    Jomalig: {
      2026: [1, 2, 1, 3, 2, 4, 3, 5, 4, 6, 5, 7],
      2025: [1, 1, 1, 2, 2, 3, 2, 4, 3, 5, 4, 5],
    },
  };

  // ============================================================
  // TOTAL PARTICIPANTS CHART DATA
  // Sample participant counts per municipality for each month.
  // ============================================================
  const participantsByMunicipality = {
    Tingloy: {
      2026: [42, 48, 45, 56, 52, 64, 60, 72, 68, 78, 74, 86],
      2025: [35, 40, 38, 47, 44, 53, 50, 60, 56, 66, 62, 73],
    },
    Pakil: {
      2026: [55, 62, 58, 70, 66, 78, 74, 86, 82, 94, 90, 102],
      2025: [46, 52, 49, 60, 56, 67, 63, 74, 70, 81, 77, 89],
    },
    'Rizal (Laguna)': {
      2026: [30, 36, 40, 44, 50, 54, 60, 64, 70, 74, 80, 86],
      2025: [25, 30, 34, 38, 43, 47, 52, 56, 61, 65, 70, 75],
    },
    Alabat: {
      2026: [64, 58, 72, 68, 82, 76, 90, 84, 98, 92, 106, 100],
      2025: [54, 49, 61, 58, 70, 65, 77, 72, 84, 79, 91, 86],
    },
    Perez: {
      2026: [38, 34, 46, 42, 54, 50, 62, 58, 70, 66, 78, 74],
      2025: [32, 29, 39, 36, 46, 43, 53, 49, 60, 56, 67, 63],
    },
    'Quezon (Quezon)': {
      2026: [78, 86, 70, 94, 88, 104, 98, 114, 108, 124, 118, 136],
      2025: [66, 73, 60, 80, 75, 88, 83, 97, 91, 105, 100, 115],
    },
    Patnanungan: {
      2026: [28, 34, 30, 42, 38, 50, 46, 58, 54, 66, 62, 74],
      2025: [23, 28, 25, 35, 32, 42, 39, 49, 45, 56, 52, 62],
    },
    Jomalig: {
      2026: [18, 24, 20, 30, 26, 36, 32, 42, 38, 48, 44, 54],
      2025: [15, 20, 17, 25, 22, 30, 27, 36, 32, 41, 37, 46],
    },
  };

  // ============================================================
  // TOTAL FA CHART DATA
  // Sample FA counts per municipality for each month.
  // ============================================================

  const fabyMunicipality = {
    Tingloy: {
      2026: [0, 0, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      2025: [0, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    },
    Pakil: {
      2026: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      2025: [0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    },
    'Rizal (Laguna)': {
      2026: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      2025: [0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0],
    },
    Patnanungan: {
      2026: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      2025: [0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0],
    },
    Jomalig: {
      2026: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      2025: [0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0],
    },
    Alabat: {
      2026: [0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0],
      2025: [0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    },
    Perez: {
      2026: [0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0],
      2025: [0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0],
    },
    'Quezon (Quezon)': {
      2026: [0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0],
      2025: [0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0],
    },
  };

  // ============================================================
  // ALLOCATED TRAINING BUDGET BY DISTRICT
  // Sample total training funds allocated per beneficiary district (not monthly data).
  // Replace these amounts with totals returned by the database.
  // ============================================================
  const allocatedBudgetByDistrict = [
    { district: 'District I', amount: 180000 },
    { district: 'District II', amount: 155000 },
    { district: 'District III', amount: 140000 },
    { district: 'District IV', amount: 125000 },
    { district: 'District V', amount: 110000 },
    { district: 'District VI', amount: 95000 },
    { district: 'District VII', amount: 80000 },
    { district: 'District VIII', amount: 65000 },
  ];

  const formatPeso = (amount) =>
    new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      maximumFractionDigits: 0,
    }).format(amount);

  const formatCompactPeso = (amount) =>
    `₱${amount >= 1000000 ? `${(amount / 1000000).toFixed(2)}M` : `${Math.round(amount / 1000)}K`}`;

  const totalAllocatedDistrictChart = document.querySelector(
    '#totalAllocatedDistrictChart'
  );

  if (totalAllocatedDistrictChart && typeof ApexCharts !== 'undefined') {
    const allocatedDistrictChart = new ApexCharts(
      totalAllocatedDistrictChart,
      {
        chart: {
          type: 'bar',
          height: 310,
          width: '100%',
          toolbar: { show: false },
          parentHeightOffset: 0,
          redrawOnParentResize: true,
          fontFamily: 'Inter, sans-serif',
        },
        series: [
          {
            name: 'Total allocated funds',
            data: allocatedBudgetByDistrict.map(({ amount }) => amount),
          },
        ],
        colors: ['#2e7d32'],
        plotOptions: {
          bar: {
            horizontal: true,
            borderRadius: 5,
            barHeight: '58%',
            dataLabels: { position: 'center' },
          },
        },
        dataLabels: {
          enabled: true,
          formatter: (value) => formatPeso(value),
          style: { colors: ['#fff'], fontSize: '10px', fontWeight: 600 },
        },
        grid: {
          borderColor: '#e0e0e0',
          strokeDashArray: 4,
          padding: { top: -4, right: 36, bottom: -4, left: 4 },
        },
        xaxis: {
          categories: allocatedBudgetByDistrict.map(({ district }) => district),
          labels: {
            formatter: (value) => formatCompactPeso(Number(value)),
            style: { colors: '#607088', fontSize: '10px' },
          },
          axisBorder: { color: '#e0e0e0' },
          axisTicks: { color: '#e0e0e0' },
        },
        yaxis: {
          labels: { style: { colors: '#263238', fontSize: '11px' } },
        },
        legend: { show: false },
        tooltip: {
          y: {
            formatter: (value) => formatPeso(value),
            title: { formatter: () => 'Total allocated funds' },
          },
        },
      }
    );

    allocatedDistrictChart.render();
  }

  // ============================================================
  // ALLOCATED TRAINING FUNDS BY PROVINCE AND MUNICIPALITY
  // Sample allocation figures; replace with totals returned by the database.
  // ============================================================
  const allocatedBudgetByProvince = [
    { province: 'Quezon', amount: 1736142 },
    { province: 'Laguna', amount: 725410 },
    { province: 'Batangas', amount: 315013 },
  ];

  const allocatedProvinceChart = document.getElementById('allocatedProvinceChart');
  if (allocatedProvinceChart && typeof ApexCharts !== 'undefined') {
    new ApexCharts(allocatedProvinceChart, {
      chart: { type: 'bar', height: 280, toolbar: { show: false }, parentHeightOffset: 0, redrawOnParentResize: true, fontFamily: 'Inter, sans-serif' },
      series: [{ name: 'Total allocated funds', data: allocatedBudgetByProvince.map(({ amount }) => amount) }],
      colors: ['#2e7d32'],
      plotOptions: { bar: { horizontal: true, borderRadius: 5, barHeight: '58%', dataLabels: { position: 'center' } } },
      dataLabels: { enabled: true, formatter: (value) => formatPeso(value), style: { colors: ['#fff'], fontSize: '10px', fontWeight: 600 } },
      grid: { borderColor: '#e0e0e0', strokeDashArray: 4, padding: { top: -4, right: 36, bottom: -4, left: 4 } },
      xaxis: { categories: allocatedBudgetByProvince.map(({ province }) => province), labels: { formatter: (value) => formatCompactPeso(Number(value)), style: { colors: '#607088', fontSize: '10px' } }, axisBorder: { color: '#e0e0e0' }, axisTicks: { color: '#e0e0e0' } },
      yaxis: { labels: { style: { colors: '#263238', fontSize: '11px' } } },
      legend: { show: false },
      tooltip: { y: { formatter: (value) => formatPeso(value), title: { formatter: () => 'Total allocated funds' } } },
    }).render();
  }

  const allocatedMunicipalityChart = document.getElementById('allocatedMunicipalityChart');
  if (allocatedMunicipalityChart && typeof ApexCharts !== 'undefined') {
    const municipalityAllocation = [
      { municipality: 'Quezon', amount: 525012 }, { municipality: 'Alabat', amount: 450310 },
      { municipality: 'Pakil', amount: 385010 }, { municipality: 'Rizal', amount: 340400 },
      { municipality: 'Tingloy', amount: 315013 }, { municipality: 'Perez', amount: 290310 },
      { municipality: 'Patnanungan', amount: 260020 }, { municipality: 'Jomalig', amount: 210500 },
    ];
    new ApexCharts(allocatedMunicipalityChart, {
      chart: { type: 'bar', height: 280, toolbar: { show: false }, parentHeightOffset: 0, redrawOnParentResize: true, fontFamily: 'Inter, sans-serif' },
      series: [{ name: 'Total allocated funds', data: municipalityAllocation.map(({ amount }) => amount) }],
      colors: ['#43a047'],
      plotOptions: { bar: { horizontal: true, borderRadius: 5, barHeight: '58%', dataLabels: { position: 'center' } } },
      dataLabels: { enabled: true, formatter: (value) => formatPeso(value), style: { colors: ['#fff'], fontSize: '10px', fontWeight: 600 } },
      grid: { borderColor: '#e0e0e0', strokeDashArray: 4, padding: { top: -4, right: 36, bottom: -4, left: 4 } },
      xaxis: {
        categories: municipalityAllocation.map(({ municipality }) => municipality),
        labels: { formatter: (value) => formatCompactPeso(Number(value)), style: { colors: '#607088', fontSize: '10px' } },
      },
      yaxis: { labels: { style: { colors: '#263238', fontSize: '11px' } } },
      tooltip: { y: { formatter: (value) => formatPeso(value), title: { formatter: () => 'Total allocated funds' } } },
    }).render();
  }

  // Municipality names are used to calculate totals and build the tooltip.
  const municipalityNames = Object.keys(trainingByMunicipality);
  const municipalityDisplayLimit = 10;
  const displayedMunicipalityNames = municipalityNames.slice(
    0,
    municipalityDisplayLimit
  );
  const otherMunicipalityNames = municipalityNames.slice(
    municipalityDisplayLimit
  );

  // Shows up to 10 named municipalities, then combines the remaining data.
  function buildMunicipalityRows(data, year, monthIndex) {
    const rows = displayedMunicipalityNames.map(
      (municipality) =>
        `<div class="apexcharts-tooltip-row"><span>${municipality}</span><strong>${data[municipality][year][monthIndex]}</strong></div>`
    );

    if (otherMunicipalityNames.length) {
      const otherTotal = otherMunicipalityNames.reduce(
        (total, municipality) => total + data[municipality][year][monthIndex],
        0
      );

      rows.push(
        `<div class="apexcharts-tooltip-row apexcharts-tooltip-other"><span>Other municipalities (${otherMunicipalityNames.length})</span><strong>${otherTotal}</strong></div>`
      );
    }

    return rows.join('');
  }

  // Chart mount element from dashboard.
  const totalTrainingChart = document.querySelector('#totalTrainingChart');

  if (totalTrainingChart && typeof ApexCharts !== 'undefined') {
    // Add all municipality values together to create one total per month.
    const yearlyTotals = [2026, 2025].map((year) =>
      trainingMonths.map((month, monthIndex) =>
        municipalityNames.reduce(
          (total, municipality) =>
            total + trainingByMunicipality[municipality][year][monthIndex],
          0
        )
      )
    );

    // ============================================================
    // APEXCHARTS CONFIGURATION: TOTAL TRAININGS
    // ============================================================
    const chart = new ApexCharts(totalTrainingChart, {
      chart: {
        // Area chart with smooth lines and responsive parent resizing.
        type: 'area',
        height: 270,
        width: '100%',
        toolbar: { show: true, tools: { download: false } },
        zoom: { enabled: true },
        parentHeightOffset: 0,
        redrawOnParentResize: true,
        fontFamily: 'Inter, sans-serif',
      },
      series: [
        // These are the two lines shown in the chart legend.
        { name: '2026', data: yearlyTotals[0] },
        { name: '2025', data: yearlyTotals[1] },
      ],
      // Green represents the current year; blue represents the previous year.
      colors: ['#2e7D32', '#1976D2'],
      stroke: { curve: 'smooth', width: 3 },
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.35,
          opacityTo: 0.05,
          stops: [0, 100],
        },
      },
      dataLabels: { enabled: false },
      markers: { size: 3, strokeWidth: 0, hover: { size: 5 } },
      grid: {
        borderColor: '#e0e0e0',
        strokeDashArray: 4,
        padding: { top: 4, right: 8, bottom: 0, left: 8 },
      },
      xaxis: {
        // Month labels shown along the bottom of the chart.
        categories: trainingMonths,
        labels: {
          style: { colors: '#607068', fontSize: '11px' },
          trim: false,
        },
        axisBorder: { color: '#e0e0e0' },
        axisTicks: { color: '#e0e0e0' },
      },
      yaxis: {
        // Training session totals shown on the left side of the chart.
        min: 0,
        forceNiceScale: true,
        labels: {
          style: { colors: '#607068', fontSize: '11px' },
          formatter: (value) => Math.round(value),
        },
        title: {
          text: 'Trainings',
          style: { color: '#607068', fontSize: '11px', fontWeight: 500 },
        },
      },
      legend: {
        // Year labels shown above the chart.
        position: 'bottom',
        horizontalAlign: 'right',
        labels: { colors: '#263238' },
        markers: { width: 8, height: 8, radius: 8 },
        itemMargin: { horizontal: 8 },
        onItemClick: {
          toggleDataSeries: true,
        },
        onItemHover: {
          highlightDataSeries: true,
        },
      },
      tooltip: {
        // Track the nearest month without requiring an exact point intersection.
        shared: false,
        intersect: false,
        custom: ({ seriesIndex, dataPointIndex, w }) => {
          const year = Number(w.config.series[seriesIndex].name);
          const seriesColor = w.globals.colors[seriesIndex];
          const totalTrainings = municipalityNames.reduce(
            (total, municipality) =>
              total +
              trainingByMunicipality[municipality][year][dataPointIndex],
            0
          );
          const municipalityRows = buildMunicipalityRows(
            trainingByMunicipality,
            year,
            dataPointIndex
          );

          return `<div class="apexcharts-tooltip-custom" style="--tooltip-series-color: ${seriesColor};"><div class="apexcharts-tooltip-heading"><strong>${trainingMonths[dataPointIndex]} ${year}</strong></div><div class="apexcharts-tooltip-total"><span>Total trainings</span><strong>${totalTrainings}</strong></div><div class="apexcharts-tooltip-section-title">Municipality details</div>${municipalityRows}</div>`;
        },
      },
      responsive: [
        {
          // Smaller chart layout for Bootstrap/mobile viewport sizes.
          breakpoint: 576,
          options: {
            chart: { height: 220 },
            legend: { position: 'bottom' },
            xaxis: {
              labels: { rotate: -45, style: { fontSize: '10px' } },
            },
            yaxis: {
              labels: { show: false },
              title: { text: undefined },
            },
          },
        },
      ],
    });

    // Render the chart inside #totalTrainingChart.
    chart.render();
  }

  // ============================================================
  // APEXCHARTS CONFIGURATION: TOTAL PARTICIPANTS
  // This chart uses the same month, municipality, and year structure
  // as the training chart, with zoom and reset controls enabled.
  // ============================================================
  const totalParticipantsChart = document.querySelector(
    '#totalParticipantsChart'
  );

  if (totalParticipantsChart && typeof ApexCharts !== 'undefined') {
    const participantTotals = [2026, 2025].map((year) =>
      trainingMonths.map((month, monthIndex) =>
        municipalityNames.reduce(
          (total, municipality) =>
            total + participantsByMunicipality[municipality][year][monthIndex],
          0
        )
      )
    );

    const participantChart = new ApexCharts(totalParticipantsChart, {
      chart: {
        type: 'area',
        height: 270,
        width: '100%',
        toolbar: { show: true, tools: { download: false } },
        zoom: { enabled: true },
        parentHeightOffset: 0,
        redrawOnParentResize: true,
        fontFamily: 'Inter, sans-serif',
      },
      series: [
        { name: '2026', data: participantTotals[0] },
        { name: '2025', data: participantTotals[1] },
      ],
      colors: ['#F88C00', '#8E24AA'],
      stroke: { curve: 'smooth', width: 3 },
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.35,
          opacityTo: 0.05,
          stops: [0, 100],
        },
      },
      dataLabels: { enabled: false },
      markers: { size: 3, strokeWidth: 0, hover: { size: 5 } },
      grid: {
        borderColor: '#e0e0e0',
        strokeDashArray: 4,
        padding: { top: 4, right: 8, bottom: 0, left: 8 },
      },
      xaxis: {
        categories: trainingMonths,
        labels: {
          style: { colors: '#607068', fontSize: '11px' },
          trim: false,
        },
        axisBorder: { color: '#e0e0e0' },
        axisTicks: { color: '#e0e0e0' },
      },
      yaxis: {
        min: 0,
        forceNiceScale: true,
        labels: {
          style: { colors: '#607068', fontSize: '11px' },
          formatter: (value) => Math.round(value),
        },
        title: {
          text: 'Participants',
          style: { color: '#607068', fontSize: '11px', fontWeight: 500 },
        },
      },
      legend: {
        position: 'bottom',
        horizontalAlign: 'right',
        labels: { colors: '#263238' },
        markers: { width: 8, height: 8, radius: 8 },
        itemMargin: { horizontal: 8 },
        onItemClick: {
          toggleDataSeries: true,
        },
        onItemHover: {
          highlightDataSeries: true,
        },
      },
      tooltip: {
        shared: false,
        intersect: false,
        custom: ({ seriesIndex, dataPointIndex, w }) => {
          const year = Number(w.config.series[seriesIndex].name);
          const seriesColor = w.globals.colors[seriesIndex];
          const totalParticipants = municipalityNames.reduce(
            (total, municipality) =>
              total +
              participantsByMunicipality[municipality][year][dataPointIndex],
            0
          );
          const municipalityRows = buildMunicipalityRows(
            participantsByMunicipality,
            year,
            dataPointIndex
          );

          return `<div class="apexcharts-tooltip-custom" style="--tooltip-series-color: ${seriesColor};"><div class="apexcharts-tooltip-heading"><strong>${trainingMonths[dataPointIndex]} ${year}</strong></div><div class="apexcharts-tooltip-total"><span>Total participants</span><strong>${totalParticipants}</strong></div><div class="apexcharts-tooltip-section-title">Municipality details</div>${municipalityRows}</div>`;
        },
      },
      responsive: [
        {
          breakpoint: 576,
          options: {
            chart: { height: 220 },
            legend: { position: 'bottom' },
            xaxis: {
              labels: { rotate: -45, style: { fontSize: '10px' } },
            },
            yaxis: {
              labels: { show: false },
              title: { text: undefined },
            },
          },
        },
      ],
    });

    // Render the chart inside #totalParticipantsChart.
    participantChart.render();
  }

  // ============================================================
  // APEXCHARTS CONFIGURATION: TOTAL FA
  // This chart uses the same month, municipality, and year structure
  // as the training chart, with zoom and reset controls enabled.
  // ============================================================
  const totalFAChart = document.querySelector('#totalFAChart');

  if (totalFAChart && typeof ApexCharts !== 'undefined') {
    const faTotals = [2026, 2025].map((year) =>
      trainingMonths.map((month, monthIndex) =>
        municipalityNames.reduce(
          (total, municipality) =>
            total + fabyMunicipality[municipality][year][monthIndex],
          0
        )
      )
    );

    const faChart = new ApexCharts(totalFAChart, {
      chart: {
        type: 'area',
        height: 270,
        width: '100%',
        toolbar: { show: true, tools: { download: false } },
        zoom: { enabled: true },
        parentHeightOffset: 0,
        redrawOnParentResize: true,
        fontFamily: 'Inter, sans-serif',
      },
      series: [
        { name: '2026', data: faTotals[0] },
        { name: '2025', data: faTotals[1] },
      ],
      colors: ['#2e7d32', '#1976D2'],
      stroke: { curve: 'smooth', width: 3 },
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.35,
          opacityTo: 0.05,
          stops: [0, 100],
        },
      },
      dataLabels: { enabled: false },
      markers: { size: 3, strokeWidth: 0, hover: { size: 5 } },
      grid: {
        borderColor: '#e0e0e0',
        strokeDashArray: 4,
        padding: { top: 4, right: 8, bottom: 0, left: 8 },
      },
      xaxis: {
        categories: trainingMonths,
        labels: {
          style: { colors: '#607068', fontSize: '11px' },
          trim: false,
        },
        axisBorder: { color: '#e0e0e0' },
        axisTicks: { color: '#e0e0e0' },
      },
      yaxis: {
        min: 0,
        forceNiceScale: true,
        labels: {
          style: { colors: '#607068', fontSize: '11px' },
          formatter: (value) => Math.round(value),
        },
        title: {
          text: 'Farmer Association',
          style: { color: '#607068', fontSize: '11px', fontWeight: 500 },
        },
      },
      legend: {
        position: 'bottom',
        horizontalAlign: 'right',
        labels: { colors: '#263238' },
        markers: { width: 8, height: 8, radius: 8 },
        itemMargin: { horizontal: 8 },
        onItemClick: {
          toggleDataSeries: true,
        },
        onItemHover: {
          highlightDataSeries: true,
        },
      },
      tooltip: {
        shared: false,
        intersect: false,
        custom: ({ seriesIndex, dataPointIndex, w }) => {
          const year = Number(w.config.series[seriesIndex].name);
          const seriesColor = w.globals.colors[seriesIndex];
          const totalFA = municipalityNames.reduce(
            (total, municipality) =>
              total + fabyMunicipality[municipality][year][dataPointIndex],
            0
          );
          const municipalityRows = buildMunicipalityRows(
            fabyMunicipality,
            year,
            dataPointIndex
          );

          return `<div class="apexcharts-tooltip-custom" style="--tooltip-series-color: ${seriesColor};"><div class="apexcharts-tooltip-heading"><strong>${trainingMonths[dataPointIndex]} ${year}</strong></div><div class="apexcharts-tooltip-total"><span>Total FA</span><strong>${totalFA}</strong></div><div class="apexcharts-tooltip-section-title">Municipality details</div>${municipalityRows}</div>`;
        },
      },
      responsive: [
        {
          breakpoint: 576,
          options: {
            chart: { height: 220 },
            legend: { position: 'bottom' },
            xaxis: {
              labels: { rotate: -45, style: { fontSize: '10px' } },
            },
            yaxis: {
              labels: { show: false },
              title: { text: undefined },
            },
          },
        },
      ],
    });

    // Render the chart inside #totalFAChart.
    faChart.render();
  }

  // ============================================================
  // BENEFICIARIES BY AGE AND SEX
  // Purpose: compares the number of male and female beneficiaries
  // in the Youth, Adult, and Senior age groups on the dashboard card.
  // Replace these sample values with totals from the database when
  // beneficiary reporting data is available.
  // ============================================================
  const beneficiaryAgeSexChart = document.getElementById(
    'beneficiaryAgeSexChart'
  );

  if (beneficiaryAgeSexChart && typeof ApexCharts !== 'undefined') {
    const beneficiaryChart = new ApexCharts(beneficiaryAgeSexChart, {
      chart: {
        type: 'bar',
        height: 280,
        stacked: true,
        toolbar: { show: false },
        parentHeightOffset: 0,
        redrawOnParentResize: true,
        fontFamily: 'Inter, sans-serif',
      },
      series: [
        { name: 'Male', data: [148, 221, 74] },
        { name: 'Female', data: [176, 258, 96] },
      ],
      colors: ['#1976D2', '#8e24aa'],
      plotOptions: {
        bar: {
          horizontal: true,
          barHeight: '54%',
          borderRadius: 5,
          borderRadiusApplication: 'end',
        },
      },
      dataLabels: {
        enabled: true,
        formatter: (value) => (value > 0 ? value : ''),
        style: { fontSize: '11px', fontWeight: 600, colors: ['#fff'] },
        dropShadow: { enabled: true },
      },
      stroke: { show: true, width: 2, colors: ['#fff'] },
      xaxis: {
        categories: ['Youth (15–30)', 'Adults (31–59)', 'Senior (60+)'],
        min: 0,
        labels: {
          style: { colors: '#607068', fontSize: '11px' },
          formatter: (value) => Math.round(value),
        },
        axisBorder: { show: true },
        axisTicks: { show: true },
      },
      yaxis: {
        labels: {
          style: { colors: '#263238', fontSize: '12px', fontWeight: 500 },
          maxWidth: 105,
        },
      },
      grid: {
        borderColor: '#e8edf0',
        strokeDashArray: 4,
        padding: { top: -8, right: 8, bottom: -4, left: 8 },
      },
      legend: {
        position: 'bottom',
        horizontalAlign: 'right',
        fontSize: '12px',
        fontWeight: 500,
        labels: { colors: '#455a64' },
        markers: { width: 9, height: 9, radius: 9 },
        itemMargin: { horizontal: 8 },
      },
      tooltip: {
        shared: true,
        intersect: false,
        y: { formatter: (value) => `${value}` },
      },
      responsive: [
        {
          breakpoint: 576,
          options: {
            chart: { height: 250 },
            dataLabels: { enabled: true },
            legend: { horizontalAlign: 'left' },
            yaxis: { labels: { style: { fontSize: '11px' }, maxWidth: 90 } },
          },
        },
      ],
    });

    beneficiaryChart.render();
  }

  // ============================================================
  // BENEFICIARIES BY SEX
  // Purpose: the rounded donut shows each sex's share of all
  // beneficiaries, with the combined total displayed at its center.
  // Replace these sample values with totals from the database when
  // beneficiary reporting data is available.
  // ============================================================
  const beneficiarySexChart = document.getElementById(
    'beneficiarySexChart'
  );

  if (beneficiarySexChart && typeof ApexCharts !== 'undefined') {
    const beneficiaryChart = new ApexCharts(beneficiarySexChart, {
      chart: {
        type: 'donut',
        height: 280,
        toolbar: { show: false },
        parentHeightOffset: 0,
        redrawOnParentResize: true,
        fontFamily: 'Inter, sans-serif',
      },
      series: [221, 258],
      labels: ['Male', 'Female'],
      colors: ['#1976D2', '#8e24aa'],
      // A thick white stroke creates distinct, rounded-looking donut segments.
      stroke: { show: true, width: 5, colors: ['#fff'] },
      plotOptions: {
        pie: {
          donut: {
            // Keep a visible ring for the Male and Female segment colors.
            size: '65%',
            labels: {
              show: true,
              name: {
                show: true,
                color: '#607068',
                fontSize: '12px',
                offsetY: -4,
              },
              value: {
                show: true,
                color: '#263238',
                fontSize: '22px',
                fontWeight: 700,
                offsetY: 4,
                formatter: (value) => Math.round(value),
              },
              total: {
                show: true,
                showAlways: true,
                label: 'Total',
                color: '#607068',
                fontSize: '12px',
                formatter: (chart) =>
                  chart.globals.seriesTotals.reduce((total, value) => total + value, 0),
              },
            },
          },
        },
      },
      dataLabels: {
        enabled: true,
      },
      legend: {
        position: 'bottom',
        horizontalAlign: 'right',
        fontSize: '12px',
        fontWeight: 500,
        labels: { colors: '#455a64' },
        markers: { width: 9, height: 9, radius: 9 },
        itemMargin: { horizontal: 8 },
      },
      tooltip: {
        y: { formatter: (value) => `${value} beneficiaries` },
      },
      responsive: [
        {
          breakpoint: 576,
          options: {
            chart: { height: 250 },
            legend: { horizontalAlign: 'right' },
          },
        },
      ],
    });

    beneficiaryChart.render();
  }

  // ============================================================
  // BENEFICIARY GROUPS
  // Purpose: compares the total beneficiaries classified as PWD,
  // 4Ps, and Indigenous People (IP). Replace sample counts with DB totals.
  // ============================================================
  const beneficiaryGroupChart = document.getElementById(
    'beneficiaryGroupChart'
  );

  if (beneficiaryGroupChart && typeof ApexCharts !== 'undefined') {
    const groupChart = new ApexCharts(beneficiaryGroupChart, {
      chart: {
        type: 'bar',
        height: 280,
        width: '100%',
        toolbar: { show: false },
        parentHeightOffset: 0,
        redrawOnParentResize: true,
        fontFamily: 'Inter, sans-serif',
      },
      // Separate series provide an accurate, clickable legend for each group.
      series: [
        { name: 'PWD', data: [42, null, null] },
        { name: '4Ps', data: [null, 186, null] },
        { name: 'IP', data: [null, null, 74] },
      ],
      // High-contrast blue, green, and orange are distinct and readable together.
      colors: ['#1565C0', '#2E7D32', '#EF6C00'],
      title: {
        text: '',
        align: 'left',
        style: { color: '#263238', fontSize: '13px', fontWeight: 600 },
      },
      plotOptions: {
        bar: {
          borderRadius: 6,
          // Leave consistent space between category bars for easier comparison.
          columnWidth: '100 %',
          dataLabels: { position: 'center' },
        },
      },
      dataLabels: {
        enabled: true,
        // White value labels are centered inside their matching colored bar.
        formatter: (value) => (value === null || value === 0 ? '' : value),
        offsetY: 0,
        style: { colors: ['#fff'], fontSize: '11px', fontWeight: 600 },
      },
      legend: {
        position: 'bottom',
        horizontalAlign: 'right',
        fontSize: '11px',
        fontWeight: 500,
        labels: { colors: '#455A64' },
        markers: { width: 8, height: 8, radius: 8 },
        itemMargin: { horizontal: 6 },
      },
      grid: {
        borderColor: '#e8edf0',
        strokeDashArray: 4,
        padding: { top: 6, right: 4, bottom: 0, left: 4 },
      },
      xaxis: {
        categories: ['PWD', '4Ps', 'IP'],
        labels: { style: { colors: '#607068', fontSize: '11px' } },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        min: 0,
        forceNiceScale: true,
        labels: {
          style: { colors: '#607068', fontSize: '11px' },
          formatter: (value) => Math.round(value),
        },
      },
      tooltip: {
        // Show only the group directly hovered by the user.
        shared: false,
        intersect: true,
        hideEmptySeries: true,
        y: { formatter: (value) => `${value} beneficiaries` },
      },
      responsive: [
        {
          breakpoint: 576,
          options: {
            chart: { height: 250 },
            title: { style: { fontSize: '12px' } },
            // Center the legend when a narrow Bootstrap card wraps its items.
            legend: { horizontalAlign: 'center' },
          },
        },
      ],
    });

    groupChart.render();
  }

  // ============================================================
  // SHARED NAVIGATION COLLAPSE HELPER
  // ============================================================
  // Closes nested menu items when another menu is opened.
  function closeAllNestedCollapses(nestedIds) {
    nestedIds.forEach((id) => {
      const element = document.getElementById(id);
      if (element && element.classList.contains('show')) {
        const bsCollapse = new bootstrap.Collapse(element, {
          toggle: false,
        });
        bsCollapse.hide();
      }
    });
  }

  // ============================================================
  // MOBILE NAVIGATION EVENTS
  // ============================================================
  Object.entries(mobileMainCollapses).forEach(([mainId, nestedIds]) => {
    const mainElement = document.getElementById(mainId);
    if (mainElement) {
      mainElement.addEventListener('show.bs.collapse', function () {
        // Close all other main collapses and their nested items
        Object.entries(mobileMainCollapses).forEach(
          ([otherId, otherNestedIds]) => {
            if (otherId !== mainId) {
              const otherElement = document.getElementById(otherId);
              if (otherElement && otherElement.classList.contains('show')) {
                const bsCollapse = new bootstrap.Collapse(otherElement, {
                  toggle: false,
                });
                bsCollapse.hide();
              }
              closeAllNestedCollapses(otherNestedIds);
            }
          }
        );
      });
    }

    // Close sibling mobile submenu items when one submenu opens.
    nestedIds.forEach((nestedId) => {
      const nestedElement = document.getElementById(nestedId);
      if (nestedElement) {
        nestedElement.addEventListener('show.bs.collapse', function () {
          // Close all sibling nested collapses
          nestedIds.forEach((otherId) => {
            if (otherId !== nestedId) {
              const otherElement = document.getElementById(otherId);
              if (otherElement && otherElement.classList.contains('show')) {
                const bsCollapse = new bootstrap.Collapse(otherElement, {
                  toggle: false,
                });
                bsCollapse.hide();
              }
            }
          });
        });
      }
    });
  });

  // ============================================================
  // DESKTOP HEADER NAVIGATION EVENTS
  // ============================================================
  Object.entries(headerMainCollapses).forEach(([mainId, nestedIds]) => {
    const mainElement = document.getElementById(mainId);
    if (mainElement) {
      mainElement.addEventListener('show.bs.collapse', function () {
        // Close all other main collapses and their nested items
        Object.entries(headerMainCollapses).forEach(
          ([otherId, otherNestedIds]) => {
            if (otherId !== mainId) {
              const otherElement = document.getElementById(otherId);
              if (otherElement && otherElement.classList.contains('show')) {
                const bsCollapse = new bootstrap.Collapse(otherElement, {
                  toggle: false,
                });
                bsCollapse.hide();
              }
              closeAllNestedCollapses(otherNestedIds);
            }
          }
        );
      });
    }

    // Close sibling header submenu items when one submenu opens.
    nestedIds.forEach((nestedId) => {
      const nestedElement = document.getElementById(nestedId);
      if (nestedElement) {
        nestedElement.addEventListener('show.bs.collapse', function () {
          // Close all sibling nested collapses
          nestedIds.forEach((otherId) => {
            if (otherId !== nestedId) {
              const otherElement = document.getElementById(otherId);
              if (otherElement && otherElement.classList.contains('show')) {
                const bsCollapse = new bootstrap.Collapse(otherElement, {
                  toggle: false,
                });
                bsCollapse.hide();
              }
            }
          });
        });
      }
    });
  });

  // ======================================================
  // Tooltip for information in card
  // APEXCHARTS CONFIGURATION: Trainng Trend
  // This chart uses the same month, municipality, and year structure
  // as the training chart, with zoom and reset controls enabled.
  // =====================================================
  const tooltipTriggerList = document.querySelectorAll(
    '[data-bs-toggle="tooltip"]'
  );
  const tooltipList = [...tooltipTriggerList].map(
    (tooltipTriggerEl) => new bootstrap.Tooltip(tooltipTriggerEl)
  );

}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeDashboard, { once: true });
} else {
  initializeDashboard();
}
