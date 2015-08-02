var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var Immutable = require('immutable');
function fromJSDefault(json) {
    if (Array.isArray(json)) {
        return Immutable.Seq.Indexed(json).map(fromJSDefault).toList();
    }
    if (isPlainObj(json)) {
        return Immutable.Seq.Keyed(json).map(fromJSDefault).toMap();
    }
    return json;
}
function isPlainObj(value) {
    return value && (value.constructor === Object || value.constructor === undefined);
}
exports.AvatarRecordCtor = Immutable.Record;
function parseAvatarRecord(value, deps) {
    var recordWalker = function (value, key) {
        switch (true) {
            default: return fromJSDefault(value);
        }
    };
    var result = {};
    for (var k in value) {
        if (value.hasOwnProperty) {
            result[k] = recordWalker(value[k], k);
        }
    }
    return new deps.AvatarRecord(result);
}
exports.parseAvatarRecord = parseAvatarRecord;
var AvatarRecord = (function (_super) {
    __extends(AvatarRecord, _super);
    function AvatarRecord() {
        _super.apply(this, arguments);
    }
    return AvatarRecord;
})(exports.AvatarRecordCtor({
    src: null,
}));
exports.AvatarRecord = AvatarRecord;
exports.ProfileRecordCtor = Immutable.Record;
function parseProfileRecord(value, deps) {
    var recordWalker = function (value, key) {
        switch (true) {
            case key == 'avatar':
                return parseAvatarRecord(value, deps);
            default: return fromJSDefault(value);
        }
    };
    var result = {};
    for (var k in value) {
        if (value.hasOwnProperty) {
            result[k] = recordWalker(value[k], k);
        }
    }
    return new deps.ProfileRecord(result);
}
exports.parseProfileRecord = parseProfileRecord;
var ProfileRecord = (function (_super) {
    __extends(ProfileRecord, _super);
    function ProfileRecord() {
        _super.apply(this, arguments);
    }
    return ProfileRecord;
})(exports.ProfileRecordCtor({
    firstName: null,
    lastName: null,
    avatar: null,
}));
exports.ProfileRecord = ProfileRecord;
exports.UserRecordCtor = Immutable.Record;
function parseUserRecord(value, deps) {
    var recordWalker = function (value, key) {
        switch (true) {
            case key == 'profile':
                return parseProfileRecord(value, deps);
            case key == 'friends':
                return Immutable.List(value.map(function (item) {
                    return parseUserRecord(item, deps);
                }));
            default: return fromJSDefault(value);
        }
    };
    var result = {};
    for (var k in value) {
        if (value.hasOwnProperty) {
            result[k] = recordWalker(value[k], k);
        }
    }
    return new deps.UserRecord(result);
}
exports.parseUserRecord = parseUserRecord;
var UserRecord = (function (_super) {
    __extends(UserRecord, _super);
    function UserRecord() {
        _super.apply(this, arguments);
    }
    return UserRecord;
})(exports.UserRecordCtor({
    profile: new ProfileRecord(),
    login: null,
    friends: Immutable.List(),
}));
exports.UserRecord = UserRecord;
exports.allRecords = {
    AvatarRecord: AvatarRecord,
    ProfileRecord: ProfileRecord,
    UserRecord: UserRecord,
};
