/**
 * 全局常量定义
 * 集中管理所有魔法数字和字符串
 */

// 购物车限制
export const CART_LIMITS = {
  MAX_ITEMS: 50,
  MAX_QUANTITY_PER_ITEM: 99,
  STORAGE_KEY: 'cart'
};

// 订单相关
export const ORDER = {
  REFRESH_DELAY: 600, // 订单刷新延迟（毫秒）
  LOOKUP_RETRY_COUNT: 3,
  LOOKUP_RETRY_DELAY: 1000
};

// 商品相关
export const PRODUCT = {
  IMAGE_MAX_SIZE: 5 * 1024 * 1024, // 5MB
  DESCRIPTION_MAX_LENGTH: 2000,
  NAME_MAX_LENGTH: 100
};

// 故事分享限制
export const STORY = {
  INDEX_MAX: 300,
  MESSAGE_MIN_LENGTH: 2,
  MESSAGE_MAX_LENGTH: 800,
  NICKNAME_MAX_LENGTH: 20,
  RATE_LIMIT_WINDOW: 15000 // 15秒
};

// 优惠券
export const COUPON = {
  CODE_LENGTH: 8,
  DEFAULT_AMOUNT: 200,
  EXPIRY_DAYS: 14
};

// 运费
export const SHIPPING = {
  STANDARD_FEE: 60,
  COD_FEE: 38,
  FREE_THRESHOLD: 1000
};

// API 相关
export const API = {
  TIMEOUT: 30000, // 30秒
  RETRY_COUNT: 3,
  RETRY_DELAY: 1000,
  CACHE_TTL: 60000 // 1分钟
};

// 守护神代码
export const DEITY_CODES = {
  'FM': '四面神',
  'GA': '象神',
  'ZF': '招財女神',
  'WE': '五眼四耳',
  'XZ': '徐祝老人',
  'KP': '坤平',
  'CD': '崇迪',
  'RH': '拉胡',
  'HM': '哈魯曼',
  'JL': '迦樓羅',
  'ZD': '澤度金',
  'HP': '魂魄勇'
};

// 商品分类
export const CATEGORIES = [
  '佛牌/聖物',
  '蠟燭加持祈福',
  '跑廟行程',
  '其他'
];

// 订单状态
export const ORDER_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled'
};

// 订单状态显示文本
export const ORDER_STATUS_TEXT = {
  [ORDER_STATUS.PENDING]: '訂單待處理',
  [ORDER_STATUS.PAID]: '待出貨',
  [ORDER_STATUS.SHIPPED]: '已寄件',
  [ORDER_STATUS.DELIVERED]: '已取件（訂單完成）',
  [ORDER_STATUS.CANCELLED]: '取消訂單'
};

// 支付方式
export const PAYMENT_METHODS = {
  BANK: 'bank',
  CREDIT: 'credit',
  COD_711: 'cod-711'
};

// 本地存储键名
export const STORAGE_KEYS = {
  CART: 'cart',
  WISHLIST: 'wishlist',
  USER_PREFERENCES: 'user_preferences',
  ACTIVE_COUPON: '__activeCoupon__',
  PENDING_DETAIL: '__pendingDetail__'
};

// UI 相关
export const UI = {
  TOAST_DURATION: 2000,
  DEBOUNCE_DELAY: 300,
  ANIMATION_DURATION: 200
};

// 验证规则
export const VALIDATION = {
  PHONE_PATTERN: /^09\d{8}$/,
  EMAIL_PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  ORDER_ID_PATTERN: /^[A-Z0-9]{5,}$/
};
