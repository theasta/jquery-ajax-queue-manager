module.exports = function (config) {
    config.set({
        // base path, that will be used to resolve files and exclude
        basePath: '',

        frameworks: ['jasmine'],

        files: [
            'libs/jquery-1.7.1.min.js',
            'libs/mock-ajax.js',
            'src/*.js',
            'tests/*.js'
        ],


        reporters: ['dots'],
        colors: true,
        logLevel: config.LOG_INFO,
        autoWatch: true,

        browsers: [process.env.TRAVIS ? 'Chrome' : 'PhantomJS'],

        captureTimeout: 20000,

        singleRun: false,


        plugins: [
            'karma-jasmine',
            'karma-phantomjs-launcher'
        ]
    });
};