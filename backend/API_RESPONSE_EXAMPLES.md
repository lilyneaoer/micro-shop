# API 响应格式示例

本文档展示了 API 响应从 snake_case 转换为 camelCase 后的变化。

## 1. 分类接口

### GET /api/categories

**之前 (snake_case):**

```json
{
  "code": 0,
  "message": "success",
  "data": [
    {
      "id": "uuid-1",
      "merchant_id": "uuid-merchant",
      "name": "热菜",
      "sort_order": 0,
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

**现在 (camelCase):**

```json
{
  "code": 0,
  "message": "success",
  "data": [
    {
      "id": "uuid-1",
      "merchantId": "uuid-merchant",
      "name": "热菜",
      "sortOrder": 0,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

## 2. 菜品接口

### GET /api/dishes

**之前 (snake_case):**

```json
{
  "code": 0,
  "message": "success",
  "data": [
    {
      "id": "uuid-1",
      "merchant_id": "uuid-merchant",
      "category_id": "uuid-category",
      "name": "宫保鸡丁",
      "description": "经典川菜",
      "price": 3800,
      "image_url": "/public/uploads/dishes/xxx.jpg",
      "is_available": true,
      "has_sku": true,
      "sort_order": 0,
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-01T00:00:00.000Z",
      "skus": [
        {
          "id": "uuid-sku-1",
          "dish_id": "uuid-1",
          "name": "小份",
          "price_delta": -500,
          "is_available": true
        },
        {
          "id": "uuid-sku-2",
          "dish_id": "uuid-1",
          "name": "大份",
          "price_delta": 500,
          "is_available": true
        }
      ]
    }
  ]
}
```

**现在 (camelCase):**

```json
{
  "code": 0,
  "message": "success",
  "data": [
    {
      "id": "uuid-1",
      "merchantId": "uuid-merchant",
      "categoryId": "uuid-category",
      "name": "宫保鸡丁",
      "description": "经典川菜",
      "price": 3800,
      "imageUrl": "/public/uploads/dishes/xxx.jpg",
      "isAvailable": true,
      "hasSku": true,
      "sortOrder": 0,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z",
      "skus": [
        {
          "id": "uuid-sku-1",
          "dishId": "uuid-1",
          "name": "小份",
          "priceDelta": -500,
          "isAvailable": true
        },
        {
          "id": "uuid-sku-2",
          "dishId": "uuid-1",
          "name": "大份",
          "priceDelta": 500,
          "isAvailable": true
        }
      ]
    }
  ]
}
```

## 3. 订单接口

### GET /api/orders/:id

**之前 (snake_case):**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": "uuid-order",
    "order_no": "1234567890",
    "merchant_id": "uuid-merchant",
    "table_id": "uuid-table",
    "session_id": "uuid-session",
    "total_amount": 8800,
    "status": "已支付",
    "customer_remark": "不要辣",
    "paid_at": "2024-01-01T12:00:00.000Z",
    "created_at": "2024-01-01T11:50:00.000Z",
    "updated_at": "2024-01-01T12:00:00.000Z",
    "table_no": "A01",
    "area": "大厅",
    "items": [
      {
        "id": "uuid-item-1",
        "order_id": "uuid-order",
        "dish_id": "uuid-dish-1",
        "sku_id": "uuid-sku-1",
        "dish_name": "宫保鸡丁",
        "sku_name": "小份",
        "unit_price": 3300,
        "quantity": 2,
        "subtotal": 6600
      },
      {
        "id": "uuid-item-2",
        "order_id": "uuid-order",
        "dish_id": "uuid-dish-2",
        "sku_id": null,
        "dish_name": "米饭",
        "sku_name": null,
        "unit_price": 200,
        "quantity": 2,
        "subtotal": 400
      }
    ]
  }
}
```

**现在 (camelCase):**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": "uuid-order",
    "orderNo": "1234567890",
    "merchantId": "uuid-merchant",
    "tableId": "uuid-table",
    "sessionId": "uuid-session",
    "totalAmount": 8800,
    "status": "已支付",
    "customerRemark": "不要辣",
    "paidAt": "2024-01-01T12:00:00.000Z",
    "createdAt": "2024-01-01T11:50:00.000Z",
    "updatedAt": "2024-01-01T12:00:00.000Z",
    "tableNo": "A01",
    "area": "大厅",
    "items": [
      {
        "id": "uuid-item-1",
        "orderId": "uuid-order",
        "dishId": "uuid-dish-1",
        "skuId": "uuid-sku-1",
        "dishName": "宫保鸡丁",
        "skuName": "小份",
        "unitPrice": 3300,
        "quantity": 2,
        "subtotal": 6600
      },
      {
        "id": "uuid-item-2",
        "orderId": "uuid-order",
        "dishId": "uuid-dish-2",
        "skuId": null,
        "dishName": "米饭",
        "skuName": null,
        "unitPrice": 200,
        "quantity": 2,
        "subtotal": 400
      }
    ]
  }
}
```

## 4. 订单列表接口

### GET /api/orders

**之前 (snake_case):**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [
      {
        "id": "uuid-order",
        "order_no": "1234567890",
        "merchant_id": "uuid-merchant",
        "table_id": "uuid-table",
        "session_id": "uuid-session",
        "total_amount": 8800,
        "status": "已支付",
        "customer_remark": "不要辣",
        "paid_at": "2024-01-01T12:00:00.000Z",
        "created_at": "2024-01-01T11:50:00.000Z",
        "updated_at": "2024-01-01T12:00:00.000Z",
        "table_no": "A01",
        "area": "大厅"
      }
    ],
    "total": 1
  }
}
```

**现在 (camelCase):**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [
      {
        "id": "uuid-order",
        "orderNo": "1234567890",
        "merchantId": "uuid-merchant",
        "tableId": "uuid-table",
        "sessionId": "uuid-session",
        "totalAmount": 8800,
        "status": "已支付",
        "customerRemark": "不要辣",
        "paidAt": "2024-01-01T12:00:00.000Z",
        "createdAt": "2024-01-01T11:50:00.000Z",
        "updatedAt": "2024-01-01T12:00:00.000Z",
        "tableNo": "A01",
        "area": "大厅"
      }
    ],
    "total": 1
  }
}
```

