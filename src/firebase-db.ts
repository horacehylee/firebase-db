import { FirebaseDbParser } from "./fns/firebase-db-parser";
import { FirebaseDbSerializer } from "./fns/firebase-db-serializer";
import { notNull } from "./fns/firebase-db-util";

import * as admin from "firebase-admin";
import * as path from "path";

const _serialize = data => FirebaseDbSerializer.serialize(data);
const _parseSnapshot = (snapshot: admin.database.DataSnapshot) =>
  FirebaseDbParser.parse(snapshot.val());

// Testing hook
const testRef = "/__test__";
const hookPathValue = (pathValue: string): string => {
  if (process.env.NODE_ENV != "test") return pathValue;
  return path.posix.join(testRef, pathValue);
};

let _database: admin.database.Database;

export class FirebaseDb {
  public static connect(database: admin.database.Database) {
    _database = database;
  }

  private static getDb() {
    if (_database) {
      return _database;
    } else {
      return admin.database();
    }
  }

  static insert(pathValue: string, data: any): Promise<string> {
    notNull(data, "data");
    notNull(pathValue, "pathValue");

    pathValue = hookPathValue(pathValue);

    const db = this.getDb();
    const insertRef = db.ref(pathValue).push();
    const id = insertRef.key;

    const item = {
      ..._serialize(data),
      id: id
    };
    return insertRef.set(item).then(() => {
      return Promise.resolve(id);
    });
  }

  static insertWithId(
    pathValue: string,
    id: string,
    data: any
  ): Promise<string> {
    notNull(data, "data");
    notNull(pathValue, "pathValue");
    notNull(id, "id");

    pathValue = hookPathValue(pathValue);

    const db = this.getDb();
    const insertRef = db.ref(pathValue).child(id);

    const item = {
      ..._serialize(data),
      id: id
    };
    return insertRef.set(item).then(() => {
      return Promise.resolve(id);
    });
  }

  static insertAndGet(pathValue: string, data: any): Promise<any> {
    return this.insert(pathValue, data).then(id => {
      return this.get(pathValue, id);
    });
  }

  static exists(pathValue: string, id?: string): Promise<boolean> {
    notNull(pathValue, "pathValue");
    pathValue = hookPathValue(pathValue);
    if (id) {
      pathValue = path.posix.join(pathValue, id);
    }
    const db = this.getDb();
    const ref = db.ref(pathValue);
    return ref.once("value").then(snapshot => {
      const data = snapshot.val();
      if (!data) {
        return Promise.resolve(false);
      }
      return Promise.resolve(true);
    });
  }

  static get(pathValue: string, id: string): Promise<any> {
    notNull(id, "id");
    notNull(pathValue, "pathValue");

    pathValue = hookPathValue(pathValue);

    pathValue = path.posix.join(pathValue, id);
    const db = this.getDb();
    const ref = db.ref(pathValue);
    return ref.once("value").then((snapshot: admin.database.DataSnapshot) => {
      if (!snapshot.val()) {
        // throw new ReferenceError(`unknown id(${id}) for ref(${pathValue})`)
        // return Promise.reject(`unknown id(${id}) for ref(${pathValue})`);
        return Promise.reject(
          new ReferenceError(`unknown id(${id}) for ref(${pathValue})`)
        );
      }
      return Promise.resolve(_parseSnapshot(snapshot));
    });
  }

  static getAll(pathValue: string): Promise<any[]> {
    notNull(pathValue, "pathValue");

    pathValue = hookPathValue(pathValue);

    const db = this.getDb();
    const ref = db.ref(pathValue);
    return ref.once("value").then((snapshot: admin.database.DataSnapshot) => {
      const results = [];
      snapshot.forEach(childSnapshot => {
        results.push(_parseSnapshot(childSnapshot));
        return false;
      });
      return Promise.resolve(results);
    });
  }

  static update(pathValue: string, id: string, data: any): Promise<void> {
    notNull(id, "id");
    notNull(pathValue, "pathValue");
    notNull(data, "data");

    return this.get(pathValue, id).then(() => {
      pathValue = hookPathValue(pathValue);

      pathValue = path.posix.join(pathValue, id);
      const db = this.getDb();
      const ref = db.ref(pathValue);
      const item = {
        ..._serialize(data),
        id: id
      };
      return ref.set(item);
    });
  }

  static updateFields(
    pathValue: string,
    id: string,
    fields: object
  ): Promise<void> {
    notNull(id, "id");
    notNull(pathValue, "pathValue");
    notNull(fields, "fields");

    return this.get(pathValue, id).then(originalItem => {
      pathValue = hookPathValue(pathValue);

      pathValue = path.posix.join(pathValue, id);
      const db = this.getDb();
      const ref = db.ref(pathValue);
      const item = {
        ..._serialize(originalItem),
        ...fields,
        id: id
      };
      return ref.set(item);
    });
  }

  static updateFieldsAndGet(
    pathValue: string,
    id: string,
    fields: object
  ): Promise<any> {
    return this.updateFields(pathValue, id, fields).then(() => {
      return this.get(pathValue, id);
    });
  }

  static updateAndGet(pathValue: string, id: string, data: any): Promise<any> {
    return this.update(pathValue, id, data).then(() => {
      return this.get(pathValue, id);
    });
  }

  static delete(pathValue: string, id: string): Promise<void> {
    notNull(id, "id");
    notNull(pathValue, "pathValue");

    return this.get(pathValue, id).then(() => {
      pathValue = path.posix.join(pathValue, id);
      return this.deleteAll(pathValue);
    });
  }

  static deleteAll(pathValue: string): Promise<void> {
    notNull(pathValue, "pathValue");

    pathValue = hookPathValue(pathValue);

    const db = this.getDb();
    const ref = db.ref(pathValue);
    return ref.remove();
  }
}
