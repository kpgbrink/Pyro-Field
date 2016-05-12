'use strict';

// menu
// Makes the menu
// The menu uses dat.GUI to have parameters for changing mouse sensitivity, field of view, and toggle fps.
// By Kristofer Brink
// Date: Wednesday, May 11, 2016

// The menu gets run when the user presses esc. 
// In here the user can change the graphical settings and leave the game.
// TODO make this show something and unlock cursor if it is locked.
define( function () {
    return {
        makeMenu: function(game) {
            var gui = new dat.GUI({autoPlace: false});
            // mouse sensitivity
            gui.add(game.player, 'mouseSensitivity', .1, 1);
            // field of view
            gui.add(game.camera, 'fov', 10, 120).onChange(function(){
                game.camera.updateProjectionMatrix();
            });
            // frame rate on/off
            // https://github.com/mrdoob/stats.js/
            var stats=new Stats();
            stats.domElement.style.cssText='position:fixed;right:0;top:0;z-index:10000';
            document.body.appendChild(stats.domElement);
            jQuery(stats.domElement).hide();
            var latestStatsToken = {};
            gui.add({statsOn: false}, 'statsOn').onChange(function(statsOn){
                console.log('t=' + (typeof(statsOn)));
                console.log('statsOn=' + statsOn);
                var savedStatsToken = latestStatsToken = {};
                if (statsOn) {
                    console.log("stats are on");
                    jQuery(stats.domElement).show();
                    requestAnimationFrame(function loop(){
                        if (latestStatsToken != savedStatsToken)
                            return;
                        stats.update();
                        requestAnimationFrame(loop);
                        });
                } else {
                    jQuery(stats.domElement).hide();
                }
            });
            
            // Set GUI location
            var customContainer = document.getElementById('gui');
            customContainer.appendChild(gui.domElement);
        }
    }
});