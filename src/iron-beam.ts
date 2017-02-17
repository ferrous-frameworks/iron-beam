
import _ = require('lodash');
import async = require('async');

import IronTree = require('iron-tree');

/**
 * Type for IronBeam initialization options
 */
export interface IIronBeamOptions {
    defaultMaxListeners?: number;
    delimiter?: string;
    wildcard?: string;
    globalWildcardMatch?: boolean;
    cascadingWildcardMatch?: boolean;
}

/**
 * Type for Listeners
 */
export interface IListener {
    event: string;
    annotation: any;
    method: Function;
    prepend: boolean;
    onlyOnce: boolean;
}

/**
 * Interface for PreIntercept lifecycle step
 */
export interface IPreIntercept {
    (
        stop: () => void,
        next: (args?: any[]) => void,
        annotation: any,
        ...args: any[]
    ): void;
}

/**
 * Interface for PostIntercept lifecycle step
 */
export interface IPostIntercept {
    (
        stop: () => void,
        next: () => void,
        annotation: any,
        ...args: any[]
    ): void;
}

/**
 * Interface for IInterceptors
 */
export interface IInterceptors {
    preEmit?: IPreIntercept;
    preListener?: IPreIntercept;
    postListener?: IPostIntercept;
    postEmit?: IPostIntercept;
}

/**
 * Interface for IIntercept
 */
interface IIntercept {
    event: string;
    interceptors: IInterceptors;
}

/**
 * Interface for IEventEmitter
 */
export interface IEventEmitter {
    defaultMaxListeners: number;
    Domain: any; //deprecated
    
    getMaxListeners(): number;
    setMaxListeners(max: number): IEventEmitter;
    annotate(anno: any): IEventEmitter;
    on(eventName: string, method: Function): IEventEmitter;
    addListener(eventName: string, method: Function): IEventEmitter;
    prependListener(eventName: string, method: Function): EventEmitter;
    once(eventName: string, method: Function): IEventEmitter;
    prependOnceListener(eventName: string, method: Function): EventEmitter;
    emit(eventName: string, ...args: any[]): boolean;
    eventNames(): string[];
    intercept(eventName: string, interceptors: IInterceptors): IEventEmitter;
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
    listenerCount(eventName: string): number;
    dispose(callback?: () => void): void;
}

var defaultMaxListeners = 10;

/**
 * This is the primary class in IronBeam.
 * This class should be used as a replacement for events.EventEmitter in node
 * Please see (https://nodejs.org/dist/latest-v6.x/docs/api/events.html#events_emitter_listeners_eventname) for the node EventEmitter API
 */
export class EventEmitter implements IEventEmitter {
    private annotation: any;
    private _maxListeners: number;
    private wildcard: string;
    private delimiter: string;
    private globalWildcardMatch: boolean;
    private cascadingWildcardMatch: boolean;

    private listenerTree: IronTree.Tree<IListener>;
    private interceptorTree: IronTree.Tree<IIntercept>;
    
    public Domain: any;
    
    public defaultMaxListeners: number;
    public static defaultMaxListeners: number = defaultMaxListeners;

    /**
     * @param opts optional IIronBeamOptions.
     */
    constructor(opts?: IIronBeamOptions) {
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

        this.listenerTree = new IronTree.Tree<IListener>({
            delimiter: this.delimiter,
            wildcard: this.wildcard,
            globalWildcardMatch: this.globalWildcardMatch,
            cascadingWildcardMatch: this.cascadingWildcardMatch
        });
        this.interceptorTree = new IronTree.Tree<IIntercept>({
            delimiter: this.delimiter,
            wildcard: this.wildcard,
            globalWildcardMatch: this.globalWildcardMatch,
            cascadingWildcardMatch: this.cascadingWildcardMatch
        });
        
        this.Domain = null; //deprecated
    }
    
    public getMaxListeners(): number {
        return this._maxListeners == void 0 ? defaultMaxListeners : this._maxListeners;
    }

    public setMaxListeners(max: number): EventEmitter {
        this._maxListeners = max;
        return this;
    }

    /**
     * ´annotate´ allows an object to be set for any listener/emitter that will be available in any ´anno´ property.
     * @param anno ´anno´ is any object that needs to used by listeners/emitters/interceptors
     * @returns Returns EventEmitter for chaining.
     */
    public annotate(anno: any): EventEmitter {
        this.annotation = _.cloneDeep(anno);
        return this;
    }

