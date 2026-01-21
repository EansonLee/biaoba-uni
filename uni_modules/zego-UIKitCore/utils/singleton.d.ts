export declare enum SingletonScope {
    Session = 0,
    Global = 1
}
export declare function getSingletonInstance<T>(constructor: new () => T, scope?: SingletonScope): T;
export declare function deleteSingletonInstance(constructor: new () => any, scope?: SingletonScope): void;
