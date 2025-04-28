import "dotenv/config";

import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);
let db = null;

function connect(isTest = false) {
  try {
    const dbName =
      process.env.NODE_ENV === "test"
        ? `${process.env.MONGODB_DATABASE}_test`
        : process.env.MONGODB_DATABASE;

    db = client.db(dbName);
  } catch (err) {
    console.log(err);
  }
}

export function getDb(isTest = false) {
  if (!db) {
    connect(isTest);
  }
  return db;
}

export function getClient() {
  return client;
}
