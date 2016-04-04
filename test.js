import fs from 'fs';
import path from 'path';
import postcss from 'postcss';
import test from 'ava';
import plugin from './';

const TEST_DIR = path.join(__dirname, 'test');

const normalize = str => str.replace(/\r\n?/g, '\n').replace(/\n$/,'');

const readFile = basepath => filepath => {
  return new Promise((resolve, reject) => {
    fs.readFile(path.join(basepath, filepath), 'utf8', (err, data) => {
      err ? reject(err) : resolve(data);
    });
  });
};

const run = (t, input, expected, opts = { readFile: readFile(__dirname) }) => {
  return postcss([ plugin(opts) ]).process(input)
    .then( result => {
      t.same(result.css, expected);
      t.same(result.warnings().length, 0);
    });
};

const runWithError = (t, input, output, opts = { readFile: readFile(__dirname) }) => {
  return t.throws(postcss([ plugin(opts) ]).process(input));
};


//
// Test cases on TEST_DIR
//

// TODO: source order
// TODO: recursion with cycle check

fs.readdirSync(TEST_DIR).forEach(testCase => {
  const testCaseDir = (p = '') => path.join(TEST_DIR, testCase, p);
  if (fs.existsSync(path.join(testCaseDir(), 'source.css'))) {
    test(testCase, t => {
      const input = normalize(fs.readFileSync(testCaseDir('source.css'), 'utf-8'));
      const expected = normalize(fs.readFileSync(testCaseDir('expected.css'), 'utf-8'));
      return run(t, input, expected, {readFile: readFile(testCaseDir())});
    });
  }
});


//
// Manual test cases
//

test("does not do anything if it doesn\'t have to", t => {
  return run(t, '', '');
});

test('reading from other file only works when readFile option is defined', t => {
  const input = '.test{includes: bar from "./foo.css"}';
  const output = '.test{color: blue}';
  return runWithError(t, input, output, { readFile: undefined });
});

test('throws an error when referenced file does not exist', t => {
  const input = '.test{includes: bar from "./not.exists"}';
  const output = '.test{color: blue}';
  return runWithError(t, input, output);
});

test('throws an error when recursion depth exceeds allowed limit', t => {
  const input = '.test{includes: test}';
  return runWithError(t, input);
});
