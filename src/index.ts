/// <reference path="../typings/tsd.d.ts" />
/// <reference path="../node_modules/typescript/lib/typescript.d.ts" />
/// <reference path="../node_modules/immutable/dist/immutable.d.ts"/>

require('source-map-support').install();

import * as ts from "typescript";
import * as path from "path";
import * as _ from 'lodash';
import { readFileSync, writeFileSync } from 'fs';
import { format } from './formatter';
import { walker } from './util';

var _s = require('underscore.string');

var ejs = require('ejs');

export interface ExternalOptions {
    indexerType?: string,
    emitRecords?: boolean,
    emitMarkers?: boolean,
    emitEmptyRecords?: boolean,
    defaultEmptyType?: string,
    recordSuffix?: string,
    mapSuffix?: string,
    dictType?: string,
    fileSuffix?: string,
    verbose?: boolean
}

export interface Module {
    fileName: string;
    sourceFile: ts.SourceFile;
    ifaces: ts.InterfaceDeclaration[];
    importName: string;
    flatImports: {[key: string]: string};
    namespaceImports: {[alias: string]: string};
}

let templatesFolder = path.join(__dirname, '../templates');
let template = readFileSync(path.join(templatesFolder, 'file.ejs')).toString();

function isNamedImports(namedBindings: ts.NamespaceImport | ts.NamedImportsOrExports): namedBindings is ts.NamedImportsOrExports {
    if ((namedBindings as any).elements) {
        return true
    }
}

export class Scope {
    modules: { [key: string]: ModuleGenerator } = {};
    options: ExternalOptions;

    constructor(options: ExternalOptions) {
        let defaultOptions = {
            keyType: "string",
            indexerType: 'any',
            emitMaps: true,
            emitRecords: false,
            emitMarkers: false,
            emitEmptyRecords: false,
            emitTypedMethods: false,
            defaultEmptyType: 'null',
            mapSuffix: 'Map',
            recordSuffix: 'Record',
            dictType: 'Dictionary',
            fileSuffix: '-i',
            verbose: false
        };

        this.options = _.assign(defaultOptions, options);
    }

    addModule(fileName: string, text: string) {
        // Parse a file
        let sourceFile = ts.createSourceFile(
            fileName,
            text.toString(),
            ts.ScriptTarget.ES6,
            false
        );

        let [ifaces, imports] = walker(sourceFile);
        let importName = path.basename(fileName.replace(/.tsx?$/, ''));

        let flatImports: {[key: string]: string} = {};
        let namespaceImports: {[key: string]: string} = {};
        imports.forEach((imp) => {
            if (imp.importClause && imp.importClause.namedBindings) {
                let namedBindings = imp.importClause.namedBindings;
                if (isNamedImports(namedBindings)) {
                    namedBindings.elements.forEach(el => {
                        flatImports[el.name.text] = (imp.moduleSpecifier as any).text;
                    })
                } else {
                    namespaceImports[namedBindings.name.text] = (imp.moduleSpecifier as any).text;
                }
            }
        });

        this.modules[fileName] = new ModuleGenerator({
            fileName,
            sourceFile,
            ifaces,
            importName,
            flatImports,
            namespaceImports
        }, this);
    }

    getModule(fileName: string): ModuleGenerator {
        return this.modules[fileName];
    }

    write(fileName: string) {
        let result = this.getModule(fileName).generate();

        if (this.options.verbose) {
            console.log(`[tsimmutable]: write ${path.relative(process.cwd(), result.fileName)}`);
        }

        writeFileSync(result.fileName, result.text);
    }

    writeAll() {
        _.forEach(this.modules, (_mod, fileName) => {
            this.write(fileName);
        })
    }
}

export interface TypeInfo {
    typeName: string,
    modulePath: string
}

export interface EmitOutput {
    fileName: string;
    text: string;
}

