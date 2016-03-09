
var path = require('path');

var _ = require('lodash');

var tsConfigInit = require('./utils/tsc/tsConfigInit');

module.exports = function(grunt) {

    grunt.config.init(require('./grunt-config.json'));

    var moduleName = grunt.config('module-name');
    if (_.isUndefined(moduleName)) {
        throw new Error('module-name config setting is required. check grunt-config.json');
    }
    var pathToNode = grunt.option('path-to-node');
    if (_.isUndefined(pathToNode)) {
        pathToNode = path.join(process.execPath, '/../../');
    }

    var tsBin = path.join(pathToNode, 'lib/node_modules/typescript/bin');
    var nodeBin = path.join(pathToNode, 'bin');
    var projectRoot = __dirname;



    grunt.loadNpmTasks('grunt-mocha-test');
    grunt.loadNpmTasks('grunt-shell');
    grunt.loadNpmTasks('grunt-bump');

    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-clean');
    
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),


        nodeBin: nodeBin,
        tscExec: path.join(tsBin, 'tsc'),


        shell: {
            module: {
                command: [
                    'rm -rf ' + path.join(projectRoot, 'node_modules', moduleName),
                    '<%= nodeBin %>/npm install'
                ].join('&&')
            },
            
            tsd: {
                command: [
                    'mkdir -p src'
                    ,'cd src'
                    ,'mkdir -p typings'
                    ,'cd typings'
                    ,'mkdir -p tsd'
                    ,'cd ' + projectRoot
                    ,'<%= nodeBin %>/tsd reinstall -s'
                ].join('&&')
            },

            tsc: {
                options: {
                    stdout: false,
                    callback: function (e, stdout, stderr, cb) {
                        grunt.log.subhead('typescript compiler results ---');
                        if (stdout.length === 0) {
                            grunt.log.ok();
                        }
                        else {
                            var grouped = _.groupBy(_.initial(stdout.split('\n')), function (error) {
                                return error.substring(0, error.indexOf('('));
                            });
                            _.each(grouped, function (errors, file) {
                                grunt.log.subhead(file);
                                var filename = path.basename(file);
                                _.each(errors, function (e) {
                                    grunt.log.error(e);
                                });
                                grunt.log.writeln();
                            });
                        }
                        cb(e);
                    }
                },
                command: '<%= tscExec %> --project ./'
            },
            addDistToGit: {
                command: 'git add dist/* dist/**/*'
            }
        },

        mochaTest: {
            all: {
                options: {
                    colors: true,
                    log: true,
                    logErrors: true
                },
                src: ['src/**/*.test.js']
            }
        },
        bump: {
            options: {
                files: ['package.json'],
                updateConfigs: [],
                commit: true,
                commitMessage: 'Release v%VERSION%',
                commitFiles: ['package.json'],
                createTag: true,
                tagName: 'v%VERSION%',
                tagMessage: 'Version %VERSION%',
                push: false,
                pushTo: 'upstream',
                gitDescribeOptions: '--tags --always --abbrev=1 --dirty=-d',
                globalReplace: false,
                prereleaseName: false,
                regExp: false
            }
        },
        copy: {
            dist: {
                files: [{
                    options: {
                        noProcess: 'src/**/*.test.js'
                    },
                    expand: true,
                    cwd: 'src/',
                    src: ['**/*.js', '*.d.ts'],
                    dest: 'dist/'
                }]
            }
        },
        clean: {
            dist: [ "dist" ]
        }

        //Typedoc 1.5 compatiblity not ready
        //typedoc: {
        //    build: {
        //        options: {
        //            module: 'commonjs',
        //            target: 'es5',
        //            out: 'docs/',
        //            name: 'ironworks'
        //        },
        //        src: 'src/**/*'
        //    }
        //}
    });


    grunt.registerTask('tsconfig', 'initialize tsconfig.json with the current project files', function () {
        var done = this.async();
        tsConfigInit({
            dirsToCompile: [
                'src',
                'interfaces',
                'tests',
                'typings'
            ],
            pathToTsConfig: './tsconfig.json'
        }, function (e, results) {
            if (_.isUndefined(e)) {
                grunt.log.subhead('tsconfig.json init results ---');
                _.each(results.tsFiles, function (tsf) {
                    grunt.log.ok("included " + tsf);
                });
                _.each(results.ignored, function (ignored) {
                    grunt.log.ok("ignored directory " + ignored);
                });
                grunt.log.ok();
                done();
                return;
            }
            done(e);
        });
    });


    grunt.registerTask('prep', [
        'shell:module',
        'shell:tsd',
        'tsconfig'
    ]);

    grunt.registerTask('build', [
        'shell:tsc',
        'clean:dist',
        'copy:dist',
        'shell:addDistToGit'
    ]);

    grunt.registerTask('prep-n-build', [
        'prep',
        'build'
    ]);

    grunt.registerTask('test', [
        'mochaTest:all'
    ]);

    grunt.registerTask('build-n-test', [
        'build',
        'test'
    ]);

    grunt.registerTask('default', [
        'prep',
        'build',
        'test'
    ]);
};
