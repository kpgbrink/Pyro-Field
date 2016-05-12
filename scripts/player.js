'use strict';

// Player Class
// Defines player
// The player moves with WASD and space and right clicking. It shoots bullets with left clicking
// By Kristofer Brink
// Date: Wednesday, May 11, 2016



define('player', ['mapLoader'], function (
        mapLoader  
      ) {
    var Player = function (game, head, foot, eye, visibleEye) {
        this.head = head;
        this.foot = foot;
        this.eye = eye;
        this.visibleEye = visibleEye;
        //console.log("The head and the foot. Rivers and Roads");
        //console.log(head.position.clone());
        //console.log(foot.position.clone());
        //console.log(eye.position.clone());
        
        // attach the eye to the head
        game.scene.add(this.eye);
        this.head.rotation.set(0,0,0);
        //this.head.scale.set(0,0,0);
        game.scene.add(this.head);
        game.scene.updateMatrix();
        game.scene.updateMatrixWorld();
        THREE.SceneUtils.attach( this.eye, game.scene, this.head);
        //console.log(eye.position.clone());
        // http://stackoverflow.com/a/29587642/2948122
        this.gyro = new THREE.Gyroscope();
        this.foot.add(this.gyro);
        game.scene.add(this.foot);
        game.scene.updateMatrix();
        game.scene.updateMatrixWorld();
        THREE.SceneUtils.attach( this.head, game.scene, this.gyro);
        
        // visible eye to eye
        game.scene.add(this.visibleEye);
        game.scene.updateMatrix();
        game.scene.updateMatrixWorld();
        THREE.SceneUtils.attach( this.visibleEye, game.scene, this.eye);
        
        // make sure the ball doesn't fall through things https://github.com/chandlerprall/Physijs/issues/102
        this.foot.setCcdMotionThreshold(.01);
        this.foot.setCcdSweptSphereRadius( .2 );
        
        // attach the head to the foot
        /*
        var headFootConstraint = new Physijs.DOFConstraint(
			this.head, this.foot, new THREE.Vector3( 0, 0, 0 )
		);
		scene.addConstraint( headFootConstraint);
        headFootConstraint.setAngularLowerLimit({x: 0, y: 0, z: 0});
        headFootConstraint.setAngularUpperLimit({x: 0, y: 0, z: 0});s
        headFootConstraint.setLinearUpperLimit({x: 0, y: 0, z: 0});
        this.head.setAngularFactor({x: 0, y: 0, z: 0});
        */
        // Make the game not start out at a rotated angle
        //this.eye.rotation.x = 0;
        this.eye.rotation.order = 'ZYX';
        // Start looking straight forwards
        this.eye.rotation.z = -Math.PI/2;
        var lookMinMax = [-Math.PI, 0]; // Look min max
        this.mouseSensitivity = 1;
        
        // mouse movement
        this.look = function(xDelta, yDelta) {
            // Left and right rotation
            //console.log(this.head.rotation.y);
            this.head.rotation.y -= this.mouseSensitivity * xDelta/500;
            // Up and down rotation
            //console.log(this.eye.rotation.x);
            this.eye.rotation.z = Math.min(Math.max(this.eye.rotation.z + this.mouseSensitivity * yDelta/500, lookMinMax[0]), lookMinMax[1]);
            
        };
        
        var hasAJump = false;
        var hasAJumpCounter = 0;
        
        this.foot.addEventListener( 'collision', function( other_object, relative_velocity, relative_rotation, contact_normal ) {
            // Portal to another map
            if (other_object.userData.map) {
                //alert("Go to map" + other_object.userData.map);
                game.loadMap(other_object.userData.map, this);
            } else if (other_object.userData.respawn) {
                //alert("respawn");
                this.respawn();
            } else {
                // `this` has collided with `other_object` with an impact speed of `relative_velocity` and a rotational force of `relative_rotation` and at normal `contact_normal`
                // console.log("The foot is colliding");
                hasAJump = true;
            }
        }.bind(this));
        
        // Ray cast down
        this.raycaster = new THREE.Raycaster(this.foot.position, new THREE.Vector3(0, -1, 0), 0, 2);
        this.rayCastDown = function () {
            this.raycaster.set(
                this.foot.position,
                new THREE.Vector3(0, -1, 0));
            var other = this.raycaster.intersectObjects(game.scene.children)[0];
            return other;
        };
        
        var lastFrameTouch = false;
        
        // wasd movment and k is kill
        this.movement = function () {
            var impulse = new THREE.Vector3(0, 0, 0);
            
            if (key.isPressed("W")) { // up
                impulse.add(new THREE.Vector3(-1, 0, 0));
            }
            if (key.isPressed("S")) { // down
                impulse.add(new THREE.Vector3(1, 0, 0));
            }
            if (key.isPressed("A")) { // left
                impulse.add(new THREE.Vector3(0, 0, 1));
            }
            if (key.isPressed("D")) { // right
                impulse.add(new THREE.Vector3(0, 0, -1));
            }
            hasAJumpCounter = Math.max(hasAJumpCounter - 1, 0);
            //console.log(hasAJumpCounter);
            // TODO Make the jump not be messed up when physijs is going slow
            if (key.isPressed(" ") && hasAJump && hasAJumpCounter == 0) {
                hasAJumpCounter = 60;
                hasAJump = false;
                foot.applyCentralImpulse(new THREE.Vector3(0, 5, 0));
            } else if (key.shift || key.isPressed(" ")) {
                 foot.applyCentralImpulse(new THREE.Vector3(0, 0.12, 0));
            }
            // Add force to player ball
            impulse.applyAxisAngle(new THREE.Vector3(0,1,0), this.head.rotation.y);
            var frameTouch = !!this.rayCastDown();
            var movementSpeed = .05;
            if (frameTouch) {
                //console.log("Move fast my young one!!!!");
                movementSpeed *= 6;
                if (frameTouch != lastFrameTouch) {
                    this.foot.setDamping(.8, 0);
                    //console.log('Slow down faster much slow faster')
                }
            } else {
                if (frameTouch != lastFrameTouch){
                    this.foot.setDamping(0,0);
                    //console.log("Don't slow down do not slow down");
                }
            }
            lastFrameTouch = frameTouch;
            foot.applyCentralImpulse(impulse.normalize().multiplyScalar(movementSpeed));
            
            // K kills yourself.
            if (key.isPressed("K")) {
                // console.log("RESPAWN");
                this.respawn();
            }
            
            // Stay still
            if (key.isPressed("E")) {
                foot.setLinearVelocity(new THREE.Vector3(0,0,0));
            }
        };
        
        this.respawn = function () {
            // console.log("respawn");
            // Set velocity to 0
            foot.setLinearVelocity(new THREE.Vector3(0, 0, 0));
            // Move the player to respawn point
            // traverse scene
            game.scene.traverse (function (object)
            {
                try {
                    console.log(JSON.stringify(object.userData));
                if (object.userData.spawn) {
                    foot.position.copy(object.position);
                    foot.__dirtyPosition = true;
                }
                } catch (ex) {
                    console.error(ex);
                }
            });
            // TODO: Later reset more stuff
        }
   
        
        // MOUSE EVENTS
        var bullets_material = new Physijs.createMaterial(new THREE.MeshLambertMaterial({color: 0x302040}));
        // store a list of bullets
        this.bullets = [];
        for (var i = 0; i < 60; i++){
            this.bullets.push(new Physijs.SphereMesh( new THREE.SphereGeometry(.5,10,10), bullets_material ));
        };
        
        
        
        var bulletPoweringUp = false;
        var bulletStrength;
        var bulletMax = 50;
        var bulletIncrement = 2;
        
        var buildUp = function () {
            if (bulletPoweringUp) {
                bulletStrength = Math.min(bulletMax, bulletStrength + bulletIncrement);
            }
        }
        
        var bulletDelete = function () {
            var bullet;
            for (bullet of this.bullets) {
                if (bullet.parent) {
                    bullet.userData.timer--;
                    if (bullet.userData.timer <= 0){
                        game.scene.remove(bullet);
                    }
                }
            }
        }.bind(this);
        
        var rightClickDown = false;
        var startRightClickMovementSpeed =.1;
        var rightClickMovementSpeed = .1;
        
        this.mouseDown = function (button) {
            // left click
            if (button == 0) {
                bulletStrength = 0;
                bulletPoweringUp = true;
            // right click
            } else if (button == 2) {
                rightClickDown = true;
                rightClickMovementSpeed = startRightClickMovementSpeed;
            }
        }
        
        this.mouseUp = function (button) {
            var bullet;
            // when left click shoot out bullets
            if (button == 0) {
                console.log('left click');
                // find ball not in scene and make it!
                for (bullet of this.bullets) {
                    if (!bullet.parent) {
                        // Make bullet
                        // Bullet position
                        bullet.position.set(this.foot.position.x, this.foot.position.y + 1.5, this.foot.position.z);
                        // Bullet direction
                        var direction = new THREE.Vector3(1,0,0);
                        var axisY = new THREE.Vector3(0,1,0);
                        var axisZ = new THREE.Vector3(0,0,1);
                        
                        direction.applyAxisAngle( axisZ, this.eye.rotation.z - Math.PI/2);
                        direction.applyAxisAngle( axisY, this.head.rotation.y );
                        
                        bullet.userData.timer = 60 * 10; // Bullets last for 10 seconds
                        
                        game.scene.add(bullet);
                        
                        bullet.setLinearVelocity(direction.normalize().multiplyScalar(bulletStrength));
                        
                        console.log("head rotation: " + this.head.rotation.y);
                        console.log("eye rotation: " + this.eye.rotation.z);
                        console.log("");
                        
                        console.log(bulletStrength);
                        
                        break;
                    }
                }
                // reset bullet values
                bulletPoweringUp = false;
            // right click
            } else if (button == 2) {
                rightClickDown = false;
            }
        }.bind(this);
        
        
       
        // if right click do special movement
        var rightClickMovement = function () {
            if (!rightClickDown)
                return;
             // move towards looking location. This is for testing. Will make it cooler later
            var direction = new THREE.Vector3(1,0,0);
            var axisY = new THREE.Vector3(0,1,0);
            var axisZ = new THREE.Vector3(0,0,1);
            direction.applyAxisAngle( axisZ, this.eye.rotation.z - Math.PI/2);
            direction.applyAxisAngle( axisY, this.head.rotation.y );
            
            foot.setLinearVelocity(direction.normalize().multiplyScalar(rightClickMovementSpeed)); // speed of looking and pushing
            rightClickMovementSpeed = Math.min(20, rightClickMovementSpeed + .2);
            
        }.bind(this);
         
        // player controls
        this.animate = function () {
            rightClickMovement();
            buildUp();
            bulletDelete();
            this.movement();
        };
    };
        
    var playerObjectTypes =
        [
            {
                "name": "head",
                "builder": function (thing) {
                /*
                
                    var objectMake = new Physijs.BoxMesh(
                        thing.geometry,
                        mapLoader.physijsMaterial(thing, userData),
                        userData.mass);
                    mapLoader.setPosRotScal(objectMake, thing);
                    
                    
                    objectMake.name = thing.name;
                    objectMake.userData = userData;
                    return objectMake;
                    */
                    var userData = _.defaults({}, thing.userData, {
                        receiveShadow: true,
                        castShadow: true
                    });
                    thing.receiveShadow = userData.receiveShadow;
                    thing.castShadow = userData.castShadow;
                    return thing;
                }
            },
            {
                "name": "eye",
                "builder": function (thing) {
                    thing.receiveShadow = false;
                    thing.castShadow = false;
                    console.log("Making the eye.");
                    console.log(thing.position.clone());
                    return thing;
                }
            },
            {
                "name": "visibleEye",
                "builder": function (thing) {
                    thing.receiveShadow = true;
                    thing.castShadow = true;
                    console.log("making visible eye");
                    return thing;
                }
            },
            {
                "name": "foot",
                "builder": function (thing) {
                    var userData = _.defaults({}, thing.userData, {
                        friction: .5,
                        retitution: .5, 
                        linearDamping: .5,
                        rotationalDamping: .99,
                        mass: 1,
                        receiveShadow: true,
                        castShadow: true,
                        
                    });
                    // fix the sphere geometry.
                    mapLoader.fixSphereGeometry(thing);
                    var objectMake = new Physijs.SphereMesh(
                        thing.geometry,
                        mapLoader.physijsMaterial(thing, userData),
                        userData.mass);
                    mapLoader.setPosRotScal(objectMake, thing);
                    
                    objectMake.receiveShadow = userData.receiveShadow;
                    objectMake.castShadow = userData.castShadow;
                    objectMake.name = thing.name;
                    objectMake.userData = userData;
                    return objectMake;
                }
            }
        ];
    
    return {
        load: function (game) {
            return mapLoader.load('meshes/player/main.json', playerObjectTypes).then(function (playerObjects){
                
                var head = _.find(playerObjects, function(playerObject) { return playerObject.name.toLowerCase() == 'head';});
                var foot = _.find(playerObjects, function(playerObject) { return playerObject.name.toLowerCase() == 'foot';});
                var eye = _.find(playerObjects, function(playerObject) { return playerObject.name.toLowerCase() == 'eye'});
                var visibleEye = _.find(playerObjects, function(playerObject) { return playerObject.name.toLowerCase() == 'visibleeye'});
                var player = new Player(game, head, foot, eye, visibleEye);
                return player;
            });
        }
    }
});