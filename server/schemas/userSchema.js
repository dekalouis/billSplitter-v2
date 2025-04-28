import User from "../models/user.js";

const users = [
  {
    email: "test@test.com",
    password: "test",
    name: "Test",
  },
];

export const typeDefs = `#graphql
type User {
    _id: ID!
    email: String!
    password: String!
    name: String!
}

type AuthPayload {
    user: User!
}

input RegisterInput {
    email: String!
    password: String!
    name: String!
}

input LoginInput {
    email: String!
    password: String!
}

type Query {
    findAllUsers: [User]
    findUserById(id: ID!): User
}

type Mutation {
    register(input: RegisterInput!): AuthPayload
}
`;

export const resolvers = {
  Query: {
    findAllUsers: async () => await User.findAll(),
    findUserById: async (_, { id }) => {
      const user = await User.findUserById(id);
      if (!user) throw new Error(`User with ID ${id} not found!`);
      return user;
    },
  },
  Mutation: {
    register: async (_, { input }) => {
      await User.register(input);
    },
  },
};
