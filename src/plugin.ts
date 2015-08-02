import { generate } from './index';
import { readFileSync, writeFileSync } from 'fs';
import * as path from 'path';

export default class TsImmutablePlugin {
    files: string[]
    options: any;

    constructor(options) {
      var opt = options || {};
      this.options = opt;
      this.files = opt.files ? [].concat(opt.files) : [];
      this.files = this.files.map(fileName => path.resolve(fileName));
    }

    generate(fileName: string) {
        let result = generate(fileName, readFileSync(fileName).toString(), this.options);
        let resultFileName = fileName.replace(/\.ts$/, `${this.options.suffix || '-i'}.ts`);

        if (this.options.verbose) {
            console.log(`[tsimmutable]: write ${path.relative(process.cwd(), resultFileName)}`);
        }
        writeFileSync(resultFileName, result);
    }

    generateAll() {
        this.files.forEach((fileName) => {
            this.generate(fileName);
        })
    }

    apply(compiler): void {
        compiler.plugin('run', (compiler, callback) => {
            this.generateAll();
            callback();
        });

        compiler.plugin('watch-run', (watching, callback) => {
            let mtimes = watching.compiler.watchFileSystem.watcher.mtimes;
            if (!Object.keys(mtimes).length) {
                this.generateAll()
            } else {
                this.files.forEach((fileName) => {
                    if (mtimes.hasOwnProperty(fileName)) {
                        this.generate(fileName);
                    }
                });
            }
            callback();
        });
    }
}

module.exports = TsImmutablePlugin
