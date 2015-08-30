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

describe('Scope', () => {
    let scope: Scope;

    beforeEach(() => {
        scope = new Scope({});

        _.forEach(Modules, (modPath: string, modName: string) => {
            scope.addModule(modPath, readFileSync(modPath).toString())
            let mod = scope.getModule(modPath);

            expect(mod).to.exist;
            expect(mod.fileName).to.equal(mod.fileName);
            expect(mod.sourceFile).to.exist;
        });
    })

    it('should contain modules', () => {
        expect(Object.keys(scope.modules)).to.be.lengthOf(3);
    });

    describe(Modules.User, () => {
        let mod: ModuleGenerator;

        beforeEach(() => {
            mod = scope.getModule(Modules.User);
        });

        it('should parse', () => {
            expect(mod.ifaces).to.be.lengthOf(1);
            expect(mod.flatImports).to.be.deep.equal({
                Profile: './profile'
            });

            expect(mod.namespaceImports).to.be.deep.equal({
                acl: './acl'
            });
        });

        it('should classify local interfaces', () => {
            expect(mod.localInterface('User')).to.deep.equal({ modulePath: null, typeName: 'User' });
            expect(mod.localInterface('Profile')).to.be.not.ok;
        });

        it('should classify Profile imported type', () => {
            let modInfo = mod.importedType('Profile');
            expect(modInfo).to.be.ok;
            expect(modInfo.typeName).to.equal('Profile');
            expect(modInfo.modulePath).to.equal('./profile');
        });

        it('should classify Acl imported type', () => {
            let modInfo = mod.importedType('acl.Acl');
            expect(modInfo).to.be.ok;
            expect(modInfo.typeName).to.equal('Acl');
            expect(modInfo.modulePath).to.equal('./acl');
        });

        it('should classify Profile as external interface', () => {
            let modInfo = mod.externalInterface('Profile');
            expect(modInfo).to.be.ok;
            expect(modInfo.typeName).to.equal('Profile');
            expect(modInfo.modulePath).to.equal('./profile');
        });

        it('should classify Acl as external interface', () => {
            let modInfo = mod.externalInterface('acl.Acl');
            expect(modInfo).to.be.ok;
            expect(modInfo.typeName).to.equal('Acl');
            expect(modInfo.modulePath).to.equal('./acl');
        });
    });

    describe(Modules.Profile, () => {
        let mod: ModuleGenerator;

        beforeEach(() => {
            mod = scope.getModule(Modules.Profile);
        });

        it('should parse', () => {
            let mod = scope.getModule(Modules.Profile);
            expect(mod.ifaces).to.be.lengthOf(2);
            expect(mod.flatImports).to.be.deep.equal({ Theme: './enums' });
        });
    });
})
