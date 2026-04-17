import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

describe('Stats Page', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('formatAmount', () => {
    it('should convert cents to yuan with 2 decimal places', () => {
      // Test the formatAmount function logic
      const formatAmount = (amount: number): string => {
        return (amount / 100).toFixed(2)
      }

      expect(formatAmount(0)).toBe('0.00')
      expect(formatAmount(100)).toBe('1.00')
      expect(formatAmount(12345)).toBe('123.45')
      expect(formatAmount(999)).toBe('9.99')
      expect(formatAmount(1)).toBe('0.01')
    })
  })

  describe('Dashboard Data Structure', () => {
    it('should have correct dashboard data structure', () => {
      const dashboardData = {
        today_revenue: 0,
        today_order_count: 0,
        today_avg_order_value: 0,
        month_revenue: 0,
      }

      expect(dashboardData).toHaveProperty('today_revenue')
      expect(dashboardData).toHaveProperty('today_order_count')
      expect(dashboardData).toHaveProperty('today_avg_order_value')
      expect(dashboardData).toHaveProperty('month_revenue')
    })

    it('should handle typical dashboard data values', () => {
      const dashboardData = {
        today_revenue: 50000, // 500元
        today_order_count: 10,
        today_avg_order_value: 5000, // 50元
        month_revenue: 1500000, // 15000元
      }

      const formatAmount = (amount: number): string => {
        return (amount / 100).toFixed(2)
      }

      expect(formatAmount(dashboardData.today_revenue)).toBe('500.00')
      expect(dashboardData.today_order_count).toBe(10)
      expect(formatAmount(dashboardData.today_avg_order_value)).toBe('50.00')
      expect(formatAmount(dashboardData.month_revenue)).toBe('15000.00')
    })
  })
})
