'use strict';
angular.module('ikelClientApp', [
  'ngCookies',
  'ngResource',
  'ngSanitize',
  'ngRoute',
  'ui.bootstrap',
  'ui.bootstrap.tabs',
  'LocalStorageModule',
  'btford.socket-io',
  'angular-web-notification'
]).config(function($routeProvider) {
  $routeProvider.when('/', {
    templateUrl: 'views/main.html',
    controller: 'MainCtrl'
  }).when('/createOrder', {
    templateUrl: 'views/createOrder.html',
    controller: 'CreateOrderCtrl'
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
}).config(['localStorageServiceProvider', function(localStorageServiceProvider){
  localStorageServiceProvider.setPrefix('EHN');
}]).factory('ehnSocket', function (socketFactory, ioPrefix, webNotification) {
    if (Notification) {
        Notification.requestPermission();
    }

    var ehnSocket = socketFactory({
        ioSocket: io.connect(ioPrefix)
    });
    
    ehnSocket.on('new_order', function(order) {
        webNotification.showNotification('New Food Order', {
            body: order.author + ' has opened a new food order for ' + order.from.name + ' on Ejja Ħa Nieklu.',
            icon: 'images/burger.png',
            autoClose: 24000
        }, function(error, hide) {
            if (error) {
                console.log('Unable to show notification ', error);
            } else {
                console.log('Notification Shown.');
            }
        });
    });
    ehnSocket.on('closed_order', function(order) {
        webNotification.showNotification('Food Order Closed', {
            body: 'The food order for ' + order.from.name + ' by ' + order.author + ' has been closed.',
            icon: 'images/burger.png',
            autoClose: 24000
        }, function(error, hide) {
            if (error) {
                console.log('Unable to show notification ', error);
            } else {
                console.log('Notification Shown.');
            }
        });
    }); 
    
    return ehnSocket;
});
