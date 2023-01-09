const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const stripe = require("stripe")(
  "sk_test_51M8hmyBxfMe73ILHdzVgDDpfpEZIULmTtZYCPQc2jhXQ9AV832kbmpQZeWScUFIbGRyWS0UNP4TlULsMNyjSqYbB00I9fj362j"
);
const app = express();
app.use(cors());
app.use(express.json());

const Port = process.env.Port || 5000;

const data = require("./Fakedata.json");
// console.log(data)
//response is only needed when we want the res from frontend ex(.then(res=>{will only works when we send res.send()}) )

const uri =
  "mongodb+srv://hamidthedev:hamidthedev@cluster0.srwkfcj.mongodb.net/?retryWrites=true&w=majority";

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

const products = client.db("mcomputers").collection("products");
const users = client.db("mcomputers").collection("users");
const carts = client.db("mcomputers").collection("cart");
const reported = client.db("mcomputers").collection("reported");
const advertised = client.db("mcomputers").collection("advertised");


//get all products
app.get("/product", async (req, res) => {
  const query = {};
  const product = await products.find(query).toArray();
  res.send(product);
});

//get product by id
app.get("/details/:id", async (req, res) => {
  const id = req.params.id;
  const mogoId = { _id: ObjectId(id) };
  const data = await products.find(mogoId).toArray();
  res.send(data);
  console.log(data);
});

//finding product by category

app.get("/product/:category", async (req, res) => {
  const category = req.params.category;
  const query = {};
  const cursor = products.find(query);
  const result = await cursor.toArray();
  const categoryitems = result.filter((p) => p.category == category);

  //getting products for seller verification

  res.send(categoryitems);
  if (!categoryitems) {
    res.send("No Data Found");
  }
});

//finding user role
app.get("/role", async (req, res) => {
  let query = { email: req.query.email };

  const cursor = users.find(query);
  const user = await cursor.toArray();
  res.send(user);
});
//finding all users accept admin
app.get("/users", async (req, res) => {
  const query = {};
  const cursor = users.find(query);
  const user = await cursor.toArray();
  const result = user.filter((u) => u.role == "buyer" || u.role == "seller");
  res.send(result);
});

//add to cart items
app.post("/cart", async (req, res) => {
  const cartInfo = req.body;
  const added = await carts.insertOne(cartInfo);
  res.send(added);
});

//getting cart items for user
app.get("/cart", async (req, res) => {
  let query = {};
  if (req.query.email) {
    query = {
      email: req.query.email,
    };
  }

  const cursor = carts.find(query);
  const allItems = await cursor.toArray();
  res.send(allItems);
});

//add reported item to server
app.post("/reported", async (req, res) => {
  const reportInfo = req.body;
  const added = await reported.insertOne(reportInfo);
  res.send(added);
});

//get reported items
app.get("/reported", async (req, res) => {
  const cursor = reported.find({});
  const allItems = await cursor.toArray();
  res.send(allItems);
});

//sending user to dg
app.post("/users", async (req, res) => {
  const userInfo = req.body;
  const add = await users.insertOne(userInfo);
  res.send(add);
});

//deleting user
app.delete("/users", async (req, res) => {
  const id = req.body._id;
  const mongoid = { _id: ObjectId(id) };
  const deleted = await users.deleteOne(mongoid);
  res.send(deleted);
});

//put verification field to sellers
app.put("/users", async (req, res) => {
  const id = req.body._id;
  const mongoid = { _id: ObjectId(id) };
  const options = { upsert: true };
  const updateUser = {
    $set: {
      verified: "true",
    },
  };

  const result = await users.updateOne(mongoid, updateUser, options);
  console.log(result);

  //verifying the seller also in the products collection
  const email = { email: req.body.email };
  const vrfy = await products.updateMany(email, updateUser, options);
  console.log(vrfy);
});
//getting product for seller specific
app.get("/product", async (req, res) => {
  let query = { email: req.query.email };

  const cursor = products.find(query);
  const result = await cursor.toArray();
  res.send(result);
});

//deleting product by seller
app.delete("/products", async (req, res) => {
  const id = req.body._id;
  const mongoid = { _id: ObjectId(id) };
  const deleted = await products.deleteOne(mongoid);
  res.send(deleted);
  console.log(deleted);
});

//send advertised items to db
app.post("/advertise", async (req, res) => {
  const items = req.body;
  const added = await advertised.insertOne(items);
  res.send(added);
});

//get reported items
app.get("/advertise", async (req, res) => {
  const cursor = advertised.find({});
  const allItems = await cursor.toArray();
  res.send(allItems);
});

//sending added products  to db
app.post("/products", async (req, res) => {
  const productInfo = req.body;
  const add = await products.insertOne(productInfo);
  res.send(add);
});

//payment via stripe fk

app.put("/payment", async (req, res) => {
  const id = req.body.buyingId;
  const mongoId = { _id: ObjectId(id) };
  const options = { upsert: true };
  const updatedDoc = {
    $set: {
      paid: true,
    },
  };
  const result = await carts.updateOne(mongoId, updatedDoc, options);
  res.send(result);

  //updating product from col. as sold
  const productName = { model: req.body.product };
  const soldUpdate = {
    $set: {
      sold: true,
    },
  };
  const solded = await products.updateMany(productName, soldUpdate, options);
  const soldedInAdvertised = await advertised.updateMany(
    productName,
    soldUpdate,
    options
  );
  console.log(soldedInAdvertised);
});

app.listen(Port, () => {
  console.log("server running");
});
