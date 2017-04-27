import 'reflect-metadata';
import * as D from './decorator';
import { SchemaFactoryError , SchemaFactoryErrorType } from './schema_factory';
import { objectTypeFactory , clearObjectTypeRepository } from './object_type_factory';

import * as graphql from 'graphql';
import { parse } from 'graphql/language';
import { execute } from 'graphql/execution';

const assert = require('assert');

describe('objectTypeFactory', function() {
    beforeEach(function() {
        clearObjectTypeRepository();
    });
    it('throws an error with class which has no @Field field', function() {
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

    it('returns GraphQLObjectType with a Class which has string field', function() {
        @D.ObjectType()
        class Obj { @D.Field() title: string; }
        const GQLType = objectTypeFactory(Obj);
        assert(GQLType._typeConfig.name === 'Obj');
        assert(GQLType._typeConfig.fields.title.type instanceof graphql.GraphQLScalarType);
    });

    it('returns GraphQLObjectType with a class annotated by @Description', function() {
        @D.Description('this is a object type')
        @D.ObjectType()
        class Obj { @D.Field() title: string; }
        const GQLType = objectTypeFactory(Obj);
        assert(GQLType._typeConfig.description === 'this is a object type');
    });

    it('returns GraphQLInputObjectType with a class annotated by @InputObjectType', function() {
        @D.InputObjectType()
        class Obj { @D.Field() title: string; }
        const GQLType = objectTypeFactory(Obj, true);
        assert(GQLType._typeConfig.name === 'Obj');
    });
});
