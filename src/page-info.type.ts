import * as graphql from "graphql";
import { GraphQLObjectType } from "graphql";

export interface PageInfoObject {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export const PageInfoType = 
    new graphql.GraphQLObjectType({
      name: 'PageInfo',
      description: 'Contains current paging information.',
      fields: function () {
        return {
          hasNextPage: {
            type: new graphql.GraphQLNonNull(graphql.GraphQLBoolean),
          },
          hasPreviousPage: {
            type: new graphql.GraphQLNonNull(graphql.GraphQLBoolean),
          },
        }
      }
    });
