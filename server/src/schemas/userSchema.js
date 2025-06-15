export const typeDefs = `#graphql
  type User {
    _id: ID!
    email: String!
    name: String!
  }

  type AuthPayload {
    user: User!
    token: String!
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
    me: User
  }

  type Mutation {
    register(input: RegisterInput!): AuthPayload
    login(input: LoginInput!): AuthPayload
  }
`;
