const CopyWebpackPlugin = require('copy-webpack-plugin');
const path = require('path');
const outputPath = path.resolve(__dirname, './dist');

module.exports = {
  mode: 'production',
  entry: {
    'index': './src/index.ts',
  },
  devtool: 'source-map',
  output: {
    filename: '[name].js',
    path: outputPath,
    publicPath: '',
    library: {
      type: 'commonjs'
    },
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.json'],
    modules: ['node_modules', 'src'],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/i,
        exclude: /node_modules/,
        loader: 'ts-loader',
      }
    ]
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [{
        from: path.resolve(__dirname, './src/default-profiles'),
        to: `${outputPath}/default-profiles`
      }]
    })
  ],
  experiments: {
    outputModule: true
  }
};
