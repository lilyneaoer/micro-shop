/**
 * 图片 URL 处理工具
 */

/**
 * 获取 API 基础 URL
 */
function getBaseURL(): string {
  return process.env.NODE_ENV === 'development' 
    ? 'http://localhost:7001' 
    : 'http://localhost:7001'
}

/**
 * 转换图片 URL 为完整路径
 * 如果是相对路径，则拼接 baseURL
 * 如果已经是完整 URL，则直接返回
 * 
 * @param imageUrl - 图片 URL（可能是相对路径或完整 URL）
 * @returns 完整的图片 URL，如果输入为空则返回 undefined
 * 
 * @example
 * normalizeImageUrl('/public/uploads/dishes/xxx.jpg')
 * // => 'http://localhost:7001/public/uploads/dishes/xxx.jpg'
 * 
 * normalizeImageUrl('https://cdn.example.com/image.jpg')
 * // => 'https://cdn.example.com/image.jpg'
 */
export function normalizeImageUrl(imageUrl?: string): string | undefined {
  if (!imageUrl) return undefined
  
  // 如果已经是完整 URL，直接返回
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl
  }
  
  // 如果是相对路径，拼接 baseURL
  const baseURL = getBaseURL()
  return `${baseURL}${imageUrl}`
}

/**
 * 批量转换图片 URL
 * 
 * @param imageUrls - 图片 URL 数组
 * @returns 转换后的完整 URL 数组
 */
export function normalizeImageUrls(imageUrls: (string | undefined)[]): (string | undefined)[] {
  return imageUrls.map(normalizeImageUrl)
}
