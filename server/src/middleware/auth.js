import { verifyToken } from "../utils/jwt.js";
import User from "../models/user.js";

export async function authenticate(token) {
  try {
    if (!token) {
      throw new Error("No token provided");
    }

    // Remove 'Bearer ' prefix if present
    const cleanToken = token.replace("Bearer ", "");

    const decoded = verifyToken(cleanToken);
    const user = await User.findUserById(decoded.userId);

    if (!user) {
      throw new Error("User not found");
    }

    return user;
  } catch (error) {
    throw new Error("Invalid or expired token");
  }
}

export function getTokenFromHeaders(headers) {
  return headers.authorization || headers.Authorization;
}
