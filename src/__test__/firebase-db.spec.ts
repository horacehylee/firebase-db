import { FirebaseDb } from "../firebase-db";

import 'mocha';
import { assert, expect, should } from 'chai';
import * as sinon from 'sinon';
import * as admin from 'firebase-admin';
import * as path from 'path';
import * as randomString from 'randomstring';

import { isEmpty } from 'lodash';

import * as chai from 'chai';
import * as chaiShallowDeepEqual from 'chai-shallow-deep-equal';
import * as chaiAsPromised from 'chai-as-promised';
chai.use(chaiShallowDeepEqual);
chai.use(chaiAsPromised);

process.env.NODE_ENV = 'test';

require('dotenv').config();

const testRefPrefix = '__test__'

describe('FirebaseDb', () => {
    let adminInitStub, configStub;
    let databaseStub;
    let refStub, pushStub;

    const testRef = 'ref';
    const fetchFromDatabase = (id: string): Promise<any> => {
        const db = admin.database();
        const refValue = path.posix.join(testRefPrefix, testRef, id);
        return db.ref(refValue).once('value').then((snapshot) => {
            return Promise.resolve(snapshot.val());
        });
    }
    const fetchRefFromDatabase = (): Promise<any> => {
        const db = admin.database();
        const ref = path.posix.join(testRefPrefix, testRef);
        return db.ref(ref).once('value').then((snapshot) => {
            return Promise.resolve(snapshot.val());
        });
    }
    const clearDb = async () => {
        const db = admin.database();
        await db.ref(testRefPrefix).remove();
    }

    before(() => {
        const serviceAccount = require("./../../secrets/firebase-adminsdk.json");
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            databaseURL: process.env.FIREBASE_DATABASE_URL,
        }, !isEmpty(admin.apps) ? randomString.generate() : undefined);
        console.log(`Database Url: ${process.env.FIREBASE_DATABASE_URL}`)
    });

    describe('Insert', () => {
        let insertedId;

        it('should insert data into database with auto id generation, except date', async () => {
            const data = {
                string: "Testing data",
                trueBoolean: true,
                falseBoolean: false,
                number: 12341,
                float: 3.141592654,
                object: {
                    firstProp: 1,
                    secondProp: '2',
                    nestedObject: {
                        moreProp: false,
                    }
                },
                arrayOfNumbers: [1, 2, 3],
                arrayOfObjects: [
                    { objId: 1 },
                    { objId: 2 },
                    { objId: 3 },
                ],
            }
            insertedId = await FirebaseDb.insert(testRef, data);

            const fetchResult = await fetchFromDatabase(insertedId);
            expect(fetchResult).to.deep.equal({
                id: insertedId,
                string: "Testing data",
                trueBoolean: true,
                falseBoolean: false,
                number: 12341,
                float: 3.141592654,
                object: {
                    firstProp: 1,
                    secondProp: '2',
                    nestedObject: {
                        moreProp: false,
                    }
                },
                arrayOfNumbers: [1, 2, 3],
                arrayOfObjects: [
                    { objId: 1 },
                    { objId: 2 },
                    { objId: 3 },
                ],
            });
        });

        it('should convert date into number with type and insert it into database', async () => {
            const now = new Date();
            const data = {
                string: "Testing data",
                date: now,
                object: {
                    dateProp: now,
                    nestedObject: {
                        moreDateProp: now,
                    }
                },
            }
            insertedId = await FirebaseDb.insert(testRef, data);

            const fetchResult = await fetchFromDatabase(insertedId);
            expect(fetchResult).to.deep.equal({
                id: insertedId,
                string: "Testing data",
                date: {
                    value: now.getTime(),
                    type: 'date',
                },
                object: {
                    dateProp: {
                        value: now.getTime(),
                        type: 'date',
                    },
                    nestedObject: {
                        moreDateProp: {
                            value: now.getTime(),
                            type: 'date',
                        },
                    }
                },
            });
        });

        it('should replace id field if id already exists in the data', async () => {
            const data = {
                id: 'previousId',
                string: 'some text'
            }
            insertedId = await FirebaseDb.insert(testRef, data);

            const fetchResult = await fetchFromDatabase(insertedId);
            expect(fetchResult).to.deep.equal({
                id: insertedId,
                string: 'some text'
            });
        });

        it('should throw error if null or undefined is inserted', async () => {
            const insertNull = () => FirebaseDb.insert(testRef, null);
            expect(insertNull).to.throw(ReferenceError);

            const insertUndefined = () => FirebaseDb.insert(testRef, undefined);
            expect(insertUndefined).to.throw(ReferenceError);

            const refResult = await fetchRefFromDatabase();
            expect(refResult).to.be.null;
        });

        afterEach(() => {
            clearDb();
        })
    });

    describe('Get with id', () => {
        it('should throw reference error for null / undefined id', () => {
            expect(() => FirebaseDb.get(testRef, null)).to.throw(ReferenceError);
            expect(() => FirebaseDb.get(testRef, undefined)).to.throw(ReferenceError);
        });

        describe('Already populated with data', () => {
            before(() => {
                const db = admin.database();
                const ref = path.posix.join(testRefPrefix, testRef);
                db.ref(ref).set({
                    testId1: {
                        id: 'testId1',
                        title: 'hello1',
                        number: 123,
                        float: 3.141592654,
                    },
                    testId2: {
                        id: 'testId2',
                        title: 'hello2',
                        number: 1934,
                        float: 2.54,
                    }
                })
            });

            it('should get specific data with id from database', async () => {
                {
                    const result = await FirebaseDb.get(testRef, 'testId1');
                    expect(result).to.deep.equal({
                        id: 'testId1',
                        title: 'hello1',
                        number: 123,
                        float: 3.141592654,
                    });
                }
                {
                    const result = await FirebaseDb.get(testRef, 'testId2');
                    expect(result).to.deep.equal({
                        id: 'testId2',
                        title: 'hello2',
                        number: 1934,
                        float: 2.54,
                    });
                }
            });

            it('should be rejected with reference error for unknown id', () => {
                expect(FirebaseDb.get(testRef, 'unknownId')).to.rejectedWith(ReferenceError);
            });

            after(() => {
                clearDb();
            })
        })

        describe('Without data', () => {
            it('should be rejected with reference error for any id', () => {
                expect(FirebaseDb.get(testRef, 'anyId')).to.rejectedWith(ReferenceError);
            });
        });
    });

    describe('Get All', () => {
        describe('Already populated with data', () => {
            before(() => {
                const db = admin.database();
                const ref = path.posix.join(testRefPrefix, testRef);
                db.ref(ref).set({
                    'testId1': {
                        'id': 'testId1',
                        'title': 'hello1',
                    },
                    'testId2': {
                        'id': 'testId2',
                        'title': 'hello2',
                    }
                })
            });

            it('should get all from database', async () => {
                const result = await FirebaseDb.getAll(testRef);
                expect(result).not.to.be.null;
                expect(result).to.deep.equals([
                    {
                        'id': 'testId1',
                        'title': 'hello1',
                    },
                    {
                        'id': 'testId2',
                        'title': 'hello2',
                    }
                ]);
            });

            after(() => {
                clearDb();
            })
        });

        describe('Without data', () => {
            it('get all should return empty array', async () => {
                const result = await FirebaseDb.getAll(testRef);
                expect(result).to.be.deep.equal([]);
            });
        });
    });

    describe('Update', () => {
        describe('Already populated with data', () => {
            before(() => {
                const db = admin.database();
                const ref = path.posix.join(testRefPrefix, testRef);
                db.ref(ref).set({
                    'testId1': {
                        'id': 'testId1',
                        'title': 'hello1',
                    },
                    'testId2': {
                        'id': 'testId2',
                        'title': 'hello2',
                    }
                })
            });

            it('should update by id', async () => {
                await FirebaseDb.update(testRef, 'testId2', {
                    'id': 'testId2',
                    'title': 'helloEdited',
                    'moreProp': 123123,
                });
                const result = await fetchFromDatabase('testId2');
                expect(result).to.deep.equal({
                    'id': 'testId2',
                    'title': 'helloEdited',
                    'moreProp': 123123,
                })
            });

            it('should throw reference error if unknown id', async () => {
                const unknownIdAction = FirebaseDb.update(testRef, 'unknownId', {
                    'id': 'unknownId',
                    'title': 'helloEdited',
                    'moreProp': 123123,
                });
                expect(unknownIdAction).to.rejectedWith(ReferenceError);
            });

            it('should not update id', async () => {
                await FirebaseDb.update(testRef, 'testId2', {
                    'id': 'editedId',
                    'title': 'helloEdited',
                    'moreProp': 123123,
                });
                const result = await fetchFromDatabase('testId2');
                expect(result).to.deep.equal({
                    'id': 'testId2',
                    'title': 'helloEdited',
                    'moreProp': 123123,
                })
            });

            after(() => {
                clearDb();
            })
        });
    });

    describe('Delete with id', () => {
        describe('Already populated with data', () => {
            beforeEach(() => {
                const db = admin.database();
                const ref = path.posix.join(testRefPrefix, testRef);
                db.ref(ref).set({
                    'testId1': {
                        'id': 'testId1',
                        'title': 'hello1',
                    },
                    'testId2': {
                        'id': 'testId2',
                        'title': 'hello2',
                    }
                })
            });

            it('should delete specific id', async () => {
                await FirebaseDb.delete(testRef, 'testId2');
                const result = await fetchRefFromDatabase();
                expect(result).to.deep.equal({
                    'testId1': {
                        'id': 'testId1',
                        'title': 'hello1',
                    },
                })
            });

            it('should throw reference error for unknown id', async () => {
                expect(FirebaseDb.delete(testRef, 'unknownId')).to.rejectedWith(ReferenceError);
            });

            afterEach(() => {
                clearDb();
            })
        });
    });

    describe('Delete All', () => {
        describe('Already populated with data', () => {
            before(() => {
                const db = admin.database();
                const ref = path.posix.join(testRefPrefix, testRef);
                db.ref(ref).set({
                    'testId1': {
                        'id': 'testId1',
                        'title': 'hello1',
                    },
                    'testId2': {
                        'id': 'testId2',
                        'title': 'hello2',
                    }
                })
            });

            it('should delete all within ref', async () => {
                await FirebaseDb.deleteAll(testRef);
                const result = await fetchRefFromDatabase();
                expect(result).to.be.null;
            });

            after(() => {
                clearDb();
            })
        });
    });

    describe('Exists', () => {
        before(() => {
            const db = admin.database();
            const ref = path.posix.join(testRefPrefix, testRef);
            db.ref(ref).set({
                'testId1': {
                    'id': 'testId1',
                    'title': 'hello1',
                },
                'testId2': {
                    'id': 'testId2',
                    'title': 'hello2',
                }
            })
        });

        it('should be true for populated ref', async () => {
            const exists = await FirebaseDb.exists(testRef);
            expect(exists).to.be.true;
        })

        it('should be true for specific id', async () => {
            const exists = await FirebaseDb.exists(testRef, 'testId1');
            expect(exists).to.be.true;
        })

        it('should be false for unknown id', async () => {
            const exists = await FirebaseDb.exists(testRef, 'unknownId');
            expect(exists).to.be.false;
        })

        after(() => {
            clearDb();
        })
    })

    after(() => {
        clearDb();
    });
});

