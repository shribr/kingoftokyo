/** archiveManagementService.js
 * Comprehensive archive management service for game logs and AIDT data
 * Provides filtering, searching, sorting, bulk operations, and analytics
 */

import { 
  listArchivedGameLogs, 
  listArchivedAIDT, 
  loadArchivedGameLog, 
  loadArchivedAIDT,
  exportSnapshot
} from './logArchiveService.js';
import { listAutoArchives, loadAutoArchive, deleteAutoArchive } from './autoArchiveTempService.js';

/**
 * Archive management service class
 */
export class ArchiveManagementService {
  constructor() {
    this.filters = {
      type: 'all', // 'all', 'game', 'aidt', 'auto'
      dateRange: 'all', // 'all', 'today', 'week', 'month', 'custom'
      searchTerm: '',
      sortBy: 'date', // 'date', 'name', 'size'
      sortOrder: 'desc', // 'asc', 'desc'
      tags: []
    };
    this.selection = new Set();
    this.analytics = null;
    this.lastRefresh = null;
  }

  /**
   * Get all archives with current filters applied
   * @returns {Array} Filtered and sorted archive list
   */
  getFilteredArchives() {
    const allArchives = this.getAllArchives();
    let filtered = this.applyFilters(allArchives);
    filtered = this.applySorting(filtered);
    
    this.lastRefresh = Date.now();
    return filtered;
  }

  /**
   * Get all archives from all sources
   * @returns {Array} Combined archive list
   */
  getAllArchives() {
    const archives = [];
    
    // Get game log archives
    if (this.filters.type === 'all' || this.filters.type === 'game') {
      const gameLogs = listArchivedGameLogs().map(log => ({
        ...log,
        type: 'game',
        source: 'archive',
        category: 'Game Log'
      }));
      archives.push(...gameLogs);
    }
    
    // Get AIDT archives
    if (this.filters.type === 'all' || this.filters.type === 'aidt') {
      const aidtLogs = listArchivedAIDT().map(log => ({
        ...log,
        type: 'aidt',
        source: 'archive',
        category: 'AI Decisions'
      }));
      archives.push(...aidtLogs);
    }
    
    // Get auto archives
    if (this.filters.type === 'all' || this.filters.type === 'auto') {
      const autoArchives = listAutoArchives().map(archive => ({
        ...archive,
        type: 'auto',
        source: 'temp',
        category: 'Auto Archive'
      }));
      archives.push(...autoArchives);
    }
    
    return archives;
  }

  /**
   * Apply current filters to archive list
   * @param {Array} archives - Archive list
   * @returns {Array} Filtered archives
   */
  applyFilters(archives) {
    let filtered = [...archives];
    
    // Search term filter
    if (this.filters.searchTerm) {
      const term = this.filters.searchTerm.toLowerCase();
      filtered = filtered.filter(archive => 
        archive.name?.toLowerCase().includes(term) ||
        archive.category?.toLowerCase().includes(term) ||
        archive.id?.toLowerCase().includes(term)
      );
    }
    
    // Date range filter
    if (this.filters.dateRange !== 'all') {
      const now = new Date();
      const cutoff = this.getDateCutoff(now, this.filters.dateRange);
      
      filtered = filtered.filter(archive => {
        const archiveDate = new Date(archive.ts || archive.timestamp);
        return archiveDate >= cutoff;
      });
    }
    
    // Tag filter (if implemented)
    if (this.filters.tags.length > 0) {
      filtered = filtered.filter(archive => 
        this.filters.tags.some(tag => archive.tags?.includes(tag))
      );
    }
    
    return filtered;
  }

  /**
   * Apply sorting to archive list
   * @param {Array} archives - Archive list
   * @returns {Array} Sorted archives
   */
  applySorting(archives) {
    const { sortBy, sortOrder } = this.filters;
    
    return archives.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'date':
          const dateA = new Date(a.ts || a.timestamp);
          const dateB = new Date(b.ts || b.timestamp);
          comparison = dateA.getTime() - dateB.getTime();
          break;
        case 'name':
          comparison = (a.name || '').localeCompare(b.name || '');
          break;
        case 'size':
          comparison = (a.size || 0) - (b.size || 0);
          break;
        case 'type':
          comparison = (a.type || '').localeCompare(b.type || '');
          break;
        default:
          comparison = 0;
      }
      
