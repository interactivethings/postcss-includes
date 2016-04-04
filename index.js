var postcss = require('postcss');

var INCLUDES_PROP = 'includes';
var INCLUDES_VALUE_PATTERN = /^(.+?)(?:\s+from\s+(?:"([^"]+)"|'([^']+)'))?$/;


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
  return function(cssAst /* Root */) {
    return Promise.all(walkDecls(cssAst, INCLUDES_PROP, expandIncludes(cssAst, readFile, 0)));
  };
});


// Function which expands all "includes" declarations in the given node (Root
// or Rule). This function modifies the node, so make sure to clone it first
// if you want to keep the original intact.
function expandIncludes(ast /* Node */, readFile, recursionDepth /* Number */) /* Promise Unit */ {
  if (recursionDepth > 10) {
    throw new Error('expandIncludes: Recursion depth limit exeeded');
  }

  return function(decl /* Declaration with type = "includes": ... */) /* Promise Unit */ {

    // Find all replacements for the "includes" declaration.
    return replacementsForDeclaration(ast, readFile, recursionDepth, decl).then(function(replacements /* [Node] */) {

      // Insert all replacements before the declaration
      replacements.forEach(function(replacement) {
        decl.parent.insertBefore(decl, replacement);
      });

      // And then remove the original declaration (includes: ...)
      decl.remove();
    });
  };
}


function replacementsForDeclaration(ast /* Root */, readFile, recursionDepth /* Number */, decl /* Declaration */) /* Promise [Node] */ {
  // ASSERT: decl.prop === 'includes'

  function go(localAst /* Root */, selectors /* [Selector] */) /* Promise [Node] */ {
    return Promise.all(selectors.map(function(sel /* Selector */) {
      var node = declForSelector(sel)(localAst);
      if (node === undefined) {
        throw new Error('parseIncludesDirective: selector "' + sel + '" not found');
      } else {
        return node;
      }
    }).map(function(rule /* Rule */) {
      /* Need to clone the rule because 'walkDecls' modifies the object. */
      var clonedRule = rule.clone();
      return Promise.all(walkDecls(clonedRule, INCLUDES_PROP, expandIncludes(localAst, readFile, recursionDepth + 1))).then(function() {
        return clonedRule.nodes;
      });
    }));
  }

  return parseIncludesDirective(decl.value).then(function(directive) {
    if (directive.type === 'local') {
      return go(ast, directive.selectors);
    } else if (directive.type === 'foreign') {
      return readFile(directive.filepath).then(function(contents) {
        return postcss.parse(contents, {from: directive.filepath});
      }).then(function(foreignAst) {
        return go(foreignAst, directive.selectors);
      });

    } else {
      throw new Error('parseIncludesDirective: Unknown directive');
    }
  })
}




// type IncludesDirective
//   = LocalIncludes [Selector]
//   | ForeignIncludes FilePath [Selector]

// This function fails if it can't parse the value.
function parseIncludesDirective(value /* String */) /* Promise IncludesDirective */ {
  return new Promise(function(resolve, reject) {
    var tokens = INCLUDES_VALUE_PATTERN.exec(value);
    if (tokens === null) {
      reject('parseIncludesDirective: Invalid directive: ' + value);
    } else {
      var selectors = tokens[1].split(/\s+/);
      var filepath = tokens[2] || tokens[3];

      if (filepath !== undefined) {
        resolve({ type: 'foreign', selectors: selectors, filepath: filepath });
      } else {
        resolve({ type: 'local', selectors: selectors });
      }
    }
  });
}


//
// PURE FUNCTIONS
//

// Walk the declarations and collect the return values from the callback.
function walkDecls(css /* Root */, propFilter /* String */, transform /* (String, Declaration) -> A */) /* [A] */ {
  var results = [];
  css.walkDecls(propFilter, function(decl) {
    results = results.concat(transform(decl));
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

function readFileMissingError(filepath) {
  throw new Error('Could not read file at "' + filepath + '" because no `readFile` function has been passed in as a plugin option. The required function has this signature: `readFile :: filepath -> Promise string string`');
}
