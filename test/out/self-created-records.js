/// <reference path="../typings/tsd.d.ts" />
/// <reference path="../node_modules/typescript/lib/typescript.d.ts" />
/// <reference path="../node_modules/immutable/dist/immutable.d.ts"/>
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var models = require('./models-imm');
var Immutable = require('immutable');
var AvatarRecord = (function (_super) {
    __extends(AvatarRecord, _super);
    function AvatarRecord() {
        _super.apply(this, arguments);
    }
    return AvatarRecord;
})(models.AvatarRecordCtor({
    src: null,
}));
exports.AvatarRecord = AvatarRecord;
var ProfileRecord = (function (_super) {
    __extends(ProfileRecord, _super);
    function ProfileRecord() {
        _super.apply(this, arguments);
    }
    return ProfileRecord;
})(models.ProfileRecordCtor({
    firstName: null,
    lastName: null,
    avatar: null
}));
exports.ProfileRecord = ProfileRecord;
var UserRecord = (function (_super) {
    __extends(UserRecord, _super);
    function UserRecord() {
        _super.apply(this, arguments);
    }
    return UserRecord;
})(models.UserRecordCtor({
    profile: new ProfileRecord(),
    login: null,
    friends: Immutable.List()
}));
exports.UserRecord = UserRecord;
var allRecords = {
    UserRecord: UserRecord,
    ProfileRecord: ProfileRecord,
    AvatarRecord: AvatarRecord
};
var user = models.parseUserRecord({
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
}, allRecords);
console.log(user.profile.firstName + " " + user.profile.lastName);
console.log(user + " " + user.profile.lastName);
