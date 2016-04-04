var postcss = require('postcss');

var INCLUDES_PROP = 'includes';

module.exports = postcss.plugin('includes', function(opts) {
  var readFile = (opts && opts.readFile) || readFileMissingError;

  /*
   Initial:
   - Root element (container)
   - Walk all decls where prop is "includes"
     - For each such decl (prop-value pair) run "expandIncludes"
       - Parse the decl.value and include declBlock from existing AST or file
   Missing:
   - We need to expand includes in includes recursively
  */
  return function(cssAst) {
    return new Promise(function(resolve, reject) {

      // expandIncludes :: {prop: string, value: string} -> number -> Promise Unit
      var expandIncludes = function(decl /* includes: ... */, recursionDepth) {
        recursionDepth || (recursionDepth = 0);

        var declBlocksToInclude = readDeclarations(decl.value, declBlockFromLocal(cssAst /* FIXME: should clone AST */), declBlockFromFile(readFile));

        // insertDecls :: Promise [Declaration] -> Promise Unit
        var insertDecls = function(foreignDeclBlock) {
          return foreignDeclBlock.then(function(db) {
            return new Promise(function(res, rej) {
              var promises = each(db, function(foreignDecl) {
                return Promise.resolve(decl.parent.insertBefore(decl, foreignDecl));
              });
              return Promise.all(promises).then(res).catch(rej);
            });
          });
        };

        return Promise.all(declBlocksToInclude.map(insertDecls))
          .then(function() { decl.remove(); });
      };

      return Promise.all(walkDecls(cssAst, INCLUDES_PROP, expandIncludes))
        .then(resolve)
        .catch(reject);
    });
  };
});


//
// PURE FUNCTIONS
//

// parseIncludeStatement :: string -> { selectors: [string], filepath: Maybe string }
var parseIncludeStatement = (function() {
  var pattern = /^(.+?)(?:\s+from\s+(?:"([^"]+)"|'([^']+)'))?$/;
  return function(str) {
    var tokens = pattern.exec(str);
    return tokens ? { selectors: tokens[1].split(/\s+/),
                      filepath:  tokens[2] || tokens[3] /* Double or single quotes */ }
                  : { selectors: [] };
  };
}());

// readDeclarations :: string -> (string -> Promise [Declaration]) -> (string -> Promise [Declaration]) -> [Promise [Declaration]]
function readDeclarations(includeStatement, fromLocal, fromFile) {
  var s = parseIncludeStatement(includeStatement);
  return s.selectors.map(s.filepath ? fromFile(s.filepath) : fromLocal);
}

// walkDecls :: AST -> string -> ({prop: string, value: string} -> {???})
function walkDecls(css, propFilter, transform) {
  var results = [];
  css.walkDecls(propFilter, function(decl) {
    results = results.concat(transform(decl));
  });
  return results;
}

function each(container, fn) {
  var results = [];
  container.each(function(d) {
    results = results.concat(fn(d));
  });
  return results;
}

// declForSelector :: string -> AST -> Maybe Declaration
function declForSelector(selector) {
  return function(css) {
    var declarations = {};
    css.walkRules(function(rule) {
      rule.selectors.forEach(function(s) {
        // FIXME: error when selector is defined multiple times
        // FIXME: error when similar selector is available (e.g. `selector:hover` or `div selector`)
        declarations[s] = rule;
      });
    });
    return declarations['.' + selector];
  };
}

// declBlockFromLocal :: AST -> string -> Promise [Declaration]
function declBlockFromLocal(css) {
  return function(selector) {
    return Promise.resolve(css)
      .then(declForSelector(selector));
  };
}

// declBlockFromFile :: (string -> string) -> string -> Promise [Declaration]
function declBlockFromFile(readFile) {
  return function(filepath) {
    return function(selector) {
      // FIXME: file is read multiple times
      return readFile(filepath)
        .then(function(contents) {
          return postcss.parse(contents, {from: filepath});
        })
        .then(declForSelector(selector));
    };
  };
}

function readFileMissingError(filepath) {
  throw new Error('Could not read file at "' + filepath + '" because no `readFile` function has been passed in as a plugin option. The required function has this signature: `readFile :: filepath -> Promise string string`');
}
