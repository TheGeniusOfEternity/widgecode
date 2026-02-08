import tseslint from "typescript-eslint";
import pluginVue from "eslint-plugin-vue";
import vueParser from "vue-eslint-parser";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    files: ['**/*CompetenciesEvents.vue'],
    plugins: { 'vue': pluginVue },
    extends: [...pluginVue.configs['flat/recommended']],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tseslint.parser,
        project: './tsconfig.json',
        extraFileExtensions: ['.vue'],
        sourceType: 'module',
        ecmaVersion: 2020,
      },
    },
    rules: {
      'vue/no-reserved-component-names': 'off',
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    plugins: { "@typescript-eslint": tseslint.plugin },
    ignores: ["*.config.ts"],
    extends: [tseslint.configs.strictTypeChecked],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: "./tsconfig.json",
        projectService: true,
        extraFileExtensions: [".vue"],
      },
    },
    rules: {
      "@typescript-eslint/no-unnecessary-type-parameters": "off"
    },
  },
]);