export class ModuleGenerator implements Module {
    fileName: string;
    sourceFile: ts.SourceFile;
    ifaces: ts.InterfaceDeclaration[];
    importName: string;
    flatImports: {[key: string]: string};
    namespaceImports: {[alias: string]: string};

    scope: Scope;

    constructor(mod: Module, scope: Scope) {
        this.scope = scope;
        _.assign(this, mod);
    }

    forEach: typeof _.forEach = _.forEach;

    modulePath(typeName: string): TypeInfo {
        let match = typeName.match(/(\w+)\.(\w+)/);
        if (match) {
            let modAliasName = match[1];
            let simpleTypeName = match[2];
            let modPath = this.namespaceImports[modAliasName];
            if (modPath) {
                return { modulePath: modPath, typeName: simpleTypeName }
            } else {
                return null;
            }
        } else {
            return null
        }
    }

    importedType(typeName: string): TypeInfo {
        let typeInfo = this.modulePath(typeName);
        if (typeInfo) {
            return typeInfo;
        } else {
            let modulePath = this.flatImports[typeName];
            if (modulePath) {
                return { modulePath, typeName }
            }
        }

        return null;
    }

    resolveModule(modulePath: string): ModuleGenerator {
        let moduleAbsolutePath = path.resolve(path.dirname(this.fileName), modulePath + '.ts');
        return this.scope.getModule(moduleAbsolutePath);
    }

    externalInterface(typeName: string): TypeInfo {
        let typeInfo = this.importedType(typeName);
        if (typeInfo) {
            let mod = this.resolveModule(typeInfo.modulePath);
            if (mod) {
                let ext;
                if (mod.localInterface(typeInfo.typeName)) {
                    return typeInfo;
                } else if (ext = mod.externalInterface(typeInfo.typeName)) {
                    return ext;
                } else {
                    return null;
                }
            } else {
                return null;
            }
        } else {
            return null;
        }
    }

    type(member) {
        return this.sourceFile.text.slice(member.type.pos + 1, member.type.end)
    }

    localInterface(typeName: string): TypeInfo {
        let isLocal = _.any(this.ifaces, (iface) => iface.name.text == typeName);
        if (isLocal) {
            return {
                modulePath: null,
                typeName
            }
        }
    }

    formatModuleAlias(modulePath: string) {
        return _s.underscored(_s.slugify(modulePath))
    }

    formatTypeInfo(typeInfo: TypeInfo): string {
        if (typeInfo) {
            if (typeInfo.modulePath) {
                return this.formatModuleAlias(typeInfo.modulePath) + '.' + typeInfo.typeName;
            } else {
                return typeInfo.typeName;
            }
        } else {
            return null;
        }
    }

    isArrayType(typeName: string) {
        return typeName.indexOf('[]') !== -1;
    }

    isDictionaryType(typeName: string) {
        return typeName.indexOf(this.scope.options.dictType) !== -1;
    }

    sanitizeTypeName(typeName: string) {
        let arrayRegex = /\[\]$/;
        if (typeName.indexOf('<') !== -1) {
            return typeName.match(/<(.*?)>/)[1].replace(arrayRegex, '');
        } else {
            return typeName.replace(arrayRegex, '')
        }
    }

    typeMap(member, isRecord = false) {
        let typeName = this.type(member);
        let sanitizedTypeName = this.sanitizeTypeName(typeName);
        let isArrayType = this.isArrayType(typeName);
        let isDictionaryType = this.isDictionaryType(typeName);

        let localInterface = this.localInterface(sanitizedTypeName);
        let externalInterface = this.externalInterface(sanitizedTypeName);
        let importedType = this.importedType(sanitizedTypeName);

        let formattedType = this.formatTypeInfo(localInterface || externalInterface || importedType) || sanitizedTypeName;

        if (localInterface || externalInterface) {
            let suffix = (isRecord && (localInterface || externalInterface))
                ? this.scope.options.recordSuffix
                : this.scope.options.mapSuffix;
            if (isArrayType) {
                return `Immutable.List<${sanitizedTypeName}${suffix}>`
            } else if (isDictionaryType) {
                return `Immutable.Map<string, ${sanitizedTypeName}${suffix}>`
            } else {
                return `${formattedType}${suffix}`
            }
        } else {
            if (isArrayType) {
                return `Immutable.List<${formattedType}>`
            } else {
                return `${formattedType}`
            }
        }
    }

