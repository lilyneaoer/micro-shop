export default defineAppConfig({
  pages: [
    'pages/scan/index',
    'pages/menu/index',
    'pages/cart/index',
    'pages/order-confirm/index',
    'pages/payment/index',
    'pages/order-success/index',
    'pages/order-list/index'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#fff',
    navigationBarTitleText: '扫码点餐',
    navigationBarTextStyle: 'black'
  },
  permission: {
    'scope.userLocation': {
      desc: '你的位置信息将用于小程序位置接口的效果展示'
    }
  }
})
