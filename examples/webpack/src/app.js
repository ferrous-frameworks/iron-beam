import { EventEmitter } from 'iron-beam';

var ib = new EventEmitter();

ib.on('a.*', (msg) => {
    var h = document.createElement("h1")                // Create a <h1> element
    var t = document.createTextNode(msg);
    h.appendChild(t);
    document.body.appendChild(h);
});

ib.emit('a.b','Hello, World!');