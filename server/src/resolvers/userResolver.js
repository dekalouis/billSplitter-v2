import User from "../models/user.js";
import {
  validateRegisterInput,
  validateLoginInput,
} from "../utils/validators.js";
import { authenticate, getTokenFromHeaders } from "../middleware/auth.js";

export const userResolvers = {
  Query: {
    findAllUsers: async () => {
      return await User.findAll();
    },

    findUserById: async (_, { id }) => {
      const user = await User.findUserById(id);
      if (!user) throw new Error(`User with ID ${id} not found!`);
      return user;
    },

    me: async (_, __, { req }) => {
      const token = getTokenFromHeaders(req.headers);
      const user = await authenticate(token);
      return user;
    },
  },

  Mutation: {
    register: async (_, { input }) => {
      const validation = validateRegisterInput(input);

      if (!validation.isValid) {
        throw new Error(validation.errors.join(", "));
      }

      try {
        const result = await User.register(input);
        return result;
      } catch (error) {
        throw new Error(error.message);
      }
    },

    login: async (_, { input }) => {
      const validation = validateLoginInput(input);

      if (!validation.isValid) {
        throw new Error(validation.errors.join(", "));
      }

      try {
        const result = await User.login(input.email, input.password);
        return result;
      } catch (error) {
        throw new Error(error.message);
      }
    },
  },
};
