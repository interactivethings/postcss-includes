# PostCSS Includes

[PostCSS](https://github.com/postcss/postcss) plugin that allows the inclusion of CSS from one declaration into another. Similar in spirit to [Sass mixins](http://sass-lang.com/documentation/file.SASS_REFERENCE.html#mixins) and [PostCSS mixins](https://github.com/postcss/postcss-mixins), but solving a different problem.

[CSS Modules](https://github.com/css-modules/css-modules) has introduced [composition](https://github.com/css-modules/css-modules#composition) as a way of working. After having used this heavily, its fundamental flaws have shown through again and again. It tries to solve the problems of Sass's [extend](http://sass-lang.com/documentation/file.SASS_REFERENCE.html#extend), but can't do so due to the nature of CSS.

The PostCSS Includes plugin solves the flaws of `composes`, but tries to stay close to it. This introduces other opportunities for failure for which we strive to throw errors at compile time to not let you create undefined behaviors.

```css
/* Input */
.bar {
  color: red;
}

.foo {
  includes: bar;
}
```

```css
/* Output */
.foo {
  color: red;
}
```

Also supports inclusion of rules from other files:

```
/* bar.css */
.bar {
  color: red;
}
```

```
/* main.css */
.foo {
  includes: bar from './bar.css';
}
```

## Usage

```js
postcss([ require('postcss-includes') ])
```
