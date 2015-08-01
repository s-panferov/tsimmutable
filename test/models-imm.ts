import * as Immutable from 'immutable';

import {
Profile,
User,
} from './models';

export {
Profile,
User,
};

export interface RecordClass<T extends Immutable.Map<string, void>> {
    new (): T;
    new (values: T): T;
}

export interface RecordCtor<R, T extends Immutable.Map<string, any>> {
    (defaultValues: T | R, name?: string): RecordClass<T>
}

function fromJSDefault(json) {
    if (Array.isArray(json)) {
        return (Immutable.Seq as any).Indexed(json).map(fromJSDefault).toList();
    }
    if (isPlainObj(json)) {
        return (Immutable.Seq as any).Keyed(json).map(fromJSDefault).toMap();
    }
    return json;
}

function isPlainObj(value) {
    return value && (value.constructor === Object || value.constructor === undefined);
}

/**
* Map interface for Profile with specialized getters and setters.
*/
export interface ProfileMap extends Immutable.Map<string, void> {
    ProfileMap: ProfileMap

    firstName: string
    get(key: 'firstName', defaultValue?: string): string
    set(key: 'firstName', value: string): ProfileMap

    lastName: string
    get(key: 'lastName', defaultValue?: string): string
    set(key: 'lastName', value: string): ProfileMap

    get(key: string, defaultValue?: any): void;
    set(key: string, value: typeof undefined): ProfileMap;
}

/**
 * Default fields that must be provided in ProfileRecord.
 */
export interface ProfileRecordDefaults {
    firstName: string
    lastName: string
}

/**
 * Typed ProfileRecord constructor.
 */
export let ProfileRecordCtor: RecordCtor<ProfileRecordDefaults, ProfileMap> = Immutable.Record as any;

/**
 * ProfileRecord dependencies
 */
export interface ProfileRecordDeps {
    ProfileRecord: RecordClass<ProfileMap>
}

/**
 * Special method to parse ProfileRecord with all the dependencies.
 */
export function parseProfileRecord(value: Profile, deps: ProfileRecordDeps): ProfileMap {
    var recordWalker = function(value, key) {
        switch (true) {

            default: return fromJSDefault(value);
        }
    };

    var result: any = {};
    for (var k in value) {
        if (value.hasOwnProperty) {
            result[k] = recordWalker(value[k], k);
        }
    }

    return new deps.ProfileRecord(result);
}

export class ProfileRecord extends ProfileRecordCtor({
    firstName: null,
    lastName: null,
}) { }

/**
* Map interface for User with specialized getters and setters.
*/
export interface UserMap extends Immutable.Map<string, void> {
    UserMap: UserMap

    profile: ProfileMap
    get(key: 'profile', defaultValue?: ProfileMap): ProfileMap
    set(key: 'profile', value: ProfileMap): UserMap

    login: string
    get(key: 'login', defaultValue?: string): string
    set(key: 'login', value: string): UserMap

    friends?: Immutable.List<UserMap>
    get(key: 'friends', defaultValue?: Immutable.List<UserMap>): Immutable.List<UserMap>
    set(key: 'friends', value: Immutable.List<UserMap>): UserMap

    get(key: string, defaultValue?: any): void;
    set(key: string, value: typeof undefined): UserMap;
}

/**
 * Default fields that must be provided in UserRecord.
 */
export interface UserRecordDefaults {
    profile: ProfileMap
    login: string
    friends: Immutable.List<UserMap>
}

/**
 * Typed UserRecord constructor.
 */
export let UserRecordCtor: RecordCtor<UserRecordDefaults, UserMap> = Immutable.Record as any;

/**
 * UserRecord dependencies
 */
export interface UserRecordDeps {
    ProfileRecord: RecordClass<ProfileMap>
    UserRecord: RecordClass<UserMap>
}

/**
 * Special method to parse UserRecord with all the dependencies.
 */
export function parseUserRecord(value: User, deps: UserRecordDeps): UserMap {
    var recordWalker = function(value, key) {
        switch (true) {

            case key == 'profile':
                return parseProfileRecord(value, deps);

            case key == 'friends':
                return Immutable.List(value.map((item) => {
                    return parseUserRecord(item, deps);
                }));

            default: return fromJSDefault(value);
        }
    };

    var result: any = {};
    for (var k in value) {
        if (value.hasOwnProperty) {
            result[k] = recordWalker(value[k], k);
        }
    }

    return new deps.UserRecord(result);
}

export class UserRecord extends UserRecordCtor({
    profile: new ProfileRecord(),
    login: null,
    friends: Immutable.List<UserMap>(),
}) { }

export let allRecords = {
    ProfileRecord,
    UserRecord,
}
