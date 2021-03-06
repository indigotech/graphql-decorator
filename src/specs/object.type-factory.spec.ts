import 'reflect-metadata';

import * as D from '../decorator';
import * as graphql from 'graphql';

import {
  SchemaFactoryError,
  SchemaFactoryErrorType,
  clearObjectTypeRepository,
  objectTypeFactory,
} from '../type-factory';

import { execute } from 'graphql/execution';
import { parse } from 'graphql/language';

const assert = require('assert');

describe('objectTypeFactory', function () {
  beforeEach(function () {
    clearObjectTypeRepository();
  });
  it('throws an error with class which has no @Field field', function () {
    @D.ObjectType()
    class Obj { }
    try {
      objectTypeFactory(Obj);
      assert.fail();
    } catch (e) {
      const err = e as SchemaFactoryError;
      assert(err.type === SchemaFactoryErrorType.NO_FIELD);
    }
  });

  it('returns GraphQLObjectType with a Class which has string field', function () {
    @D.ObjectType()
    class Obj { @D.Field() title: string; }
    const GQLType: any = objectTypeFactory(Obj);
    assert(GQLType.name === 'Obj');
    assert(GQLType.getFields().title.type instanceof graphql.GraphQLScalarType);
  });

  it('returns GraphQLInputObjectType with a class annotated by @InputObjectType', function () {
    @D.InputObjectType()
    class Obj { @D.Field() title: string; }
    const GQLType: any = objectTypeFactory(Obj, true);
    assert(GQLType.name === 'Obj');
  });

  it('returns GraphQLInputObjectType with a class annotated by nested @InputObjectType objects', function () {
    @D.InputObjectType()
    class Nested { @D.Field() title: string; }

    @D.InputObjectType()
    class Obj { @D.Field() title: string; @D.Field({ type: Nested }) nested: Nested; }
    const GQLType: any = objectTypeFactory(Obj, true);
    assert(GQLType.name === 'Obj');
  });

  it('raises exception if nested @InputObjectType is undefined', function () {
    // this can be caused when order of `import` is messed up and/or nested type can not be infered
    @D.InputObjectType()
    class Obj { @D.Field() title: string; @D.Field({ type: undefined }) nested: {}; }
    try {
      const GQLType = objectTypeFactory(Obj, true);
      GQLType.getFields();
      assert.fail();
    } catch (e) {
      const err = e as SchemaFactoryError;
      assert(err.type === SchemaFactoryErrorType.NO_FIELD);
    }
  });

  it('returns GraphQLObjectType if includes circular references', function () {
    @D.ObjectType()
    class Obj { @D.Field() circle: Obj; }
    const GQLType = objectTypeFactory(Obj);
    assert(GQLType.name === 'Obj');
    assert((GQLType.getFields().circle.type as graphql.GraphQLObjectType).getFields().circle.type instanceof graphql.GraphQLObjectType);
  });

  it('allows thunk circular dependecies', function () {
    @D.ObjectType()
    class A { @D.Field({type: () => B}) circle: any; } // tslint:disable-line:no-use-before-declare
    @D.ObjectType()
    class B { @D.Field({type: () => A}) circle: any; }
    const GQLType = objectTypeFactory(A);
    assert(GQLType.name === 'A');
    assert((GQLType.getFields().circle.type as graphql.GraphQLObjectType).getFields().circle.type instanceof graphql.GraphQLObjectType);
  });
});
