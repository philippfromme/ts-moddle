import ts from "typescript";

import { isSimpleType } from "moddle";

export default function generateTypes(json) {
  const { enumerations = [], types = [] } = json;

  const context = {
    imports: {},
    statements: [],
  };

  enumerations.forEach((enumeration) => addEnum(enumeration, context));

  types.forEach((type) => addType(type, context));

  addPackage(json, context);

  const nodes = ts.factory.createNodeArray([
    ...Object.values(context.imports),
    newLine(),
    ...context.statements,
  ]);

  return printNodes(nodes);
}

function addEnum(enumeration, context) {
  const { name, literalValues } = enumeration;

  context.statements.push(
    ts.factory.createEnumDeclaration(
      [ts.factory.createModifier(ts.SyntaxKind.DeclareKeyword)],
      ts.factory.createIdentifier(name),
      literalValues.map((literalValue) => {
        return ts.factory.createEnumMember(literalValue.name);
      })
    )
  );
}

function addPackage(json, context) {
  const { name, prefix, types } = json;

  context.statements.push(
    ts.factory.createTypeAliasDeclaration(
      [ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
      ts.factory.createIdentifier(name),
      undefined,
      ts.factory.createTypeLiteralNode(
        types.map((type) => {
          return ts.factory.createPropertySignature(
            undefined,
            ts.factory.createIdentifier(`"${prefix}:${type.name}"`),
            undefined,
            ts.factory.createTypeReferenceNode(type.name)
          );
        })
      )
    )
  );
}

function addType(type, context) {
  const {
    extends: extendedTypes = [],
    name,
    properties = [],
    superClass: superTypes = [],
  } = type;

  if (isSimpleType(name)) {
    context.statements.push(
      ts.factory.createTypeAliasDeclaration(
        undefined,
        ts.factory.createIdentifier(name),
        undefined,
        getTypeNode(name)
      )
    );

    return;
  }

  let heritageClauses = undefined;

  if (superTypes.length) {
    const superType = superTypes[0];

    if (isExternalType(superType)) {
      context.imports[getNamespace(superType)] =
        createImportDeclaration(superType);
    }

    heritageClauses = [
      ts.factory.createHeritageClause(ts.SyntaxKind.ExtendsKeyword, [
        isExternalType(superType)
          ? createIndexedAccessTypeNode(superType)
          : ts.factory.createExpressionWithTypeArguments(
              ts.factory.createIdentifier(superType),
              undefined
            ),
      ]),
    ];
  }

  context.statements.push(
    ts.factory.createInterfaceDeclaration(
      [ts.factory.createModifier(ts.SyntaxKind.DeclareKeyword)],
      ts.factory.createIdentifier(
        extendedTypes.length ? getType(extendedTypes[0]) : name
      ),
      [],
      heritageClauses,
      properties.map((property) => {
        let typeNode = getTypeNode(property.type);

        if (isExternalType(property.type)) {
          context.imports[getNamespace(property.type)] =
            createImportDeclaration(property.type, context);

          typeNode = createIndexedAccessTypeNode(property.type);
        }

        if (property.isMany) {
          typeNode = ts.factory.createArrayTypeNode(typeNode);
        }

        return ts.factory.createPropertySignature(
          undefined,
          ts.factory.createIdentifier(`"${property.name}"`),
          undefined,
          typeNode
        );
      })
    )
  );
}

function createImportDeclaration(type) {
  return ts.factory.createImportDeclaration(
    undefined,
    ts.factory.createImportClause(
      true,
      ts.factory.createIdentifier(getNamespace(type).toUpperCase()),
      undefined
    ),
    ts.factory.createStringLiteral(`./${getNamespace(type)}.d.ts`)
  );
}

function createIndexedAccessTypeNode(type) {
  return ts.factory.createIndexedAccessTypeNode(
    ts.factory.createTypeReferenceNode(getNamespace(type).toUpperCase()),
    ts.factory.createLiteralTypeNode(ts.factory.createStringLiteral(type))
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

function isExternalType(type) {
  return type.includes(":");
}

function getNamespace(type) {
  return type.split(":")[0];
}

function getType(type) {
  return type.split(":")[1];
}

function newLine() {
  return ts.factory.createIdentifier("\n");
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
