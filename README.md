# PostCSS Includes

[PostCSS](https://github.com/postcss/postcss) plugin that allows the inclusion of CSS from one CSS rule into another by copying the relevant declarations over.

This is similar in spirit to [Sass mixins](http://sass-lang.com/documentation/file.SASS_REFERENCE.html#mixins) and [PostCSS mixins](https://github.com/postcss/postcss-mixins), but solves a different problem in that it tries to be a replacement for [CSS Module’s composition](https://github.com/css-modules/css-modules#composition).

CSS Modules has introduced the `composes` property as a way of inheriting styles from different places. However, after having used `composes` heavily, its fundamental flaws have shown through again and again. It tries to solve a similar problem as Sass did with [@extend](http://sass-lang.com/documentation/file.SASS_REFERENCE.html#extend), but in either case these solutions start to break down if overused. It just isn't possible to get this to run reliably due to the nature of CSS where source order matters for specificity.

The _PostCSS Includes_ plugin tries to stay close to `composes` so that it can be a drop-in replacement, but solves the problems of source order by inlining the CSS. This will obviously make the CSS bigger, but that is an easy choice for us if the output is reliable.

## Examples

Include CSS from another rule defined in the same file. Not that in this simple situation the use of `composes` would be possible without problems, so be sure to understand the limitations of both approaches.

```css
/* Input */
.bar { color: red; }
.foo { includes: bar; }
```

```css
/* Output */
.bar { color: red; }
.foo { color: red; }
```

It's possible to include declarations from another file (the result will be the same as above).

```css
/* bar.css */
.bar { color: red; }
```

```css
/* main.css */
.foo { includes: bar from './bar.css'; }
```

## Usage

```js
postcss([ require('postcss-includes') ])
```