      return sortOrder === 'desc' ? -comparison : comparison;
    });
  }

  /**
   * Get date cutoff for date range filter
   * @param {Date} now - Current date
   * @param {string} range - Date range type
   * @returns {Date} Cutoff date
   */
  getDateCutoff(now, range) {
    const cutoff = new Date(now);
    
    switch (range) {
      case 'today':
        cutoff.setHours(0, 0, 0, 0);
        break;
      case 'week':
        cutoff.setDate(cutoff.getDate() - 7);
        break;
      case 'month':
        cutoff.setMonth(cutoff.getMonth() - 1);
        break;
      default:
        cutoff.setFullYear(1970); // Very old date
    }
    
    return cutoff;
  }

  /**
   * Update filters
   * @param {Object} newFilters - New filter values
   */
  updateFilters(newFilters) {
    this.filters = { ...this.filters, ...newFilters };
  }

  /**
   * Reset filters to defaults
   */
  resetFilters() {
    this.filters = {
      type: 'all',
      dateRange: 'all',
      searchTerm: '',
      sortBy: 'date',
      sortOrder: 'desc',
      tags: []
    };
    this.selection.clear();
  }

  /**
   * Select/deselect archive
   * @param {string} id - Archive ID
   * @param {boolean} selected - Selection state
   */
  setSelection(id, selected) {
    if (selected) {
      this.selection.add(id);
    } else {
      this.selection.delete(id);
    }
  }

  /**
   * Select all visible archives
   * @param {Array} archives - Visible archives
   */
  selectAll(archives) {
    archives.forEach(archive => this.selection.add(archive.id));
  }

  /**
   * Clear all selections
   */
  clearSelection() {
    this.selection.clear();
  }

  /**
   * Get selected archives
   * @returns {Array} Selected archive IDs
   */
  getSelected() {
    return Array.from(this.selection);
  }

  /**
   * Load archive content
   * @param {Object} archive - Archive metadata
   * @returns {Object} Archive content
   */
  async loadArchive(archive) {
    switch (archive.source) {
      case 'archive':
        if (archive.type === 'game') {
          return loadArchivedGameLog(archive.id);
        } else if (archive.type === 'aidt') {
          return loadArchivedAIDT(archive.id);
        }
        break;
      case 'temp':
        return loadAutoArchive(archive.key || archive.id);
      default:
        throw new Error(`Unknown archive source: ${archive.source}`);
    }
  }

  /**
   * Export selected archives
   * @param {Array} selectedIds - Selected archive IDs
   * @returns {Promise} Export promise
   */
  async exportSelected(selectedIds) {
    const archives = this.getFilteredArchives();
    const toExport = archives.filter(archive => selectedIds.includes(archive.id));
    
    if (toExport.length === 1) {
      // Single export
      const archive = toExport[0];
      const content = await this.loadArchive(archive);
      const filename = `${archive.name || archive.id}.json`;
      exportSnapshot(content, filename);
    } else if (toExport.length > 1) {
      // Bulk export as ZIP-like structure
      const exportData = {
        exportDate: new Date().toISOString(),
        exportType: 'bulk',
        archives: []
      };

      for (const archive of toExport) {
        try {
          const content = await this.loadArchive(archive);
          exportData.archives.push({
            metadata: archive,
            content: content
          });
        } catch (error) {
          console.warn('Failed to load archive for export:', archive.id, error);
        }
      }

      const filename = `KOT_Archives_${new Date().toISOString().split('T')[0]}.json`;
      exportSnapshot(exportData, filename);
    }
  }

  /**
   * Delete selected archives
   * @param {Array} selectedIds - Selected archive IDs
   * @returns {Promise} Delete promise
   */
  async deleteSelected(selectedIds) {
    const archives = this.getFilteredArchives();
    const toDelete = archives.filter(archive => selectedIds.includes(archive.id));
    
    let deletedCount = 0;
    const errors = [];

    for (const archive of toDelete) {
      try {
        await this.deleteArchive(archive);
        deletedCount++;
        this.selection.delete(archive.id);
      } catch (error) {
        errors.push({ archive: archive.id, error: error.message });
        console.warn('Failed to delete archive:', archive.id, error);
      }
    }

    return { deletedCount, errors };
  }

  /**
   * Delete single archive
   * @param {Object} archive - Archive to delete
   */
  async deleteArchive(archive) {
    switch (archive.source) {
      case 'archive':
        // Remove from localStorage
        if (archive.type === 'game') {
          this.removeFromArchiveList('KOT_ARCHIVE_GAME_LOGS', archive.id);
          localStorage.removeItem(`KOT_ARCHIVE_GAME_LOG_${archive.id}`);
        } else if (archive.type === 'aidt') {
          this.removeFromArchiveList('KOT_ARCHIVE_AIDT_LOGS', archive.id);
          localStorage.removeItem(`KOT_ARCHIVE_AIDT_LOG_${archive.id}`);
        }
        break;
      case 'temp':
        deleteAutoArchive(archive.key || archive.id);
        break;
      default:
        throw new Error(`Cannot delete archive from source: ${archive.source}`);
    }
  }

  /**
   * Remove archive from list in localStorage
   * @param {string} listKey - localStorage key for list
   * @param {string} archiveId - Archive ID to remove
   */
  removeFromArchiveList(listKey, archiveId) {
    try {
      const list = JSON.parse(localStorage.getItem(listKey) || '[]');
      const filtered = list.filter(item => item.id !== archiveId);
      localStorage.setItem(listKey, JSON.stringify(filtered));
    } catch (error) {
      console.warn('Failed to update archive list:', listKey, error);
    }
  }

  /**
   * Calculate archive analytics
   * @returns {Object} Analytics data
   */
  calculateAnalytics() {
    const archives = this.getAllArchives();
    
    const analytics = {
      total: archives.length,
      byType: {},
      byDate: {},
      storage: {
        total: 0,
        average: 0
      },
      timeRange: {
        oldest: null,
        newest: null,
        span: 0
      }
    };

    // Type breakdown
    archives.forEach(archive => {
      const type = archive.category || archive.type;
      analytics.byType[type] = (analytics.byType[type] || 0) + 1;
      
      // Storage calculations
      if (archive.size) {
        analytics.storage.total += archive.size;
      }
    });

    analytics.storage.average = archives.length > 0 ? 
      analytics.storage.total / archives.length : 0;

    // Date analysis
    const dates = archives
      .map(a => new Date(a.ts || a.timestamp))
      .filter(d => !isNaN(d.getTime()))
      .sort((a, b) => a.getTime() - b.getTime());

    if (dates.length > 0) {
      analytics.timeRange.oldest = dates[0];
      analytics.timeRange.newest = dates[dates.length - 1];
      analytics.timeRange.span = analytics.timeRange.newest.getTime() - 
        analytics.timeRange.oldest.getTime();
    }

    // Date grouping for charts
    analytics.byDate = this.groupArchivesByDate(archives);

    this.analytics = analytics;
    return analytics;
  }

  /**
   * Group archives by date for chart display
   * @param {Array} archives - Archive list
   * @returns {Object} Date-grouped data
   */
  groupArchivesByDate(archives) {
    const groups = {};
    
    archives.forEach(archive => {
      const date = new Date(archive.ts || archive.timestamp);
      const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
      
      if (!groups[dateKey]) {
        groups[dateKey] = {
          date: dateKey,
          count: 0,
          types: {}
        };
      }
      
      groups[dateKey].count++;
      const type = archive.category || archive.type;
      groups[dateKey].types[type] = (groups[dateKey].types[type] || 0) + 1;
    });
    
    return groups;
  }

  /**
   * Get storage usage statistics
   * @returns {Object} Storage statistics
   */
  getStorageStats() {
    let totalSize = 0;
    let archiveCount = 0;
    
    // Calculate localStorage usage for archives
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('KOT_ARCHIVE_') || key.startsWith('kot_'))) {
        const value = localStorage.getItem(key);
        if (value) {
          totalSize += value.length;
          archiveCount++;
        }
      }
    }
    
    return {
      totalSize,
      archiveCount,
      averageSize: archiveCount > 0 ? totalSize / archiveCount : 0,
      estimatedMB: totalSize / (1024 * 1024)
    };
  }

  /**
   * Search archives with advanced criteria
   * @param {Object} criteria - Search criteria
   * @returns {Array} Search results
   */
  advancedSearch(criteria) {
    const archives = this.getAllArchives();
    
    return archives.filter(archive => {
      // Text search
      if (criteria.text) {
        const text = criteria.text.toLowerCase();
        const matches = [
          archive.name?.toLowerCase(),
          archive.category?.toLowerCase(),
          archive.type?.toLowerCase()
        ].some(field => field?.includes(text));
        
        if (!matches) return false;
      }
      
      // Date range
      if (criteria.startDate || criteria.endDate) {
        const archiveDate = new Date(archive.ts || archive.timestamp);
        if (criteria.startDate && archiveDate < new Date(criteria.startDate)) return false;
        if (criteria.endDate && archiveDate > new Date(criteria.endDate)) return false;
      }
      
      // Size range
      if (criteria.minSize && archive.size < criteria.minSize) return false;
      if (criteria.maxSize && archive.size > criteria.maxSize) return false;
      
      // Type filter
      if (criteria.types && criteria.types.length > 0) {
        if (!criteria.types.includes(archive.type)) return false;
      }
      
      return true;
    });
  }

  /**
   * Get current filter summary
   * @returns {Object} Filter summary
   */
  getFilterSummary() {
    const total = this.getAllArchives().length;
    const filtered = this.getFilteredArchives().length;
    const selected = this.selection.size;
    
    return {
      total,
      filtered,
      selected,
      hasFilters: this.hasActiveFilters(),
      filterCount: this.getActiveFilterCount()
    };
  }

  /**
   * Check if any filters are active
   * @returns {boolean} True if filters are active
   */
  hasActiveFilters() {
    return this.filters.type !== 'all' ||
           this.filters.dateRange !== 'all' ||
           this.filters.searchTerm !== '' ||
           this.filters.tags.length > 0;
  }

  /**
   * Count active filters
   * @returns {number} Number of active filters
   */
  getActiveFilterCount() {
    let count = 0;
    if (this.filters.type !== 'all') count++;
    if (this.filters.dateRange !== 'all') count++;
    if (this.filters.searchTerm !== '') count++;
    if (this.filters.tags.length > 0) count++;
    return count;
  }
}

// Export singleton instance
export const archiveManager = new ArchiveManagementService();