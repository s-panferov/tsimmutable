import { Scope, ExternalOptions } from './index';
import { readFileSync, writeFileSync } from 'fs';
import * as path from 'path';

export interface PluginOptions extends ExternalOptions {
    files: string[]
}

export default class TsImmutablePlugin {
    files: string[]
    options: any;
    scope: Scope;

    constructor(options: PluginOptions) {
        if (typeof options == 'undefined') {
            options = {} as any;
        }
        this.options = options;
        this.files = options.files ? [].concat(options.files) : [];
        this.files = this.files.map(fileName => path.resolve(fileName));

        this.scope = new Scope(options);

        this.prepareAll();
    }

    prepareAll() {
        this.files.forEach((fileName) => {
            this.scope.addModule(fileName, readFileSync(fileName).toString());
        })
    }

    apply(compiler): void {
        compiler.plugin('run', (compiler, callback) => {
            this.scope.writeAll();
            callback();
        });

        compiler.plugin('watch-run', (watching, callback) => {
            let mtimes = watching.compiler.watchFileSystem.watcher.mtimes;
            if (!Object.keys(mtimes).length) {
                this.scope.writeAll()
            } else {
                this.files.forEach((fileName) => {
                    if (mtimes.hasOwnProperty(fileName)) {
                        this.scope.write(fileName);
                    }
                });
            }
            callback();
        });
    }
}

module.exports = TsImmutablePlugin;
