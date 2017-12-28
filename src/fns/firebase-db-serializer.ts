import { convertDeepObjectOfType } from "./firebase-db-util";

export class FirebaseDbSerializer {
    static serialize(input: any): any {
        return convertDeepObjectOfType<Date>(input, Date)((date) => ({
            value: date.getTime(),
            type: 'date',
        }))
    }
}