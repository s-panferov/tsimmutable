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
}
