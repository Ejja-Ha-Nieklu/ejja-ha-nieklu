'use strict';
angular.module('ikelClientApp', [
  'ngCookies',
  'ngResource',
  'ngSanitize',
  'ngRoute',
  'ngAnimate',
  'ui.bootstrap',
  'ui.bootstrap.tabs',
  'LocalStorageModule',
  'btford.socket-io',
  'angular-web-notification'
]).config(function($routeProvider) {
  $routeProvider.when('/', {
    templateUrl: 'views/landing.html',
    controller: 'LandingCtrl'
  }).when('/createOrder', {
    templateUrl: 'views/createOrder.html',
    controller: 'CreateOrderCtrl'
  }).when('/order/:orderId', {
    templateUrl: 'views/order.html',
    controller: 'OrderCtrl'
  }).when('/createItem/:orderId', {
    templateUrl: 'views/createItem.html',
    controller: 'CreateItemCtrl'
  }).when('/printOrder/:orderId', {
    templateUrl: 'views/printOrder.html',
    controller: 'PrintOrderCtrl'
  }).when('/deleteOrder/:orderId', {
    templateUrl: 'views/deleteOrder.html',
    controller: 'DeleteOrderCtrl'
  }).otherwise({
    redirectTo: '/'
  });
}).config(['localStorageServiceProvider', function(
  localStorageServiceProvider) {
  localStorageServiceProvider.setPrefix('EHN');
}]).factory('ehnSocket', ['socketFactory', 'apiPrefix', function(socketFactory, apiPrefix) {
  var ehnSocket = socketFactory({
    ioSocket: io.connect(apiPrefix)
  });
  return ehnSocket;
}]).run(['ehnSocket', '$rootScope', 'webNotification', function(ehnSocket, $rootScope, webNotification) {
  if (Notification) {
    Notification.requestPermission();
  }

  ehnSocket.on('new_order', function(order) {
    webNotification.showNotification('New Food Order', {
      body: order.author + ' has opened a new food order for ' +
        order.from.name + ' on Ejja Ħa Nieklu.',
      icon: 'images/burger.png',
      autoClose: 24000
    }, function() {});
    $rootScope.$broadcast('REMOTE_ORDER_ADDED', order);
  });
  ehnSocket.on('closed_order', function(order) {
    webNotification.showNotification('Food Order Closed', {
      body: 'The food order ' + order + ' has been closed.',
      icon: 'images/burger.png',
      autoClose: 24000
    }, function() {});
    $rootScope.$broadcast('REMOTE_ORDER_REMOVED', order);
  });
}]);
