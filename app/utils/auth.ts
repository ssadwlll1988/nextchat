// 密码保护配置
export const ADMIN_PASSWORD = "admin123"; // 可以根据需要修改密码
export const PASSWORD_STORAGE_KEY = "nextchat_admin_authenticated";

// 检查是否已认证
export function isAuthenticated(): boolean {
  const localStorage = safeLocalStorage();
  return localStorage.getItem(PASSWORD_STORAGE_KEY) === "true";
}

// 安全的本地存储访问
function safeLocalStorage() {
  try {
    return localStorage;
  } catch (e) {
    return {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {}
    };
  }
}

// 需要权限的路径
export const PROTECTED_PATHS = [
  "/masks",
  "/mcp-market",
  "/plugins",
  "/sd",
  "/search-chat",
  "/settings"
];

// 检查路径是否需要权限
export function isProtectedPath(path: string): boolean {
  return PROTECTED_PATHS.some(protectedPath => path.startsWith(protectedPath));
}
