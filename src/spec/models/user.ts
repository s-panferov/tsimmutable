import { Profile } from './profile';
import * as acl from './acl';

export enum UserType {
    Payed = 'payed' as any,
    Guest = 'payed' as any
}

export interface User {
    profile: Profile;
    login: string;
    friends?: User[];
    type: UserType;
    acl: acl.Acl
}
