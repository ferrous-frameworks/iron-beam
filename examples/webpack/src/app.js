import { EventEmitter } from 'iron-beam';

const ib = new EventEmitter();

ib.on('a.*', (msg) => {
    let h = document.createElement("h1");
    let t = document.createTextNode(msg);
    h.appendChild(t);
    document.body.appendChild(h);
});

ib.emit('a.b','Hello, World!');