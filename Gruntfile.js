module.exports = function(grunt) {
    require('load-grunt-tasks')(grunt);

    grunt.initConfig({
        clean: ['dist'],
        ts: {
            default : {
                options: {
                    compiler: './node_modules/typescript/bin/tsc',
                    module: "commonjs",
                    fast: 'never',
                    preserveConstEnums: true,
                    sourceMap: false
                },
                files: [
                    { src: ['./src/**/*.ts'], dest: './dist' },
                    { src: ['./test/**/*.ts'], dest: './test/out' }
                ]
            }
        },
        bump: {
            options: {
                files: [
                    'package.json'
                ],
                updateConfigs: [],
                commit: true,
                commitMessage: 'chore(ver): v%VERSION%',
                commitFiles: [
                    'package.json',
                    'CHANGELOG.md'
                ],
                createTag: true,
                tagName: 'v%VERSION%',
                tagMessage: 'chore(ver): v%VERSION%',
                push: true,
                pushTo: 'origin',
                gitDescribeOptions: '--tags --always --abbrev=1 --dirty=-d',
                globalReplace: false,
                prereleaseName: 'rc',
                regExp: false
            }
        },
        shell: {
            addChangelog: {
                command: 'git add CHANGELOG.md'
            }
        },
        conventionalChangelog: {
            options: {
                changelogOpts: {
                    preset: 'angular'
                }
            },
            release: {
                src: 'CHANGELOG.md'
            }
        }
    });

    grunt.registerTask('release', 'Release a new version', function(target) {
        if (!target) {
            target = 'minor';
        }
        return grunt.task.run(
            'bump-only:' + target,
            'conventionalChangelog',
            'shell:addChangelog',
            'bump-commit'
        );
    });

    grunt.registerTask('default', ['ts']);
};
