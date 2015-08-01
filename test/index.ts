import * as models from './models-imm';

export class UserNameRecord extends models.UserNameRecordCtor({
    firstName: null,
    lastName: null
}) {

}

export class UserRecord extends models.UserRecordCtor({
    name: new UserNameRecord(),
    password: null
}) {

}

let allRecords = {
    UserRecord,
    UserNameRecord
}

let user = models.parseUserRecord({
    name: {
        firstName: 'Anakin',
        lastName: 'Skywalker'
    },
    password: 'qwerty'
}, allRecords)

console.log(`${user.name.firstName} ${user.name.lastName}`)
