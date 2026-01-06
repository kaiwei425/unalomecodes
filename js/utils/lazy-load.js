/**
 * 图片懒加载工具
 * 使用 Intersection Observer API 实现图片懒加载
 */

/**
 * 初始化图片懒加载
 * @param {string} selector - 图片选择器，默认为 'img[data-src]'
 */
export function initLazyLoad(selector = 'img[data-src]') {
  // 检查浏览器支持
  if (!('IntersectionObserver' in window)) {
    // 降级方案：直接加载所有图片
    const images = document.querySelectorAll(selector);
    images.forEach(img => {
      const src = img.getAttribute('data-src');
      if (src) {
        img.src = src;
        img.removeAttribute('data-src');
      }
    });
    return;
  }

  // 创建 Intersection Observer
  const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        const src = img.getAttribute('data-src');
        
        if (src) {
          // 添加加载状态
          img.classList.add('lazy-loading');
          
          // 创建新的 Image 对象预加载
          const imageLoader = new Image();
          imageLoader.onload = () => {
            img.src = src;
            img.classList.remove('lazy-loading');
            img.classList.add('lazy-loaded');
            img.removeAttribute('data-src');
            observer.unobserve(img);
          };
          imageLoader.onerror = () => {
            img.classList.remove('lazy-loading');
            img.classList.add('lazy-error');
            // 可以设置一个占位图
            img.src = '/img/placeholder.png';
            observer.unobserve(img);
          };
          imageLoader.src = src;
        } else {
          observer.unobserve(img);
        }
      }
    });
  }, {
    // 提前 50px 开始加载
    rootMargin: '50px'
  });

  // 观察所有匹配的图片
  const images = document.querySelectorAll(selector);
  images.forEach(img => imageObserver.observe(img));

  return imageObserver;
}

/**
 * 为图片添加懒加载属性
 * @param {HTMLImageElement} img - 图片元素
 * @param {string} src - 图片 URL
 */
export function setLazyImage(img, src) {
  if (!img) return;
  
  // 设置占位图（可以是 1x1 透明像素或模糊占位图）
  const placeholder = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"%3E%3C/svg%3E';
  img.src = placeholder;
  img.setAttribute('data-src', src);
  img.loading = 'lazy'; // 浏览器原生懒加载（作为后备）
}

/**
 * 批量处理图片懒加载
 * @param {NodeList|Array} images - 图片元素列表
 */
export function processLazyImages(images) {
  images.forEach(img => {
    const src = img.src || img.getAttribute('src');
    if (src && !img.hasAttribute('data-src')) {
      setLazyImage(img, src);
    }
  });
}

// 自动初始化（如果 DOM 已加载）
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initLazyLoad();
  });
} else {
  initLazyLoad();
}
