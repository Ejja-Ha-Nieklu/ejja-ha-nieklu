var MongoClient = require("mongodb").MongoClient;

module.exports = function clientAccess(uri, fn) {
  var client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  client
    .connect()
    .then((client) => {
      return fn(client.db("ejja-ha-nieklu"));
    })
    .finally(() => {
      client.close();
    });
};
