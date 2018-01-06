import { convertDeepObjectOfType, removeEmptyProp } from "./firebase-db-util";

export class FirebaseDbSerializer {
  static serialize(input: any): any {
    const removedEmpty = removeEmptyProp(input);
    return convertDeepObjectOfType<Date>(removedEmpty, Date)(date => ({
      value: date.getTime(),
      type: "date"
    }));
  }
}
