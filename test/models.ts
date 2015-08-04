export enum UserType {
    Payed = 'payed' as any,
    Guest = 'payed' as any
}

export interface Avatar {
    src: string;
}

export interface Profile {
    firstName: string;
    lastName: string;
    avatar?: Avatar;
}

export interface User {
    profile: Profile;
    login: string;
    friends?: User[];
    type: UserType
}
