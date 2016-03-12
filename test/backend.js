'use strict';

var expect = require('expect');
var extend = require("util")._extend;
var fork = require('child_process').fork;
var request = require('request');

var MongoClient = require('mongodb').MongoClient;
var ObjectId = require('mongodb').ObjectId;

/**
 * Set up a completely new mongo database on the specified URI.
 *
 * @param uri the database URI to use for the MongoClient
 * @param data object where keys are the collections and the values are arrays
 *        of documents to put into those collections.
 */
var mongo = function (uri, data) {
    return new Promise(function (resolve, reject) {
        MongoClient.connect(uri, function (err, db) {
            if (err) {
                throw new Error('Could not connect to database with uri: ' + uri);
            }
            db.dropDatabase(function (err, result) {
                if (err) {
                    throw new Error('Could not drop database with uri: ' + uri);
                }
                data = data || {};
                var pending = Object.keys(data);    // Pending collections
                if (pending.length === 0) {
                    resolve();
                }
                for (var key in data) {
                    db.collection(key, function (err, collection) {
                        if (err) {
                            throw new Error('Could not access collection: ' + key);
                        }
                        var documents = data[key];
                        collection.insertMany(documents.map(function (document) {
                            var record = extend({}, document);
                            record._id = new ObjectId(record._id);
                            return record;
                        }), {w: 1}, (function (key) {
                            return function (err, result) {
                                if (err) {
                                    throw new Error('Could not insert items into collection: ' + key);
                                }
                                pending = pending.filter(function (document) {
                                    return key !== document;
                                });
                                if (pending.length === 0) {
                                    resolve();
                                }
                            }
                        })(key));
                    });
                }
            });
        });
    });
}

