var TsImmutablePlugin = require('../../dist/plugin');

module.exports = {
    resolve: {
        extensions: ['', '.ts', '.js']
    },
    module: {
        loaders: [
            {
                test: /\.ts$/,
                loader: 'awesome-typescript-loader?module=common&-emitRequireType'
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
            suffix: '-i',
            verbose: true,
            indexerType: 'any',
            emitRecords: true,
            emitMarkers: true,
            emitEmptyRecords: true,
            defaultEmptyType: 'null'
        })
    ]
};
