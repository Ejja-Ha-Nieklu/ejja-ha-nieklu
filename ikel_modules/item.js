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
    return then();
  }
};

/**
 * TODO: item description
 */
module.exports = (function () {
  var mongoUri = null;

  var create = function (item) {
    return new Promise(function (fulfill, reject) {
      if (isEmpty(item.name)) {
        reject({
          code: 400,
          message:
            "Item name not specified. Please specify a non-empty item name.",
        });
        return;
      }
      if (isEmpty(item.author)) {
        reject({
          code: 400,
          message:
            "Author's name not specified. Please specify a non-empty name for the person who wants this item.",
        });
        return;
      }
      if (isEmpty(item.price)) {
        reject({
          code: 400,
          message:
            "Price not specified. Please specify a non-empty price for this item.",
        });
        return;
      }

      clientAccess(mongoUri, (db) => {
        return Promise.resolve(db.collection("orders"))
          .then((ordersCollection) =>
            ordersCollection
              .findOne({
                _id: new ObjectId(item._order),
              })
              .then((order) => {
                if (!order) {
                  reject();
                  throw "invalid order";
                }

                return Promise.all([order, db.collection("items")]);
              })
              .then(([order, itemsCollection]) => {
                console.log({ item });
                return itemsCollection.updateOne(
                  { _id: item._id },
                  { ["$set"]: { paid: item.paid } },
                  {
                    w: 1,
                    upsert: true,
                  }
                );
              })
              .then((insertedResult) => {
                return { _id: insertedResult.insertedId };
              })
          )
          .then(fulfill);
      });
    });
  };

  var update = function (id, item) {
    item._id = new ObjectId(id); // Ensure we're updating the item with the correct id
    return create(item);
  };

  var remove = function (id) {
    return new Promise(function (fulfill, reject) {
      clientAccess(mongoUri, (db) =>
        Promise.resolve(db.collection("items"))
          .then((collection) =>
            collection.remove({
              _id: new ObjectId(id),
            })
          )
          .then(fulfill)
      );
    });
  };

  var lookup = function (id) {
    return new Promise(function (fulfill, reject) {
      clientAccess(mongoUri, (db) =>
        Promise.resolve(db.collection("items"))
          .then((collection) => {
            return collection.findOne({
              _id: new ObjectId(id),
            });
          })
          .then(fulfill)
      );
    });
  };

  var query = function (query) {
    return new Promise(function (fulfill, reject) {
      if (!query || !query.order) {
        reject({
          code: 501,
          message:
            "The current implementation does not support arbitrary queries for items. Make sure that your items request " +
            'contains the "order" query parameter.',
        });
        return;
      }

      clientAccess(mongoUri, (db) =>
        Promise.resolve(db.collection("items"))
          .then((collection) => {
            return collection
              .find({
                _order: query.order,
              })
              .toArray();
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

      // When this module binds, create some indices in the database
      clientAccess(mongoUri, (db) => {
        return db.collection("items").createIndex({ _order: 1 });
      });

      app.post("/item", function (req, res) {
        create(req.body).then(
          function (item) {
            res.send(item);
          },
          function (error) {
            console.log("Error while creating a new item", error);
            res.send(error.code, error.message);
          }
        );
      });
      app.post("/item/:id", function (req, res) {
        update(req.params.id, req.body).then(
          function (item) {
            res.send(item);
          },
          function (error) {
            console.log("Error while creating a new item", error);
            res.send(error.code, error.message);
          }
        );
      });
      app.delete("/item/:id", function (req, res) {
        remove(req.params.id).then(
          function () {
            res.send();
          },
          function (error) {
            console.log("Error while deleting an item", error);
            res.send(error.code, error.message);
          }
        );
      });
      app.get("/item", function (req, res) {
        query(req.query).then(
          function (items) {
            res.send(items);
          },
          function (error) {
            console.log("Error while querying items", error);
            res.send(error.code, error.message);
          }
        );
      });
      app.get("/item/:id", function (req, res) {
        lookup(req.params.id).then(
          function (item) {
            res.send(item);
          },
          function (error) {
            console.log("Error while looking up an item", error);
            res.send(error.code, error.message);
          }
        );
      });
    },
  };
})();
