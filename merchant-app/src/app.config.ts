export default defineAppConfig({
  pages: ['pages/login/index', 'pages/order-list/index', 'pages/order-detail/index', 'pages/stats/index'],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#fff',
    navigationBarTitleText: '商家接单',
    navigationBarTextStyle: 'black',
  },
  permission: {
    'scope.userLocation': {
      desc: '你的位置信息将用于小程序位置接口的效果展示',
    },
  },
})
