import { ObjectId } from "mongodb";
import { getDb } from "../config/mongodb.js";
import bcrypt from "bcryptjs";

export default class User {
  static getCollection() {
    const db = getDb();
    return db.collection("users");
  }

  static async findAll() {
    return await this.getCollection().find().toArray();
  }

  static async findUserById(id) {
    return await this.getCollection().findOne({ _id: new ObjectId(id) });
  }

  static async register(data) {
    const collection = this.getCollection();
    const { email, password, name } = data;

    if (!email || !password)
      throw new Error("Username and password are required!");

    const existing = await collection.findOne({ email });
    if (existing) throw new Error(`Email already registered!`);

    const hashedPass = await bcrypt.hash(password, 10);

    const newUser = {
      email,
      password: hashedPass,
      name,
    };

    const result = await collection.insertOne(newUser);
    const user = { _id: result.insertedId, ...newUser };

    //todo make the token

    return {
      user,
    };
  }
}
