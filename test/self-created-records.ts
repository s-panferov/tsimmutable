/// <reference path="../typings/tsd.d.ts" />
/// <reference path="../node_modules/typescript/lib/typescript.d.ts" />
/// <reference path="../node_modules/immutable/dist/immutable.d.ts"/>

import * as models from './models-imm';
import * as Immutable from 'immutable';

export class AvatarRecord extends models.AvatarRecordCtor({
    src: null,
}) {

}

export class ProfileRecord extends models.ProfileRecordCtor({
    firstName: null,
    lastName: null,
    avatar: null
}) {

}

export class UserRecord extends models.UserRecordCtor({
    profile: new ProfileRecord(),
    login: null,
    friends: Immutable.List<models.UserMap>()
}) {

}

let allRecords = {
    UserRecord,
    ProfileRecord,
    AvatarRecord
}

let user = models.parseUserRecord({
    profile: {
        firstName: 'Anakin',
        lastName: 'Skywalker'
    },
    login: 'anakin1990',
    friends: [{
        profile: {
            firstName: 'Dart',
            lastName: 'Vader'
        },
        login: 'vader1990'
    }]
}, allRecords)

console.log(`${user.profile.firstName} ${user.profile.lastName}`)
console.log(`${user} ${user.profile.lastName}`)
