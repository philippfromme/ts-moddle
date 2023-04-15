import fs from 'fs';

import generateTypes from '..';

async function run() {
  const args = process.argv.slice(2);

  const help = args.includes('--help') || args.includes('-h');

  if (help) {
    console.log(`Usage: ts-moddle [file] -o [output]

  Example:
    $ ts-moddle "resources/bpmn/json/bpmn.json" -o "resources/bpmn/types/bpmn.d.ts"
`);

    return;
  }

  const jsonPath = args[ 0 ];

  const jsonFile = fs.readFileSync(jsonPath, 'utf-8');

  const json = JSON.parse(jsonFile);

  const file = generateTypes(json);

  const output = args.includes('-o') ? args[ args.indexOf('-o') + 1 ] : null;

  if (!output) {
    console.log(file);
  } else {
    console.log(file);

    fs.writeFileSync(output, file);
  }

  console.log('Done.');
}

run().catch(err => {
  console.error(err);

  process.exit(1);
});