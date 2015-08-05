# TypeScript code generator for ImmutableJS

[![Join the chat at https://gitter.im/s-panferov/tsimmutable](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/s-panferov/tsimmutable?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

Codegen all you need to use ImmutableJS in your TypeScript application. Also
uses type information to emit functions to parse **nested** Records.

## Install

With [npm](https://npmjs.org) do:

```
npm install tsimmutable --save-dev
```

## Example

Write a file with your models (e.g. `models.ts`):

``` js
export interface Profile {
    firstName: string;
    lastName: string;
}

export interface User {
    profile: Profile;
    login: string;
    friends?: User[];
}
```

Compile it:

```
./node_modules/.bin/tsimmutable models.ts --out=models-imm.ts --indexerType=void --emitRecords --emitMarkers --emitEmptyRecords
```

See the [output](https://github.com/s-panferov/tsimmutable/blob/master/test/models-imm.ts).

## Options

```
--out               Output file name. Default: stdout
--keyType           Emit map with Map<$keyType, ...> type. Default: "string"
--indexerType       Emit map with Map<string, $indexerType> type. Default: "any"
--emitRecords       Shoud emitter emit records? Default: false
--emitMarkers       Shoud emitter emit type markers? Default: false
--emitEmptyRecords  Shoud emitter emit empty default records? Default: false
--emitTypedMethods  Shoud emitter emit typed methods? Default: false
--defaultEmptyType  Emit empty records with fields initializer by this value. Default: "null"
```

## JS API

```js
import { generate } from 'tsimmutable';
let result = generate(fileName, fileText, options);
```

## Webpack plugin

`tsimmutable` goes together with [webpack](http://webpack.github.io/) plugin which
helps to watch and re-generate your model files when initial interface files change.

Usage:

```
var TsImmutablePlugin = require('tsimmutable/plugin');

module.exports = {
    resolve: {
        extensions: ['', '.ts', '.js']
    },
    module: {
        loaders: [
            {
                test: /\.ts$/,
                loader: 'awesome-typescript-loader?module=common'
            }
        ]
    },
    entry: {
        index: ['./index.ts']
    },
    output: {
        path: './dist',
        filename: './[name].js'
    },
    plugins: [
        new TsImmutablePlugin({
            files: [
                './models.ts'
            ],

            /*
             * Every option below is optional.
             */

            suffix: '-i',
            verbose: true,
            indexerType: 'any',
            emitRecords: true,
            emitMarkers: true,
            emitEmptyRecords: true,
            emitTypedMethods: true,
            defaultEmptyType: 'null'
        })
    ]
};
```

## Limitations

1. Inline object types will not work:

```
export interface User {
    profile: {
        a: User
    };
}
```

1. Two-dimensional array types will not work:

```
export interface User {
    profile: User[][]
}
```

# License

MIT
