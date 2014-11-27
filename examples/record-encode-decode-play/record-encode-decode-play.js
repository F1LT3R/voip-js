
function error(){
    console.log('Err: ', arguments);
  }


var socket = io('http://localhost');

  var audioContext = new AudioContext
    , recorder
    , input
    ;

  function startUserMedia(stream){
    var gainNode = audioContext.createGain();
    gainNode.gain.value = 0;
    input = audioContext.createMediaStreamSource(stream);
    input.connect(gainNode);
    gainNode.connect(audioContext.destination)
    recorder = new Recorder(input);
  }

  navigator.webkitGetUserMedia({audio: true}, startUserMedia, error);

  var wavReader = new RiffPcmWaveReader();

  wavReader.onopened = function(){
    console.log( wavReader.getSamplingRate() + 'Hz');
    console.log( wavReader.getBitsPerSample() + 'bits');
    console.log( wavReader.getChannels() + 'ch');
    console.log( Math.floor(wavReader.getDataChunkBytes() /
      (wavReader.getSamplingRate() * wavReader.getChannels() * (wavReader.getBitsPerSample()/8)
      )) + ' sec'
    );

    wavReader.seek(0);
    wavReader.read(file_io_buffer_size);
  }



  var ran = 0;

  wavReader.onloadend = function(ev){
    console.log('WaveReader read '+ ev.target.result.byteLength+' bytes.');
    // console.log(ev);
    // console.log(ev.target.result.byteLength);
    doEncode(ev.target.result);

    if(!ran){
      ran=1;
      // source.start(0);
    }

    // wavReader.seek(0);
    // Finish when the bytes have been exhausted
    if(ev.target.result.byteLength>0){
      wavReader.read(file_io_buffer_size);
      // doEncode();
    }else{
      // thePlayer.stop();
    }
  }
  wavReader.onerror = function(reason){
    console.log('wavReader error: ', reason);
  }





  startRec.onclick = function(){
    console.log('Started recording...');
    recorder.record();
  };

  stopRec.onclick = function(){
    console.log('Stopped recording.');
    input.disconnect();
    recorder.stop();
    recorder.exportWAV(function(blob) {
      wavReader.open(blob);
    });
  };


var file_io_buffer_size = 65536 * 2;

sampler = new SpeexResampler(2, 48000*2, 48000, 16, false);
encoder = new OpusEncoder(48000, 2, 2048, 20); //2048=voip, 2049=audio (app)
decoder = new OpusDecoder(48000, 2);



function doEncode(data){
  var resampled_pcm = sampler.process_interleaved(data)
    , opus_packets = encoder.encode_float(resampled_pcm)
    , i = 0
    , l = opus_packets.length
    , decoded_buffer
    ;

  for (; i < l; i++) {
    audioQueue.write(decoder.decode_float(opus_packets[i]));
  }
}




var audioQueue = {
  buffer: new Float32Array(0),
  write: function(newAudio){
    var currentQLength = this.buffer.length
      , newBuffer = new Float32Array(currentQLength+newAudio.length)
      ;
    newBuffer.set(this.buffer, 0);
    newBuffer.set(newAudio, currentQLength);
    this.buffer = newBuffer;
    // console.log('Queued '+newBuffer.length+' samples.');
  },
  read: function(nSamples){
    var samplesToPlay = this.buffer.subarray(0, nSamples);
    this.buffer = this.buffer.subarray(nSamples, this.buffer.length);
    console.log('Queue at '+this.buffer.length+' samples.');
    return samplesToPlay;
  },
  length: function(){
    return this.buffer.length;
  }
};



var scriptNode = audioContext.createScriptProcessor(1024, 1, 1);
scriptNode.connect(audioContext.destination);



scriptNode.onaudioprocess = function(e) {
  if (audioQueue.length())
      e.outputBuffer.getChannelData(0).set(audioQueue.read(1024));
  else
    e.outputBuffer.getChannelData(0).set([]);
}

