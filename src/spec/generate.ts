/// <reference path="../../typings/tsd.d.ts" />

import { Scope, ModuleGenerator } from '../index';
import { readFileSync } from 'fs';
import { expect } from 'chai';
import * as _ from 'lodash';
import * as path from 'path';

const MODELS_FOLDER = path.join(process.cwd(), 'src', 'spec', 'models');

const Modules = {
    User: path.join(MODELS_FOLDER, 'user.ts'),
    Profile: path.join(MODELS_FOLDER, 'profile.ts'),
    Acl: path.join(MODELS_FOLDER, 'acl.ts')
}

let scope = new Scope({
    verbose: true,
    emitRecords: true,
    emitMarkers: true,
    emitEmptyRecords: true
});

_.forEach(Modules, (modPath: string, modName: string) => {
    scope.addModule(modPath, readFileSync(modPath).toString())
});

scope.writeAll();
