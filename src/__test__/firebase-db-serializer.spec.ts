process.env.NODE_ENV = 'test';
import 'mocha';
import { assert, expect, should } from 'chai';
should();
import * as sinon from 'sinon';
import { SinonStub } from 'sinon';

import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import * as shallowDeepEqual from 'chai-shallow-deep-equal';
import * as chaiAsPromised from 'chai-as-promised';
chai.use(sinonChai);
chai.use(shallowDeepEqual);
chai.use(chaiAsPromised);

import { FirebaseDbSerializer } from '../fns/firebase-db-serializer';

describe('Firebase Db Serializer', () => {
    it('should only serialize date into number with dataType for input object', () => {
        const now = new Date();
        const input = {
            string: "some random string",
            date: now,
            number: 123123,
            trueBoolean: true,
            falseBoolean: false,
            float: 3.141592654,
            object: {
                firstProp: 1,
                secondProp: '2',
            },
            arrayOfNumbers: [1, 2, 3],
            arrayOfObjects: [
                { objId: 1 },
                { objId: 2 },
                { objId: 3 },
            ],
        }
        const output = FirebaseDbSerializer.serialize(input);
        expect(output).to.deep.equal({
            string: "some random string",
            date: { value: now.getTime(), type: 'date' },
            number: 123123,
            trueBoolean: true,
            falseBoolean: false,
            float: 3.141592654,
            object: {
                firstProp: 1,
                secondProp: '2',
            },
            arrayOfNumbers: [1, 2, 3],
            arrayOfObjects: [
                { objId: 1 },
                { objId: 2 },
                { objId: 3 },
            ],
        });
    });

    it('should serialize date inside nested object', () => {
        const now = new Date();
        const input = {
            date: now,
            object: {
                firstProp: 1,
                secondProp: '2',
                dateProp: now,
                nextNestedObject: {
                    otherProp: '123',
                    nestedDateProp: now,
                }
            },
        }
        const output = FirebaseDbSerializer.serialize(input);
        expect(output).to.deep.equal({
            date: {
                value: now.getTime(),
                type: 'date',
            },
            object: {
                firstProp: 1,
                secondProp: '2',
                dateProp: {
                    value: now.getTime(),
                    type: 'date',
                },
                nextNestedObject: {
                    otherProp: '123',
                    nestedDateProp: {
                        value: now.getTime(),
                        type: 'date',
                    },
                }
            },
        });
    });

    it('should return null if input is null', () => {
        const input = null;
        const output = FirebaseDbSerializer.serialize(input);
        expect(output).to.be.null;
    });

    it('should return undefined if input is undefined', () => {
        const input = undefined;
        const output = FirebaseDbSerializer.serialize(input);
        expect(output).to.be.undefined;
    });
});