import * as ts from "typescript";

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
