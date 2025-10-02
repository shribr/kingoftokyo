/** archiveManagerComponent.js
 * Comprehensive archive management UI with filtering, search, bulk operations
 * Provides professional interface for managing game logs and AIDT archives
 */

import { archiveManager } from '../services/archiveManagementService.js';
import { archiveAnalytics } from '../services/archiveAnalyticsService.js';
import { startReplay } from '../services/replayService.js';
import { createReplayStateOverlay } from './replayStateOverlay.js';

export class ArchiveManagerComponent {
  constructor() {
    this.container = null;
    this.isVisible = false;
    this.refreshInterval = null;
    this.archives = [];
    this.currentView = 'grid'; // 'grid', 'list', 'analytics'
    
    this.initializeComponent();
    this.bindEvents();
  }

  /**
   * Initialize the archive manager component
   */
  initializeComponent() {
    this.container = document.createElement('div');
    this.container.className = 'archive-manager-modal';
    this.container.innerHTML = this.getTemplate();
    
    // Add to document body
    document.body.appendChild(this.container);
    
    // Initial data load
    this.refreshArchives();
    
    console.log('[ArchiveManagerComponent] Initialized');
  }

  /**
   * Get the HTML template for the archive manager
   * @returns {string}
   */
  getTemplate() {
    return `
      <div class="archive-modal-backdrop">
        <div class="archive-modal-container">
          <div class="archive-modal-header">
            <div class="header-left">
              <h2>📁 Archive Manager</h2>
              <div class="archive-summary" data-summary>
                <span class="summary-total">0 archives</span>
                <span class="summary-selected" data-selected-count style="display: none;">0 selected</span>
              </div>
            </div>
            <div class="header-right">
              <div class="view-toggle" data-view-toggle>
                <button class="view-btn active" data-view="grid" title="Grid View">⊞</button>
                <button class="view-btn" data-view="list" title="List View">☰</button>
                <button class="view-btn" data-view="analytics" title="Analytics">📊</button>
              </div>
              <button class="close-btn" data-action="close">×</button>
            </div>
          </div>

          <div class="archive-toolbar">
            <div class="toolbar-section search-section">
              <div class="search-input-group">
                <input type="text" 
                       class="search-input" 
                       data-search-input 
                       placeholder="Search archives..."
                       autocomplete="off">
                <button class="search-clear-btn" data-search-clear title="Clear search">×</button>
              </div>
            </div>

            <div class="toolbar-section filter-section">
              <select class="filter-select" data-filter-type>
                <option value="all">All Types</option>
                <option value="game">Game Logs</option>
                <option value="aidt">AI Decisions</option>
                <option value="auto">Auto Archives</option>
              </select>

              <select class="filter-select" data-filter-date>
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>

              <select class="filter-select" data-filter-sort>
                <option value="date-desc">Newest First</option>
                <option value="date-asc">Oldest First</option>
                <option value="name-asc">Name A-Z</option>
                <option value="name-desc">Name Z-A</option>
                <option value="size-desc">Largest First</option>
                <option value="size-asc">Smallest First</option>
              </select>

              <button class="filter-reset-btn" data-filter-reset title="Reset Filters">🔄</button>
            </div>

            <div class="toolbar-section actions-section">
              <button class="action-btn refresh-btn" data-action="refresh" title="Refresh">
                <span class="btn-icon">🔄</span>
                <span class="btn-text">Refresh</span>
              </button>
              <button class="action-btn bulk-btn" data-action="bulk-export" title="Export Selected" disabled>
                <span class="btn-icon">📤</span>
                <span class="btn-text">Export</span>
              </button>
              <button class="action-btn bulk-btn danger" data-action="bulk-delete" title="Delete Selected" disabled>
                <span class="btn-icon">🗑️</span>
                <span class="btn-text">Delete</span>
              </button>
            </div>
          </div>

          <div class="archive-content" data-content>
            <div class="archive-view archive-grid-view" data-view-content="grid">
              <div class="archive-grid" data-archive-grid>
                <!-- Archive cards populated dynamically -->
              </div>
            </div>

            <div class="archive-view archive-list-view" data-view-content="list" style="display: none;">
              <div class="archive-table-container">
                <table class="archive-table" data-archive-table>
                  <thead>
                    <tr>
                      <th class="select-column">
                        <input type="checkbox" data-select-all>
                      </th>
                      <th class="name-column">Name</th>
                      <th class="type-column">Type</th>
                      <th class="date-column">Date</th>
                      <th class="size-column">Size</th>
                      <th class="actions-column">Actions</th>
                    </tr>
                  </thead>
                  <tbody data-archive-tbody>
                    <!-- Archive rows populated dynamically -->
                  </tbody>
                </table>
              </div>
            </div>

            <div class="archive-view archive-analytics-view" data-view-content="analytics" style="display: none;">
              <div class="analytics-dashboard" data-analytics-dashboard>
                <div class="analytics-loading">📊 Calculating analytics...</div>
              </div>
            </div>
          </div>

          <div class="archive-modal-footer">
            <div class="footer-left">
              <div class="storage-info" data-storage-info>
                <span class="storage-label">Storage:</span>
                <span class="storage-value">0 MB</span>
              </div>
            </div>
            <div class="footer-right">
              <button class="btn-secondary" data-action="settings">Settings</button>
              <button class="btn-primary" data-action="close">Close</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Bind event listeners
   */
  bindEvents() {
    // Modal close events
    this.container.addEventListener('click', (event) => {
      if (event.target.classList.contains('archive-modal-backdrop')) {
        this.hide();
      }
    });

    // Action button events
    this.container.addEventListener('click', (event) => {
      const action = event.target.closest('[data-action]')?.dataset.action;
      if (action) {
        this.handleAction(action, event);
      }
    });

    // View toggle events
    const viewButtons = this.container.querySelectorAll('[data-view]');
    viewButtons.forEach(button => {
      button.addEventListener('click', () => {
        this.switchView(button.dataset.view);
      });
    });

    // Filter events
    const filterElements = this.container.querySelectorAll('[data-filter-type], [data-filter-date], [data-filter-sort]');
    filterElements.forEach(element => {
      element.addEventListener('change', () => {
        this.applyFilters();
      });
    });

    // Search events
    const searchInput = this.container.querySelector('[data-search-input]');
    if (searchInput) {
      searchInput.addEventListener('input', this.debounce(() => {
        this.applySearch();
      }, 300));
    }

    const searchClear = this.container.querySelector('[data-search-clear]');
    if (searchClear) {
      searchClear.addEventListener('click', () => {
        searchInput.value = '';
        this.applySearch();
      });
    }

    // Select all events
    const selectAll = this.container.querySelector('[data-select-all]');
    if (selectAll) {
      selectAll.addEventListener('change', (event) => {
        this.handleSelectAll(event.target.checked);
      });
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', (event) => {
      if (this.isVisible) {
        this.handleKeyboard(event);
      }
    });
  }

  /**
   * Handle action button clicks
   * @param {string} action - Action type
   * @param {Event} event - Click event
   */
  async handleAction(action, event) {
    switch (action) {
      case 'close':
        this.hide();
        break;
      case 'refresh':
        await this.refreshArchives();
        break;
      case 'bulk-export':
        await this.exportSelected();
        break;
      case 'bulk-delete':
        await this.deleteSelected();
        break;
      case 'filter-reset':
        this.resetFilters();
        break;
      case 'settings':
        this.showSettings();
        break;
      case 'archive-select':
        this.handleArchiveSelect(event);
        break;
      case 'archive-open':
        this.handleArchiveOpen(event);
        break;
      case 'archive-export':
        this.handleArchiveExport(event);
        break;
      case 'archive-delete':
        this.handleArchiveDelete(event);
        break;
      case 'archive-replay':
        this.handleArchiveReplay(event);
        break;
    }
  }

  /**
   * Switch between views
   * @param {string} viewType - View type ('grid', 'list', 'analytics')
   */
  switchView(viewType) {
    this.currentView = viewType;

    // Update view buttons
    const viewButtons = this.container.querySelectorAll('[data-view]');
    viewButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === viewType);
    });

    // Show/hide view content
    const viewContents = this.container.querySelectorAll('[data-view-content]');
    viewContents.forEach(content => {
      content.style.display = content.dataset.viewContent === viewType ? 'block' : 'none';
    });

    // Load view-specific content
    switch (viewType) {
      case 'grid':
        this.renderGridView();
        break;
      case 'list':
        this.renderListView();
        break;
      case 'analytics':
        this.renderAnalyticsView();
        break;
    }
  }

  /**
   * Refresh archives from sources
   */
  async refreshArchives() {
    try {
      this.showLoading();
      this.archives = archiveManager.getFilteredArchives();
      this.updateSummary();
      this.updateStorageInfo();
      this.renderCurrentView();
      this.hideLoading();
    } catch (error) {
      console.error('Failed to refresh archives:', error);
      this.showError('Failed to load archives');
    }
  }

  /**
   * Apply current filters
   */
  applyFilters() {
    const typeSelect = this.container.querySelector('[data-filter-type]');
    const dateSelect = this.container.querySelector('[data-filter-date]');
    const sortSelect = this.container.querySelector('[data-filter-sort]');

    const [sortBy, sortOrder] = sortSelect.value.split('-');

    archiveManager.updateFilters({
      type: typeSelect.value,
      dateRange: dateSelect.value,
      sortBy,
      sortOrder
    });

    this.refreshArchives();
  }

  /**
   * Apply search filter
   */
  applySearch() {
    const searchInput = this.container.querySelector('[data-search-input]');
    archiveManager.updateFilters({
      searchTerm: searchInput.value
    });
    this.refreshArchives();
  }

  /**
   * Reset all filters
   */
  resetFilters() {
    archiveManager.resetFilters();
    
    // Reset UI controls
    const typeSelect = this.container.querySelector('[data-filter-type]');
    const dateSelect = this.container.querySelector('[data-filter-date]');
    const sortSelect = this.container.querySelector('[data-filter-sort]');
    const searchInput = this.container.querySelector('[data-search-input]');

    if (typeSelect) typeSelect.value = 'all';
    if (dateSelect) dateSelect.value = 'all';
    if (sortSelect) sortSelect.value = 'date-desc';
    if (searchInput) searchInput.value = '';

    this.refreshArchives();
  }

  /**
   * Render current view
   */
  renderCurrentView() {
    switch (this.currentView) {
      case 'grid':
        this.renderGridView();
        break;
      case 'list':
        this.renderListView();
        break;
      case 'analytics':
        this.renderAnalyticsView();
        break;
    }
  }

  /**
   * Render grid view
   */
  renderGridView() {
    const grid = this.container.querySelector('[data-archive-grid]');
    if (!grid) return;

    if (this.archives.length === 0) {
      grid.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📁</div>
          <div class="empty-title">No Archives Found</div>
          <div class="empty-description">
            ${archiveManager.hasActiveFilters() ? 
              'Try adjusting your filters or search terms.' : 
              'Game archives will appear here after games are completed.'}
          </div>
        </div>
      `;
      return;
    }

