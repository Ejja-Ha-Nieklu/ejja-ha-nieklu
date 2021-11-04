var { MongoClient, ObjectId } = require("mongodb");
const clientAccess = require("./clientAccess");

var isEmpty = function (text) {
  return !text || text === "";
};

var processMongoError = function (error, reject, then) {
  if (error) {
    console.log("An error occurred while accessing the database", error);
    reject({
      code: 500,
      message: "An error occurred while accessing the database",
    });
  } else {
    then();
  }
};

/**
 * An order represents an intended purchase from a food establishment. For example,
 * a group of friends might want to buy a meal together so they would open an Order
 * where they can add items they want to buy.
 */
module.exports = (function () {
  var mongoUri = null;

  var create = function (order) {
    return new Promise(function (fulfill, reject) {
      if (!order.from || !order.from.name) {
        reject({
          code: 400,
          message:
            "Restaurant name not specified. Please specify a non-empty restaurant name.",
        });
        return;
      }
      if (isEmpty(order.author)) {
        reject({
          code: 400,
          message:
            "Author's name not specified. Please specify a non-empty name for the person opening this order.",
        });
        return;
      }
      if (isEmpty(order.email)) {
        reject({
          code: 400,
          message:
            "E-mail not specified. Please specify a non-empty e-mail for this order.",
        });
        return;
      }

      clientAccess(mongoUri, (db) =>
        Promise.resolve(db.collection("orders"))
          .then((collection) => {
            return collection.insertOne(order, {
              w: 1,
            });
          })
          .then((insertResult) => {
            fulfill({ ...order, _id: insertResult.insertedId });
          })
      );
    });
  };

  var remove = function (id) {
    return new Promise(function (fulfill, reject) {
      console.log("delete", { id });
      clientAccess(mongoUri, (db) =>
        Promise.all([db.collection("orders"), db.collection("items")])
          .then(([ordersCollection, itemsCollection]) => {
            return Promise.all([
              ordersCollection.remove({ _id: new ObjectId(id) }),
              itemsCollection.remove({
                _order: new ObjectId(id),
              }),
            ]);
          })
          .then(fulfill)
      );
    });
  };

  var getAll = function () {
    return new Promise(function (fulfill, reject) {
      clientAccess(mongoUri, (db) => {
        return Promise.resolve(db.collection("orders"))
          .then((collection) => {
            return collection.find().toArray();
          })
          .then((res) => {
            fulfill(res);
          });
      });
    });
  };

  var lookup = function (id) {
    return new Promise(function (fulfill, reject) {
      clientAccess(mongoUri, (db) =>
        Promise.resolve(db.collection("orders"))
          .then((collection) => {
            return collection.findOne({
              _id: new ObjectId(id),
            });
          })
          .then(fulfill)
      );
    });
  };

  return {
    /**
     * Register our API endpoints on the specified express application and using
     * the specified database
     */
    bind: function (app, mongo, io) {
      mongoUri = mongo;
      app.post("/order", function (req, res) {
        create(req.body).then(
          function (order) {
            io.emit("new_order", order);
            res.send(order);
          },
          function (error) {
            console.log("Error while creating a new order", error);
            res.send(error.code, error.message);
          }
        );
      });
      app.delete("/order/:id", function (req, res) {
        remove(req.params.id).then(
          function () {
            io.emit("closed_order", req.params.id);
            res.send();
          },
          function (error) {
            console.log("Error while deleting an order", error);
            res.send(error.code, error.message);
          }
        );
      });
      app.get("/order", function (req, res) {
        getAll().then(
          function (orders) {
            res.send(orders);
          },
          function (error) {
            console.log("Error while deleting an order", error);
            res.send(error.code, error.message);
          }
        );
      });
      app.get("/order/:id", function (req, res) {
        lookup(req.params.id).then(
          function (orders) {
            res.send(orders);
          },
          function (error) {
            console.log("Error while fetching an order", error);
            res.send(error.code, error.message);
          }
        );
      });
    },
  };
})();
