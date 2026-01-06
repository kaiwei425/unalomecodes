/**
 * 安全工具函数
 * 提供 XSS 防护、数据加密等安全功能
 */

/**
 * HTML 转义（防止 XSS）
 * @param {string} str - 要转义的字符串
 * @returns {string} 转义后的字符串
 */
export function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * 安全的 innerHTML 设置（使用 DOMPurify）
 * 需要先引入 DOMPurify: <script src="https://cdn.jsdelivr.net/npm/dompurify@3.0.6/dist/purify.min.js"></script>
 * @param {HTMLElement} element - 目标元素
 * @param {string} html - HTML 内容
 */
export function safeSetInnerHTML(element, html) {
  if (typeof window.DOMPurify !== 'undefined') {
    element.innerHTML = DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
      ALLOWED_ATTR: ['href']
    });
  } else {
    // 降级方案：只允许纯文本
    element.textContent = html;
  }
}

/**
 * 简单的数据加密（Base64 + 混淆）
 * 注意：这不是真正的加密，只是简单混淆，敏感数据应使用 HTTPS
 * @param {any} data - 要加密的数据
 * @returns {string} 加密后的字符串
 */
export function simpleEncrypt(data) {
  try {
    const json = JSON.stringify(data);
    // Base64 编码 + 简单混淆
    const encoded = btoa(encodeURIComponent(json));
    return encoded.split('').reverse().join('');
  } catch (err) {
    console.error('[Security] Encryption failed:', err);
    return '';
  }
}

/**
 * 简单的数据解密
 * @param {string} encrypted - 加密的字符串
 * @returns {any|null} 解密后的数据
 */
export function simpleDecrypt(encrypted) {
  try {
    if (!encrypted) return null;
    // 反转混淆 + Base64 解码
    const reversed = encrypted.split('').reverse().join('');
    const decoded = decodeURIComponent(atob(reversed));
    return JSON.parse(decoded);
  } catch (err) {
    console.error('[Security] Decryption failed:', err);
    return null;
  }
}

/**
 * 验证 URL 是否安全
 * @param {string} url - 要验证的 URL
 * @returns {boolean} 是否安全
 */
export function isSafeUrl(url) {
  try {
    const u = new URL(url, window.location.origin);
    // 只允许 http/https 协议
    return ['http:', 'https:'].includes(u.protocol);
  } catch {
    return false;
  }
}

/**
 * 清理用户输入（移除危险字符）
 * @param {string} input - 用户输入
 * @param {Object} options - 选项
 * @returns {string} 清理后的字符串
 */
export function sanitizeInput(input, options = {}) {
  if (typeof input !== 'string') return '';
  
  let cleaned = input.trim();
  
  // 移除脚本标签
  cleaned = cleaned.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // 移除事件处理器
  cleaned = cleaned.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
  
  // 限制长度
  const maxLength = options.maxLength || 1000;
  if (cleaned.length > maxLength) {
    cleaned = cleaned.slice(0, maxLength);
  }
  
  return cleaned;
}

/**
 * 生成 CSRF Token
 * @returns {string} CSRF Token
 */
export function generateCSRFToken() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * 验证 CSRF Token
 * @param {string} token - 要验证的 Token
 * @param {string} storedToken - 存储的 Token
 * @returns {boolean} 是否有效
 */
export function validateCSRFToken(token, storedToken) {
  if (!token || !storedToken) return false;
  // 使用时间安全比较（防止时序攻击）
  if (token.length !== storedToken.length) return false;
  let result = 0;
  for (let i = 0; i < token.length; i++) {
    result |= token.charCodeAt(i) ^ storedToken.charCodeAt(i);
  }
  return result === 0;
}