describe('Ejja Ħa Nieklu Backend Node.JS Module', function () {
    var child,
            mongoUri = 'mongodb://localhost/test-ejja-ha-nieklu',
            port = 5220;

    before('Check & Prepare Mongo', function () {
        return mongo(mongoUri);
    });

    before('Fork Node.js', function (done) {
        child = fork('./web.js', {env: {MONGOLAB_URI: mongoUri, PORT: port}}, {silent: true});
        child.on('message', function (msg) {
            if (msg === 'LISTENING_STARTED') {
                done();
            }
        });
    });

    after(function () {
        if (child) {
            child.kill();
        }
    });

    describe('Order Retrieval', function () {
        var orders = [{
                _id: '000000000000000000000001',
                restaurant: 'TGI Fridays',
            }, {
                _id: '000000000000000000000002',
                restaurant: 'McDonalds',
            }];

        before('Prepare Mongo', function () {
            return mongo(mongoUri, {orders: orders});
        });

        it('should get all orders', function (done) {
            request('http://localhost:' + port + '/order', function (err, resp, body) {
                body = JSON.parse(body);
                expect(resp.statusCode).toBe(200);
                orders.forEach(function (order) {
                    expect(body).toInclude(order);
                });
                done();
            });
        });

        it('should get a specific order', function (done) {
            request('http://localhost:' + port + '/order/' + orders[0]._id, function (err, resp, body) {
                expect(resp.statusCode).toBe(200);
                body = JSON.parse(body);
                expect(body).toEqual(orders[0]);
                done();
            });
        });
    });

    describe('Order Creation', function (done) {
        before('Prepare Mongo', function () {
            return mongo(mongoUri);
        });

        it('should create a new order', function (done) {
            request({
                url: 'http://localhost:' + port + '/order',
                method: 'POST',
                json: true,
                body: {
                    from: {
                        name: 'Il-Veduta',
                        address: 'Rabat'
                    },
                    menuLink: 'http://menu.test',
                    author: 'Kyle',
                    email: 'kyle@test.test'
                }
            }, function (err, resp, body) {
                if (err) {
                    done(new Error('Error during request', err));
                } else {
                    expect(resp.statusCode).toBe(200);
                    expect(body.from).toEqual({name: 'Il-Veduta', address: 'Rabat'});
                    expect(body.menuLink).toEqual('http://menu.test');
                    expect(body.author).toEqual('Kyle');
                    expect(body.email).toEqual('kyle@test.test');
                    done();
                }
            });
        });

        it('should not accept empty name', function (done) {
            request({
                url: 'http://localhost:' + port + '/order',
                method: 'POST',
                json: true,
                body: {
                    from: {
                        name: '',
                        address: 'Rabat'
                    },
                    menuLink: 'http://menu.test',
                    author: 'Kyle',
                    email: 'kyle@test.test'
                }
            }, function (err, resp, body) {
                if (err) {
                    done(new Error('Error during request', err));
                } else {
                    expect(resp.statusCode).toBe(400, 'Received HTTP response code %s but should have received HTTP response code %s');
                    done();
                }
            });
        });

        it('should not accept empty author', function (done) {
            request({
                url: 'http://localhost:' + port + '/order',
                method: 'POST',
                json: true,
                body: {
                    from: {
                        name: 'Il-Veduta',
                        address: 'Rabat'
                    },
                    menuLink: 'http://menu.test',
                    author: '',
                    email: 'kyle@test.test'
                }
            }, function (err, resp, body) {
                if (err) {
                    done(new Error('Error during request', err));
                } else {
                    expect(resp.statusCode).toBe(400, 'Received HTTP response code %s but should have received HTTP response code %s');
                    done();
                }
            });
        });

        it('should not accept empty email', function (done) {
            request({
                url: 'http://localhost:' + port + '/order',
                method: 'POST',
                json: true,
                body: {
                    from: {
                        name: 'Il-Veduta',
                        address: 'Rabat'
                    },
                    menuLink: 'http://menu.test',
                    author: 'Kyle',
                    email: ''
                }
            }, function (err, resp, body) {
                if (err) {
                    done(new Error('Error during request', err));
                } else {
                    expect(resp.statusCode).toBe(400, 'Received HTTP response code %s but should have received HTTP response code %s');
                    done();
                }
            });
        });
    });

    describe('Order Deletion', function () {
        var orders = [{
                _id: '000000000000000000000001',
                restaurant: 'TGI Fridays',
            }, {
                _id: '000000000000000000000002',
                restaurant: 'McDonalds',
            }];

        before('Prepare Mongo', function () {
            return mongo(mongoUri, {orders: orders});
        });

        it('should delete an existing order', function (done) {
            request({
                url: 'http://localhost:' + port + '/order/000000000000000000000001',
                method: 'DELETE',
                json: true,
            }, function (err, resp, body) {
                if (err) {
                    done(new Error('Error during request', err));
                } else {
                    expect(resp.statusCode).toBe(200, 'Received HTTP response code %s but should have received HTTP response code %s');
                    done();
                }
            });
        });

        it('should fail to delete an inexistant order', function (done) {
            request({
                url: 'http://localhost:' + port + '/order/000000000000000000000101',
                method: 'DELETE',
                json: true,
            }, function (err, resp, body) {
                if (err) {
                    done(new Error('Error during request', err));
                } else {
                    expect(resp.statusCode).toBe(404, 'Received HTTP response code %s but should have received HTTP response code %s');
                    done();
                }
            });
        });
    });

    describe('Item Retrieval', function () {
        var orders = [{
                _id: '000000000000000000000001',
                restaurant: 'TGI Fridays',
            }, {
                _id: '000000000000000000000002',
                restaurant: 'McDonalds',
            }];
        var items = [{
                _id: '000000000000000000000006',
                _order: '000000000000000000000001',
                name: 'Burger',
                author: 'Kyle',
                price: '4.95'
            }, {
                _id: '000000000000000000000007',
                _order: '000000000000000000000001',
                name: 'Pizza',
                author: 'Bob',
                price: '9.95'
            }, {
                _id: '000000000000000000000008',
                _order: '000000000000000000000002',
                name: 'Pasta',
                author: 'Luke',
                price: '7.70'
            }];
        before('Prepare Mongo', function () {
            return mongo(mongoUri, {orders: orders, items: items});
        });
        it('should retrieve a particular item', function (done) {
            request('http://localhost:' + port + '/item/' + items[0]._id, function (err, resp, body) {
                if (err) {
                    done(new Error('Error during request', err));
                } else {
                    expect(resp.statusCode).toBe(200, 'Received HTTP response code %s but should have received HTTP response code %s');
                    body = JSON.parse(body);
                    expect(body).toEqual(items[0]);
                    done();
                }
            });
        });
        it('should retrieve items of a particular order', function (done) {
            request('http://localhost:' + port + '/item?order=' + items[0]._order, function (err, resp, body) {
                if (err) {
                    done(new Error('Error during request', err));
                } else {
                    expect(resp.statusCode).toBe(200, 'Received HTTP response code %s but should have received HTTP response code %s');
                    body = JSON.parse(body);
                    expect(body).toEqual(items.filter(function (item) {
                        return item._order === items[0]._order;
                    }));
                    done();
                }
            });
        });
        it('should handle a request for an inexistant item', function (done) {
            request('http://localhost:' + port + '/item/000000000000000000001009', function (err, resp, body) {
                if (err) {
                    done(new Error('Error during request', err));
                } else {
                    expect(resp.statusCode).toBe(404, 'Received HTTP response code %s but should have received HTTP response code %s');
                    done();
                }
            });
        });
    });

    describe('Item Creation', function () {
        var orders = [{
                _id: '000000000000000000000001',
                restaurant: 'TGI Fridays',
            }];
        var items = [{
                _id: '000000000000000000000006',
                _order: '000000000000000000000001',
                name: 'Burger',
                author: 'Kyle',
                price: '4.95'
            }];
        before('Prepare Mongo', function () {
            return mongo(mongoUri, {orders: orders, items: items});
        });
        it('should add an item to an order', function (done) {
            request({
                url: 'http://localhost:' + port + '/item',
                method: 'POST',
                json: true,
                body: {
                    _order: '000000000000000000000001',
                    name: 'Orange',
                    price: '3.50',
                    author: 'John'
                }
            }, function (err, resp, body) {
                if (err) {
                    done(new Error('Error during request', err));
                } else {
                    expect(resp.statusCode).toBe(200, 'Received HTTP response code %s but should have received HTTP response code %s');
                    done();
                }
            });
        });
        it('should reject adding an item to an inexistant order', function (done) {
            request({
                url: 'http://localhost:' + port + '/item',
                method: 'POST',
                json: true,
                body: {
                    _order: '000000000000000000000002',
                    name: 'Orange',
                    price: '3.50',
                    author: 'John'
                }
            }, function (err, resp, body) {
                if (err) {
                    done(new Error('Error during request', err));
                } else {
                    expect(resp.statusCode).toBe(404, 'Received HTTP response code %s but should have received HTTP response code %s');
                    done();
                }
            });
        });
        it('should reject adding an item without a name', function (done) {
            request({
                url: 'http://localhost:' + port + '/item',
                method: 'POST',
                json: true,
                body: {
                    _order: '000000000000000000000001',
                    price: '3.50',
                    author: 'John'
                }
            }, function (err, resp, body) {
                if (err) {
                    done(new Error('Error during request', err));
                } else {
                    expect(resp.statusCode).toBe(400, 'Received HTTP response code %s but should have received HTTP response code %s');
                    done();
                }
            });
        });
        it('should reject adding an item without an author', function (done) {
            request({
                url: 'http://localhost:' + port + '/item',
                method: 'POST',
                json: true,
                body: {
                    _order: '000000000000000000000001',
                    name: 'Orange',
                    price: '3.50'
                }
            }, function (err, resp, body) {
                if (err) {
                    done(new Error('Error during request', err));
                } else {
                    expect(resp.statusCode).toBe(400, 'Received HTTP response code %s but should have received HTTP response code %s');
                    done();
                }
            });
        });
        it('should reject adding an item without a price', function (done) {
            request({
                url: 'http://localhost:' + port + '/item',
                method: 'POST',
                json: true,
                body: {
                    _order: '000000000000000000000001',
                    name: 'Orange',
                    author: 'John'
                }
            }, function (err, resp, body) {
                if (err) {
                    done(new Error('Error during request', err));
                } else {
                    expect(resp.statusCode).toBe(400, 'Received HTTP response code %s but should have received HTTP response code %s');
                    done();
                }
            });
        });
    });

    describe('Item Update', function () {
        var orders = [{
                _id: '000000000000000000000001',
                restaurant: 'TGI Fridays'
            }, {
                _id: '000000000000000000000002',
                restaurant: 'McDonalds'
            }];
        var items = [{
                _id: '000000000000000000000006',
                _order: '000000000000000000000001',
                name: 'Burger',
                author: 'Kyle',
                price: '4.95'
            }, {
                _id: '000000000000000000000007',
                _order: '000000000000000000000001',
                name: 'Pizza',
                author: 'Bob',
                price: '9.95'
            }, {
                _id: '000000000000000000000008',
                _order: '000000000000000000000002',
                name: 'Pasta',
                author: 'Luke',
                price: '7.70'
            }];
        before('Prepare Mongo', function () {
            return mongo(mongoUri, {orders: orders, items: items});
        });
        it('should update the specified item (using a path variable)', function (done) {
            request({
                url: 'http://localhost:' + port + '/item/000000000000000000000006',
                method: 'POST',
                json: true,
                body: {
                    _id: '000000000000000000000006',
                    _order: '000000000000000000000001',
                    name: 'Burger',
                    author: 'Kyle',
                    price: '4.95',
                    paid: true
                }
            }, function (err, resp, body) {
                if (err) {
                    done(new Error('Error during request', err));
                } else {
                    expect(resp.statusCode).toBe(200, 'Received HTTP response code %s but should have received HTTP response code %s');
                    done();
                }
            });
        });
        it('should update the specified item (using the collection)', function (done) {
            request({
                url: 'http://localhost:' + port + '/item',
                method: 'POST',
                json: true,
                body: {
                    _id: '000000000000000000000007',
                    _order: '000000000000000000000001',
                    name: 'Pizza',
                    author: 'Bob',
                    price: '9.95',
                    paid: true
                }
            }, function (err, resp, body) {
                if (err) {
                    done(new Error('Error during request', err));
                } else {
                    expect(resp.statusCode).toBe(200, 'Received HTTP response code %s but should have received HTTP response code %s');
                    done();
                }
            });
        });
    });

    describe('Item Deletion', function () {
        var orders = [{
                _id: '000000000000000000000001',
                restaurant: 'TGI Fridays'
            }, {
                _id: '000000000000000000000002',
                restaurant: 'McDonalds'
            }];
        var items = [{
                _id: '000000000000000000000006',
                _order: '000000000000000000000001',
                name: 'Burger',
                author: 'Kyle',
                price: '4.95'
            }, {
                _id: '000000000000000000000007',
                _order: '000000000000000000000001',
                name: 'Pizza',
                author: 'Bob',
                price: '9.95'
            }, {
                _id: '000000000000000000000008',
                _order: '000000000000000000000002',
                name: 'Pasta',
                author: 'Luke',
                price: '7.70'
            }];
        before('Prepare Mongo', function () {
            return mongo(mongoUri, {orders: orders, items: items});
        });
        it('should delete the specified item', function (done) {
            request({
                url: 'http://localhost:' + port + '/item/000000000000000000000006',
                method: 'DELETE',
                json: true
            }, function (err, resp, body) {
                if (err) {
                    done(new Error('Error during request', err));
                } else {
                    expect(resp.statusCode).toBe(200, 'Received HTTP response code %s but should have received HTTP response code %s');
                    done();
                }
            });
        });
        it('should reject deleting an inexistant item', function (done) {
            request({
                url: 'http://localhost:' + port + '/item/000000000000000100000006',
                method: 'DELETE',
                json: true
            }, function (err, resp, body) {
                if (err) {
                    done(new Error('Error during request', err));
                } else {
                    expect(resp.statusCode).toBe(404, 'Received HTTP response code %s but should have received HTTP response code %s');
                    done();
                }
            });
        });
    });

    });

    it('listens on the specified port', function (done) {
        request('http://localhost:' + port, function (err, resp, body) {
            expect(resp.statusCode).toBe(200);
            done();
        });
    });
});
