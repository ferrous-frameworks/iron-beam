"use strict";
var _ = require('lodash');
var async = require('async');
var IronTree = require('iron-tree');
var defaultMaxListeners = 10;
/**
 * This is the primary class in IronBeam.
 * This class should be used as a replacement for events.EventEmitter in node
 * Please see (https://nodejs.org/dist/latest-v6.x/docs/api/events.html#events_emitter_listeners_eventname) for the node EventEmitter API
 */
var EventEmitter = (function () {
    /**
     * @param opts optional IIronBeamOptions.
     */
    function EventEmitter(opts) {
        var defs = {
            defaultMaxListeners: defaultMaxListeners,
            delimiter: '.',
            wildcard: '*',
            globalWildcardMatch: false,
            cascadingWildcardMatch: false
        };
        if (_.isUndefined(opts)) {
            opts = {};
        }
        opts = _.merge(defs, opts);
        this.defaultMaxListeners = opts.defaultMaxListeners;
        this.wildcard = opts.wildcard;
        this.delimiter = opts.delimiter;
        this.cascadingWildcardMatch = opts.cascadingWildcardMatch;
        this.globalWildcardMatch = opts.globalWildcardMatch;
        this.annotation = {};
        this.listenerTree = new IronTree.Tree({
            delimiter: this.delimiter,
            wildcard: this.wildcard,
            globalWildcardMatch: this.globalWildcardMatch,
            cascadingWildcardMatch: this.cascadingWildcardMatch
        });
        this.interceptorTree = new IronTree.Tree({
            delimiter: this.delimiter,
            wildcard: this.wildcard,
            globalWildcardMatch: this.globalWildcardMatch,
            cascadingWildcardMatch: this.cascadingWildcardMatch
        });
        this.Domain = null; //deprecated
    }
    EventEmitter.prototype.getMaxListeners = function () {
        return this._maxListeners == void 0 ? defaultMaxListeners : this._maxListeners;
    };
    EventEmitter.prototype.setMaxListeners = function (max) {
        this._maxListeners = max;
        return this;
    };
    /**
     * ´annotate´ allows an object to be set for any listener/emitter that will be available in any ´anno´ property.
     * @param anno ´anno´ is any object that needs to used by listeners/emitters/interceptors
     * @returns Returns EventEmitter for chaining.
     */
    EventEmitter.prototype.annotate = function (anno) {
        this.annotation = _.cloneDeep(anno);
        return this;
    };
    EventEmitter.prototype.on = function (eventName, method) {
        this.addNewListener({
            event: eventName,
            method: method,
            annotation: _.cloneDeep(this.annotation),
            prepend: false,
            onlyOnce: false
        }, method);
        return this;
    };
    EventEmitter.prototype.addListener = function (eventName, method) {
        return this.on(eventName, method);
    };
    EventEmitter.prototype.prependListener = function (eventName, method) {
        this.addNewListener({
            event: eventName,
            method: method,
            annotation: _.cloneDeep(this.annotation),
            prepend: true,
            onlyOnce: false
        }, method);
        return this;
    };
    EventEmitter.prototype.once = function (eventName, method) {
        this.addNewListener({
            event: eventName,
            method: method,
            annotation: _.cloneDeep(this.annotation),
            prepend: false,
            onlyOnce: true
        }, method);
        return this;
    };
    EventEmitter.prototype.prependOnceListener = function (eventName, method) {
        this.addNewListener({
            event: eventName,
            method: method,
            annotation: _.cloneDeep(this.annotation),
            prepend: true,
            onlyOnce: true
        }, method);
        return this;
    };
    EventEmitter.prototype.addNewListener = function (listener, method) {
        this.annotation = {};
        var count = this.listenerCount(listener.event);
        if (++count > this.getMaxListeners()) {
            this.emit('tooManyListeners', listener.event, count, listener);
            console.error('(iron-beam) warning: possible EventEmitter memory ' +
                'leak detected. %d %s listeners added. ' +
                'Use emitter.setMaxListeners() to increase limit.', count, listener.event);
            console.trace();
        }
        if (listener.prepend) {
            this.listenerTree.prepend(listener.event, listener);
        }
        else {
            this.listenerTree.add(listener.event, listener);
        }
        this.emit('newListener', listener.event, method, listener);
        return this;
    };
    EventEmitter.prototype.emit = function (eventName) {
        var _this = this;
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        var allListeners = this.listenerTree.get(eventName);
        if (allListeners.length === 0 && eventName === 'error') {
            throw new Error('Uncaught, unspecified "error" event.');
        }
        var intercepts = this.interceptorTree.get(eventName);
        var emitAnno = _.cloneDeep(this.annotation);
        this.annotation = {};
        var listeners = _.filter(allListeners, function (listener) {
            return listener.event !== _this.wildcard || eventName !== 'newListener';
        });
        var eventMeta = {
            eventMeta: {
                name: eventName,
                sections: eventName.split(this.delimiter)
            }
        };
        var interceptorAnno = _.merge.apply(_, _.cloneDeep(_.pluck(listeners, 'annotation')).concat([emitAnno]).concat([eventMeta]));
        _.each(listeners, function (listener) {
            if (listener.onlyOnce) {
                _this.removeListener(eventName, listener.method);
            }
        });
        async.waterfall([
            function (cb) {
                _this.callPre('preEmit', intercepts, interceptorAnno, args, function (e, preEmitResult) {
                    if (!preEmitResult.stop) {
                        cb(e, preEmitResult.args);
                    }
                });
            },
            function (args, cb) {
                var finalArgs;
                async.eachSeries(listeners, function (listener, cb) {
                    async.waterfall([
                        function (cb) {
                            _this.callPre('preListener', intercepts, interceptorAnno, args, function (e, preListenerResult) {
                                if (!preListenerResult.stop) {
                                    cb(e, preListenerResult.args);
                                }
                            });
                        },
                        function (args, cb) {
                            var listenerAnno = _.merge(_.cloneDeep(listener.annotation), emitAnno, eventMeta);
                            listener.method.apply(listener, args.concat([listenerAnno]));
                            _this.callPost('postListener', intercepts, interceptorAnno, args, function (e, postListenerResult) {
                                if (!postListenerResult.stop) {
                                    finalArgs = args;
                                    cb(e);
                                }
                            });
                        }
                    ], function (e) {
                        cb(e);
                    });
                }, function (e) {
                    if (e !== null) {
                        cb(e);
                    }
                    else {
                        if (_.isUndefined(finalArgs)) {
                            finalArgs = args;
                        }
                        _this.callPost('postEmit', intercepts, interceptorAnno, finalArgs, function (e) {
                            cb(e);
                        });
                    }
                });
            }
        ], function (e) {
            if (e !== null) {
                throw e;
            }
        });
        return listeners.length > 0;
    };
    EventEmitter.prototype.eventNames = function () {
        var listeners = this.allListeners();
        return _.map(listeners, 'event');
    };
    /**
     * ´intercept´ allows an object to be set for any listener/emitter that will be available in any ´anno´ property.
     * @param eventName `eventName` the event name to intercept
     * @param interceptors `interceptors` [comment]
     * * @returns EventEmitter for chaining.
     */
    EventEmitter.prototype.intercept = function (eventName, interceptors) {
        this.interceptorTree.add(eventName, {
            event: eventName,
            interceptors: interceptors
        });
        return this;
    };
    EventEmitter.prototype.callPre = function (method, intercepts, anno, args, cb) {
        var _this = this;
        var stop = false;
        async.eachSeries(intercepts, function (intercept, cb) {
            if (!stop) {
                if (!_.isUndefined(intercept.interceptors[method])) {
                    intercept.interceptors[method].apply(_this, [
                        function () {
                            stop = true;
                            cb(null);
                        },
                        function (modifiedArgs) {
                            if (!_.isUndefined(modifiedArgs)) {
                                args = modifiedArgs;
                            }
                            cb(null);
                        },
                        anno
                    ].concat(args));
                }
                else {
                    cb(null);
                }
            }
        }, function (e) {
            cb(e, {
                stop: stop,
                args: args
            });
        });
    };
    EventEmitter.prototype.callPost = function (method, intercepts, anno, args, cb) {
        var _this = this;
        var stop = false;
        async.eachSeries(intercepts, function (intercept, cb) {
            if (!stop) {
                if (!_.isUndefined(intercept.interceptors[method])) {
                    intercept.interceptors[method].apply(_this, [
                        function () {
                            stop = true;
                            cb(null);
                        }, function () {
                            cb(null);
                        }, anno
                    ].concat(args));
                }
                else {
                    cb(null);
                }
            }
        }, function (e) {
            cb(e, {
                stop: stop
            });
        });
    };
    EventEmitter.prototype.removeListener = function (eventName, method) {
        var listeners = this.listenerTree.get(eventName);
        var listenerToRemove = _.find(listeners, function (listener) {
            return listener.method === method;
        });
        if (!_.isUndefined(listenerToRemove)) {
            this.emit('removeListener', eventName, method, listenerToRemove);
            this.listenerTree.remove(eventName, listenerToRemove);
        }
        return this;
    };
    /**
     * `removeAnnotatedListeners` [comment]
     */
    EventEmitter.prototype.removeAnnotatedListeners = function (eventName, anno) {
        return this.removeAllAnnotatedListeners(anno, eventName);
    };
    EventEmitter.prototype.removeAllListeners = function (eventName) {
        var listeners = _.isUndefined(eventName)
            ? this.listenerTree.getAll()
            : this.listenerTree.get(eventName);
        var instance = this;
        _.each(listeners, function (listener) {
            instance.removeListener(listener.event, listener.method);
        });
        return this;
    };
    /**
     * `removeAllAnnotatedListeners` [comment]
     */
    EventEmitter.prototype.removeAllAnnotatedListeners = function (anno, eventName) {
        var _this = this;
        var listeners = this.allAnnotatedListeners(anno, eventName);
        _.each(listeners, function (l) {
            _this.removeListener(l.event, l.method);
        });
        return this;
    };
    EventEmitter.prototype.listeners = function (eventName) {
        var listeners = this.listenerTree.get(eventName);
        return _.pluck(listeners, 'method');
    };
    /**
     * `hasListener` [comment]
     */
    EventEmitter.prototype.hasListener = function (eventName) {
        return this.listeners(eventName).length > 0;
    };
    /**
     * `annotatedListeners` [comment]
     */
    EventEmitter.prototype.annotatedListeners = function (eventName, anno) {
        return this.allAnnotatedListeners(anno, eventName);
    };
    /**
     * `allListeners` [comment]
     */
    EventEmitter.prototype.allListeners = function () {
        return this.listenerTree.getAll();
    };
    /**
     * `allAnnotatedListeners` [comment]
     */
    EventEmitter.prototype.allAnnotatedListeners = function (anno, eventName) {
        var listeners = _.isUndefined(eventName) ? this.listenerTree.getAll() : this.listenerTree.get(eventName);
        return _.filter(listeners, function (l) {
            if (_.isUndefined(anno)) {
                return _.keys(l.annotation).length > 0;
            }
            return _.every(_.keys(anno), function (k) {
                return !_.isUndefined(l.annotation[k])
                    && _.isEqual(l.annotation[k], anno[k]);
            });
        });
    };
    /**
     * `allInterceptors` [comment]
     */
    EventEmitter.prototype.allInterceptors = function () {
        return this.interceptorTree.getAll();
    };
    EventEmitter.listenerCount = function (emitter, eventName) {
        console.warn('Deprecated: Use emitter.listenerCount(eventName) instead');
        return emitter.listeners(eventName).length;
    };
    EventEmitter.prototype.listenerCount = function (eventName) {
        return this.listeners(eventName).length;
    };
    /**
     * `dispose` [comment]
     */
    EventEmitter.prototype.dispose = function (callback) {
        this.listenerTree.remove();
        this.interceptorTree.remove();
        if (!_.isUndefined(callback)) {
            process.nextTick(function () {
                callback();
            });
        }
    };
    EventEmitter.defaultMaxListeners = defaultMaxListeners;
    return EventEmitter;
}());
exports.EventEmitter = EventEmitter;
//# sourceMappingURL=iron-beam.js.map