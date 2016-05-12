'use strict';

// mapLoader Class
// Defines mapLoader
// The map loader takes a json file and makes physijs objects or plain threejs objects
// By Kristofer Brink
// Date: Wednesday, May 11, 2016

define('mapLoader', function () {
    
    // simple boolean function for making string to bool the way I want it
    var toBool = function (str) {
        if (str[0].toLowerCase() == 't')
            return true;
        return false;
    }
    
    var physijsMaterial = function (thing, userData) {
        return Physijs.createMaterial(
                        thing.material, // Material
                        userData.friction, // Friction
                        userData.restitution); // Restitution
    };
    
    var setPosRotScal = function (objectMake, thing) {
        // Make the object be in the right place using the position, rotation, and scale
        objectMake.position.copy(thing.position);
        objectMake.rotation.copy(thing.rotation);
        objectMake.scale.copy(thing.scale);
    };
    
    var setDamping = function (objectMake, userData) {
        if (userData.mass == 0) // non moving objects can't have damping
            return;
        if (userData.linearDamping || userData.angularDamping) { // Only add if at least one is given.
            objectMake.addEventListener ( ''+{}, function () { // should be able to type add physijs fix this
            setTimeout(function () {
                objectMake.setDamping(userData.linearDamping, userData.angularDamping);
            }, 0);
            });
        }
    };
    
    // average as in block and sphere and other stuff that don't more
    var commonObject = function (thing, physijsType) {
        // http://stackoverflow.com/a/9602718/2948122
        // set the defaults
        var userData = _.defaults({}, thing.userData, {
                            friction: 0,
                            restitution: 0,
                            mass: 0,
                            receiveShadow: "true",
                            castShadow: "true",
                            linearDamping: 0,
                            angularDamping: 0,
                            visible: "true",
                            respawn: "false"
                        });
        
        var objectMake = new physijsType(
            thing.geometry,
            physijsMaterial(thing, userData),
            userData.mass);
        
        // set position, rotation, and scale
        setPosRotScal(objectMake, thing);

        objectMake.receiveShadow = toBool(userData.receiveShadow);
        objectMake.castShadow = toBool(userData.castShadow);

        setDamping(objectMake, userData);
        
        // Make invisible objects possible
        objectMake.visible = toBool(userData.visible);
        
        // Make respawn object possible
        objectMake.userData.respawn = toBool(userData.respawn);

        return objectMake;
    };
    
    var fixSphereGeometry = function (thing) {
        var allY = _.map(thing.geometry.vertices, 'z'); // take out only the y values
        var uniqY = _.uniq(allY); // get all unique y
        var heightSeg = uniqY.length-1;
        console.log(uniqY);
        //console.log("The number of vertices is " + _.size(thing.geometry.vertices));
        //console.log("The Height is " + heightSeg);
        var widthSeg = Math.floor((_.size(thing.geometry.vertices) - 2) / (heightSeg-1));
        //console.log("The Width is " + widthSeg);
        thing.geometry = new THREE.SphereGeometry(
            thing.geometry.vertices[0].multiply(thing.scale).length(), // radius
            widthSeg, // width segments
            heightSeg // height segments
            );
        thing.scale.set(1, 1, 1);  
        return thing;
    };
    
    var fixCylinderGeometry = function (thing) {
        console.log(thing.rotation);
        console.log(thing.scale);
        // Blender geometry lies on z
        // figure out top and bottom radius
        var radius = function (z) {
            var matchingVertices = _.filter(thing.geometry.vertices, function (vertex) { return vertex.z = z});
            var topRadius = _.maxBy(matchingVertices, 'x');
            // use Pythagorean theorem
            return new THREE.Vector2(topRadius.x, topRadius.y).length();
        }
        var minZ = _.minBy(thing.geometry.vertices, 'z').z;
        var maxZ = _.maxBy(thing.geometry.vertices, 'z').z;
        var topRadius = radius(maxZ);
        var bottomRadius = radius(minZ);
        // figure out number of segments
        var segCount = thing.geometry.vertices.length / 2 - 2;
        // figure out the height
        var height = maxZ * 2;
        
        console.log("THIS IS CYLLLL");
        thing.geometry = new THREE.CylinderGeometry(topRadius, bottomRadius, height, segCount);
        //thing.scale.set(1, 1, 1);
        thing.rotation.set(thing.rotation.x + Math.PI/2, thing.rotation.y, thing.rotation.z + Math.PI);
        return thing;
    };
    
    var objectTypes = 
        [
            {
                "name": "movie",
                "builder": function (thing) {
                    var userData = _.defaults({}, thing.userData, {
                        src: "./movies/sintel.ogv",
                        width: 480,
                        height: 204,
                    });
                    // Very much copied this
                    // https://stemkoski.github.io/Three.js/Video.html 
                    var video = document.createElement( 'video' );
                    video.src = userData.src;
                    video.load();
                    video.play();
                    var videoImage = document.createElement( 'canvas' );
                    videoImage.width = userData.width;
                    videoImage.height = userData.height;
                    
                    var videoImageContext = videoImage.getContext( '2d' );
                    // background color if no video present
                    videoImageContext.fillStyle = '#000000';
                    videoImageContext.fillRect( 0, 0, videoImage.width, videoImage.height);
                    
                    var videoTexture = new THREE.Texture( videoImage );
                    videoTexture.minFilter = THREE.LinearFilter;
                    videoTexture.magFilter = THREE.LinearFilter;
                    
                    var movieMaterial = new THREE.MeshBasicMaterial( { map: videoTexture, overdraw: true, side: THREE.DoubleSide });
                    
                    var movieScreen = new THREE.Mesh( thing.geometry, movieMaterial );
                    
                    movieScreen.scale.copy(thing.scale);
                    movieScreen.position.copy(thing.position);
                    movieScreen.rotation.copy(thing.rotation);
                    
                    movieScreen.userData.onRender = function () {
                        if ( video.readyState === video.HAVE_ENOUGH_DATA ) 
                        {
                            videoImageContext.drawImage( video, 0, 0 );
                            if ( videoTexture ) 
                                videoTexture.needsUpdate = true;
                        }
                    }
                    
                    movieScreen.addEventListener( 'removed', function(){
                        video.pause();
                        
                    });
                    
                    return movieScreen;
                    
                }
            },
            {
                "name": "ambientlight",
                "builder": function (thing) {
                    var userData = _.defaults({}, thing.userData, {
                        light: "404040"
                    });
                    console.log("ambient Light is made: " + userData.light);
                    console.log(parseInt(userData.light, 16));
                    return new THREE.AmbientLight( parseInt( userData.light, 16));
                }
            },
            {
                "name": "spawn",
                "builder": function (thing) {
                    var obj = new THREE.Object3D();
                    obj.position.copy(thing.position);
                    obj.userData = { spawn: true };
                    return obj;
                }
            },
            {
                // portals are assumed to be boxes. TODO add option to make blocks invisible.
                "name": "portal",
                "builder": function (thing) {
                    //return commonObject(thing, Physijs.BoxMesh);
                    var userData = _.defaults({}, thing.userData, {
                        map: 'maps/testmap5.json'
                    });
                    var obj = commonObject(thing, Physijs.BoxMesh);
                    obj.userData = userData; // map: MAPNAME
                    return obj;
                }
            },
            {
                "name": "grid",
                "builder": function (thing) {
                    var userData = _.defaults({}, thing.userData, {
                        friction: .5,
                        retitution: .5,
                        receiveShadow: "true",
                        castShadow: "true"
                    });
                    // Turn the grid into a threejs planeGeometry. Then use that to make a physijs heightfield.
                    // view-source:http://chandlerprall.github.io/Physijs/examples/heightfield.html
                    
                    // Figure things out for the geometry
                    if (false) {
                        console.log(thing.geometry.vertices);
                    }
                    var allX = _.map(thing.geometry.vertices, 'x');
                    var allY = _.map(thing.geometry.vertices, 'y');
                    var intermediateX = _(allX).uniq().orderBy().value();
                    var intermediateY = _(allY).uniq().orderBy().value();
                    var xMap = _(intermediateX).invert().mapValues(function (x) {return x; }).value();
                    var yMap = _(intermediateY).invert().mapValues(function (y) {return y; }).value();
                                                             // width, height, verticesWidth, verticesLength
                    if (false) { // debugging
                        console.log("max = " + _.max(allX));
                        console.log("length = " + intermediateX.length);
                        console.log("xMap length = " + _.keys(xMap).length);
                        console.log("yMap length = " + _.keys(yMap).length);
                        console.log(xMap);
                    }
                    var ground_geometry = new THREE.PlaneGeometry( _.max(allX) - _.min(allX), _.max(allY) - _.min(allY), intermediateX.length - 1, intermediateY.length - 1);
                    var gallX = _.map(ground_geometry.vertices, 'x');
                    var gallY = _.map(ground_geometry.vertices, 'y');
                    var gintermediateX = _(gallX).uniq().orderBy([_.identity], ['desc']).value();
                    var gintermediateY = _(gallY).uniq().orderBy([_.identity], ['desc']).value();
                    var gxMap = _(gintermediateX).invert().mapValues(function (x) {return x; }).value();
                    var gyMap = _(gintermediateY).invert().mapValues(function (y) {return y; }).value();
                    console.log(gxMap);
                    var finalDestination = [];
                    ground_geometry.vertices.forEach( function (vertex) {
                        var col = gxMap[vertex.x];
                        var row = gyMap[vertex.y];
                        if (!finalDestination[row]) {
                            finalDestination[row] = [];
                        }
                        finalDestination[row][col] = vertex;
                    });
                    
                    thing.geometry.vertices.forEach( function (vertex) { // making a flat geometry to test it out
                        // Find column
                        var col = xMap[vertex.x];
                        // Find row
                        var row = yMap[vertex.y];
                        finalDestination[row][col].z = vertex.z;
                    });
                    ground_geometry.computeFaceNormals();
                    ground_geometry.computeVertexNormals();
                    
                    var objectMake = new Physijs.HeightfieldMesh(
                        ground_geometry,
                        physijsMaterial(thing, userData),
                        0, // mass
                        intermediateX.length - 1, // vertices width
                        intermediateY.length - 1 // vertices height
                    );
                    objectMake.position.copy(thing.position);

                    
                    objectMake.rotation.set(-Math.PI / 2, 0, 0); // rotate because it is perpendicular to the z axis
                    
                                        objectMake.receiveShadow = userData.receiveShadow;
                    objectMake.castShadow = userData.castShadow;
                    
                    return objectMake;
                }
            },
            {
                "name": "mirrorcube",
                "builder": function (thing) {
                    var userData = _.defaults({}, thing.userData, {
                        near: .1,
                        far: 200,
                        resolution: Math.pow(2, 11),
                    });
                    // use a new object 3d for the mirror cube
                    var mirrorCube = new THREE.Object3D;
                    // make mirror camera
                    var mirrorCubeCamera = new THREE.CubeCamera(userData.near, userData.far, userData.resolution);
                    mirrorCube.add(mirrorCubeCamera);
                    mirrorCubeCamera.position.copy(thing.position);
                    mirrorCubeCamera.rotation.set(thing.rotation.x - Math.PI/2, thing.rotation.z, thing.rotation.y + Math.PI);
                    mirrorCubeCamera.scale.copy(thing.scale);
                    // Add the actual cube
                    var cube = new THREE.Mesh(new THREE.BoxGeometry(1,1,1), new THREE.MeshBasicMaterial( {envMap: mirrorCubeCamera.renderTarget} ));
                    //cube.scale.copy(thing.scale);
                    cube.scale.set( 2 * thing.scale.x, thing.scale.y*2, thing.scale.z*2);
                    cube.position.copy(thing.position);
                    cube.rotation.copy(thing.rotation);
                    mirrorCube.add(cube);
                    // make an on render function
                    mirrorCube.userData.onRender = function (scene, renderer) {
                        cube.visible = false;
                        mirrorCubeCamera.updateCubeMap(renderer, scene);
                        cube.visible = true;
                    }
                    // return all of it together
                    return mirrorCube;
                }
            },
            {
                "name": "mirrorSphere",
                "builder": function (thing) {
                    var userData = _.defaults({}, thing.userData, {
                        near: .1,
                        far: 200,
                        resolution: Math.pow(2, 9),
                    });
                    // use a new object 3d for the mirror cube
                    var mirrorSphere = new THREE.Object3D;
                    // make mirror camera
                    var mirrorSphereCamera = new THREE.CubeCamera(userData.near, userData.far, userData.resolution);
                    mirrorSphere.add(mirrorSphereCamera);
                    mirrorSphereCamera.position.copy(thing.position);
                    mirrorSphereCamera.rotation.set(thing.rotation.x - Math.PI/2, thing.rotation.z, thing.rotation.y + Math.PI);
                    mirrorSphereCamera.scale.copy(thing.scale);
                    // Add the actual cube
                    var sphere = new THREE.Mesh(fixSphereGeometry(thing).geometry, new THREE.MeshBasicMaterial( {envMap: mirrorSphereCamera.renderTarget} ));
                    sphere.scale.copy(thing.scale);
                    sphere.position.copy(thing.position);
                    sphere.rotation.copy(thing.rotation);
                    mirrorSphere.add(sphere);
                    // make an on render function
                    mirrorSphere.userData.onRender = function (scene, renderer) {
                        sphere.visible = false;
                        mirrorSphereCamera.updateCubeMap(renderer, scene);
                        sphere.visible = true;
                    }
                    // return all of it together
                    return mirrorSphere;
                }
            },
            {
                "name": "cube",
                "builder": function (thing) {
                    return commonObject(thing, Physijs.BoxMesh);
                }
            },
            {
                "name": "sphere",
                "builder": function (thing) {
                    return commonObject(fixSphereGeometry(thing), Physijs.SphereMesh);
                }
            },
            {
                "name": "cylinder", // doesn't work yet
                "builder": function (thing) {
                    return commonObject(fixCylinderGeometry(thing), Physijs.CylinderMesh);
                }
            },
            {
                "name": "cone", // doesn't work yet
                "builder": function (thing) {
                    return commonObject(thing, Physijs.ConeMesh);
                }
            },
            {
                "name": "point", // most likely a point light
                "builder": function (thing) {
                    var userData = _.defaults({}, thing.userData, {
                        castShadow: true,
                        shadowDarkness: .1,
                        shadowCameraNear: 1,
                        shadowCameraFar: 200,
                        shadowMapWidth: 2048,
                        shadowMapHeight: 2048
                    });
                    thing.castShadow = userData.castShadow;
                    thing.shadowDarkness = userData.shadowDarkness;
                    thing.shadowCameraNear = userData.shadowCameraNear;
                    thing.shadowCameraFar = userData.shadowCameraFar;
                    thing.shadowMapWidth = userData.shadowMapWidth;
                    thing.shadowMapHeight = userData.shadowMapHeight;
                    return thing;
                }
            },
            {
                "name": "changing",
                "builder": function (thing) {
                    var userData = _.defaults({}, thing.userData, {
                        min: .01,
                        max: 2,
                        scaleSpeed: .002,
                        rotationX: 0,
                        rotationY: 0,
                        rotationZ: .009,
                        receiveShadow: "true",
                        castShadow: "true",
                        scaleUp: "false",
                        scale: 1
                    });
                    thing.receiveShadow = toBool(userData.receiveShadow);
                    thing.castShadow = toBool(userData.castShadow);
                    var scaleUp = toBool(userData.scaleUp);
                    var scale = userData.scale;
                    
                    thing.userData.onRender = function (scene, renderer) {
                        //console.log("rescaling");
                        thing.rotation.x += userData.rotationX;
                        thing.rotation.y += userData.rotationY;
                        thing.rotation.z += userData.rotationZ;
                        if (scaleUp) {
                            scale += userData.scaleSpeed;
                            if (scale > userData.max){
                                scaleUp = false;
                                scale = userData.max;
                            }
                        } else {
                            scale -= userData.scaleSpeed;
                            if (scale < userData.min){
                                scaleUp = true;
                                scale = userData.min;
                            }
                        }
                        
                        thing.scale.set( scale, scale, scale);
                    };
                    return thing;
                }
            },
            {
                "name": "",
                "builder": function (thing) {
                    var userData = _.defaults({}, thing.userData, {
                        receiveShadow: "true",
                        castShadow: "true"
                    });
                    thing.receiveShadow = toBool(userData.receiveShadow);
                    thing.castShadow = toBool(userData.castShadow);
                    return thing;
                }
            }
    ];
    
    return {
        load: function (mapFile, extraObjectTypes) {
            return new Promise(function(resolve, reject) {
                // http://threejs.org/docs/#Reference/Loaders/ObjectLoader
                var loader = new THREE.ObjectLoader();
                // Start loading from blender
                loader.load(mapFile, resolve,
                    undefined, // onProgress
                    function () { // onReject. This doesn't work yet. Needs to be fixed by someone else though.
                        reject("Map can't be loaded. Maybe try a different map.");
                    });
            }.bind(this)).then(function(object) { // onLoad
                        var objects = [];
                        object.children.forEach(function (thing) {
                            console.log("Birthing object " + thing.name);
                            //thing.material = gameBoxMaterial;
                            // http://devdocs.io/lodash/index#find
                            // filter gets rid of undefined
                            // concat combines two arrays, extraObjectTypes is first to "override" entries in objectTypes
                            objects.push(_.find(_.filter(_.concat(extraObjectTypes, objectTypes)), function(objectType) {
                                return thing.name.toLowerCase().indexOf(objectType.name.toLowerCase()) + 1;
                            }).builder(thing));
                        });
                    return objects;
                    });
        },
        fixSphereGeometry: fixSphereGeometry,
        fixCylinderGeometry: fixCylinderGeometry,
        physijsMaterial: physijsMaterial,
        setPosRotScal: setPosRotScal
    }
});
