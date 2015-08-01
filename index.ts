/// <reference path="./typings/tsd.d.ts" />
/// <reference path="./node_modules/typescript/lib/typescript.d.ts" />

import {readFileSync, writeFileSync} from "fs";
import * as ts from "typescript";
import * as path from "path";
import * as _ from 'lodash';

var ejs = require('ejs');

export function walker(sourceFile: ts.SourceFile) {
    let interfaces = [];
    let walk = (node: ts.Node) => {
        switch (node.kind) {
            case ts.SyntaxKind.InterfaceDeclaration:
                console.log(JSON.stringify(node, null, 4))
                interfaces.push(node);
        }

        ts.forEachChild(node, walk);
    }

    walk(sourceFile);
    return interfaces;
}

export function codegen(iface: ts.InterfaceDeclaration) {
    console.log(iface)

    ejs.render(readFileSync('templates/file'), {})
}

const fileNames = process.argv.slice(2);
fileNames.forEach(fileName => {
    // Parse a file
    let sourceFile = ts.createSourceFile(
        fileName,
        readFileSync(fileName).toString(),
        ts.ScriptTarget.ES6,
        false
    );

    let ifaces = walker(sourceFile);
    let template = readFileSync('./templates/file.ejs').toString();
    let importName = path.basename(fileName.replace(/.tsx?$/, ''));

    let functions = {
        type: (member) => {
            return sourceFile.text.slice(member.type.pos + 1, member.type.end)
        },
        isLocalType(typeName: string) {
            return  _.any(ifaces, (iface) => iface.name.text == typeName);
        },
        typeMap: (member) => {
            let typeName = functions.type(member);
            let isLocalType = functions.isLocalType(typeName);

            if (isLocalType) {
                return `${typeName}Map`
            } else {
                return typeName
            }
        },
        deps: (ifaceName: string, acc = {}) => {
            let iface = _.find(ifaces, (iface) => iface.name.text == ifaceName);
            iface.members.forEach((member) => {
                let memberTypeName = functions.type(member);
                let isVisited = acc[memberTypeName];
                if (!isVisited) {
                    if (functions.isLocalType(memberTypeName)) {
                        acc[memberTypeName] = true
                        functions.deps(memberTypeName, acc);
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
                if (functions.isLocalType(memberTypeName)) {
                    acc[member.name.text] = memberTypeName
                }
            });

            return acc
        },
        forEach: _.forEach
    }

    let result = ejs.render(
        template,
        {
            ifaces: ifaces,
            importName: importName,
            indexerType: 'void',
            isRecordsReady: true
        },
        {
            filename: './templates/file.ejs',
            context: functions
        }
    );

    writeFileSync(fileName.replace(/.tsx?$/, '-imm.ts'), format(result))
});

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
