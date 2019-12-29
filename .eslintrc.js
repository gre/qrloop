module.exports = {
  env: {
    browser: true,
    es6: true,
    node: true
  },
  extends: ["eslint:recommended", "plugin:flowtype/recommended"],
  plugins: ["flowtype"],
  rules: {
    "no-console": ["error", { allow: ["warn", "error"] }],
    "linebreak-style": ["error", "unix"],
    quotes: ["error", "double"],
    semi: ["error", "always"],
    "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    "flowtype/generic-spacing": 0,
    "flowtype/space-after-type-colon": 0
  },
  settings: {
    flowtype: {
      onlyFilesWithFlowAnnotation: true
    }
  }
};
