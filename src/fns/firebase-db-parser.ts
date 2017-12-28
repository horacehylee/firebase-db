import { convertDeepObject } from "./firebase-db-util";

export class FirebaseDbParser {
    static parse(input: any): any {
        return convertDeepObject(input, (obj) => (obj.type && obj.type == 'date'))((obj) => (new Date(obj.value)));
    }
}