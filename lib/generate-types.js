import ts from "typescript";

import { isSimpleType } from "moddle";

export default function generateTypes(json) {
  const { types } = json;

  const nodes = ts.factory.createNodeArray([
    ...types.map((type) => createType(type)),
    createPackage(json),
  ]);

  return printNodes(nodes);
}

function createPackage(json) {
  const { name, prefix, types } = json;

  return ts.factory.createTypeAliasDeclaration(
    [ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
    ts.factory.createIdentifier(name),
    undefined,
    ts.factory.createTypeLiteralNode(
      types.map((type) => {
        return ts.factory.createPropertySignature(
          undefined,
          `${prefix}:${type.name}`,
          undefined,
          ts.factory.createTypeReferenceNode(type.name)
        );
      })
    )
  );
}

function createType(type) {
  const { name, properties = [] } = type;

  if (isSimpleType(name)) {
    return ts.factory.createTypeAliasDeclaration(
      undefined,
      ts.factory.createIdentifier(name),
      undefined,
      getTypeNode(name)
    );
  }

  return ts.factory.createInterfaceDeclaration(
    undefined,
    name,
    [],
    undefined,
    properties.map((property) => {
      return ts.factory.createPropertySignature(
        undefined,
        property.name,
        undefined,
        property.isMany
          ? ts.factory.createArrayTypeNode(getTypeNode(property.type))
          : getTypeNode(property.type)
      );
    })
  );
}

function getTypeNode(type) {
  if (type === "Boolean") {
    return ts.factory.createKeywordTypeNode(ts.SyntaxKind.BooleanKeyword);
  } else if (type === "String") {
    return ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword);
  } else if (type === "Integer" || type === "Real") {
    return ts.factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword);
  }

  return ts.factory.createTypeReferenceNode(type);
}

function printNodes(nodes) {
  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });

  return printer.printList(
    ts.ListFormat.MultiLine,
    nodes,
    ts.createSourceFile(
      "placeholder.ts",
      "",
      ts.ScriptTarget.ESNext,
      true,
      ts.ScriptKind.TS
    )
  );
}
