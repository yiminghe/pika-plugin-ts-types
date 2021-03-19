const { MessageError } = require('@pika/types');
const path = require('path');
const fs = require('fs');
const execa = require('execa');

exports.manifest = function (newManifest) {
  newManifest.types = newManifest.types || 'dist-types/index.d.ts';
  return newManifest;
};

function getTscBin(cwd) {
  try {
    return require.resolve('typescript/bin/tsc', { paths: [cwd] });
  } catch (err) {
    // ignore err
    return null;
  }
}

function getTsConfigPath(options, cwd) {
  return path.resolve(cwd, options.tsconfig || 'tsconfig.json');
}

exports.beforeJob = function ({ cwd }) {
  const srcDirectory = path.join(cwd, 'src/');
  if (!fs.existsSync(srcDirectory)) {
    throw new MessageError('@pika/pack expects a standard package format, where package source must live in "src/".');
  }
  if (!fs.existsSync(path.join(cwd, 'src/index.ts')) && !fs.existsSync(path.join(cwd, 'src/index.tsx'))) {
    throw new MessageError(
      '@pika/pack expects a standard package format, where the package entrypoint must live at "src/index".',
    );
  }
};

exports.build = async function ({ cwd, out, options, reporter }) {
  const additionalArgs = options.args || [];
  const args = [
    '-d',
    '--declarationDir',
    path.join(out, 'dist-types/'),
    '--project',
    getTsConfigPath(options, cwd),
    '--target',
    'es2020',
    '--module',
    'esnext',
    '--emitDeclarationOnly',
    '--sourceMap',
    'false',
    ...additionalArgs,
  ];
  const result = execa(
    getTscBin(cwd),
    args,
    { cwd },
  );
  reporter.info('npx tsc ' + args.join(' '));
  result.stderr.pipe(process.stderr);
  result.stdout.pipe(process.stdout);
  await result.catch(err => {
    // Small formatting improvement.
    console.log('');
    reporter.warning('npx tsc ' + args.join(' '));
    console.log('');
    if (!options.ignoreError) {
      throw err;
    }
  });
  reporter.created(path.join(out, 'dist-types', 'index.d.ts'), 'types');
};
