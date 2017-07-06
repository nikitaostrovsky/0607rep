/*
 * Copyright (c) 2016 Samsung Electronics Co., Ltd. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/*global $, tau*/
/*jslint unparam: true */

(function(){
    'use strict';
    
    var posters = [];
    var sources = [];
    var currentSource = 0;
    var player = null;
    var watchID;
    
    /**
     * Displays logging information on the screen and in the console.
     * @param {string} msg - Message to log.
     */
    function log(msg) {
    	console.log(msg);
        var logsEl = document.getElementById('logs');

        if (msg) {
            // Update logs
            //console.log('[MultiScreen]: ', msg);
            logsEl.innerHTML += msg + '<br />';
        } else {
            // Clear logs
            logsEl.innerHTML = '';
        }

        logsEl.scrollTop = logsEl.scrollHeight;
    }

    
    
    /**
     * Register keys used in this application
     */
    function registerKeys() {
        var usedKeys = [
            'MediaFastForward',
            'MediaPause',
            'MediaPlay',
            'MediaRewind',
            'MediaStop'
        ];

        usedKeys.forEach(
            function(keyName) {
                tizen.tvinputdevice.registerKey(keyName);
            }
        );
    }
    


    /**
     * Handle input from remote
     */
    function registerKeyHandler() {
        document.addEventListener('keydown', function(e) {
            var seekJump = 5;
            switch (e.keyCode) {
                case 10009:  // RETURN
                    log("RETURN");
                    tizen.application.getCurrentApplication().hide();
                    break;
                   
                case 415: // PLAY
                    play();
                    break;

                case 413: // STOP
                    stop();
                    break;

                case 19: // PAUSE
                    pause();
                    break;

                case 417: // FF
                    if (!player.seeking && player.currentTime + seekJump < player.seekable.end(0)) {
                        player.currentTime += seekJump;
                    }
                    break;

                case 412: // REWIND
                    if (!player.seeking && player.currentTime - seekJump > player.seekable.start(0)) {
                        player.currentTime -= seekJump;
                    }
                    break;

                case 38: // UP
                    changeSource(1);
                    break;
                case 40: // DOWN
                    changeSource(-1);
                    break;
                default:
                    log("Key pressed: " + e.keyCode);
                    break;
            }
        });
    }
    

    /**
     * Stop the player when application is closed.
     */
    function onUnload() {
        log('onUnload');
        stop();
    }
    
    function publishState() {
    	if (channel) {
    		channel.publish('say', 'state ' + (player && !player.paused ? 'playing' : 'paused'));
    	}
    }
    
    /**
     * Creates HTML video tag and adds all event listeners
     */
    function createPlayer() {
        var _player = document.createElement('video');
        console.dir(_player);
        
        _player.width = 1920;
        _player.height = 1080;
        _player.poster = posters[currentSource];
        _player.src = sources[currentSource];
        _player.load();

        _player.addEventListener('loadeddata', function() {
            log("Movie loaded.");
        });
        _player.addEventListener('loadedmetadata', function() {
            log("Meta data loaded.");
        });
        _player.addEventListener('timeupdate', function() {
            log("Current time: " + _player.currentTime);
            progress.updateProgress(_player.currentTime, _player.duration);
        });
        _player.addEventListener('play', function() {
            log("Playback started.");
            publishState();
        });
        _player.addEventListener('pause', function() {
            log("Playback paused.");
            publishState();
        });
        _player.addEventListener('ended', function() {
            log("Playback finished.");
            publishState();
            init();
        });

        return _player;
    }

    
    /**
     * Changes video file to play.
     */
    function changeSource(shift) {
        currentSource += shift;

        if (currentSource >= sources.length) {
            currentSource = 0;
        }

        if (currentSource < 0) {
            currentSource = sources.length - 1;
        }


        if (!player) {
            player = createPlayer();
            document.querySelector('.left').appendChild(player);
        }

        init();
        publishState();
    }
    
    /**
     * Function to init video playback.
     */
    function init() {
        player.poster = posters[currentSource];
        player.src = sources[currentSource];
        player.width = 1920;
        player.height = 1080;
        player.load();
        progress.hide();
        progress.reset();
    }
    
    
    /**
     * Function to start video playback.
     * Create video element if it does not exist yet.
     */
    function play() {
        player.play();
    }

    /**
     * Function to pause video playback.
     */
    function pause() {
        player.pause();
    }

    /**
     * Function to stop video playback.
     */
    function stop() {
        player.pause();
        player.currentTime = 0;
        init();
    }

    /**
     * Object handling updating of progress bar
     */
    var progress = {
        init: function() {
            this.dom = document.getElementById('progress');
            this.barEl = document.getElementById('bar');

            this.reset();
        },

        reset: function() {
            this.barEl.style.width = 0;
            this.show();
        },

        updateProgress: function(elapsed, total) {
            var progress = 100 * elapsed / total;

            this.barEl.style.width = progress + '%';
        },

        show: function() {
            this.dom.style.visibility = "visible";
        },

        hide: function() {
            this.dom.style.visibility = "hidden";
        }
    };
    

    var channel = null,
 	volume_control = {
		set_value: function(new_value){
			if (this.fading_timer){
				clearTimeout(this.fading_timer);
			}
			
	        $("#volume_indicator").removeClass('hidden');
	        $("#volume_value").html(new_value /*+ "%"*/);
	        volume_control.fading_timer = setTimeout(function(){
	        	$("#volume_indicator").addClass('hidden');
	        	volume_control.fading_timer = null;
	        }, 2000);
			
		},
		fading_timer : null
	};        	
    	
            
    function extract_command_from_query(query){
    	var splitted_query = null;
    	if (query){
    		splitted_query = query.split(' ');
    		return splitted_query[0];
    	}
    	
    	return null;
    }
    
    
    function tune_volume(val){
    	if (val < 0){
    		tizen.tvaudiocontrol.setVolumeDown();
    	}
    	else {
    		tizen.tvaudiocontrol.setVolumeUp();    		
    	}
    	
    	channel.publish("say", "volume " + tizen.tvaudiocontrol.getVolume());
    	volume_control.set_value(tizen.tvaudiocontrol.getVolume());
    }
    
    function stripExtension(str) {
        return str.substr(0,str.lastIndexOf('.'));
    }
    
    var fileEnumerator = {
    		
    	onFilesListed : null,
    	
		_onListFilesError : function (error) {
            log("Error " + error.message + " occurred when listing the files in the selected folder");
        },
        

        _onListFilesSuccess : function (files) {
        	var names = [];
        	var paths = [];
            for (var i = 0; i < files.length; i++) {
            	names[names.length] = files[i].name;
            	paths[paths.length] = files[i].fullPath;
                
            }
            for (var i = 0; i < names.length; i++) {
            	if (names[i].match(/.*\.(mp4|avi|mkv)$/i)) {
            		var index = sources.length;
            		var basename = stripExtension(names[i]);             
                    sources[index] = paths[i];
                    
                    for (var j = 0; j < names.length; j++) {
                    	if (names[j].match(/.*\.(png|jpg)$/i) && basename === stripExtension(names[j])) {
                            posters[index] = paths[j];
                            log('Poster added: ' + names[j]);
                            break;
                    	}
                    }
                    
                    if (!posters[index]) {
                    	posters[index] = 'img/no-image.png';
                    }
                    
                    log('Video added: ' + names[i]);
                } else 
            	if (files[i].name.match(/.*\.(png|jpg)$/i)) {
                    
                }
            }
            if (fileEnumerator.onFilesListed) { fileEnumerator.onFilesListed(); }
        },

        _listStoragesCallback : function (storages) {
        	sources = [];
        	posters = [];
            for (var i = 0; i < storages.length; i++) {
            	//log('Storage found: ' + storages[i].label);
                if (storages[i].type != "EXTERNAL")
                    continue;

                log("Drive:" + storages[i].label);

                tizen.filesystem.resolve(
                    storages[i].label,
                    function(dir) {
                        dir.listFiles(fileEnumerator._onListFilesSuccess, fileEnumerator._onListFilesError);
                    },
                    function(e) {
                        log("Error:" + e.message);
                    }, "r"
                );
            }
        },
                
    	_onStorageStateChanged : function (storage) {
            if (storage.state === "MOUNTED") {
                log("Storage " + storage.label + " was added!");
                fileEnumerator.listFiles();
                
            }
        },
        
        init : function(cb) {
        	watchID = tizen.filesystem.addStorageStateChangeListener(this._onStorageStateChanged);
        	this.onFilesListed = cb;
        },
        
        listFiles : function() {
        	tizen.filesystem.listStorages(this._listStoragesCallback);
        }

        
    };
    
    function configure_msf()
    {
    	// Get a reference to the local "service"
        msf.local(function(err, service) {
            if (err) {
                log('msf.local error: ' + err /*, logBox*/);
                return;
            }
            // Create a reference to a communication "channel"
            channel = service.channel('com.samsung.multiscreen.MultiScreenSimple');

            // Connect to the channel
            channel.connect({name:"The TV"}, function (err) {
                if (err) {
                    return console.error(err);
                }
                log('MultiScreen initialized, channel opened.');
            });

            // Add a message listener. This is where you will receive messages from mobile devices
            channel.on('say', function(msg, from){
            	var command = extract_command_from_query(msg);
            	log(from.attributes.name + ' says: <strong>' + msg + '</strong>');                	
                
            	try
            	{
	                if (command === "volume_down"){
	                	tune_volume(-1);
	                }
	                else if (command  === "volume_up"){
	                	tune_volume(1);
	                }
	                else if (command === "channel_up"){
	                	changeSource(1);
	                }
	                else if (command === "channel_down"){
	                	changeSource(-1);
	                }
	                else if (command === "video_play"){
	                	if (!player.paused) {
	                		publishState();
	                	} else {
	                		play();
	                	}
	                }
	                else if (command === "video_pause"){
	                	if (player.paused) {
	                		publishState();
	                	} else {
	                		pause();
	                	}
	                }
	                else if (command === "video_stop"){
	                	stop();
	                }
	                else
	                {
	                    //echo(from.attributes.name + ' says: <strong>' + msg + '</strong>');                	
	                }
            	}
            	catch (e)
            	{
            		log(e.toString());
            	}
                
            });

            // Add a listener for when another client connects, such as a mobile device
            channel.on('clientConnect', function(client){
                // Send the new client a message
            	// hannel.publish('say', 'Hello ' + client.attributes.name, client.id);
            	publishState();
                log("Let's welcome a new client: " + client.attributes.name);
            });

            // Add a listener for when a client disconnects
            channel.on('clientDisconnect', function(client){
                log("Sorry to see you go, " + client.attributes.name + ". Goodbye!");
            });
        });
    }

    window.onload = function () {
        if (window.tizen === undefined) {
            log('This application needs to be run on Tizen device');
            return;
        }

        progress.init();
        registerKeys();
        registerKeyHandler();
        configure_msf();
        
        document.body.addEventListener('unload', onUnload);
        
        fileEnumerator.init(function() {
        	changeSource(0);
        });
        fileEnumerator.listFiles();
        
    };
})();






