<template lang="pug">
  .audio-recorder
    .text-description
      text-input(
        :placeholder='"Type a title for your recording"'
        :label='"title"'
        :error='errors.title'
        :class-list='"h2"'
        :initial-value='contentItem.title'
        @value='contentItem.title = $event'
      )
      text-input(
        :placeholder='"Type a description for your recording"'
        :label='"description"'
        :error='errors.description'
        :class-list='"p"'
        :initial-value='contentItem.description'
        @value='contentItem.description = $event'
      )
    .recorder
      svg.visualizer(:id='svgId' height='70px')
      player(
        :src='contentItem.recording.audioSrc'
        :duration='contentItem.recording.duration'
        :class='state'
      )
      .record-button.noselect(
        :class='state'
        @click='toggleRecorder'
      )
        span click to
        span {{ state === "recording" ? "stop" : "record" }}
</template>

<script>
export default {
	props : {
		errors : {
			default : () => ( {} ),
		},

		startingData : {
			default : () => ( {} ),
		}
	},

	data : () => ( {
		contentItem : {
			title       : '',
			description : '',
			recording   : {
				start    : null,
				end      : null,
				duration : null,
				audioSrc : null,
			},
		},

		currentTime : 0,

		svgHeight : 70,

		state        : 'stopped',
		audioPlaying : false,

		svgId : FirebaseKey(),

		recorder : null,
	} ),

	/* life cycle */

	created() {

		if ( Object.keys( this.startingData ).length ) {
			this.contentItem = this.startingData;
			this.state       = 'has-audio';

			return;
		}

		this.$emit( 'value', this.contentItem );

	},

	mounted() {

		// initialize the volume rectangles
		// that jump and bounce as you record

		const svg = d3.select( `#${this.svgId}` );
		const w   = 500;

		for ( let i = 0; i < 128; i += 1 ) {

			svg.append( 'rect' )
				.attr( 'class', 'visualizer-rect' )
				.attr( 'height', '2px' )
				.attr( 'width', '2px' )
				.attr( 'rx', '1px' )
				.attr( 'ry', '1px' )
				.attr( 'x', ( i * ( w / 128 ) ) )
				.attr( 'y', this.svgHeight - 1 )
				.attr( 'transform', 'translate(-2 -2)' )
				.style( 'fill', '#e3e3e3' );

		}

	},

	beforeDestroy() {

		if ( this.state === 'recording' ) {
			this.stopRecording();
		}

	},

	methods : {

		toggleRecorder() {

			if ( this.state === 'recording' ) {
				this.stopRecording();

				this.state = 'stopped';
			}

			else if ( this.state === 'stopped' ) {
				this.startRecording();

				this.state = 'recording';
			}

		},

		startRecording() {

			GetMedia( { video : false, audio : true } )
				.then( ( localMediaStream ) => {

					// set up recorder
					const options = {
						mimeType : 'video/webm;codecs=vp9'
					};
					const recordedChunks = [];
					const recorder       = new MediaRecorder( localMediaStream, options );

					recorder.addEventListener( 'dataavailable', ( e ) => {

						const { data } = e;

						if ( data.size > 0 ) {
							recordedChunks.push( data );
						}

					} );

					let visualizingAnimation = null;

					recorder.addEventListener( 'start', () => {

						this.contentItem.recording.start = new Date().getTime();

						// set up visualizer
						const audioContext   = new AudioContext();                                        // create context for our audio
						const audioSource    = audioContext.createMediaStreamSource( localMediaStream );  // hook stream into said context
						const analyser       = audioContext.createAnalyser();                             // make an analyzer

						// set this. I guess it defines the range of values you will get from getByteTimeDomainData..?
						// Maybe? I don't know. You have Google.
						analyser.fftSize = 128;

						// anyways. you create this array for getByteTimeDomainData to work with.
						// The only requirement I know of is that the parameter for your Uint8Array
						// *must* be equal to analyser.fftsize or else... idk
						const dataArray = new Uint8Array( analyser.fftSize );

						// this line isn't explicitly in any examples that I could find. It connects
						// your audio to your analyser
						audioSource.connect( analyser );

						const rectangles       = d3.selectAll( '.visualizer-rect' );
						const visualizerHeight = 30;

						const getHeight = ( i, e ) => {
							const datum  = dataArray[i];
							const ratio  = ( ( datum - analyser.fftSize ) / analyser.fftSize );

							// minimum height
							let min = 2;

							if ( e ) {
								// this is why the bars fall slowly
								// it makes the min either 2, or 3
								// less than the current height
								min = Math.max( e.getBBox().height - 3, 2 );
							}

							return Math.max( 4 * ratio * visualizerHeight, min );
						};

						const startAudioVisualizingAnimation = () => {

							// this is the reason this is recursive
							visualizingAnimation = window.requestAnimationFrame( startAudioVisualizingAnimation );

							// This changes dataArray to be what we want. For some reason, this will
							// continue to function as expected even though it is mutating dataArray.
							// Again, just don't question it.
							analyser.getByteTimeDomainData( dataArray );

							rectangles
								.attr( 'height', ( d, i, nodes ) => getHeight( i, nodes[i] ) )
								.attr( 'y', ( d, i, nodes ) => {
									const height = nodes[i].getBBox().height;

									return ( this.svgHeight - height );
								} );

						};

						startAudioVisualizingAnimation();

					} );

					recorder.addEventListener( 'stop', () => {

						// turn off visualizing animtion
						window.cancelAnimationFrame( visualizingAnimation );

						// turn off mic
						const audioChannels = localMediaStream.getTracks();
						audioChannels.forEach( channel => channel.stop() );

						// should always be true... probably
						if ( recordedChunks.length ) {
							this.state = 'has-audio';
						}

						if ( !recordedChunks.length ) {
							this.state          = 'error';
							this.recordingError = 'We were unable to record at this time. Please try again later.';

							return;
						}

						// gather metadata and assign new audio to player
						const currentTime = new Date().getTime();
						const duration    = currentTime - this.contentItem.recording.start;
						const audioBlob   = new Blob( recordedChunks );

						this.contentItem.recording.end       = currentTime;
						this.contentItem.recording.duration  = duration;
						this.contentItem.recording.audioSrc  = URL.createObjectURL( audioBlob );

						const audioKey = FirebaseKey();
						this.$emit( 'item-to-upload', {
							key  : audioKey,
							blob : audioBlob
						} );

					} );

					this.recorder = recorder;

					recorder.start();
				} );

		},

		stopRecording() {
			this.recorder.stop();
		},

		GetTime,

	}
}
</script>

