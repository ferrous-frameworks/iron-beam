 const path = require('path');
 const HtmlWebpackPlugin = require('html-webpack-plugin');

 module.exports = {
     entry: './src/app.js',
     output: {
         path: './bin',
         filename: 'app.bundle.js'
     },
     resolve: {
         root: path.resolve(__dirname),
         alias: {
             "iron-beam": "../../../dist/iron-beam.js"
         }
     },
     module: {
         loaders: [{
             test: /\.js$/,
             exclude: /node_modules/,
             loader: 'babel-loader'
         }]
     },
  plugins: [new HtmlWebpackPlugin()]
 };


 