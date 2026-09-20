import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// The UI-installed @netlify/plugin-emails copies a CommonJS handler into
// .netlify/functions-internal/emails/index.js during onBuild. The root
// package.json declares "type": "module", so Node loads that handler as ESM
// and it crashes at runtime, and Netlify's bundler fails the build over it.
// A package.json in the function directory scopes just that handler back to
// CommonJS. Plugins from netlify.toml run after UI-installed plugins, so this
// onBuild sees the directory the emails plugin has just (re)created.
const EMAILS_FUNCTION_DIR = join('.netlify', 'functions-internal', 'emails');

export const onBuild = () => {
  if (!existsSync(EMAILS_FUNCTION_DIR)) {
    return;
  }

  writeFileSync(
    join(EMAILS_FUNCTION_DIR, 'package.json'),
    `${JSON.stringify({ type: 'commonjs' })}\n`
  );
};
