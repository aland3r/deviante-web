import path from 'node:path'

/**
 * Vite resolve + fs.allow for @gestalt/dev-quest (monorepo local package).
 * @param {string} webRootDir — absolute path to {product}/web
 * @param {string} [gestaltRoot] — monorepo root or vendor/gestalt when deployed standalone
 */
export function gestaltDevQuest(webRootDir, gestaltRoot = path.resolve(webRootDir, '../..')) {

  return {
    resolve: {
      alias: {
        '@gestalt/auth': path.resolve(gestaltRoot, 'ui/auth'),
        '@gestalt/dev-quest': path.resolve(gestaltRoot, 'ui/dev-quest'),
        '@supabase/supabase-js': path.resolve(webRootDir, 'node_modules/@supabase/supabase-js'),
        react: path.resolve(webRootDir, 'node_modules/react'),
        'react-dom': path.resolve(webRootDir, 'node_modules/react-dom'),
        'react/jsx-runtime': path.resolve(webRootDir, 'node_modules/react/jsx-runtime'),
        'react/jsx-dev-runtime': path.resolve(webRootDir, 'node_modules/react/jsx-dev-runtime'),
      },
      dedupe: ['react', 'react-dom'],
    },
    server: {
      fs: {
        allow: [gestaltRoot],
      },
    },
  }
}
