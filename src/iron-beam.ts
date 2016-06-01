
import _ = require('lodash');
import async = require('async');

import IronTree = require('iron-tree');

export interface IIronBeamOptions {
    defaultMaxListeners?: number;
    delimiter?: string;
    wildcard?: string;
}

export interface IListener {
    event: string;
    annotation: any;
    method: Function;
    onlyOnce: boolean;
}

export interface IPreIntercept {
    (
        stop: () => void,
        next: (args?: any[]) => void,
        annotation: any,
        ...args: any[]
    ): void;
}

export interface IPostIntercept {
    (
        stop: () => void,
        next: () => void,
        annotation: any,
        ...args: any[]
    ): void;
}

export interface IInterceptors {
    preEmit?: IPreIntercept;
    preListener?: IPreIntercept;
    postListener?: IPostIntercept;
    postEmit?: IPostIntercept;
}

interface IIntercept {
    event: string;
    interceptors: IInterceptors;
}

export interface IEventEmitter {
    defaultMaxListeners: number;

    setMaxListeners(max: number): IEventEmitter;
    annotate(anno: any): IEventEmitter;
    on(eventName: string, method: Function): IEventEmitter;
    addListener(eventName: string, method: Function): IEventEmitter;
    once(eventName: string, method: Function): IEventEmitter;
    emit(eventName: string, ...args: any[]): boolean;
    removeListener(eventName: string, method: Function): IEventEmitter;
    removeAnnotatedListeners(eventName: string, anno?: any): IEventEmitter;
    removeAllListeners(eventName?: string): IEventEmitter;
    removeAllAnnotatedListeners(anno?: any, eventName?: string): IEventEmitter;
    listeners(eventName: string): Function[];
    hasListener(eventName: string): boolean;
    annotatedListeners(eventName: string, anno?: any): IListener[];
    allListeners(): IListener[];
    allAnnotatedListeners(anno?: any, eventName?: string): IListener[];
    allInterceptors(): IInterceptors[];

    intercept(eventName: string, interceptors: IInterceptors): IEventEmitter;
}

export class EventEmitter implements IEventEmitter {
    private annotation: any;
    private maxListeners: number;
    private wildcard: string;
    private delimiter: string;

    private listenerTree: IronTree.Tree<IListener>;
    private interceptorTree: IronTree.Tree<IIntercept>;

    public defaultMaxListeners: number;

    constructor(opts?: IIronBeamOptions) {
        var defs = {
            defaultMaxListeners: 10,
            delimiter: '.',
            wildcard: '*'
        };
        if (_.isUndefined(opts)) {
            opts = {};
        }
        opts = _.merge(defs, opts);
        this.maxListeners = opts.defaultMaxListeners;
        this.defaultMaxListeners = opts.defaultMaxListeners;
        this.wildcard = opts.wildcard;
        this.delimiter = opts.delimiter;

        this.annotation = {};

        this.listenerTree = new IronTree.Tree<IListener>();
        this.interceptorTree = new IronTree.Tree<IIntercept>();
    }

    public setMaxListeners(max: number): EventEmitter {
        this.maxListeners = max;
        return this;
    }

    public annotate(anno: any): EventEmitter {
        this.annotation = _.cloneDeep(anno);
        return this;
    }

    public on(eventName: string, method: Function): EventEmitter {
        this.addNewListener({
            event: eventName,
            method: method,
            annotation: _.cloneDeep(this.annotation),
            onlyOnce: false
        }, method);
        return this;
    }
    public addListener(eventName: string, method: Function): EventEmitter {
        return this.on(eventName, method);
    }

    public once(eventName: string, method: Function): EventEmitter {
        this.addNewListener({
            event: eventName,
            method: method,
            annotation: _.cloneDeep(this.annotation),
            onlyOnce: true
        }, method);
        return this;
    }

    private addNewListener(listener: IListener, method: Function) {
        this.annotation = {};
        var count = EventEmitter.listenerCount(this, listener.event);
        if (++count > this.maxListeners) {
            this.emit('tooManyListeners', listener.event, count, listener);
            console.error('(iron-beam) warning: possible EventEmitter memory ' +
                'leak detected. %d %s listeners added. ' +
                'Use emitter.setMaxListeners() to increase limit.',
                count, listener.event);
            console.trace();
        }
        this.listenerTree.add(listener.event, listener);
        this.emit('newListener', listener.event, method, listener);
        return this;
    }