    const cardsHtml = this.archives.map(archive => this.renderArchiveCard(archive)).join('');
    grid.innerHTML = cardsHtml;
  }

  /**
   * Render archive card for grid view
   * @param {Object} archive - Archive data
   * @returns {string} Card HTML
   */
  renderArchiveCard(archive) {
    const isSelected = archiveManager.selection.has(archive.id);
    const date = new Date(archive.ts || archive.timestamp);
    const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    const formattedSize = this.formatFileSize(archive.size || 0);
    const typeIcon = this.getTypeIcon(archive.type);
    
    return `
      <div class="archive-card ${isSelected ? 'selected' : ''}" data-archive-id="${archive.id}">
        <div class="card-header">
          <input type="checkbox" 
                 class="card-checkbox" 
                 data-action="archive-select"
                 data-archive-id="${archive.id}"
                 ${isSelected ? 'checked' : ''}>
          <div class="card-type">
            <span class="type-icon">${typeIcon}</span>
            <span class="type-label">${archive.category}</span>
          </div>
        </div>
        
        <div class="card-content">
          <div class="card-name" title="${archive.name}">${archive.name}</div>
          <div class="card-meta">
            <div class="meta-item">
              <span class="meta-label">Date:</span>
              <span class="meta-value">${formattedDate}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Size:</span>
              <span class="meta-value">${formattedSize}</span>
            </div>
          </div>
        </div>
        
        <div class="card-actions">
          <button class="card-action-btn primary" 
                  data-action="archive-open"
                  data-archive-id="${archive.id}"
                  title="Open/View Archive">
            <span class="btn-icon">👁️</span>
          </button>
          <button class="card-action-btn secondary" 
                  data-action="archive-replay"
                  data-archive-id="${archive.id}"
                  title="Start Replay">
            <span class="btn-icon">▶️</span>
          </button>
          <button class="card-action-btn secondary" 
                  data-action="archive-export"
                  data-archive-id="${archive.id}"
                  title="Export Archive">
            <span class="btn-icon">📤</span>
          </button>
          <button class="card-action-btn danger" 
                  data-action="archive-delete"
                  data-archive-id="${archive.id}"
                  title="Delete Archive">
            <span class="btn-icon">🗑️</span>
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Get type icon for archive
   * @param {string} type - Archive type
   * @returns {string} Icon emoji
   */
  getTypeIcon(type) {
    const icons = {
      game: '🎮',
      aidt: '🤖',
      auto: '⚡'
    };
    return icons[type] || '📄';
  }

  /**
   * Format file size for display
   * @param {number} bytes - Size in bytes
   * @returns {string} Formatted size
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  /**
   * Render list view
   */
  renderListView() {
    const tbody = this.container.querySelector('[data-archive-tbody]');
    if (!tbody) return;

    if (this.archives.length === 0) {
      tbody.innerHTML = `
        <tr class="empty-row">
          <td colspan="6" class="empty-cell">
            <div class="empty-state-small">
              📁 No archives found
            </div>
          </td>
        </tr>
      `;
      return;
    }

    const rowsHtml = this.archives.map(archive => this.renderArchiveRow(archive)).join('');
    tbody.innerHTML = rowsHtml;
  }

  /**
   * Render archive row for list view
   * @param {Object} archive - Archive data
   * @returns {string} Row HTML
   */
  renderArchiveRow(archive) {
    const isSelected = archiveManager.selection.has(archive.id);
    const date = new Date(archive.ts || archive.timestamp);
    const formattedDate = date.toLocaleDateString();
    const formattedSize = this.formatFileSize(archive.size || 0);
    const typeIcon = this.getTypeIcon(archive.type);
    
    return `
      <tr class="archive-row ${isSelected ? 'selected' : ''}" data-archive-id="${archive.id}">
        <td class="select-cell">
          <input type="checkbox" 
                 data-action="archive-select"
                 data-archive-id="${archive.id}"
                 ${isSelected ? 'checked' : ''}>
        </td>
        <td class="name-cell">
          <div class="archive-name" title="${archive.name}">${archive.name}</div>
        </td>
        <td class="type-cell">
          <span class="type-badge">
            <span class="type-icon">${typeIcon}</span>
            ${archive.category}
          </span>
        </td>
        <td class="date-cell">${formattedDate}</td>
        <td class="size-cell">${formattedSize}</td>
        <td class="actions-cell">
          <div class="row-actions">
            <button class="row-action-btn" 
                    data-action="archive-open"
                    data-archive-id="${archive.id}"
                    title="Open">👁️</button>
            <button class="row-action-btn" 
                    data-action="archive-replay"
                    data-archive-id="${archive.id}"
                    title="Replay">▶️</button>
            <button class="row-action-btn" 
                    data-action="archive-export"
                    data-archive-id="${archive.id}"
                    title="Export">📤</button>
            <button class="row-action-btn danger" 
                    data-action="archive-delete"
                    data-archive-id="${archive.id}"
                    title="Delete">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  }

  /**
   * Render analytics view
   */
  async renderAnalyticsView() {
    const dashboard = this.container.querySelector('[data-analytics-dashboard]');
    if (!dashboard) return;

    // Show loading
    dashboard.innerHTML = `
      <div class="analytics-loading">
        <div class="loading-spinner">📊</div>
        <div class="loading-text">Analyzing archives...</div>
        <div class="loading-subtitle">This may take a moment for large datasets</div>
      </div>
    `;

    try {
      console.log('[ArchiveManager] Calculating comprehensive analytics...');
      const analytics = await archiveAnalytics.calculateCompleteAnalytics();
      console.log('[ArchiveManager] Analytics calculated:', analytics);
      
      dashboard.innerHTML = this.renderAdvancedAnalyticsDashboard(analytics);
    } catch (error) {
      dashboard.innerHTML = `
        <div class="analytics-error">
          <div class="error-icon">⚠️</div>
          <div class="error-title">Analytics Error</div>
          <div class="error-message">Failed to calculate analytics: ${error.message}</div>
          <button class="retry-btn" onclick="location.reload()">Retry</button>
        </div>
      `;
      console.error('Analytics error:', error);
    }
  }

  /**
   * Render advanced analytics dashboard content
   * @param {Object} analytics - Complete analytics data
   * @returns {string} Dashboard HTML
   */
  renderAdvancedAnalyticsDashboard(analytics) {
    return `
      <div class="advanced-analytics-container">
        ${this.renderAnalyticsHeader(analytics)}
        ${this.renderOverviewSection(analytics.overview)}
        ${this.renderGamePerformanceSection(analytics.gamePerformance)}
        ${this.renderAIAnalysisSection(analytics.aiAnalysis)}
        ${this.renderTrendsSection(analytics.trends)}
        ${this.renderInsightsSection(analytics.insights)}
        ${this.renderStorageAnalysisSection(analytics.storage)}
      </div>
    `;
  }

  /**
   * Render analytics header with export options
   */
  renderAnalyticsHeader(analytics) {
    return `
      <div class="analytics-header">
        <div class="analytics-title">
          <h3>📊 Archive Analytics Dashboard</h3>
          <div class="analytics-subtitle">
            Generated on ${new Date(analytics.timestamp).toLocaleString()}
          </div>
        </div>
        <div class="analytics-actions">
          <button class="analytics-btn" onclick="this.exportAnalytics()" title="Export Analytics">
            📤 Export Report
          </button>
          <button class="analytics-btn" onclick="this.refreshAnalytics()" title="Refresh Analytics">
            🔄 Refresh
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Render overview section
   */
  renderOverviewSection(overview) {
    if (!overview) return '';
    
    return `
      <div class="analytics-section overview-section">
        <h4>🎯 Overview</h4>
        <div class="overview-grid">
          <div class="overview-card">
            <div class="card-value">${overview.totalArchives}</div>
            <div class="card-label">Total Archives</div>
          </div>
          <div class="overview-card">
            <div class="card-value">${overview.totalGames}</div>
            <div class="card-label">Games Analyzed</div>
          </div>
          <div class="overview-card">
            <div class="card-value">${overview.totalAIDecisions}</div>
            <div class="card-label">AI Decisions</div>
          </div>
          <div class="overview-card">
            <div class="card-value">${overview.uniquePlayers}</div>
            <div class="card-label">Unique Players</div>
          </div>
          <div class="overview-card">
            <div class="card-value">${overview.averageGameDuration}min</div>
            <div class="card-label">Avg Game Length</div>
          </div>
          <div class="overview-card">
            <div class="card-value">
              ${overview.dateRange ? Math.ceil(overview.dateRange.span / (1000 * 60 * 60 * 24)) : 0}
            </div>
            <div class="card-label">Days Tracked</div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render game performance section
   */
  renderGamePerformanceSection(gamePerformance) {
    if (!gamePerformance) return '';
    
    const topPlayers = Object.entries(gamePerformance.playerPerformance || {})
      .sort(([,a], [,b]) => parseFloat(b.winPercentage) - parseFloat(a.winPercentage))
      .slice(0, 5);

    const gameLengthData = Object.entries(gamePerformance.gameLength?.distribution || {});
    const victoryData = Object.entries(gamePerformance.victorConditions || {});

    return `
      <div class="analytics-section performance-section">
        <h4>🏆 Game Performance</h4>
        
        <div class="performance-grid">
          <div class="performance-card">
            <h5>Top Players</h5>
            <div class="player-rankings">
              ${topPlayers.map(([name, stats], index) => `
                <div class="player-rank-item">
                  <div class="rank-position">${index + 1}</div>
                  <div class="rank-info">
                    <div class="rank-name">${name}</div>
                    <div class="rank-stats">
                      ${stats.wins}/${stats.gamesPlayed} games (${stats.winPercentage}%)
                    </div>
                  </div>
                  <div class="rank-bar">
                    <div class="rank-fill" style="width: ${stats.winPercentage}%"></div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <div class="performance-card">
            <h5>Game Length Distribution</h5>
            <div class="distribution-chart">
              ${gameLengthData.map(([category, count]) => {
                const total = gameLengthData.reduce((sum, [,c]) => sum + c, 0);
                const percentage = total > 0 ? (count / total * 100).toFixed(1) : 0;
                return `
                  <div class="distribution-item">
                    <div class="dist-label">${category}</div>
                    <div class="dist-bar">
                      <div class="dist-fill" style="width: ${percentage}%"></div>
                    </div>
                    <div class="dist-value">${count} (${percentage}%)</div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <div class="performance-card">
            <h5>Victory Conditions</h5>
            <div class="victory-chart">
              ${victoryData.map(([condition, count]) => {
                const total = victoryData.reduce((sum, [,c]) => sum + c, 0);
                const percentage = total > 0 ? (count / total * 100).toFixed(1) : 0;
                return `
                  <div class="victory-item">
                    <div class="victory-icon">${this.getVictoryIcon(condition)}</div>
                    <div class="victory-info">
                      <div class="victory-name">${condition}</div>
                      <div class="victory-count">${count} games (${percentage}%)</div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render AI analysis section
   */
  renderAIAnalysisSection(aiAnalysis) {
    if (!aiAnalysis) return '';
    
    const decisionPatterns = Object.entries(aiAnalysis.decisionPatterns || {}).slice(0, 6);
    const confidenceData = Object.entries(aiAnalysis.confidenceAnalysis?.distribution || {});
    const strategyData = Object.entries(aiAnalysis.strategyAnalysis || {});

    return `
      <div class="analytics-section ai-section">
        <h4>🤖 AI Analysis</h4>
        
        <div class="ai-stats-summary">
          <div class="ai-stat">
            <span class="ai-stat-label">Average Confidence:</span>
            <span class="ai-stat-value">${aiAnalysis.confidenceAnalysis?.average || 'N/A'}</span>
          </div>
        </div>

        <div class="ai-analysis-grid">
          <div class="ai-card">
            <h5>Decision Patterns</h5>
            <div class="decision-patterns">
              ${decisionPatterns.map(([action, data]) => `
                <div class="pattern-item">
                  <div class="pattern-action">${action}</div>
                  <div class="pattern-bar">
                    <div class="pattern-fill" style="width: ${data.percentage}%"></div>
                  </div>
                  <div class="pattern-stats">
                    ${data.count} (${data.percentage}%)
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <div class="ai-card">
            <h5>Confidence Distribution</h5>
            <div class="confidence-chart">
              ${confidenceData.map(([level, count]) => {
                const total = confidenceData.reduce((sum, [,c]) => sum + c, 0);
                const percentage = total > 0 ? (count / total * 100).toFixed(1) : 0;
                return `
                  <div class="confidence-item">
                    <div class="conf-level">${level}</div>
                    <div class="conf-bar">
                      <div class="conf-fill ${this.getConfidenceClass(level)}" style="width: ${percentage}%"></div>
                    </div>
                    <div class="conf-count">${count}</div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <div class="ai-card">
            <h5>Strategy Analysis</h5>
            <div class="strategy-breakdown">
              ${strategyData.map(([strategy, count]) => {
                const total = strategyData.reduce((sum, [,c]) => sum + c, 0);
                const percentage = total > 0 ? (count / total * 100).toFixed(1) : 0;
                return `
                  <div class="strategy-item">
                    <div class="strategy-icon">${this.getStrategyIcon(strategy)}</div>
                    <div class="strategy-info">
                      <div class="strategy-name">${strategy.charAt(0).toUpperCase() + strategy.slice(1)}</div>
                      <div class="strategy-percentage">${percentage}%</div>
                    </div>
                    <div class="strategy-count">${count} decisions</div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render trends section
   */
  renderTrendsSection(trends) {
    if (!trends) return '';
    
    return `
      <div class="analytics-section trends-section">
        <h4>📈 Trends & Patterns</h4>
        
        <div class="trends-grid">
          <div class="trend-card">
            <h5>Archive Activity</h5>
            <div class="activity-timeline">
              ${this.renderArchiveFrequencyChart(trends.archiveFrequency)}
            </div>
          </div>

          <div class="trend-card">
            <h5>Player Activity</h5>
            <div class="player-activity">
              ${this.renderPlayerActivityTrends(trends.playerActivityTrends)}
            </div>
          </div>

          <div class="trend-card">
            <h5>Game Performance Trends</h5>
            <div class="performance-trends">
              ${this.renderGamePerformanceTrends(trends.gamePerformanceTrends)}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render insights section
   */
  renderInsightsSection(insights) {
    if (!insights || insights.length === 0) {
      return `
        <div class="analytics-section insights-section">
          <h4>💡 Insights</h4>
          <div class="no-insights">
            <div class="no-insights-icon">🔍</div>
            <div class="no-insights-text">No specific insights available yet. Play more games to generate insights!</div>
          </div>
        </div>
      `;
    }
    
    return `
      <div class="analytics-section insights-section">
        <h4>💡 Insights</h4>
        <div class="insights-grid">
          ${insights.map(insight => `
            <div class="insight-card ${insight.level}">
              <div class="insight-header">
                <span class="insight-icon">${insight.icon}</span>
                <span class="insight-title">${insight.title}</span>
              </div>
              <div class="insight-message">${insight.message}</div>
              <div class="insight-type">${insight.type.toUpperCase()}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  /**
   * Render storage analysis section
   */
  renderStorageAnalysisSection(storage) {
    if (!storage) return '';
    
    return `
      <div class="analytics-section storage-section">
        <h4>💾 Storage Analysis</h4>
        <div class="storage-grid">
          <div class="storage-card">
            <div class="storage-metric">
              <div class="metric-value">${storage.estimatedMB.toFixed(1)} MB</div>
              <div class="metric-label">Total Storage</div>
            </div>
          </div>
          <div class="storage-card">
            <div class="storage-metric">
              <div class="metric-value">${storage.archiveCount}</div>
              <div class="metric-label">Archive Files</div>
            </div>
          </div>
          <div class="storage-card">
            <div class="storage-metric">
              <div class="metric-value">${(storage.averageSize / 1024).toFixed(1)} KB</div>
              <div class="metric-label">Average Size</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render analytics dashboard content
   * @param {Object} analytics - Analytics data
   * @param {Object} storageStats - Storage statistics
   * @returns {string} Dashboard HTML
   */
  renderAnalyticsDashboard(analytics, storageStats) {
    const typeChartData = Object.entries(analytics.byType)
      .map(([type, count]) => ({ type, count, percentage: (count / analytics.total * 100).toFixed(1) }));

    return `
      <div class="analytics-grid">
        <div class="analytics-card overview-card">
          <h3>📊 Overview</h3>
          <div class="overview-stats">
            <div class="stat-item">
              <div class="stat-value">${analytics.total}</div>
              <div class="stat-label">Total Archives</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">${storageStats.estimatedMB.toFixed(1)} MB</div>
              <div class="stat-label">Storage Used</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">${(storageStats.averageSize / 1024).toFixed(1)} KB</div>
              <div class="stat-label">Average Size</div>
            </div>
          </div>
        </div>

        <div class="analytics-card type-breakdown-card">
          <h3>📁 Type Breakdown</h3>
          <div class="type-chart">
            ${typeChartData.map(item => `
              <div class="type-chart-item">
                <div class="type-info">
                  <span class="type-icon">${this.getTypeIcon(item.type)}</span>
                  <span class="type-name">${item.type}</span>
                </div>
                <div class="type-bar">
                  <div class="type-bar-fill" style="width: ${item.percentage}%"></div>
                </div>
                <div class="type-stats">
                  <span class="type-count">${item.count}</span>
                  <span class="type-percentage">(${item.percentage}%)</span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="analytics-card timeline-card">
          <h3>📅 Timeline</h3>
          <div class="timeline-info">
            ${analytics.timeRange.oldest ? `
              <div class="timeline-item">
                <span class="timeline-label">Oldest:</span>
                <span class="timeline-value">${analytics.timeRange.oldest.toLocaleDateString()}</span>
              </div>
              <div class="timeline-item">
                <span class="timeline-label">Newest:</span>
                <span class="timeline-value">${analytics.timeRange.newest.toLocaleDateString()}</span>
              </div>
              <div class="timeline-item">
                <span class="timeline-label">Span:</span>
                <span class="timeline-value">${Math.ceil(analytics.timeRange.span / (1000 * 60 * 60 * 24))} days</span>
              </div>
            ` : '<div class="no-data">No archive data available</div>'}
          </div>
        </div>

        <div class="analytics-card storage-card">
          <h3>💾 Storage Details</h3>
          <div class="storage-details">
            <div class="storage-item">
              <span class="storage-label">Total Items:</span>
              <span class="storage-value">${storageStats.archiveCount}</span>
            </div>
            <div class="storage-item">
              <span class="storage-label">Estimated Size:</span>
              <span class="storage-value">${this.formatFileSize(storageStats.totalSize)}</span>
            </div>
            <div class="storage-item">
              <span class="storage-label">Average Item:</span>
              <span class="storage-value">${this.formatFileSize(storageStats.averageSize)}</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // Analytics utility methods
  getVictoryIcon(condition) {
    const icons = {
      'points': '🏆',
      'tokyo': '🗾', 
      'destruction': '💥',
      'cards': '🃏',
      'hearts': '❤️',
      'default': '⭐'
    };
    return icons[condition.toLowerCase()] || icons.default;
  }

  getConfidenceClass(level) {
    const classes = {
      'Very High': 'conf-very-high',
      'High': 'conf-high', 
      'Medium': 'conf-medium',
      'Low': 'conf-low',
      'Very Low': 'conf-very-low'
    };
    return classes[level] || 'conf-medium';
  }

  getStrategyIcon(strategy) {
    const icons = {
      'aggressive': '⚔️',
      'defensive': '🛡️',
      'balanced': '⚖️',
      'opportunistic': '🎯',
      'cards': '🃏',
      'points': '🏆',
      'default': '🎲'
    };
    return icons[strategy.toLowerCase()] || icons.default;
  }

  renderArchiveFrequencyChart(frequency) {
    if (!frequency || frequency.length === 0) {
      return '<div class="chart-no-data">No frequency data available</div>';
    }
    
    const maxCount = Math.max(...frequency.map(f => f.count));
    return frequency.slice(-7).map(f => `
      <div class="frequency-item">
        <div class="freq-bar" style="height: ${(f.count / maxCount * 100)}%"></div>
        <div class="freq-label">${new Date(f.date).toLocaleDateString()}</div>
        <div class="freq-count">${f.count}</div>
      </div>
    `).join('');
  }

  renderPlayerActivityTrends(trends) {
    if (!trends || trends.length === 0) {
      return '<div class="chart-no-data">No activity trends available</div>';
    }
    
    return trends.slice(0, 5).map(trend => `
      <div class="activity-trend-item">
        <div class="trend-player">${trend.player}</div>
        <div class="trend-direction ${trend.direction}">
          ${trend.direction === 'increasing' ? '📈' : trend.direction === 'decreasing' ? '📉' : '➡️'}
        </div>
        <div class="trend-value">${trend.gamesThisPeriod} games</div>
      </div>
    `).join('');
  }

  renderGamePerformanceTrends(trends) {
    if (!trends || trends.length === 0) {
      return '<div class="chart-no-data">No performance trends available</div>';
    }
    
    return trends.slice(0, 5).map(trend => `
      <div class="perf-trend-item">
        <div class="trend-metric">${trend.metric}</div>
        <div class="trend-change ${trend.direction}">
          ${trend.direction === 'increasing' ? '📈' : trend.direction === 'decreasing' ? '📉' : '➡️'}
          ${trend.change}
        </div>
      </div>
    `).join('');
  }

  // Analytics actions
  exportAnalytics() {
    // Export analytics as JSON
    archiveAnalytics.calculateCompleteAnalytics().then(analytics => {
      const blob = new Blob([JSON.stringify(analytics, null, 2)], {type: 'application/json'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `archive-analytics-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  refreshAnalytics() {
    // Refresh the analytics view
    this.renderAnalyticsView();
  }

  /**
   * Update summary display
   */
  updateSummary() {
    const summary = archiveManager.getFilterSummary();
    const summaryEl = this.container.querySelector('[data-summary]');
    const selectedEl = this.container.querySelector('[data-selected-count]');
    
    if (summaryEl) {
      const totalEl = summaryEl.querySelector('.summary-total');
      if (totalEl) {
        totalEl.textContent = `${summary.filtered} of ${summary.total} archives`;
      }
    }
    
    if (selectedEl) {
      if (summary.selected > 0) {
        selectedEl.textContent = `${summary.selected} selected`;
        selectedEl.style.display = 'inline';
      } else {
        selectedEl.style.display = 'none';
      }
    }
    
    // Update bulk action buttons
    const bulkButtons = this.container.querySelectorAll('.bulk-btn');
    bulkButtons.forEach(btn => {
      btn.disabled = summary.selected === 0;
    });
  }

  /**
   * Update storage info display
   */
  updateStorageInfo() {
    const storageInfo = this.container.querySelector('[data-storage-info]');
    if (!storageInfo) return;
    
    const stats = archiveManager.getStorageStats();
    const valueEl = storageInfo.querySelector('.storage-value');
    if (valueEl) {
      valueEl.textContent = `${stats.estimatedMB.toFixed(1)} MB`;
    }
  }

  /**
   * Handle archive selection
   * @param {Event} event - Click event
   */
  handleArchiveSelect(event) {
    const archiveId = event.target.dataset.archiveId;
    const isSelected = event.target.checked;
    
    archiveManager.setSelection(archiveId, isSelected);
    this.updateSummary();
    
    // Update visual selection state
    const archiveElements = this.container.querySelectorAll(`[data-archive-id="${archiveId}"]`);
    archiveElements.forEach(el => {
      el.classList.toggle('selected', isSelected);
    });
  }

  /**
   * Handle select all
   * @param {boolean} selectAll - Whether to select all
   */
  handleSelectAll(selectAll) {
    if (selectAll) {
      archiveManager.selectAll(this.archives);
    } else {
      archiveManager.clearSelection();
    }
    
    this.updateSummary();
    this.renderCurrentView();
  }

  /**
   * Export selected archives
   */
  async exportSelected() {
    const selected = archiveManager.getSelected();
    if (selected.length === 0) return;
    
    try {
      this.showLoading('Exporting archives...');
      await archiveManager.exportSelected(selected);
      this.hideLoading();
      this.showMessage('Archives exported successfully');
    } catch (error) {
      this.hideLoading();
      this.showError('Failed to export archives: ' + error.message);
    }
  }

  /**
   * Delete selected archives
   */
  async deleteSelected() {
    const selected = archiveManager.getSelected();
    if (selected.length === 0) return;
    
    const confirmed = confirm(`Delete ${selected.length} archive(s)? This cannot be undone.`);
    if (!confirmed) return;
    
    try {
      this.showLoading('Deleting archives...');
      const result = await archiveManager.deleteSelected(selected);
      this.hideLoading();
      
      if (result.errors.length > 0) {
        this.showError(`Deleted ${result.deletedCount} archives. ${result.errors.length} failed.`);
      } else {
        this.showMessage(`Deleted ${result.deletedCount} archives successfully`);
      }
      
      await this.refreshArchives();
    } catch (error) {
      this.hideLoading();
      this.showError('Failed to delete archives: ' + error.message);
    }
  }

  /**
   * Handle individual archive actions
   */
  async handleArchiveOpen(event) {
    const archiveId = event.target.closest('[data-archive-id]').dataset.archiveId;
    // TODO: Implement archive viewer
    console.log('Open archive:', archiveId);
  }

  async handleArchiveReplay(event) {
    const archiveId = event.target.closest('[data-archive-id]').dataset.archiveId;
    const archive = this.archives.find(a => a.id === archiveId);
    
    if (!archive) return;
    
    try {
      this.showLoading('Loading archive for replay...');
      const content = await archiveManager.loadArchive(archive);
      this.hideLoading();
      
      // Start replay
      const replayOverlay = createReplayStateOverlay();
      startReplay(content, { overlay: replayOverlay });
      
      // Hide archive manager during replay
      this.hide();
    } catch (error) {
      this.hideLoading();
      this.showError('Failed to start replay: ' + error.message);
    }
  }

  async handleArchiveExport(event) {
    const archiveId = event.target.closest('[data-archive-id]').dataset.archiveId;
    await archiveManager.exportSelected([archiveId]);
  }

  async handleArchiveDelete(event) {
    const archiveId = event.target.closest('[data-archive-id]').dataset.archiveId;
    const archive = this.archives.find(a => a.id === archiveId);
    
    if (!archive) return;
    
    const confirmed = confirm(`Delete archive "${archive.name}"? This cannot be undone.`);
    if (!confirmed) return;
    
    try {
      await archiveManager.deleteSelected([archiveId]);
      this.showMessage('Archive deleted successfully');
      await this.refreshArchives();
    } catch (error) {
      this.showError('Failed to delete archive: ' + error.message);
    }
  }

  /**
   * Show/hide the archive manager
   */
  show() {
    this.container.style.display = 'block';
    this.isVisible = true;
    this.refreshArchives();
    
    // Auto-refresh every 30 seconds when visible
    this.refreshInterval = setInterval(() => {
      this.refreshArchives();
    }, 30000);
  }

  hide() {
    this.container.style.display = 'none';
    this.isVisible = false;
    
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  /**
   * Utility methods
   */
  showLoading(message = 'Loading...') {
    // TODO: Implement loading overlay
    console.log('Loading:', message);
  }

  hideLoading() {
    // TODO: Hide loading overlay
  }

  showMessage(message) {
    // TODO: Implement message display
    console.log('Message:', message);
  }

  showError(message) {
    // TODO: Implement error display
    console.error('Error:', message);
  }

  showSettings() {
    // TODO: Implement settings dialog
    console.log('Show settings');
  }

  handleKeyboard(event) {
    switch (event.key) {
      case 'Escape':
        this.hide();
        break;
      case 'r':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          this.refreshArchives();
        }
        break;
      case 'a':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          this.handleSelectAll(true);
        }
        break;
    }
  }

  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  /**
   * Destroy the component
   */
  destroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
    
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    
    console.log('[ArchiveManagerComponent] Destroyed');
  }
}

// Export function to create and show archive manager
export function showArchiveManager() {
  if (!window.archiveManagerInstance) {
    window.archiveManagerInstance = new ArchiveManagerComponent();
  }
  window.archiveManagerInstance.show();
  return window.archiveManagerInstance;
}