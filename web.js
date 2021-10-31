// web.js
"use strict";

var express = require("express");
var logfmt = require("logfmt");
var app = express();
var cors = require("cors");
var bodyParser = require("body-parser");
var nodemailer = require("nodemailer");
var Order = require("./ikel_modules/order.js");
var Item = require("./ikel_modules/item.js");

var MongoClient = require("mongodb").MongoClient;
var ObjectId = require("mongodb").ObjectID;

var mongoUri =
  process.env.MONGOLAB_URI ||
  process.env.MONGOHQ_URL ||
  "mongodb://localhost/ejja-ha-nieklu";

app.use(cors());
app.use(logfmt.requestLogger());

app.use(bodyParser());

app.use(express.static(__dirname + "/webapp/dist"));

var port = Number(process.env.PORT || 5000);
var server = app.listen(port, function () {
  if (process.send) {
    process.send("LISTENING_STARTED");
  }
  console.log("Listening on " + port);
});
var io = require("socket.io").listen(server);

app.get("/", function (req, res) {
  res.send();
});

Order.bind(app, mongoUri, io);
Item.bind(app, mongoUri, io);
