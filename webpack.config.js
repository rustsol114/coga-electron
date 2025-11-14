const path = require('path');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';

  return {
    entry: {
      renderer: './extension/src/index.ts',
      dashboard: './electron/renderer/dashboard.ts',
    },
    output: {
      path: path.resolve(__dirname, 'electron/renderer'),
      filename: (pathData) => {
        // Keep renderer.js name for COGA bundle, use [name].js for others
        if (pathData.chunk.name === 'renderer') {
          return 'renderer.js';
        }
        return '[name].js';
      },
      clean: false,
      // Library config only applies to renderer entry (COGA)
      library: {
        name: 'COGA',
        type: 'umd',
        export: 'default',
      },
      globalObject: 'this',
    },
    module: {
      rules: [
        {
          test: /\.(ts|tsx)$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: [
                '@babel/preset-env',
                '@babel/preset-typescript',
              ],
            },
          },
        },
        {
          test: /\.js$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: ['@babel/preset-env'],
            },
          },
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader'],
        },
      ],
    },
    resolve: {
      extensions: ['.ts', '.tsx', '.js'],
      alias: {
        '@': path.resolve(__dirname, 'extension/src'),
        '@core': path.resolve(__dirname, 'extension/src/core'),
        '@interventions': path.resolve(__dirname, 'extension/src/interventions'),
        '@ui': path.resolve(__dirname, 'extension/src/ui'),
        '@utils': path.resolve(__dirname, 'extension/src/utils'),
        '@rules': path.resolve(__dirname, 'extension/src/rules'),
      },
    },
    devtool: isProduction ? 'source-map' : 'eval-source-map',
    target: ['web', 'es5'],
    optimization: {
      minimize: isProduction,
    },
    performance: {
      maxAssetSize: 102400,
      maxEntrypointSize: 102400,
      hints: 'warning',
    },
  };
};

