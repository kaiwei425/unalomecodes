/**
 * 统一错误处理系统
 * 提供错误捕获、记录和用户提示功能
 */

import { UI } from './constants.js';

/**
 * 错误类型枚举
 */
export const ErrorType = {
  NETWORK: 'network',
  VALIDATION: 'validation',
  PERMISSION: 'permission',
  UNKNOWN: 'unknown'
};

/**
 * 错误处理器类
 */
class ErrorHandler {
  constructor() {
    this.errorLog = [];
    this.maxLogSize = 100;
  }

  /**
   * 记录错误
   * @param {Error|string} error - 错误对象或消息
   * @param {Object} context - 上下文信息
   */
  log(error, context = {}) {
    const errorInfo = {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      context,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent
    };

    this.errorLog.push(errorInfo);
    
    // 限制日志大小
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog.shift();
    }

    // 开发环境输出到控制台
    if (this.isDevelopment()) {
      console.error('[ErrorHandler]', errorInfo);
    }

    // 生产环境可发送到错误追踪服务
    if (!this.isDevelopment() && window.trackError) {
      window.trackError(errorInfo);
    }
  }

  /**
   * 显示用户友好的错误提示
   * @param {string} message - 错误消息
   * @param {ErrorType} type - 错误类型
   */
  showError(message, type = ErrorType.UNKNOWN) {
    const userMessages = {
      [ErrorType.NETWORK]: '网络连接失败，请检查网络后重试',
      [ErrorType.VALIDATION]: '输入信息有误，请检查后重试',
      [ErrorType.PERMISSION]: '权限不足，请先登录',
      [ErrorType.UNKNOWN]: '操作失败，请稍后重试'
    };

    const displayMessage = message || userMessages[type];
    this.showToast(displayMessage, 'error');
  }

  /**
   * 显示成功提示
   * @param {string} message - 成功消息
   */
  showSuccess(message) {
    this.showToast(message, 'success');
  }

  /**
   * 显示 Toast 提示
   * @param {string} message - 消息
   * @param {string} type - 类型 (success, error, info, warning)
   */
  showToast(message, type = 'info') {
    // 移除现有的 toast
    const existing = document.querySelector('.app-toast');
    if (existing) existing.remove();

    // 创建新的 toast
    const toast = document.createElement('div');
    toast.className = `app-toast app-toast--${type}`;
    toast.textContent = message;
    
    // 添加样式（如果还没有）
    if (!document.getElementById('toast-styles')) {
      const style = document.createElement('style');
      style.id = 'toast-styles';
      style.textContent = `
        .app-toast {
          position: fixed;
          left: 50%;
          bottom: 100px;
          transform: translateX(-50%) translateY(20px);
          background: rgba(17, 17, 17, 0.9);
          color: #fff;
          padding: 12px 18px;
          border-radius: 10px;
          font-weight: 700;
          font-size: 15px;
          z-index: 9999;
          opacity: 0;
          transition: opacity 0.3s ease, transform 0.3s ease;
          pointer-events: none;
        }
        .app-toast.app-toast--success {
          background: rgba(16, 185, 129, 0.9);
        }
        .app-toast.app-toast--error {
          background: rgba(239, 68, 68, 0.9);
        }
        .app-toast.app-toast--info {
          background: rgba(59, 130, 246, 0.9);
        }
        .app-toast.app-toast--warning {
          background: rgba(245, 158, 11, 0.9);
        }
        .app-toast.show {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(toast);
    
    // 触发显示动画
    requestAnimationFrame(() => {
      toast.classList.add('show');
    });

    // 自动移除
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, UI.TOAST_DURATION);
  }

  /**
   * 处理 API 错误
   * @param {Response} response - Fetch Response 对象
   * @returns {Promise<never>}
   */
  async handleApiError(response) {
    let errorMessage = '请求失败';
    
    try {
      const data = await response.json();
      errorMessage = data.error || data.message || errorMessage;
    } catch {
      // 如果响应不是 JSON，使用状态文本
      errorMessage = response.statusText || `HTTP ${response.status}`;
    }

    const error = new Error(errorMessage);
    error.status = response.status;
    error.type = this.getErrorType(response.status);
    
    this.log(error, { url: response.url, status: response.status });
    this.showError(errorMessage, error.type);
    
    throw error;
  }

  /**
   * 根据 HTTP 状态码确定错误类型
   * @param {number} status - HTTP 状态码
   * @returns {ErrorType}
   */
  getErrorType(status) {
    if (status >= 400 && status < 500) {
      return status === 401 || status === 403 
        ? ErrorType.PERMISSION 
        : ErrorType.VALIDATION;
    }
    if (status >= 500) {
      return ErrorType.NETWORK;
    }
    return ErrorType.UNKNOWN;
  }

  /**
   * 检查是否为开发环境
   * @returns {boolean}
   */
  isDevelopment() {
    return window.location.hostname === 'localhost' 
      || window.location.hostname.includes('dev')
      || window.location.search.includes('debug=true');
  }

  /**
   * 获取错误日志（用于调试）
   * @returns {Array}
   */
  getErrorLog() {
    return [...this.errorLog];
  }

  /**
   * 清空错误日志
   */
  clearErrorLog() {
    this.errorLog = [];
  }
}

// 导出单例
export const errorHandler = new ErrorHandler();

// 全局错误捕获
window.addEventListener('error', (event) => {
  errorHandler.log(event.error, {
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno
  });
});

window.addEventListener('unhandledrejection', (event) => {
  errorHandler.log(event.reason, {
    type: 'unhandledrejection'
  });
});

// 导出便捷函数
export function handleError(error, context) {
  errorHandler.log(error, context);
  errorHandler.showError(
    error instanceof Error ? error.message : String(error)
  );
}

export function showSuccess(message) {
  errorHandler.showSuccess(message);
}

export function showError(message, type) {
  errorHandler.showError(message, type);
}
