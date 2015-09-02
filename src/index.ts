/// <reference path="../typings/tsd.d.ts" />
/// <reference path="../node_modules/typescript/lib/typescript.d.ts" />
/// <reference path="../node_modules/immutable/dist/immutable.d.ts"/>

import * as ts from "typescript";
import * as path from "path";
import * as _ from 'lodash';
import { readFileSync } from 'fs';
import { format } from './formatter';
import { walker } from './util';

var ejs = require('ejs');

export interface ExternalOptions {
    indexerType?: string,
    emitRecords?: boolean,
    emitMarkers?: boolean,
    emitEmptyRecords?: boolean,
    defaultEmptyType?: string,
    recordSuffix?: string,
    mapSuffix?: string,
    dictType?: string
}

export function generate(fileName: string, text: string, extOptions: ExternalOptions) {
    // Parse a file
    let sourceFile = ts.createSourceFile(
        fileName,
        text.toString(),
        ts.ScriptTarget.ES6,
        false
    );

    let templatesFolder = path.join(__dirname, '../templates');
    let [ifaces, imports] = walker(sourceFile);
    let template = readFileSync(path.join(templatesFolder, 'file.ejs')).toString();
    let importName = path.basename(fileName.replace(/.tsx?$/, ''));

    let flatImports = {};
    imports.forEach((imp) => {
        if (imp.importClause && imp.importClause.namedBindings) {
            imp.importClause.namedBindings.elements.forEach(el => {
                flatImports[el.name.text] = true;
            })
        }
    })

    let options = {
        ifaces: ifaces,
        importName: importName,
        flatImports,
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
        exportDeps: []
    };

    _.assign(options, extOptions);

    let functions = {
        type(member) {
            if (member.type) {
                return sourceFile.text.slice(member.type.pos + 1, member.type.end)
            } else {
            }
        },

        isLocalType(typeName: string) {
            return  _.any(ifaces, (iface) => iface.name.text == typeName);
        },

        isArrayType(typeName: string) {
            return typeName.indexOf('[]') !== -1;
        },

        isDictionaryType(typeName: string) {
            return typeName.indexOf(options.dictType) !== -1;
        },

        sanitizeTypeName(typeName: string) {
            let arrayRegex = /\[\]$/;
            if (typeName.indexOf('<') !== -1) {
                return typeName.match(/<(.*?)>/)[1].replace(arrayRegex, '');
            } else {
                return typeName.replace(arrayRegex, '')
            }
        },

        hasMapPairType(typeName: string): boolean {
            return flatImports[typeName + options.mapSuffix];
        },

        hasRecordPairType(typeName: string): boolean {
            return flatImports[typeName + options.recordSuffix];
        },

        getImportedImmutableTypes() {
            return Object.keys(flatImports).filter(item => /^[A-Z].*Map$/.test(item)).map(item => item.replace(/Map$/, ''))
        },

        typeMap: (member, isRecord = false) => {
            let typeName = functions.type(member);
            let sanitizedTypeName = functions.sanitizeTypeName(typeName);
            let isArrayType = functions.isArrayType(typeName);
            let isDictionaryType = functions.isDictionaryType(typeName);
            let isLocalType = functions.isLocalType(sanitizedTypeName);

            let hasMapPairType = functions.hasMapPairType(sanitizedTypeName);
            let hasRecordPairType = functions.hasRecordPairType(sanitizedTypeName);

            if (isLocalType || hasMapPairType || hasRecordPairType) {
                let suffix = (isRecord && (isLocalType || hasRecordPairType))
                    ? options.recordSuffix
                    : options.mapSuffix;
                if (isArrayType) {
                    return `Immutable.List<${sanitizedTypeName}${suffix}>`
                } else if (isDictionaryType) {
                    return `Immutable.Map<string, ${sanitizedTypeName}${suffix}>`
                } else {
                    return `${typeName}${suffix}`
                }
            } else {
                if (isArrayType) {
                    return `Immutable.List<${sanitizedTypeName}>`
                } else {
                    return `${typeName}`
                }
            }
        },

        deps: (ifaceName: string, acc = {}) => {
            let iface = _.find(ifaces, (iface) => iface.name.text == ifaceName);
            iface.members.forEach((member) => {
                let memberTypeName = functions.type(member);
                let sanitizedTypeName = functions.sanitizeTypeName(memberTypeName);
                let isVisited = acc[sanitizedTypeName];
                if (!isVisited) {
                    if (functions.isLocalType(sanitizedTypeName)) {
                        acc[sanitizedTypeName] = true
                        functions.deps(sanitizedTypeName, acc);
                    }
                }
            });

            acc[ifaceName] = true;
            return Object.keys(acc);
        },

        ownDeps: (ifaceName: string, acc = {}) => {
            let iface = _.find(ifaces, (iface) => iface.name.text == ifaceName);
            iface.members.forEach((member) => {
                if (member.type) {
                    let memberTypeName = functions.type(member);
                    let sanitizedTypeName = functions.sanitizeTypeName(memberTypeName);
                    if (functions.isLocalType(sanitizedTypeName)
                        || functions.hasMapPairType(sanitizedTypeName)
                        || functions.hasRecordPairType(sanitizedTypeName)) {
                        acc[member.name.text] = memberTypeName
                    }
                }
            });

            return acc
        },

        initializer: (member) => {
            let typeName = functions.type(member);
            let sanitizedTypeName = functions.sanitizeTypeName(typeName);
            let isArrayType = functions.isArrayType(typeName);
            let isDictionaryType = functions.isDictionaryType(typeName);
            let isLocalType = functions.isLocalType(sanitizedTypeName);

            let hasRecordPairType = functions.hasRecordPairType(sanitizedTypeName);
            let suffix = (isLocalType || hasRecordPairType)
                ? options.recordSuffix
                : options.mapSuffix;

            if (isLocalType) {
                if (isArrayType) {
                    return `Immutable.List<${sanitizedTypeName}${suffix}>()`;
                } else if (isDictionaryType) {
                    return `Immutable.Map<string,${sanitizedTypeName}${suffix}>()`;
                } else if (!member.questionToken) {
                    return `new ${typeName}${suffix}()`;
                } else {
                    return options.defaultEmptyType;
                }
            } else {
                return options.defaultEmptyType;
            }
        },

        exportDeps: (): string[] => {
            let deps = {};

            ifaces.forEach(iface => {
                deps[iface.name.text] = true;
                iface.members.forEach((member) => {
                    if (member.type) {
                        let memberTypeName = functions.type(member);
                        let sanitizedTypeName = functions.sanitizeTypeName(memberTypeName);
                        if (!functions.isLocalType(sanitizedTypeName)) {
                            let internalTypes = functions.extractTypes(memberTypeName);
                            internalTypes.forEach(type => {
                                deps[type] = true
                                if (functions.hasMapPairType(type)) {
                                    deps[type + options.mapSuffix] = true
                                }
                                if (functions.hasRecordPairType(type)) {
                                    deps[type + options.recordSuffix] = true
                                }
                            })
                        }
                    }
                });
            });

            return Object.keys(deps);
        },

        extractTypes: (typeName: string): string[] => {
            let types = typeName
                // Extract all type names from the type
                .match(/(?:[^a-z]|^)([A-Z]\w+)/g)

            if (types) {
                return types.map((type) => type.match(/[A-Z]\w+/)).map(s => s.toString())
            } else {
                return [];
            }
        },

        forEach: _.forEach
    }

    options.exportDeps = functions.exportDeps();

    let result = ejs.render(
        template,
        options,
        {
            filename: path.join(templatesFolder, 'file.ejs'),
            context: functions
        }
    );

    return format(result);
}