<style lang="scss">

  $grey : #4a5155;

  .audio-recorder {

    .recorder {
      margin: 15px 0;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;

      svg {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        z-index: 1;
        pointer-events: none;
      }

      p {
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 2px;
        color: $grey;
      }

      .player {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color : rgba(40, 165, 231, .15);

        &:not(.has-audio) {
          opacity: 0;
          pointer-events: none;
        }
      }

      .record-button {
        height: 70px;
        width: 50px;
        margin: 0 10px;
        position: relative;
        z-index: 1;
        transition: opacity 0.2s ease;

        &.recording {

          &::before {
            height: 40px;
            width: 40px;
            border-radius: 5px;
            background-color: #e57374;
          }

          &::after {
            height: 0;
            width: 0;
          }
        }

        &.has-audio {
          opacity: 0;
          pointer-events: none;
        }

        &:active {

          &::before {
            height: 20px;
            width: 20px;
          }

          &::after {
            height: 30px;
            width: 30px;
          }
        }

        &::before {
          height: 50px;
          width: 50px;
          background-color: #e77c7d;
        }

        &::after {
          height: 30px;
          width: 30px;
          background-color: #ed9d9e;
        }

        &::before,
        &::after {
          content: ' ';
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%,-50%);
          border-radius: 50%;
          cursor: pointer;
          transition: height 0.2s ease, width 0.2s ease, background-color 0.2s ease;
        }

        span {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 2px;
          color: $grey;
          white-space: nowrap;
          padding: 0 10px;

          &:nth-child(1) {
            right: 100%;
          }

          &:nth-child(2) {
            left: 100%;
          }
        }
      }
    }
  }
</style>

