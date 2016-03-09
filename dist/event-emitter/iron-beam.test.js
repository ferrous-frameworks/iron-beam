///<reference path='../typings/master.d.ts' />
var chai = require('chai');
var expect = chai.expect;
var _ = require('lodash');
var IronBeam = require('./iron-beam');
describe('iron-beam', function () {
    it("should call a method passed to 'addListener' every time a given event name is emitted with 'emit'", function (done) {
        var ib = new IronBeam.EventEmitter();
        var count = 0;
        ib.addListener('test', function () {
            count++;
            if (count == 2) {
                done();
            }
        });
        expect(ib.emit('test')).to.be.true;
        expect(ib.emit('test')).to.be.true;
    });
    it("should call a method passed to 'on' every time a given event name is emitted with 'emit'", function (done) {
        var ib = new IronBeam.EventEmitter();
        var count = 0;
        ib.on('test', function () {
            count++;
            if (count == 2) {
                done();
            }
        });
        expect(ib.emit('test')).to.be.true;
        expect(ib.emit('test')).to.be.true;
    });
    it("should call a method passed to 'once' one time when a given event name no matter how many times it is emitted with 'emit'", function (done) {
        var ib = new IronBeam.EventEmitter();
        ib.once('test', function () {
            done();
        });
        expect(ib.emit('test')).to.be.true;
        expect(ib.emit('test')).to.be.false;
    });
    it("should pass all arguments passed to 'emit' to the method passed to 'once'", function (done) {
        var ib = new IronBeam.EventEmitter();
        ib.once('test', function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i - 0] = arguments[_i];
            }
            expect(args[0]).to.be.equal(1);
            expect(args[1]).to.be.equal(2);
            done();
        });
        expect(ib.emit('test', 1, 2)).to.be.true;
    });
    it("should not call a method passed to 'on' after 'removeAllListeners' is called with the event name", function () {
        var ib = new IronBeam.EventEmitter();
        ib.on('test1.test2', function () {
            throw new Error("listener should not be called after removeAllListeners has been called");
        });
        ib.removeAllListeners('test1.test2');
        expect(ib.emit('test1.test2')).to.be.false;
    });
    it("should not call a method passed to 'on' after 'removeAllListeners' is called", function () {
        var ib = new IronBeam.EventEmitter();
        ib.on('test', function () {
            throw new Error("listener should not be called after removeAllListeners has been called");
        });
        ib.removeAllListeners();
        expect(ib.emit('test')).to.be.false;
    });
    var times = 5;
    it("should have zero listeners in array after adding " + times + " listeners, emitting to them, then removeAllListeners", function (done) {
        var ib = new IronBeam.EventEmitter();
        ib.setMaxListeners(times);
        var count = 0;
        for (var i = 0; i < times; i++) {
            ib.on('test' + i, function () {
                count++;
                check();
            });
        }
        for (var i = 0; i < times; i++) {
            expect(ib.emit('test' + i)).to.be.true;
        }
        function check() {
            if (count === times) {
                for (var i = 0; i < times; i++) {
                    ib.removeAllListeners('test' + i);
                }
                expect(ib.allListeners().length).to.be.equal(0);
                done();
            }
        }
    });
    it("should have a 'defaultMaxListeners' property that returns 10", function () {
        var ib = new IronBeam.EventEmitter();
        expect(ib.defaultMaxListeners).to.be.equal(10);
    });
    it("should have a 'listeners' method that returns an array of listeners functions for the given event name", function () {
        var ib = new IronBeam.EventEmitter();
        ib.on('test', function () { }).on('test', function () { });
        expect(ib.listeners('test').length).to.be.equal(2);
    });
    it("should have a static 'listenerCount' method that returns the number of listeners for a given event name", function () {
        var ib = new IronBeam.EventEmitter();
        ib.on('test', function () { });
        ib.on('test', function () { });
        expect(IronBeam.EventEmitter.listenerCount(ib, 'test')).to.be.equal(2);
    });
    it("should emit a 'newListener' event when a listener is added", function (done) {
        var ib = new IronBeam.EventEmitter();
        ib.on('newListener', function (e, l) {
            expect(e).to.be.equal('newListener');
            expect(typeof l).to.be.equal("function");
            done();
        });
    });
    it("should emit a 'removeListener' event when a listener is removed", function (done) {
        var ib = new IronBeam.EventEmitter();
        ib.on('removeListener', function (e, l) {
            expect(e).to.be.equal('test');
            expect(typeof l).to.be.equal("function");
            done();
        });
        ib.on('test', function () { });
        ib.removeAllListeners('test');
    });
    it("should emit a 'removeListener' event when a listener is removed even if it is a listener to 'removeListener", function (done) {
        var ib = new IronBeam.EventEmitter();
        ib.on('removeListener', function (e, l) {
            expect(e).to.be.equal('removeListener');
            expect(typeof l).to.be.equal("function");
            done();
        });
        ib.removeAllListeners('removeListener');
    });
    it("should throw an unhandled error on an error event if there is no listener", function (done) {
        var ib = new IronBeam.EventEmitter();
        expect(function () {
            ib.emit('error');
        }).to.throw(Error);
        done();
    });
    it("should not throw an unhandled error on an error event if there is a listener", function (done) {
        var ib = new IronBeam.EventEmitter();
        ib.on('error', function () {
            done();
        });
        ib.emit('error');
    });
    it("should emit the 'tooManyListeners' event when more listeners are added than what is passed to 'setMaxListeners'", function (done) {
        var ib = new IronBeam.EventEmitter();
        ib.setMaxListeners(1);
        ib.once('tooManyListeners', function (eventName, count) {
            expect(eventName).to.be.equal('test');
            expect(count).to.be.equal(2);
            done();
        });
        ib.on('test', function () { }).on('test', function () { });
    });
    it("should work with delimited event names", function (done) {
        var ib = new IronBeam.EventEmitter({
            delimiter: '#'
        });
        ib.on('1#2#3#4#5#6#7#8#9', function () {
            done();
        });
        ib.emit('1#2#3#4#5#6#7#8#9');
    });
    it("should work with wildcard event names", function (done) {
        var ib = new IronBeam.EventEmitter();
        ib.on('1.*.3.*.5.*.7.*.9', function () {
            done();
        });
        ib.emit('1.2.3.4.5.6.7.8.9');
    });
    it("should call the function passed to preEmit when an event is intercepted", function (done) {
        var ib = new IronBeam.EventEmitter();
        var intercepted = false;
        var test = 'arg';
        ib.on('test', function () {
            expect(intercepted).to.be.true;
            done();
        });
        ib.intercept('test', {
            preEmit: function (stop, next, anno) {
                var args = [];
                for (var _i = 3; _i < arguments.length; _i++) {
                    args[_i - 3] = arguments[_i];
                }
                intercepted = true;
                expect(_.isArray(args)).to.be.true;
                expect(args[0]).to.be.equal(test);
                next(args);
            }
        });
        ib.emit('test', test);
    });
    it("should call the function passed to preEmit when an event is intercepted even if there are no listeners", function (done) {
        var ib = new IronBeam.EventEmitter();
        var test = 'arg';
        ib.intercept('test', {
            preEmit: function (stop, next, anno) {
                var args = [];
                for (var _i = 3; _i < arguments.length; _i++) {
                    args[_i - 3] = arguments[_i];
                }
                expect(_.isArray(args)).to.be.true;
                expect(args[0]).to.be.equal(test);
                next(args);
                done();
            }
        });
        ib.emit('test', test);
    });
    it("should call the function passed to preEmit when an event is intercepted and pass through modified args", function (done) {
        var ib = new IronBeam.EventEmitter();
        var intercepted = false;
        var test = 'test';
        var not = 'not-test';
        ib.on('test', function (arg) {
            expect(intercepted).to.be.true;
            expect(arg).to.be.equal(test);
            done();
        });
        ib.intercept('test', {
            preEmit: function (stop, next, anno) {
                var args = [];
                for (var _i = 3; _i < arguments.length; _i++) {
                    args[_i - 3] = arguments[_i];
                }
                intercepted = true;
                expect(_.isArray(args)).to.be.true;
                expect(args[0]).to.be.equal(not);
                args[0] = test;
                next(args);
            }
        });
        ib.emit('test', not);
    });
    it("should call the function passed to preListener before every listener when an event is intercepted", function (done) {
        var ib = new IronBeam.EventEmitter();
        ib.on('test', function (data, cb) {
            cb(++data);
        });
        ib.on('test', function (data, cb) {
            cb(++data);
        });
        ib.intercept('test', {
            preListener: function (stop, next, anno) {
                var args = [];
                for (var _i = 3; _i < arguments.length; _i++) {
                    args[_i - 3] = arguments[_i];
                }
                next([
                    args[0],
                    function (data) {
                        expect(data).to.be.equal(1);
                        args[1](0);
                    }
                ]);
            }
        });
        var count = 0;
        ib.emit('test', 0, function (data) {
            expect(data).to.be.equal(0);
            if (++count === 2) {
                done();
            }
        });
    });
    it("should call the function passed to preListener before every listener when an event is intercepted", function (done) {
        var ib = new IronBeam.EventEmitter();
        ib.on('test', function (data, cb) {
            cb(++data);
        });
        ib.on('test', function (data, cb) {
            cb(++data);
        });
        ib.intercept('test', {
            preListener: function (stop, next, anno) {
                var args = [];
                for (var _i = 3; _i < arguments.length; _i++) {
                    args[_i - 3] = arguments[_i];
                }
                next([
                    args[0],
                    function (data) {
                        expect(data).to.be.equal(1);
                        args[1](0);
                    }
                ]);
            }
        });
        var count = 0;
        ib.emit('test', 0, function (data) {
            expect(data).to.be.equal(0);
            if (++count === 2) {
                done();
            }
        });
    });
    it("should call the function passed to postEmit when an event is intercepted", function (done) {
        var ib = new IronBeam.EventEmitter();
        ib.intercept('test', {
            postEmit: function (stop, next, anno) {
                next();
                done();
            }
        });
        ib.emit('test');
    });
    it("should provide a chainable annotation method so that listeners get listener annotations", function (done) {
        var ib = new IronBeam.EventEmitter();
        var test = {
            some: "data"
        };
        var testAnno = {
            some: "annotation"
        };
        ib.annotate(testAnno).on('test', function (req, cb, anno) {
            expect(req.some).to.be.equal(test.some);
            expect(!_.isUndefined(anno)).to.be.true;
            expect(anno.some).to.be.equal(testAnno.some);
            cb(null);
        });
        ib.emit('test', test, function () {
            done();
        });
    });
    it("should provide all listener's annotation objects to interceptors", function (done) {
        var ib = new IronBeam.EventEmitter();
        var test = {
            some: "data"
        };
        var testAnno1 = {
            some: "annotation",
            anno1: "data"
        };
        var testAnno2 = {
            some: "annotation",
            anno2: "data"
        };
        var preEmit = false;
        var preListen1 = false;
        var listen1 = false;
        var postListen1 = false;
        var preListen2 = false;
        var listen2 = false;
        var postListen2 = false;
        ib.annotate(testAnno1).on('test', function (anno) {
            expect(anno.some).to.be.equal(testAnno1.some);
            expect(anno.anno1).to.be.equal(testAnno1.anno1);
            expect(_.isUndefined(anno.anno2)).to.be.true;
            expect(preEmit).to.be.true;
            expect(preListen1).to.be.true;
            listen1 = true;
        });
        ib.annotate(testAnno2).on('test', function (anno) {
            expect(anno.some).to.be.equal(testAnno2.some);
            expect(anno.anno2).to.be.equal(testAnno2.anno2);
            expect(_.isUndefined(anno.anno1)).to.be.true;
            expect(preEmit).to.be.true;
            expect(preListen1).to.be.true;
            expect(listen1).to.be.true;
            expect(postListen1).to.be.true;
            expect(preListen2).to.be.true;
            listen2 = true;
        });
        ib.intercept('test', {
            preEmit: function (stop, next, anno) {
                var args = [];
                for (var _i = 3; _i < arguments.length; _i++) {
                    args[_i - 3] = arguments[_i];
                }
                expect(anno.some).to.be.equal(testAnno1.some);
                expect(anno.anno1).to.be.equal(testAnno1.anno1);
                expect(anno.anno2).to.be.equal(testAnno2.anno2);
                expect(args.length).to.be.equal(0);
                preEmit = true;
                next(args);
            },
            preListener: function (stop, next, anno) {
                var args = [];
                for (var _i = 3; _i < arguments.length; _i++) {
                    args[_i - 3] = arguments[_i];
                }
                expect(anno.some).to.be.equal(testAnno1.some);
                expect(anno.anno1).to.be.equal(testAnno1.anno1);
                expect(anno.anno2).to.be.equal(testAnno2.anno2);
                expect(args.length).to.be.equal(0);
                expect(preEmit).to.be.true;
                if (!preListen1) {
                    preListen1 = true;
                }
                else {
                    expect(postListen1).to.be.true;
                    preListen2 = true;
                }
                next(args);
            },
            postListener: function (stop, next, anno) {
                var args = [];
                for (var _i = 3; _i < arguments.length; _i++) {
                    args[_i - 3] = arguments[_i];
                }
                expect(anno.some).to.be.equal(testAnno1.some);
                expect(anno.anno1).to.be.equal(testAnno1.anno1);
                expect(anno.anno2).to.be.equal(testAnno2.anno2);
                expect(args.length).to.be.equal(0);
                expect(preEmit).to.be.true;
                expect(preListen1).to.be.true;
                if (!postListen1) {
                    postListen1 = true;
                }
                else {
                    expect(listen1).to.be.true;
                    expect(postListen1).to.be.true;
                    expect(preListen2).to.be.true;
                    expect(listen2).to.be.true;
                    postListen2 = true;
                }
                next();
            },
            postEmit: function (stop, next, anno) {
                var args = [];
                for (var _i = 3; _i < arguments.length; _i++) {
                    args[_i - 3] = arguments[_i];
                }
                expect(anno.some).to.be.equal(testAnno1.some);
                expect(anno.anno1).to.be.equal(testAnno1.anno1);
                expect(anno.anno2).to.be.equal(testAnno2.anno2);
                expect(preEmit).to.be.true;
                expect(preListen1).to.be.true;
                expect(listen1).to.be.true;
                expect(postListen1).to.be.true;
                expect(preListen2).to.be.true;
                expect(listen2).to.be.true;
                expect(postListen2).to.be.true;
                next();
                done();
            }
        });
        ib.emit('test');
    });
    it("should provide a chainable annotation method so that listeners get emit annotations", function (done) {
        var ib = new IronBeam.EventEmitter();
        var test = {
            some: "data"
        };
        var testAnno = {
            some: "annotation"
        };
        ib.on('test', function (req, cb, anno) {
            expect(req.some).to.be.equal(test.some);
            expect(!_.isUndefined(anno)).to.be.true;
            expect(anno.some).to.be.equal(testAnno.some);
            cb(null);
        });
        ib.annotate(testAnno).emit('test', test, function () {
            done();
        });
    });
    it("should provide a chainable annotation method so that listeners get listener and emitter annotations", function (done) {
        var ib = new IronBeam.EventEmitter();
        var test = {
            some: "data"
        };
        var listenerAnno = {
            listener: "anno"
        };
        var emitAnno = {
            emitter: "anno"
        };
        ib.annotate(listenerAnno).on('test', function (req, cb, anno) {
            expect(req.some).to.be.equal(test.some);
            expect(!_.isUndefined(anno)).to.be.true;
            expect(anno.listener).to.be.equal(listenerAnno.listener);
            expect(anno.emitter).to.be.equal(emitAnno.emitter);
            cb(null);
        });
        ib.annotate(emitAnno).emit('test', test, function () {
            done();
        });
    });
    it("should provide all listener's and emitter's annotation objects to interceptors", function (done) {
        var ib = new IronBeam.EventEmitter();
        var test = {
            some: "data"
        };
        var listenerAnno = {
            listener: "anno"
        };
        var emitAnno = {
            emitter: "anno"
        };
        ib.annotate(listenerAnno).on('test', function (cb, anno) {
            cb(null, test);
        });
        var count = 0;
        ib.intercept('test', {
            preEmit: function (stop, next, anno) {
                var args = [];
                for (var _i = 3; _i < arguments.length; _i++) {
                    args[_i - 3] = arguments[_i];
                }
                expect(!_.isUndefined(anno)).to.be.true;
                expect(anno.listener).to.be.equal(listenerAnno.listener);
                expect(anno.emitter).to.be.equal(emitAnno.emitter);
                next(args);
                count++;
            },
            preListener: function (stop, next, anno) {
                var args = [];
                for (var _i = 3; _i < arguments.length; _i++) {
                    args[_i - 3] = arguments[_i];
                }
                expect(!_.isUndefined(anno)).to.be.true;
                expect(anno.listener).to.be.equal(listenerAnno.listener);
                expect(anno.emitter).to.be.equal(emitAnno.emitter);
                next(args);
                count++;
            },
            postListener: function (stop, next, anno) {
                var args = [];
                for (var _i = 3; _i < arguments.length; _i++) {
                    args[_i - 3] = arguments[_i];
                }
                expect(!_.isUndefined(anno)).to.be.true;
                expect(anno.listener).to.be.equal(listenerAnno.listener);
                expect(anno.emitter).to.be.equal(emitAnno.emitter);
                next();
                count++;
            },
            postEmit: function (stop, next, anno) {
                expect(!_.isUndefined(anno)).to.be.true;
                expect(anno.listener).to.be.equal(listenerAnno.listener);
                expect(anno.emitter).to.be.equal(emitAnno.emitter);
                expect(count).to.be.equal(3);
                next();
                done();
            }
        });
        ib.annotate(emitAnno).emit('test', function (e, res) {
            expect(res.some).to.be.equal(test.some);
        });
    });
    it("should provide the arguments to postEmit interceptors", function (done) {
        var ib = new IronBeam.EventEmitter();
        var test = {
            some: "data"
        };
        ib.on('test', function (anno) {
        });
        ib.intercept('test', {
            postEmit: function (stop, next, anno) {
                var args = [];
                for (var _i = 3; _i < arguments.length; _i++) {
                    args[_i - 3] = arguments[_i];
                }
                expect(args).to.be.an('array');
                expect(args.length).to.be.equal(1);
                expect(args[0].some).to.be.equal(test.some);
                next();
                done();
            }
        });
        ib.emit('test', test);
    });
    it("should provide the arguments to postEmit interceptors when there are no listeners", function (done) {
        var ib = new IronBeam.EventEmitter();
        var test = {
            some: "data"
        };
        ib.intercept('test', {
            postEmit: function (stop, next, anno) {
                var args = [];
                for (var _i = 3; _i < arguments.length; _i++) {
                    args[_i - 3] = arguments[_i];
                }
                expect(args).to.be.an('array');
                expect(args.length).to.be.equal(1);
                expect(args[0].some).to.be.equal(test.some);
                next();
                done();
            }
        });
        ib.emit('test', test);
    });
    it("should provide 'annotatedListeners' method that returns an array of listeners for the given event name whose annotations match", function (done) {
        var ib = new IronBeam.EventEmitter();
        ib.once('not-test', function () { });
        ib.annotate({
            x: 1,
            y: 1
        }).once('not-test-wrong-anno', function () { });
        ib.annotate({
            x: 0,
            y: 1
        }).once('not-test-right-anno', function () { });
        ib.once('test', function () { });
        ib.annotate({
            x: 1,
            y: 1
        }).once('test', function () { });
        ib.annotate({
            x: 0,
            y: 1
        }).once('test', function () { });
        var testAnyAnno = ib.annotatedListeners('test');
        var testXAnno = ib.annotatedListeners('test', {
            x: 0
        });
        expect(testAnyAnno.length).to.be.equal(2);
        expect(testXAnno.length).to.be.equal(1);
        done();
    });
    it("should provide 'allAnnotatedListeners' method that returns an array of listeners whose annotations match", function (done) {
        var ib = new IronBeam.EventEmitter();
        ib.once('not-test', function () { });
        ib.annotate({
            x: 1,
            y: 1
        }).once('not-test-wrong-anno', function () { });
        ib.annotate({
            x: 0,
            y: 1
        }).once('not-test-right-anno', function () { });
        ib.once('test', function () { });
        ib.annotate({
            x: 1,
            y: 1
        }).once('test', function () { });
        ib.annotate({
            x: 0,
            y: 1
        }).once('test', function () { });
        var allAnno = ib.allAnnotatedListeners();
        var allXAnno = ib.allAnnotatedListeners({
            x: 0
        });
        expect(allAnno.length).to.be.equal(4);
        expect(allXAnno.length).to.be.equal(2);
        done();
    });
    it("should provide 'removeAnnotatedListeners' method that removes any listeners for the given event name whose annotations match", function (done) {
        var ib = new IronBeam.EventEmitter();
        ib.once('not-test', function () { });
        ib.annotate({
            x: 1,
            y: 1
        }).once('not-test-wrong-anno', function () { });
        ib.annotate({
            x: 0,
            y: 1
        }).once('not-test-right-anno', function () { });
        ib.once('test', function () { });
        ib.annotate({
            x: 1,
            y: 1
        }).once('test', function () { });
        ib.annotate({
            x: 0,
            y: 1
        }).once('test', function () { });
        ib.removeAnnotatedListeners('test', {
            x: 0
        });
        var testXAnno = ib.annotatedListeners('test', {
            x: 0
        });
        expect(testXAnno.length).to.be.equal(0);
        ib.removeAnnotatedListeners('test');
        var testAnno = ib.annotatedListeners('test');
        expect(testAnno.length).to.be.equal(0);
        done();
    });
    it("should provide 'removeAllAnnotatedListeners' method that removes any listeners whose annotations match", function (done) {
        var ib = new IronBeam.EventEmitter();
        ib.once('not-test', function () { });
        ib.annotate({
            x: 0,
            y: 1
        }).once('not-test-wrong-anno', function () { });
        ib.annotate({
            x: 1,
            y: 1
        }).once('not-test-right-anno', function () { });
        ib.once('test', function () { });
        ib.annotate({
            x: 1,
            y: 1
        }).once('test', function () { });
        ib.annotate({
            x: 0,
            y: 1
        }).once('test', function () { });
        ib.removeAllAnnotatedListeners({
            x: 0
        });
        var xAnno = ib.allAnnotatedListeners({
            x: 0
        });
        expect(xAnno.length).to.be.equal(0);
        ib.removeAllAnnotatedListeners();
        var anyAnno = ib.allAnnotatedListeners();
        expect(anyAnno.length).to.be.equal(0);
        done();
    });
});
//# sourceMappingURL=iron-beam.test.js.map