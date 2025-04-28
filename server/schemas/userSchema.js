const users = [
  {
    email: "test@test.com",
    password: "test",
    name: "Test",
  },
];

export const typeDefs = `#graphql
type User {
    email: String
    password: String
    name: String
}

type Query {
    users: [User]
}
`;

export const resolvers = {
  Query: {
    users: () => users,
  },
};
