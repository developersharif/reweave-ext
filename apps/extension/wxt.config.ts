import { BRAND } from '@reskin/brand';
import { defineConfig } from 'wxt';

/**
 * Supported sites. Each entry becomes an *optional* host permission that is
 * requested only when the user enables that site (D-011). Never add
 * `host_permissions`, `<all_urls>`, `tabs`, `webNavigation`, `history` or `cookies`.
 */
const SUPPORTED_SITE_ORIGINS = ['https://www.youtube.com/*'];

// https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-react'],
  manifestVersion: 3,
  manifest: ({ browser }) => ({
    name: BRAND.name,
    short_name: BRAND.shortName,
    description: BRAND.description,
    homepage_url: BRAND.repoUrl,
    permissions: ['storage', 'scripting'],
    optional_host_permissions: SUPPORTED_SITE_ORIGINS,
    ...(browser === 'firefox'
      ? {
          browser_specific_settings: {
            gecko: {
              id: 'extension@reweave.invalid',
              strict_min_version: '128.0',
              // We collect no data (D-017). Firefox requires this declaration for new add-ons.
              data_collection_permissions: { required: ['none'] },
            },
          },
        }
      : {}),
  }),
  hooks: {
    // The popup's <title> would otherwise become the toolbar tooltip; keep the brand in one place.
    'build:manifestGenerated': (_wxt, manifest) => {
      if (manifest.action) manifest.action.default_title = BRAND.name;
    },
  },
});