## 5. 桌台接口

### GET /api/tables

**之前 (snake_case):**

```json
{
  "code": 0,
  "message": "success",
  "data": [
    {
      "id": "uuid-table",
      "merchant_id": "uuid-merchant",
      "table_no": "A01",
      "seat_count": 4,
      "area": "大厅",
      "qr_token": "uuid-qr-token",
      "is_active": true,
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

**现在 (camelCase):**

```json
{
  "code": 0,
  "message": "success",
  "data": [
    {
      "id": "uuid-table",
      "merchantId": "uuid-merchant",
      "tableNo": "A01",
      "seatCount": 4,
      "area": "大厅",
      "qrToken": "uuid-qr-token",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

## 6. 统计接口

### GET /api/stats/dashboard

**之前 (snake_case):**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "today_revenue": 88000,
    "today_order_count": 10,
    "today_avg_order_value": 8800,
    "month_revenue": 2640000
  }
}
```

**现在 (camelCase):**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "todayRevenue": 88000,
    "todayOrderCount": 10,
    "todayAvgOrderValue": 8800,
    "monthRevenue": 2640000
  }
}
```

### GET /api/stats/revenue

**之前 (snake_case):**

```json
{
  "code": 0,
  "message": "success",
  "data": [
    {
      "date": "2024-01-01",
      "revenue": 88000,
      "order_count": 10
    },
    {
      "date": "2024-01-02",
      "revenue": 95000,
      "order_count": 12
    }
  ]
}
```

**现在 (camelCase):**

```json
{
  "code": 0,
  "message": "success",
  "data": [
    {
      "date": "2024-01-01",
      "revenue": 88000,
      "orderCount": 10
    },
    {
      "date": "2024-01-02",
      "revenue": 95000,
      "orderCount": 12
    }
  ]
}
```

### GET /api/stats/dishes

**之前 (snake_case):**

```json
{
  "code": 0,
  "message": "success",
  "data": [
    {
      "dish_id": "uuid-dish-1",
      "dish_name": "宫保鸡丁",
      "quantity": 50,
      "revenue": 190000
    }
  ]
}
```

**现在 (camelCase):**

```json
{
  "code": 0,
  "message": "success",
  "data": [
    {
      "dishId": "uuid-dish-1",
      "dishName": "宫保鸡丁",
      "quantity": 50,
      "revenue": 190000
    }
  ]
}
```

## 7. 支付接口

### POST /api/payments/prepay

**之前 (snake_case):**

```json
{
  "code": 0,
  "message": "预支付订单创建成功",
  "data": {
    "prepay_id": "prepay_xxx",
    "payment_params": {
      "timeStamp": "1234567890",
      "nonceStr": "abc123",
      "package": "prepay_id=prepay_xxx",
      "signType": "RSA",
      "paySign": "signature"
    }
  }
}
```

**现在 (camelCase):**

```json
{
  "code": 0,
  "message": "预支付订单创建成功",
  "data": {
    "prepayId": "prepay_xxx",
    "paymentParams": {
      "timeStamp": "1234567890",
      "nonceStr": "abc123",
      "package": "prepay_id=prepay_xxx",
      "signType": "RSA",
      "paySign": "signature"
    }
  }
}
```

## 8. 会话接口

### POST /api/sessions

**之前和现在都是 camelCase（未修改）:**

```json
{
  "code": 0,
  "message": "会话创建成功",
  "data": {
    "sessionToken": "uuid-token",
    "sessionId": "uuid-session",
    "tableId": "uuid-table",
    "expiresAt": "2024-01-01T16:00:00.000Z"
  }
}
```

## 9. 错误响应

### 订单创建失败（包含不可用菜品）

**之前 (snake_case):**

```json
{
  "code": 3002,
  "message": "订单包含已下架的菜品",
  "data": {
    "unavailable_dishes": ["宫保鸡丁", "鱼香肉丝"]
  }
}
```

**现在 (camelCase):**

```json
{
  "code": 3002,
  "message": "订单包含已下架的菜品",
  "data": {
    "unavailableDishes": ["宫保鸡丁", "鱼香肉丝"]
  }
}
```

## 注意事项

1. **输入参数兼容性**：API 仍然接受 snake_case 和 camelCase 两种格式的输入参数
2. **响应格式统一**：所有响应数据统一使用 camelCase
3. **嵌套对象**：嵌套对象和数组中的字段也会被递归转换
4. **null 值保持不变**：null 值不会被转换
5. **时间戳格式不变**：ISO 8601 格式的时间戳保持不变