    ownDeps(ifaceName: string, acc = {}) {
        let iface = _.find(this.ifaces, (iface) => iface.name.text == ifaceName);
        iface.members.forEach((member) => {
            let memberTypeName = this.type(member);
            let sanitizedTypeName = this.sanitizeTypeName(memberTypeName);
            if (this.localInterface(sanitizedTypeName)
                || this.externalInterface(sanitizedTypeName)) {
                acc[(member.name as any).text] = memberTypeName
            }
        });

        return acc
    }

    initializer(member) {
        let typeName = this.type(member);
        let sanitizedTypeName = this.sanitizeTypeName(typeName);
        let isArrayType = this.isArrayType(typeName);
        let isDictionaryType = this.isDictionaryType(typeName);
        let localInterface = this.localInterface(sanitizedTypeName);
        let externalInterface = this.externalInterface(sanitizedTypeName);

        let suffix = (localInterface || externalInterface)
            ? this.scope.options.recordSuffix
            : this.scope.options.mapSuffix;

        if (localInterface) {
            if (isArrayType) {
                return `Immutable.List<${sanitizedTypeName}${suffix}>()`;
            } else if (isDictionaryType) {
                return `Immutable.Map<string,${sanitizedTypeName}${suffix}>()`;
            } else if (!member.questionToken) {
                return `new ${typeName}${suffix}()`;
            } else {
                return this.scope.options.defaultEmptyType;
            }
        } else {
            return this.scope.options.defaultEmptyType;
        }
    }

    exportDeps(): [string[], { [ alias: string ]: string }]  {
        let deps = {};
        let modules: { [ alias: string ]: string } = {};

        this.ifaces.forEach(iface => {
            deps[iface.name.text] = true;
            iface.members.forEach((member) => {
                let memberTypeName = this.type(member);
                let sanitizedTypeName = this.sanitizeTypeName(memberTypeName);
                let localInterface = this.localInterface(sanitizedTypeName);
                let externalInterface = this.externalInterface(sanitizedTypeName);
                let importedType = this.importedType(sanitizedTypeName);
                if (localInterface || !importedType) {
                    let internalTypes = this.extractTypes(memberTypeName);
                    internalTypes.forEach(type => {
                        deps[type] = true
                    })
                } else if (importedType || externalInterface) {
                    modules[this.formatModuleAlias((importedType || externalInterface).modulePath)] =
                        externalInterface
                            ? externalInterface.modulePath + this.scope.options.fileSuffix
                            : importedType.modulePath;
                }
            });
        });

        return [
            Object.keys(deps),
            modules
        ]
    }

    extractTypes(typeName: string): string[] {
        let types = typeName
            // Extract all type names from the type
            .match(/(?:[^a-z]|^)([A-Z]\w+)/g)

        if (types) {
            return types.map((type) => type.match(/[A-Z]\w+/)).map(s => s.toString())
        } else {
            return [];
        }
    }

    getImmutableFileName(): string {
        return this.fileName.replace(/\.ts$/, `${this.scope.options.fileSuffix}.ts`);
    }

    generate(): EmitOutput {
        let { ifaces, flatImports, importName, sourceFile, fileName } = this;

        let options = {
            ifaces: ifaces,
            importName: importName,
            flatImports: flatImports,
            exportDeps: this.exportDeps(),
        };

        _.assign(options, this.scope.options);

        let result = ejs.render(
            template,
            options,
            {
                filename: path.join(templatesFolder, 'file.ejs'),
                context: this
            }
        );

        let text = format(result);
        return {
            text,
            fileName: this.getImmutableFileName()
        }
    }
}
