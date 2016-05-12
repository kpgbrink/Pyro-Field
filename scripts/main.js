'use strict';
// -------------------------------------- //
// ----------- Pyro Field --------------- //
// --------- By Kristofer Brink --------- //
// -------------------------------------- //
// Main which makes the game.
// game makes the game using mapLoader, player and menu.

// Date: Wednesday, May 11, 2016

/* JavaScript
	Multi - paradigm
object-oriented (prototype-based), imperative, functional

PRO: Portability
CON: No static type checking so you get errors at run time. var
*/

/* http://stackoverflow.com/a/10590011/429091 */
require.config({
    catchError: true // Log errors in browser console log
    ,enforceDefine: true // Forces you to use define.. etc
    ,waitSeconds: 0 // Disable timeout for waiting on a script
    ,xhtml: true // Using xhtml everywhere here
});

// require js call
define('main', ['mapLoader', 'player', 'menu'], function (
        mapLoader,
        player,
        menu
       ) {
    var Game = function (mapFileName = './maps/main.json') {
        // Physics TODO - maybe add worker and ammo later if magic doesn't work
        Physijs.scripts.worker = 'scripts/physijs_worker.js'; //'https://cdn.rawgit.com/chandlerprall/Physijs/7a5372647f5af47732e977c153c0d1c2550950a0/physijs_worker.js';
        Physijs.scripts.ammo = 'https://cdn.rawgit.com/chandlerprall/Physijs/7a5372647f5af47732e977c153c0d1c2550950a0/examples/js/ammo.js';
        
        // Set up the scene
        this.scene = new Physijs.Scene();
        // deleteScene objects
        this.deleteSceneObjects = [];
        
        // Set up renderer
        this.renderer = new THREE.WebGLRenderer({antialias: true, logarithmicDepthBuffer: true});
        this.renderer.setSize(window.innerWidth, window.innerHeight); // set size for start. The magical resize thing isn't fully magical
        this.renderer.shadowMap.enabled = true;
        
        // create canvas
        var canvas = this.renderer.domElement;
        document.getElementById("gameCanvas").appendChild(canvas);
        // Set up mouse
        jQuery('#gameCanvas').click(function() {
            // https://developer.mozilla.org/en-US/docs/Web/API/Pointer_Lock_API
            canvas.requestPointerLock = canvas.requestPointerLock ||
                                        canvas.mozRequestPointerLock ||
                                        canvas.webkitRequestPointerLock;
            canvas.requestPointerLock();
        });
        
        // Set up camera
        this.camera = new THREE.PerspectiveCamera(
            63, // View angle 
            window.innerWidth / window.innerHeight, // Aspect
            0.0001, // Near
            3000); // Far
        // add the camera to the scene
        // set camera default position
        //this.camera.position.set(0, 10, 40);
        // set camera lookat
        //this.camera.lookAt(new THREE.Vector3(0, 10, 10));
        //this.camera.rotation.z = Math.PI/2;
        // Window resize automatically from https://github.com/jeromeetienne
        new THREEx.WindowResize(this.renderer, this.camera);
        // More setup
        // ------------------------------------------------------------------------------
        // Load map
        // ----------------------------------------------------------------------------------------
        // I pass in the player in case if the player need to be respawned
        this.loadMap = function (mapFileName, player) {
            // Set up all the 3d objects in the scene. mapLoader passes in an array of objects to add. http://stackoverflow.com/a/10167931/2948122
            // Delete the scene
            // http://stackoverflow.com/a/11699415/2948122 must delete things in reverse order. duh
            for (var i = this.deleteSceneObjects.length -1; i >=0; i-- ) {
                this.scene.remove(this.deleteSceneObjects[ i ]);
                //console.log("removing");
            }
            this.deleteSceneObjects = [];
            
            var mapPromise = mapLoader.load(mapFileName).then(function(things) { // on fulfilled
                this.deleteSceneObjects = things; // save for deleting.
                things.forEach(function (thing) {
                    //console.log("this is running");
                    // make the scene into one removable object for loading a new map.
                    //objects.add(thing);
                    this.scene.add(thing);
                }.bind(this));
                // Player spawn
                if (player) {
                    console.log("respawning hte player");
                    player.respawn();
                }
            }.bind(this));
            return mapPromise;
        }.bind(this);
        
        var mapPromise = this.loadMap(mapFileName);
        
        // ----------------------------------------------------------------------------------------
        // Load Player
        // ---------------------------------------------------------------------------------
        var playerPromise = player.load(this).then(function (object) {
            this.player = object;
            /*
            this.camera.position.set(10,10,10);
            this.scene.add(this.camera);
            this.camera.lookAt(new THREE.Vector3(-20,0,-20));
            */
            this.player.eye.add(this.camera);
            this.camera.position.set(0, 0, 0);
            this.camera.rotation.set(0, 0, Math.PI/2);
            //var testObj = new THREE.Mesh(new THREE.SphereGeometry(.2,.2,.2));
            //this.player.eye.add(testObj);
            //testObj.position.set(0,0,-1);
            // Don't move when the mouse isn't locked bool
            var mouseLocked = false;
            // On mouse move
            jQuery(document).on("mousemove", function(e) {
                e = e.originalEvent;
                if (mouseLocked) {
                    this.player.look(
                        e.movementX || e.mozMovementX || e.webkitMovementX || 0,
                        e.movementY || e.mozMovementY || e.webkitMovementY || 0);
                }
            }.bind(this));
            
            // Make the menu
            menu.makeMenu(this);
            // Clicks on menu
            jQuery('#gui > *').click(function() {
                return false;
            });
            // pointer lock toggle. Toggle mouseLocked and GUI hide
            jQuery(document).on('pointerlockchange mozpointerlockchange webkitpointerlockchange', function() {
                if (document.pointerLockElement === canvas || document.mozPointerLockElement === canvas || document.webkitPointerLockElement === canvas) {
                    mouseLocked = true;
                    jQuery('#gui').hide();
                } else {
                    mouseLocked = false;
                    jQuery('#gui').show();
                }
            });
            // Mouse click
            jQuery(document).on('mousedown', function(e) {
                if (!mouseLocked) // In menu so don't fire
                    return;
                this.player.mouseDown(e.button);
            }.bind(this));
            // Mouse up
            jQuery(document).on('mouseup', function(e) {
                if (!mouseLocked) // In menu so don't fire
                    return;
                this.player.mouseUp(e.button);
            }.bind(this));
        }.bind(this));
        
        // function map promise
        Promise.all([mapPromise, playerPromise]).then(function () {
            this.player.respawn();
            // Let's start it up! -- this here because of the lights
             this.draw();
        }.bind(this), 
        function(errorMessage) { // on rejected
            console.error(errorMessage);
            alert(errorMessage);
        });
        
        // Draw function
        this.draw = function () {
            this.scene.simulate(); // run physicss
            
            
            
            // run the special onRender functions
            // right now this is only being used by special mirror cameras
            this.scene.traverse (function (object){
                if (object.userData.onRender) {
                    object.userData.onRender(this.scene, this.renderer);
                } 
            }.bind(this));
            this.renderer.render(this.scene, this.camera); // draw THREE.js scene
            
            requestAnimationFrame(this.draw.bind(this)); // Special thing so things don't lose 'this'.
            // Stop this
        }
        
        // Animate function
        this.animate = function () {
            if (this.player)
            try {
                this.player.animate();
            } catch (ex) {
                console.error(ex);
            }
        }
        this.scene.addEventListener('update', this.animate.bind(this));
    };
    new Game();
});