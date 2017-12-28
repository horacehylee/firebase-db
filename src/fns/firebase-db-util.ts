if (!Object.entries) {
    Object.entries = function (obj) {
        var ownProps = Object.keys(obj),
            i = ownProps.length,
            resArray = new Array(i); // preallocate the Array
        while (i--)
            resArray[i] = [ownProps[i], obj[ownProps[i]]];

        return resArray;
    };
}

export const convertDeepObjectOfType = <T>(obj, constructor: { new(): T }) => (callback: (objValue: T) => any) => {
    if (obj == null) {
        return obj;
    }
    const objClone = { ...obj };
    for (const [key, value] of Object.entries(objClone)) {
        if (value instanceof constructor) {
            objClone[key] = callback(value);
        } else if (value instanceof Object && !(value instanceof Array)) {
            objClone[key] = convertDeepObjectOfType<T>(value, constructor)(callback);
        }
    }
    return objClone;
};

export const convertDeepObject = (obj, predicate: (obj) => boolean) => (callback: (obj) => any) => {
    if (obj == null) {
        return obj;
    }
    const objClone = { ...obj };
    for (const [key, value] of Object.entries(objClone)) {
        if (value instanceof Object && !(value instanceof Array)) {
            if (predicate(value)) {
                objClone[key] = callback(value);
            } else {
                objClone[key] = convertDeepObject(value, predicate)(callback);
            }
        }
    }
    return objClone;
};

export const notNull = (obj: any, name: string) => {
    if (!obj) {
        throw new ReferenceError(`${name} must not be null`);
    }
}