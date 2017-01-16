
/// <reference path='./typings/index.d.ts' />

declare module "iron-beam" {
	export interface IIronBeamOptions {
	    defaultMaxListeners?: number;
	    delimiter?: string;
	    wildcard?: string;
        globalWildcardMatch?: boolean;
        cascadingWildcardMatch?: boolean;
	}

	export interface IListener {
	    event: string;
	    annotation: any;
	    method: Function;
	    prepend: boolean;
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
	        annotation: any
	    ): void;
	}

	export interface IInterceptors {
	    preEmit?: IPreIntercept;
	    preListener?: IPreIntercept;
	    postListener?: IPostIntercept;
	    postEmit?: IPostIntercept;
	}

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

	export class EventEmitter implements IEventEmitter {
	    public defaultMaxListeners: number;

	    constructor (opts?: IIronBeamOptions);

	    public setMaxListeners(max: number): IEventEmitter;
	    public annotate(anno: any): IEventEmitter;
	    public on(eventName: string, method: Function): IEventEmitter;
	    public addListener(eventName: string, method: Function): IEventEmitter;
	    public once(eventName: string, method: Function): IEventEmitter;
	    public emit(eventName: string, ...args: any[]): boolean;
	    public removeListener(eventName: string, method: Function): IEventEmitter;
	    public removeAnnotatedListeners(eventName: string, anno?: any): IEventEmitter;
	    public removeAllListeners(eventName?: string): IEventEmitter;
	    public removeAllAnnotatedListeners(anno?: any, eventName?: string): IEventEmitter;
	    public listeners(eventName: string): Function[];
	    public hasListener(eventName: string): boolean;
	    public annotatedListeners(eventName: string, anno?: any): IListener[];
	    public allListeners(): IListener[];
	    public allAnnotatedListeners(anno?: any, eventName?: string): IListener[];
	    public allInterceptors(): IInterceptors[];

	    public intercept(eventName: string, interceptors: IInterceptors): IEventEmitter;

	    public dispose(cb?: () => void);

	    public static listenerCount(emitter: EventEmitter, eventName: string): number;
	}
}
