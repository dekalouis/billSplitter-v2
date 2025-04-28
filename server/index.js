import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import {
  resolvers as userResolvers,
  typeDefs as userTypeDef,
} from "./schemas/userSchema.js";

const server = new ApolloServer({
  typeDefs: [userTypeDef],
  resolvers: [userResolvers],
});

const { url } = await startStandaloneServer(server, {
  listen: { port: 4000 },
});

console.log(`🚀 Server ready at ${url}`);