    public emit(eventName: string, ...args: any[]): boolean {
        var listeners = this.listenerTree.get(eventName);
        if (listeners.length === 0 && eventName === 'error') {
            throw new Error('Uncaught, unspecified "error" event.');
        }
        var intercepts = this.interceptorTree.get(eventName);
        var emitAnno = _.cloneDeep(this.annotation);
        this.annotation = {};
        var interceptorAnno = _.merge.apply(_, _.cloneDeep((<any>_).pluck(listeners, 'annotation')).concat([ emitAnno ]));
        _.each(listeners, (listener) => {
            if (listener.onlyOnce) {
                this.removeListener(eventName, listener.method);
            }
        });
        async.waterfall([
            (cb) => {
                this.callPre('preEmit', intercepts, interceptorAnno, args, (e, preEmitResult) => {
                    if (!preEmitResult.stop) {
                        cb(e, preEmitResult.args);
                    }
                });
            },
            (args, cb) => {
                var finalArgs;
                async.eachSeries(listeners, (listener, cb) => {
                    async.waterfall([
                        (cb) => {
                            this.callPre('preListener', intercepts, interceptorAnno, args, (e, preListenerResult) => {
                                if (!preListenerResult.stop) {
                                    cb(e, preListenerResult.args);
                                }
                            });
                        },
                        (args, cb) => {
                            var listenerAnno = _.merge(_.cloneDeep(listener.annotation), emitAnno);
                            listener.method.apply(listener, args.concat([ listenerAnno ]));
                            this.callPost('postListener', intercepts, interceptorAnno, args, (e, postListenerResult) => {
                                if (!postListenerResult.stop) {
                                    finalArgs = args;
                                    cb(e);
                                }
                            });
                        }
                    ], (e) => {
                        cb(e);
                    });
                }, (e) => {
                    if (e !== null) {
                        cb(e);
                    }
                    else {
                        if (_.isUndefined(finalArgs)) {
                            finalArgs = args;
                        }
                        this.callPost('postEmit', intercepts, interceptorAnno, finalArgs, (e) => {
                            cb(e);
                        });
                    }
                });
            }
        ], (e) => {
            if (e !== null) {
                throw e;
            }
        });
        return listeners.length > 0;
    }

    public intercept(eventName: string, interceptors: IInterceptors): IEventEmitter {
        this.interceptorTree.add(eventName, {
            event: eventName,
            interceptors: interceptors
        });
        return this;
    }

    private callPre(method: string, intercepts: IIntercept[], anno: any, args: any[], cb: (e: Error, result) => void) {
        var stop = false;
        async.eachSeries(intercepts, (intercept, cb) => {
            if (!stop) {
                if (!_.isUndefined(intercept.interceptors[method])) {
                    intercept.interceptors[method].apply(this, [
                        () => {
                            stop = true;
                            cb(null);
                        },
                        (modifiedArgs) => {
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
        }, (e) => {
            cb(e, {
                stop: stop,
                args: args
            });
        });
    }

    private callPost(method: string, intercepts: IIntercept[], anno: any, args: any[], cb: (e: Error, result?) => void) {
        var stop = false;
        async.eachSeries(intercepts, (intercept, cb) => {
            if (!stop) {
                if (!_.isUndefined(intercept.interceptors[method])) {
                    intercept.interceptors[method].apply(this, [
                        () => {
                            stop = true;
                            cb(null);
                        }, () => {
                            cb(null);
                        }, anno
                    ].concat(args));
                }
                else {
                    cb(null);
                }
            }
        }, (e) => {
            cb(e, {
                stop: stop
            });
        });
    }

    public removeListener(eventName: string, method: Function): IEventEmitter {
        var listeners = this.listenerTree.get(eventName);
        var listenerToRemove = _.find(listeners, (listener) => {
            return listener.method === method;
        });
        if (!_.isUndefined(listenerToRemove)) {
            this.emit('removeListener', eventName, method, listenerToRemove);
            this.listenerTree.remove(eventName, listenerToRemove);
        }
        return this;
    }

    public removeAnnotatedListeners(eventName: string, anno?: any): IEventEmitter {
        return this.removeAllAnnotatedListeners(anno, eventName);
    }

    public removeAllListeners(eventName?: string): IEventEmitter {
        var listeners = _.isUndefined(eventName)
            ? this.listenerTree.getAll()
            : this.listenerTree.get(eventName);
        var instance = this;
        _.each(listeners, (listener) => {
            instance.removeListener(listener.event, listener.method);
        });
        return this;
    }

    public removeAllAnnotatedListeners(anno?: any, eventName?: string): IEventEmitter {
        var listeners = this.allAnnotatedListeners(anno, eventName);
        _.each(listeners, (l: IListener) => {
            this.removeListener(l.event, l.method);
        });
        return this;
    }

    public listeners(eventName: string): Function[] {
        var listeners = this.listenerTree.get(eventName);
        return (<any>_).pluck(listeners, 'method');
    }

    public hasListener(eventName: string): boolean {
        return this.listeners(eventName).length > 0;
    }

    public annotatedListeners(eventName: string, anno?: any): IListener[] {
        return this.allAnnotatedListeners(anno, eventName);
    }

    public allListeners(): IListener[] {
        return this.listenerTree.getAll();
    }

    public allAnnotatedListeners(anno?: any, eventName?: string): IListener[] {
        var listeners = _.isUndefined(eventName) ? this.listenerTree.getAll() : this.listenerTree.get(eventName);
        return _.filter(listeners, (l) => {
            if (_.isUndefined(anno)) {
                return _.keys(l.annotation).length > 0;
            }
            return _.every(_.keys(anno), (k) => {
                return !_.isUndefined(l.annotation[k])
                    && _.isEqual(l.annotation[k], anno[k]);
            });

        });
    }

    public allInterceptors(): IInterceptors[] {
        return this.interceptorTree.getAll();
    }

    public dispose(callback?: () => void) {
        this.listenerTree.remove();
        this.interceptorTree.remove();
        if (!_.isUndefined(callback)) {
            process.nextTick(() => {
                callback();
            });
        }
    }

    public static listenerCount(emitter: EventEmitter, eventName: string): number {
        return emitter.listeners(eventName).length;
    }
}
