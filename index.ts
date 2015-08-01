/// <reference path="./typings/tsd.d.ts" />
/// <reference path="./node_modules/typescript/lib/typescript.d.ts" />

import * as ts from "typescript";
import * as path from "path";
import * as _ from 'lodash';
import { readFileSync } from 'fs';

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

export function codegen(iface: ts.InterfaceDeclaration) {
    ejs.render(readFileSync('templates/file'), {})
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

    let ifaces = walker(sourceFile);
    let template = readFileSync('./templates/file.ejs').toString();
    let importName = path.basename(fileName.replace(/.tsx?$/, ''));

    let options = {
        ifaces: ifaces,
        importName: importName,
        indexerType: 'any',
        emitRecords: false,
        emitMarkers: false,
        emitEmptyRecords: false,
        defaultEmptyType: 'null'
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
                    return `Immutable.List<${sanitizedTypeName}Map>()`
                } else {
                    return `new ${typeName}Record()`
                }
            } else {
                return options.defaultEmptyType;
            }
        },
        forEach: _.forEach
    }

    let result = ejs.render(
        template,
        options,
        {
            filename: './templates/file.ejs',
            context: functions
        }
    );

    return format(result);
}

// Note: this uses ts.formatting which is part of the typescript 1.4 package but is not currently
//       exposed in the public typescript.d.ts. The typings should be exposed in the next release.
function format(text: string) {
    let options = getDefaultOptions();

    // Parse the source text
    let sourceFile = ts.createSourceFile("file.ts", text, ts.ScriptTarget.Latest, /*setParentPointers*/ true);

    // Get the formatting edits on the input sources
    let edits = (<any>ts).formatting.formatDocument(sourceFile, getRuleProvider(options), options);

    // Apply the edits on the input code
    return applyEdits(text, edits);

    function getRuleProvider(options: ts.FormatCodeOptions) {
        // Share this between multiple formatters using the same options.
        // This represents the bulk of the space the formatter uses.
        let ruleProvider = new (<any>ts).formatting.RulesProvider();
        ruleProvider.ensureUpToDate(options);
        return ruleProvider;
    }

    function applyEdits(text: string, edits: ts.TextChange[]): string {
        // Apply edits in reverse on the existing text
        let result = text;
        for (let i = edits.length - 1; i >= 0; i--) {
            let change = edits[i];
            let head = result.slice(0, change.span.start);
            let tail = result.slice(change.span.start + change.span.length)
            result = head + change.newText + tail;
        }
        return result;
    }

    function getDefaultOptions(): ts.FormatCodeOptions {
        return {
            IndentSize: 4,
            TabSize: 4,
            NewLineCharacter: '\r\n',
            ConvertTabsToSpaces: true,
            InsertSpaceAfterCommaDelimiter: true,
            InsertSpaceAfterSemicolonInForStatements: true,
            InsertSpaceBeforeAndAfterBinaryOperators: true,
            InsertSpaceAfterKeywordsInControlFlowStatements: true,
            InsertSpaceAfterFunctionKeywordForAnonymousFunctions: false,
            InsertSpaceAfterOpeningAndBeforeClosingNonemptyParenthesis: false,
            PlaceOpenBraceOnNewLineForFunctions: false,
            PlaceOpenBraceOnNewLineForControlBlocks: false,
        };
    }
}
