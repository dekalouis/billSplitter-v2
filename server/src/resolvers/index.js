import { userResolvers } from "./userResolver.js";
import { billResolvers } from "./billResolver.js";
import { GraphQLJSON } from "graphql-type-json";

export const resolvers = {
  JSON: GraphQLJSON, // Add JSON scalar resolver
  Query: {
    ...userResolvers.Query,
    ...billResolvers.Query,
  },
  Mutation: {
    ...userResolvers.Mutation,
    ...billResolvers.Mutation,
  },
};
