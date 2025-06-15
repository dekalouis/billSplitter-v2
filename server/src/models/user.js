import { ObjectId } from "mongodb";
import { getDb } from "../config/mongodb.js";
import bcrypt from "bcryptjs";
import { generateToken } from "../utils/jwt.js";

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

  static async findUserByEmail(email) {
    return await this.getCollection().findOne({ email });
  }

  static async register(data) {
    const collection = this.getCollection();
    const { email, password, name } = data;

    if (!email || !password)
      throw new Error("Email and password are required!");

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

    // Generate JWT token
    const token = generateToken({ userId: user._id, email: user.email });

    return {
      user,
      token,
    };
  }

  static async login(email, password) {
    const collection = this.getCollection();

    const user = await collection.findOne({ email });
    if (!user) throw new Error("Invalid credentials!");

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) throw new Error("Invalid credentials!");

    const token = generateToken({ userId: user._id, email: user.email });

    return {
      user,
      token,
    };
  }
}
