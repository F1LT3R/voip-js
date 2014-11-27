#VOIP-JS

_Browser > WebAudio > Opus Codec > WebSockets > Node.js > and back again!_

VOIP-JS is an on-going experiment that aims to demonstrate how to roll your own peer-to-peer VOIP application using only JavaScript.


##Hypothesis

Using the Web Audio Context with the getUseMedia API, User-1 can capture audio input from their computer microphone, and encode the buffered data on the client-side using an audio encoder ported to JavaScript, such as: [LibMP3Lame-js](https://github.com/akrennmair/libmp3lame-js) or [opus.js](https://github.com/kazuki/opus.js-sample); then the compressed packets can be sent from the Web Browser, to a server using a WebSocket library such as [Socket.io](http://socket.io/); then Node.js can send the compressed packets on to User-2, where User-2 decodes the audio stream with JavaScript, and plays the stream back out using the Web Audio context on User-2's machine.

##Current Progress

At Present we have the audio encoding and decoding working and playing back. We also have the compressed audio packets being sent over Web Sockets to Node.js. It seems that we have all the individual pieces working well already, and we are currently focused on hooking these pieces together into a coherent system with an intuitive UI.
