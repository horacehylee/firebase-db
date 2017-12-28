/* global __dirname, require, module*/

const webpack = require('webpack');
const UglifyJsPlugin = webpack.optimize.UglifyJsPlugin;
const ModuleConcatenationPlugin = webpack.optimize.ModuleConcatenationPlugin;
const path = require('path');
const env = require('yargs').argv.env; // use --env with webpack 2
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');

const nodeExternals = require('webpack-node-externals');

let libraryName = 'firebase-db';

let plugins = [
]

let outputFile;
if (env === 'build') {
  plugins.push(new UglifyJsPlugin({ minimize: true }));
  outputFile = libraryName + '.min.js';
} else {
  outputFile = libraryName + '.js';
}

const config = {
  entry: __dirname + '/src/' + 'index' + '.ts',
  devtool: 'source-map',
  output: {
    path: __dirname + '/lib',
    filename: outputFile,
    library: libraryName,
    libraryTarget: 'umd',
    umdNamedDefine: true
  },
  target: 'node', // <-- Important
  module: {
    rules: [
      {
        test: /\.json$/,
        loader: 'json-loader'
      },
      {
        test: /^(?!.*\.spec\.tsx?$).*\.tsx?$/,
        loader: 'ts-loader',
      },
    ]
  },
  resolve: {
    modules: [path.resolve('./node_modules'), path.resolve('./src')],
    extensions: [".ts", ".js", ".json"]
  },
  plugins: plugins,
  externals: [nodeExternals()] // <-- Important
};

module.exports = config;
