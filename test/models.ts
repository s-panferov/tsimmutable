export interface Profile {
    firstName: string;
    lastName: string;
}

export interface User {
    profile: Profile;
    login: string;
    friends?: User[];
}
