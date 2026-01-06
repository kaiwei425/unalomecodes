/**
 * 本地存储优化工具
 * 提供防抖、批量更新等功能
 */

/**
 * 防抖函数
 * @param {Function} func - 要防抖的函数
 * @param {number} wait - 等待时间（毫秒）
 * @returns {Function} 防抖后的函数
 */
function debounce(func, wait) {
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
 * 存储管理器
 * 提供优化的 localStorage 操作
 */
class StorageManager {
  constructor() {
    this.pendingWrites = new Map();
    this.writeTimers = new Map();
    this.DEBOUNCE_DELAY = 100; // 100ms 防抖延迟
  }

  /**
   * 设置存储项（带防抖）
   * @param {string} key - 存储键
   * @param {any} value - 存储值
   * @param {boolean} immediate - 是否立即写入
   */
  setItem(key, value, immediate = false) {
    // 序列化值
    let serialized;
    try {
      serialized = JSON.stringify(value);
    } catch (err) {
      console.error('[Storage] Failed to serialize value:', err);
      return false;
    }

    // 保存到待写入队列
    this.pendingWrites.set(key, serialized);

    if (immediate) {
      this.flush(key);
    } else {
      // 清除之前的定时器
      if (this.writeTimers.has(key)) {
        clearTimeout(this.writeTimers.get(key));
      }

      // 设置新的防抖定时器
      const timer = setTimeout(() => {
        this.flush(key);
      }, this.DEBOUNCE_DELAY);

      this.writeTimers.set(key, timer);
    }

    return true;
  }

  /**
   * 立即写入指定键
   * @param {string} key - 存储键
   */
  flush(key) {
    if (!this.pendingWrites.has(key)) return;

    const value = this.pendingWrites.get(key);
    try {
      localStorage.setItem(key, value);
      this.pendingWrites.delete(key);
      
      if (this.writeTimers.has(key)) {
        clearTimeout(this.writeTimers.get(key));
        this.writeTimers.delete(key);
      }
    } catch (err) {
      console.error('[Storage] Failed to write to localStorage:', err);
      // 如果存储空间不足，尝试清理旧数据
      if (err.name === 'QuotaExceededError') {
        this.handleQuotaExceeded();
      }
    }
  }

  /**
   * 刷新所有待写入的数据
   */
  flushAll() {
    for (const key of this.pendingWrites.keys()) {
      this.flush(key);
    }
  }

  /**
   * 获取存储项
   * @param {string} key - 存储键
   * @param {any} defaultValue - 默认值
   * @returns {any} 存储的值
   */
  getItem(key, defaultValue = null) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return defaultValue;
      return JSON.parse(raw);
    } catch (err) {
      console.error('[Storage] Failed to read from localStorage:', err);
      return defaultValue;
    }
  }

  /**
   * 删除存储项
   * @param {string} key - 存储键
   */
  removeItem(key) {
    try {
      localStorage.removeItem(key);
      this.pendingWrites.delete(key);
      if (this.writeTimers.has(key)) {
        clearTimeout(this.writeTimers.get(key));
        this.writeTimers.delete(key);
      }
    } catch (err) {
      console.error('[Storage] Failed to remove from localStorage:', err);
    }
  }

  /**
   * 处理存储空间不足
   */
  handleQuotaExceeded() {
    console.warn('[Storage] Quota exceeded, attempting cleanup...');
    
    // 清理旧的临时数据
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('__temp__') || key.startsWith('__cache__'))) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (_) {}
    });
  }
}

// 导出单例
export const storage = new StorageManager();

// 便捷函数
export function setStorageItem(key, value, immediate = false) {
  return storage.setItem(key, value, immediate);
}

export function getStorageItem(key, defaultValue = null) {
  return storage.getItem(key, defaultValue);
}

export function removeStorageItem(key) {
  return storage.removeItem(key);
}

// 页面卸载时刷新所有待写入数据
window.addEventListener('beforeunload', () => {
  storage.flushAll();
});

// 页面可见性变化时也刷新
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    storage.flushAll();
  }
});
