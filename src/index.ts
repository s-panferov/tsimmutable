/// <reference path="../typings/tsd.d.ts" />
/// <reference path="../node_modules/typescript/lib/typescript.d.ts" />
/// <reference path="../node_modules/immutable/dist/immutable.d.ts"/>

import * as ts from "typescript";
import * as path from "path";
import * as _ from 'lodash';
import { readFileSync } from 'fs';
import { format } from './formatter';

var ejs = require('ejs');

export function walker(sourceFile: ts.SourceFile) {
    let interfaces = [];
    let imports = [];
    let walk = (node: ts.Node) => {
        switch (node.kind) {
            case ts.SyntaxKind.InterfaceDeclaration:
                interfaces.push(node);
                break;
            case ts.SyntaxKind.ImportDeclaration:
                imports.push(node);
                break;
        }

        ts.forEachChild(node, walk);
    }

    walk(sourceFile);
    return [interfaces, imports];
}

export interface ExternalOptions {
    indexerType?: string,
    emitRecords?: boolean,
    emitMarkers?: boolean,
    emitEmptyRecords?: boolean,
    defaultEmptyType?: string
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
        emitRecords: false,
        emitMarkers: false,
        emitEmptyRecords: false,
        emitTypedMethods: false,
        defaultEmptyType: 'null',
        exportDeps: []
    };

    _.assign(options, extOptions);

    let functions = {
        type: (member) => {
            return sourceFile.text.slice(member.type.pos + 1, member.type.end)
        },
        isLocalType(typeName: string) {
            return  _.any(ifaces, (iface) => iface.name.text == typeName);
        },
        isArrayType(typeName: string) {
            return typeName.indexOf('[]') !== -1;
        },
        sanitizeTypeName(typeName: string) {
            return typeName.replace(/\[\]$/, '')
        },
        hasMapPairType(typeName: string): boolean {
            return flatImports[typeName + 'Map'];
        },
        hasRecordPairType(typeName: string): boolean {
            return flatImports[typeName + 'Record'];
        },
        getImportedImmutableTypes() {
            return Object.keys(flatImports).filter(item => /^[A-Z].*Map$/.test(item)).map(item => item.replace(/Map$/, ''))
        },
        typeMap: (member) => {
            let typeName = functions.type(member);
            let sanitizedTypeName = functions.sanitizeTypeName(typeName);
            let isArrayType = functions.isArrayType(typeName);
            let isLocalType = functions.isLocalType(sanitizedTypeName);

            if (isLocalType || functions.hasMapPairType(sanitizedTypeName)) {
                if (isArrayType) {
                    return `Immutable.List<${sanitizedTypeName}Map>`
                } else {
                    return `${typeName}Map`
                }
            } else {
                return typeName
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
                let memberTypeName = functions.type(member);
                let sanitizedTypeName = functions.sanitizeTypeName(memberTypeName);
                if (functions.isLocalType(sanitizedTypeName) || functions.hasMapPairType(sanitizedTypeName)) {
                    acc[member.name.text] = memberTypeName
                }
            });

            return acc
        },
        initializer: (member) => {
            let typeName = functions.type(member);
            let sanitizedTypeName = functions.sanitizeTypeName(typeName);
            let isArrayType = functions.isArrayType(typeName);
            let isLocalType = functions.isLocalType(sanitizedTypeName);

            if (isLocalType) {
                if (isArrayType) {
                    return `Immutable.List<${sanitizedTypeName}Map>()`;
                } else if (!member.questionToken) {
                    return `new ${typeName}Record()`;
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
                    let memberTypeName = functions.type(member);
                    let sanitizedTypeName = functions.sanitizeTypeName(memberTypeName);
                    if (!functions.isLocalType(sanitizedTypeName)) {
                        let internalTypes = functions.extractTypes(memberTypeName);
                        internalTypes.forEach(type => {
                            deps[type] = true
                            if (functions.hasMapPairType(type)) {
                                deps['parse' + type + 'Record'] = true
                                deps[type + 'Map'] = true
                            }
                        })
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
