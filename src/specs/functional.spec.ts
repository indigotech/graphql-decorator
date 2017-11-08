import 'reflect-metadata';

import * as D from '../decorator';
import * as graphql from 'graphql';

import { IoCContainer } from '../ioc-container';
import { schemaFactory } from '../type-factory';
import { useContainer } from '../use-container';

const assert = require('assert');

describe('Functional', function () {

  describe('Query', function () {

    describe('Field', function () {

      @D.ObjectType()
      class QueryType {
        @D.Field()
        greeting(): string {
          return 'Hello, world!';
        }

        @D.Field({ type: graphql.GraphQLString })
        greetingAsPromise(): Promise<string> {
          return Promise.resolve('Hello, world!');
        }
      }

      @D.Schema()
      class SchemaType {
        @D.Query() query: QueryType;
      }

      it('resolves @Field', async function () {
        const schema = schemaFactory(SchemaType);
        const result = await graphql.graphql(schema, `query { greeting } `);
        assert(result.data.greeting === 'Hello, world!');
      });

      it('resolves @Field as Promise', async function () {
        const schema = schemaFactory(SchemaType);
        const result = await graphql.graphql(schema, `query { greetingAsPromise } `);
        assert(result.data.greetingAsPromise === 'Hello, world!');
      });

    });

    describe('Arg', function () {

      @D.ObjectType()
      class QueryType {
        @D.Field()
        greeting(
          @D.Arg({ name: 'arg', description: 'any desc' }) arg: string,
        ): string {
          return `Hello, ${arg}!`;
        }
      }

      @D.Schema()
      class SchemaType {
        @D.Query() query: QueryType;
      }

      it('resolves @Field with @Arg input value', async function () {
        const schema = schemaFactory(SchemaType);
        const result = await graphql.graphql(schema, `query { greeting(arg: "world") } `);
        assert(result.data.greeting === 'Hello, world!');
      });

    });

    describe('List', function () {

      @D.ObjectType()
      class QueryType {
        @D.Field({ isList: true, type: graphql.GraphQLString })
        async list(): Promise<string[]> {
          return ['Hello, world!'];
        }
      }

      @D.Schema()
      class SchemaType {
        @D.Query() query: QueryType;
      }

      it('resolves @Field with isList', async function () {
        const schema = schemaFactory(SchemaType);
        const result = await graphql.graphql(schema, `
          query {
            list
          }
        `);
        assert(result.data.list.length === 1);
        assert(result.data.list[0] === 'Hello, world!');
      });

    });

    describe('Pagination', function () {

      @D.ObjectType()
      class QueryType {
        @D.Field({ pagination: true, type: graphql.GraphQLString })
        async paginated(
          @D.Arg({ name: 'value', type: graphql.GraphQLString }) value: string,
          @D.Ctx() context: any,
        ): Promise<[string[], number]> {
          return [[`Hello, ${value}!`], 1];
        }
      }

      @D.Schema()
      class SchemaType {
        @D.Query() query: QueryType;
      }

      it('resolves @Field with pagination', async function () {
        const schema = schemaFactory(SchemaType);
        const result = await graphql.graphql(schema, `
          query {
            paginated(value: "world") {
              count
              nodes
              pageInfo {
                hasNextPage
                hasPreviousPage
              }
            }
          }
        `);
        assert(result.data.paginated.count === 1);
        assert(result.data.paginated.nodes.length === 1);
        assert(result.data.paginated.nodes[0] === 'Hello, world!');
        assert(result.data.paginated.pageInfo.hasNextPage === false);
        assert(result.data.paginated.pageInfo.hasPreviousPage === false);
      });

    });

    describe('Before Middleware', function () {

      @D.ObjectType()
      class QueryType {
        @D.Field({ type: graphql.GraphQLString })
        @D.Before({
          middleware: (context, args, next) => next(null, 'Hello from middleware'),
        })
        async replace(): Promise<string> {
          return 'Hello, world!';
        }

        @D.Field({ type: graphql.GraphQLString })
        @D.Before({ middleware: (context, args, next) => next() })
        async ignore(): Promise<string> {
          return 'Hello, world!';
        }

        @D.Field({ type: graphql.GraphQLString })
        @D.Before({ middleware: (context, args, next) => next(new Error('Error from middleware'), 'x') })
        async callError(): Promise<string> {
          return 'Hello, world!';
        }
      }

      @D.Schema()
      class SchemaType {
        @D.Query() query: QueryType;
      }

      it('resolves @Field decorated with @Before Middleware replacing resolver', async function () {
        const schema = schemaFactory(SchemaType);
        const result = await graphql.graphql(schema, `query { replace }`);
        assert(result.data.replace === 'Hello from middleware');
      });

      it('resolves @Field decorated with @Before Middleware and returning from resolver', async function () {
        const schema = schemaFactory(SchemaType);
        const result = await graphql.graphql(schema, `query { replace }`);
        assert(result.data.replace === 'Hello from middleware');
      });

      it('resolves @Field decorated with @Before Middleware and erroring', async function () {
        const schema = schemaFactory(SchemaType);
        const result = await graphql.graphql(schema, `query { callError }`);

        assert(result.data.callError === null);
        assert(typeof (result.errors) !== 'undefined');
        assert(result.errors.length === 1);
        assert(result.errors[0].message === 'Error from middleware');
      });

    });

    describe('Union', function () {

      abstract class BaseType {
        @D.Field()
        type: string;
      }

      @D.ObjectType()
      class QueryAType extends BaseType {
        @D.Field()
        queryA: string;
      }

      @D.ObjectType()
      class QueryBType extends BaseType {
        @D.Field()
        queryB: string;
      }

      type QueryUnionType = QueryAType | QueryBType;

      @D.UnionType<QueryUnionType>({
        types: [QueryAType, QueryBType],
        resolver: (obj: QueryUnionType): string | null => {
          if (obj.type === 'A') { return QueryAType.name; }
          return QueryBType.name;
        },
      })
      class UnionType { }

      @D.ObjectType()
      class QueryType {
        @D.Field({ type: UnionType, isList: true })
        value(): UnionType[] {
          return [
            {
              type: 'A',
              queryA: 'hello',
            },
            {
              type: 'B',
              queryB: 'world',
            },
          ];
        }
      }

      @D.Schema()
      class SchemaType {
        @D.Query() query: QueryType;
      }

      it('resolves @UnionType with abstact class', async function () {
        const schema = schemaFactory(SchemaType);

        const result = await graphql.graphql(schema, `
        query {
          value {
            ...on QueryAType {
              type
              queryA
            }
            ...on QueryBType {
              type
              queryB
            }
          }
        }
        `);
        assert(result.data.value.length === 2);
        assert(result.data.value[0].type === 'A');
        assert(result.data.value[0].queryA === 'hello');
        assert(result.data.value[1].type === 'B');
        assert(result.data.value[1].queryB === 'world');
      });

    });

    describe('Multiple Queries', function () {

      @D.ObjectType()
      class QueryAType {
        @D.Field()
        greetingA(): string { return `Hello, world`; }
      }

      @D.ObjectType()
      class QueryBType {
        @D.Field()
        greetingB(): string { return `Hello, world`; }
      }

      @D.Schema()
      class SchemaType {
        @D.Query() queryA: QueryAType;
        @D.Query() queryB: QueryBType;
      }

      it('resolves multiple queries with @Schema and @Query', async function () {
        const schema = schemaFactory(SchemaType);
        const result = await graphql.graphql(schema, `query { greetingA, greetingB } `);
        assert(result.data.greetingA === 'Hello, world');
        assert(result.data.greetingB === 'Hello, world');
      });

    });

  });

  describe('Mutation', function () {

    describe('InputObjectType', function () {

      @D.ObjectType()
      class QueryType {
        @D.Field()
        dummy(): string {
          return 'A schema always needs a query';
        }
      }

      @D.InputObjectType()
      class InputType {
        @D.Field()
        value: string;
      }

      @D.ObjectType()
      class MutationType {
        @D.Field()
        willItMutate(
          @D.Arg({ type: InputType, name: 'input' }) input: InputType,
        ): string {
          return `Hello, ${input.value}!`;
        }
      }

      @D.Schema()
      class SchemaType {
        @D.Query() query: QueryType;
        @D.Mutation() mutation: MutationType;
      }

      it('resolves @Mutation with @InputTypeObject', async function () {
        const schema = schemaFactory(SchemaType);
        const result = await graphql.graphql(schema, `mutation { willItMutate(input: {value: "world"}) } `);
        assert(result.data.willItMutate === 'Hello, world!');
      });


    });

  });

  describe('useContainer', function () {

    afterEach(function () {
      delete IoCContainer.INSTANCE;
    });

    it('sets the DI container properly', function () {

      const container = {};
      useContainer(container);
      assert(IoCContainer.INSTANCE === container);
    });

  });
});
