import { Theme } from './enums';

import * as events from 'events';

export interface Avatar {
    src: string;
}

export interface Profile {
    firstName: string;
    lastName: string;
    avatar?: Avatar;
    theme?: Theme;
    events: events.EventEmitter;
}