    public on(eventName: string, method: Function): EventEmitter {
        this.addNewListener({
            event: eventName,
            method: method,
            annotation: _.cloneDeep(this.annotation),
            prepend: false,
            onlyOnce: false
        }, method);
        return this;
    }
    public addListener(eventName: string, method: Function): EventEmitter {
        return this.on(eventName, method);
    }
    public prependListener(eventName: string, method: Function): EventEmitter {
        this.addNewListener({
            event: eventName,
            method: method,
            annotation: _.cloneDeep(this.annotation),
            prepend: true,
            onlyOnce: false
        }, method);
        return this;
    }

    public once(eventName: string, method: Function): EventEmitter {
        this.addNewListener({
            event: eventName,
            method: method,
            annotation: _.cloneDeep(this.annotation),
            prepend: false,
            onlyOnce: true
        }, method);
        return this;
    }
    public prependOnceListener(eventName: string, method: Function): EventEmitter {
        this.addNewListener({
            event: eventName,
            method: method,
            annotation: _.cloneDeep(this.annotation),
            prepend: true,
            onlyOnce: true
        }, method);
        return this;
    }

    private addNewListener(listener: IListener, method: Function) {
        this.annotation = {};
        var count = this.listenerCount(listener.event);
        if (++count > this.getMaxListeners()) {
            this.emit('tooManyListeners', listener.event, count, listener);
            console.error('(iron-beam) warning: possible EventEmitter memory ' +
                'leak detected. %d %s listeners added. ' +
                'Use emitter.setMaxListeners() to increase limit.',
                count, listener.event);
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
    }

    public emit(eventName: string, ...args: any[]): boolean {
        var allListeners = this.listenerTree.get(eventName);
        if (allListeners.length === 0 && eventName === 'error') {
            throw new Error('Uncaught, unspecified "error" event.');
        }
        var intercepts = this.interceptorTree.get(eventName);
        var emitAnno = _.cloneDeep(this.annotation);
        this.annotation = {};
        var listeners = _.filter(allListeners, (listener) => {
            return listener.event !== this.wildcard || eventName !== 'newListener'
        });
        var eventMeta = {
            eventMeta: {
                name: eventName,
                sections: eventName.split(this.delimiter)
            }
        };
        var interceptorAnno = _.merge.apply(_, _.cloneDeep((<any>_).pluck(listeners, 'annotation')).concat([ emitAnno ]).concat([ eventMeta ]));
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
                            var listenerAnno = _.merge(_.cloneDeep(listener.annotation), emitAnno, eventMeta);
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
    
    public eventNames(): string[] {
        var listeners = this.allListeners();
        return <string[]>_.map(listeners, 'event');
    }

    /**
     * ´intercept´ allows an object to be set for any listener/emitter that will be available in any ´anno´ property.
     * @param eventName `eventName` the event name to intercept
     * @param interceptors `interceptors` [comment]
     * * @returns EventEmitter for chaining.
     */
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

    /**
     * `removeAnnotatedListeners` [comment]
     */
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

    /**
     * `removeAllAnnotatedListeners` [comment]
     */
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

    /**
     * `hasListener` [comment]
     */
    public hasListener(eventName: string): boolean {
        return this.listeners(eventName).length > 0;
    }

    /**
     * `annotatedListeners` [comment]
     */
    public annotatedListeners(eventName: string, anno?: any): IListener[] {
        return this.allAnnotatedListeners(anno, eventName);
    }

    /**
     * `allListeners` [comment]
     */
    public allListeners(): IListener[] {
        return this.listenerTree.getAll();
    }

    /**
     * `allAnnotatedListeners` [comment]
     */
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

    /**
     * `allInterceptors` [comment]
     */
    public allInterceptors(): IInterceptors[] {
        return this.interceptorTree.getAll();
    }
    
    public static listenerCount(emitter: EventEmitter, eventName: string): number {
        console.warn('Deprecated: Use emitter.listenerCount(eventName) instead');
        return emitter.listeners(eventName).length;
    }
    public listenerCount(eventName: string): number {
        return this.listeners(eventName).length;
    }

    /**
     * `dispose` [comment]
     */
    public dispose(callback?: () => void): void {
        this.listenerTree.remove();
        this.interceptorTree.remove();
        if (!_.isUndefined(callback)) {
            process.nextTick(() => {
                callback();
            });
        }
    }
}
