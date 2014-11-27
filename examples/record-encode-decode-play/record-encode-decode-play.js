
  //// FIRST, SOME GLOBAL THINGS...
  //////////////////////////////////////////////////////////////////////////  
  
  var socket = io('http://localhost')
    , audioContext = new AudioContext
    , userMediaInput
    , recorder
    , file_io_buffer_size = 65536 * 2
    
    //  Opus Quality Settings
    //  =====================
    //  App: 2048=voip, 2049=audio, 2051=low-delay
    //  Rate: 8000, 12000, 16000, 24000, or 48000
    //  Frame Duraction: 2.5, 5, 10, 20, 40, 60
    
    // Lowest Quality Settings: (Stutters at the start of the playback)
    // , sampler = new SpeexResampler(1, 8000*2, 8000, 16, false)
    // , encoder = new OpusEncoder(8000, 1, 2048, 2.5) 
    // , decoder = new OpusDecoder(8000, 1)

    // Highest Quality Settings:
    // , sampler = new SpeexResampler(2, 48000*2, 48000, 16, false)
    // , encoder = new OpusEncoder(48000, 2, 2049, 60) 
    // , decoder = new OpusDecoder(48000, 2)
    
    // Medium Quality Settings:
    , sampler = new SpeexResampler(1, 24000*2, 24000, 16, false)
    , encoder = new OpusEncoder(24000, 1, 2048, 20) 
    , decoder = new OpusDecoder(24000, 1)    
    ;



  //// HTML RECORD BUTTON BINDING
  //////////////////////////////////////////////////////////////////////////  

  var recording = false;
  
  recordButton.onclick = function(){
    console.log('Started recording...');
    if(!recording){
      recording=true;
      recordButton.className ='recording';
      recorder = new Recorder(userMediaInput);
      recordButton.innerHTML='Playback';
      recorder.record();
    }else{
      console.log('Stopped recording.');
      recording = false;
      recordButton.className ='';
      recordButton.innerHTML='Record';
      userMediaInput.disconnect();
      recorder.stop();
      initWavReader();
      recorder.exportWAV(function(blob) {
        wavReader.open(blob);
      });
    }
  };
  

  
  //// GET USER MEDIA (MICROPHONE INPUT)
  //////////////////////////////////////////////////////////////////////////  

  function startUserMedia(stream){
    var gainNode = audioContext.createGain();
    gainNode.gain.value = 0;
    userMediaInput = audioContext.createMediaStreamSource(stream);
    userMediaInput.connect(gainNode);
    gainNode.connect(audioContext.destination)
  }

  function userMediaErr(){
    console.log('User Media Error: ', arguments);
  }

  navigator.webkitGetUserMedia({audio: true}, startUserMedia, userMediaErr);



  //// WAVE READER
  //////////////////////////////////////////////////////////////////////////

  var wavReader = null;

  function initWavReader(){
    wavReader = new RiffPcmWaveReader();
    wavReader.onopened = wavReaderOpened;
    wavReader.onloadend = wavReaderLoadend;
    wavReader.onerror = wavReaderError;
  }

  function wavReaderOpened(){
    var rate = wavReader.getSamplingRate()
      , bitsPerSample = wavReader.getBitsPerSample()
      , channels = wavReader.getChannels()
      , chunkBytes = wavReader.getDataChunkBytes()
      , seconds = (chunkBytes / (rate * channels * (bitsPerSample/8))).toFixed(2)
      ;
    console.log(seconds + ' seconds of audio recorded.');
    wavReader.seek(0);
    wavReader.read(file_io_buffer_size);
  }

  function wavReaderLoadend(ev){
    console.log('WaveReader read '+ ev.target.result.byteLength+' bytes.');
    doEncodeDecode(ev.target.result);
    // Read while there's still bytes!
    if(ev.target.result.byteLength>0)
      wavReader.read(file_io_buffer_size);
  }
  
  function wavReaderError(reason){
    console.log('wavReader error: ', reason);
  }
  


  //// OPUS ENCODE/DECODE > TO AUDIO QUEUE
  //////////////////////////////////////////////////////////////////////////

  function doEncodeDecode(data){
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



  //// AUDIO QUEUE
  //////////////////////////////////////////////////////////////////////////

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



  //// JAVASCRIPT AUDIO NOTE (FOR OUTPUT SOUND)
  //////////////////////////////////////////////////////////////////////////

  var scriptNode = audioContext.createScriptProcessor(1024, 1, 1)
    , silence = new Float32Array(1024)
    ;

  scriptNode.onaudioprocess = function(e) {
    if (audioQueue.length())
        e.outputBuffer.getChannelData(0).set(audioQueue.read(1024));
    else
      e.outputBuffer.getChannelData(0).set(silence);
  }

  scriptNode.connect(audioContext.destination);

