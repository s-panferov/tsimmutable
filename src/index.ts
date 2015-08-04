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
    let walk = (node: ts.Node) => {
        switch (node.kind) {
            case ts.SyntaxKind.InterfaceDeclaration:
                interfaces.push(node);
        }

        ts.forEachChild(node, walk);
    }

    walk(sourceFile);
    return interfaces;
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
    let ifaces = walker(sourceFile);
    let template = readFileSync(path.join(templatesFolder, 'file.ejs')).toString();
    let importName = path.basename(fileName.replace(/.tsx?$/, ''));

    let options = {
        ifaces: ifaces,
        importName: importName,
        indexerType: 'any',
        emitRecords: false,
        emitMarkers: false,
        emitEmptyRecords: false,
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
        typeMap: (member) => {
            let typeName = functions.type(member);
            let sanitizedTypeName = functions.sanitizeTypeName(typeName);
            let isArrayType = functions.isArrayType(typeName);
            let isLocalType = functions.isLocalType(sanitizedTypeName);

            if (isLocalType) {
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
                if (functions.isLocalType(sanitizedTypeName)) {
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
                        internalTypes.forEach(type => deps[type] = true)
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
