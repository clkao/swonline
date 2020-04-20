// From: https://mozdevs.github.io/gamedev-js-tiles/common.js
var api_url = 'https://meet.jothon.online/api/';

var Loader = {
    images: {}
};

Loader.loadImage = function (key, src) {
    var img = new Image();

    var d = new Promise(function (resolve, reject) {
        img.onload = function () {
            this.images[key] = img;
            resolve(img);
        }.bind(this);

        img.onerror = function () {
            reject('Could not load image: ' + src, key, src);
        };
    }.bind(this));

    img.src = src;
    return d;
};

Loader.getImage = function (key) {
    return (key in this.images) ? this.images[key] : null;
};

//
// Keyboard handler
//

var Keyboard = {};

Keyboard.LEFT = 37;
Keyboard.RIGHT = 39;
Keyboard.UP = 38;
Keyboard.DOWN = 40;

Keyboard._keys = {};

Keyboard.listenForEvents = function (keys) {
    window.addEventListener('keydown', this._onKeyDown.bind(this));
    window.addEventListener('keyup', this._onKeyUp.bind(this));

    keys.forEach(function (key) {
        this._keys[key] = false;
    }.bind(this));
}

Keyboard._onKeyDown = function (event) {
    var keyCode = event.keyCode;
    if (keyCode in this._keys) {
        event.preventDefault();
        this._keys[keyCode] = true;
    }
};

Keyboard._onKeyUp = function (event) {
    var keyCode = event.keyCode;
    if (keyCode in this._keys) {
        event.preventDefault();
        this._keys[keyCode] = false;
    }
};

Keyboard.isDown = function (keyCode) {
    if (!keyCode in this._keys) {
        throw new Error('Keycode ' + keyCode + ' is not being listened to');
    }
    return this._keys[keyCode];
};

//
// Game object
//

var Game = {};

Game.run = function (context) {
    this.ctx = context;
    this._previousElapsed = 0;

    var p = this.load();
    this.isLoad = true;
    Promise.all(p).then(function (loaded) {
        this.init();
        window.requestAnimationFrame(this.tick);
    }.bind(this));
};

Game.stop = false;
Game.tick = function (elapsed) {
    if (Game.stop) return;
    window.requestAnimationFrame(this.tick);

    // clear previous frame
    this.ctx.clearRect(0, 0, 512, 512);

    // compute delta time in seconds -- also cap it
    var delta = (elapsed - this._previousElapsed) / 1000.0;
    delta = Math.min(delta, 0.25); // maximum delta of 250 ms
    this._previousElapsed = elapsed;

    this.update(delta);
    this.render();
}.bind(Game);

// override these methods to create the demo
Game.init = function () {};
Game.update = function (delta) {};
Game.render = function () {};

//
// start up function
//

window.onload = function () {
    var context = document.getElementById('game').getContext('2d');
    document.getElementById('game').onmousemove = function(e){
        Game.mouse = [e.offsetX, e.offsetY];
    };
    document.getElementById('game').onmouseleave = function(e){
        Game.mouse = null;
    }
    Game.run(context);
};

Game.getDrawingObjects = function () {
    var startCol = Math.floor(this.camera.x / map.tsize);
    var endCol = Math.min(map.cols - 1, startCol + (this.camera.width / map.tsize));
    var startRow = Math.floor(this.camera.y / map.tsize);
    var endRow = Math.min(map.rows - 1, startRow + (this.camera.height / map.tsize));
    var offsetX = -this.camera.x + startCol * map.tsize;
    var offsetY = -this.camera.y + startRow * map.tsize;

    var objects = [];
    for (var c = startCol; c <= endCol; c++) {
        for (var r = startRow; r <= endRow; r++) {
            var tile = map.getTile('object', c, r);
            var x = (c - startCol) * map.tsize + offsetX;
            var y = (r - startRow) * map.tsize + offsetY;
            if (tile !== null && 'undefined' !== typeof(tile_map[tile])) {
                tileS = tile_map[tile][0];
                tileX = tile_map[tile][1];
                tileY = tile_map[tile][2];
                objects.push([
                    r * 32,
                    'drawImage',
                    [
                    this.tileAtlas[tileS], // image
                    tileX * map.tsize, // source x
                    tileY * map.tsize, // source y
                    map.tsize, // source width
                    map.tsize, // source height
                    Math.round(x),  // target x
                    Math.round(y), // target y
                    map.tsize, // target width
                    map.tsize // target height
                    ]
                ]);
            }
        }
    }
    return objects;
};

Game.getDrawingCustomObjects = function () {
    var objects = [];
    for (var id in Game.objects) {
        var object = Game.objects[id];
        if (object.type == 'image') {
            var image = Loader.getImage('url:' + object.data.image_url);
            if (image === null) {
                Loader.loadImage('url:' + object.data.image_url, object.data.image_url).then(function(){}, function(err, key, src){ Loader.images[key] = false; });
                continue;
            } else if (image === false) {
                continue;
            }
            if (image.width == 0 || image.height == 0) {
                continue;
            }
            var ratio = image.width / image.height
            var canvas_width = object.x2 - object.x + 32;
            var canvas_height = object.y2 - object.y + 32;
            if (canvas_height * ratio > canvas_width) {
                target_width = canvas_width;
                target_height = target_width / ratio;
            } else {
                target_height = canvas_height;
                target_width = target_height * ratio;
            }

            if ('undefined' === typeof(object.data.image_type) || object.data.image_type  == 0) {
                level = object.y2 + 16;
            } else {
                level = 0;
            }
            objects.push([
                level,
                'drawImage',
                [image, 0, 0, image.width, image.height,
                (object.x + object.x2) / 2 - target_width / 2 - this.camera.x,
                (object.y + object.y2) / 2 - target_height / 2 - this.camera.y,
                target_width,
                target_height,
                ]
            ]);
        } else if (object.type == 'iframe') {
            if (!$('#iframe-' + id).length) {
                var iframe_dom = $('<div></div>').attr('id', 'iframe-' + id);
                iframe_dom.append($('<iframe allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"></iframe>').attr('src', object.data.iframe_url).css({margin: 0, padding: 0, border: 0, width: '100%', height: '100%', "z-index": 10}));
                iframe_dom.append($('<div></div>').css({position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', 'z-index': 15, cursor: 'pointer'}).addClass('iframe-div-area'));
                $('body').append(iframe_dom);
            }
            var canvas_width = object.x2 - object.x + 32;
            var canvas_height = object.y2 - object.y + 32;
            $('#iframe-' + id).css({
                width: canvas_width,
                height: canvas_height,
                position: 'absolute',
                left: (object.x + object.x2) / 2 - canvas_width / 2 - this.camera.x + $('#game').offset().left,
                top: (object.y + object.y2) / 2 - canvas_height / 2 - this.camera.y + $('#game').offset().top,
                border: '0px',
                margin: '0px',
                padding: '0px',
            });
        }
    }
    return objects;
};

Game._drawGrid = function () {
	var width = map.cols * map.tsize;
    var height = map.rows * map.tsize;
    var x, y;
    this.ctx.lineWidth = 0.5;
    for (var r = 0; r < map.rows; r++) {
        x = - this.camera.x;
        y = r * map.tsize - this.camera.y;
        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
        this.ctx.lineTo(width, y);
        this.ctx.stroke();
    }
    for (var c = 0; c < map.cols; c++) {
        x = c * map.tsize - this.camera.x;
        y = - this.camera.y;
        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
        this.ctx.lineTo(x, height);
        this.ctx.stroke();
    }
};

function calculateWallLayer() {
	map.layers['calculate_wall'] = [];
    map.layers['calculate_wall_base'] = [];
	for (var c = map.cols - 1; c >= 0; c --) {
		for (var r = 0; r < map.rows; r ++) {
			if (true === map.layers['wall'][(r + 1) * map.cols + c]) {
				var t = 'roof_'
				if (true === map.layers['wall'][r * map.cols + c]) {
					t += 'u';
				}
				if (c < map.cols - 1 && true === map.layers['wall'][(r + 1) * map.cols + c + 1]) {
				    t += 'r';
				}
				if (true === map.layers['wall'][(r + 2) * map.cols + c]) {
					t += 'd';
				}
				if (c > 0 && true === map.layers['wall'][(r + 1) * map.cols + c - 1]) {
					t += 'l';
				}
				map.layers['calculate_wall'][r * map.cols + c] = t;
                map.layers['calculate_wall_base'][r * map.cols + c] = r + 1;
			} else if (true === map.layers['wall'][r * map.cols + c]) {
				t = 'wall_';
				if (c > 0 && true === map.layers['wall'][ r * map.cols + c - 1]) {
					t += 'l';
				}
				if (c < map.cols - 1 && true === map.layers['wall'][ r * map.cols + c + 1]) {
					t += 'r';
				}
				map.layers['calculate_wall'][r * map.cols + c] = t;
                map.layers['calculate_wall_base'][r * map.cols + c] = r;
			} else {
				map.layers['calculate_wall'][r * map.cols + c] = false;
			}
		}
	}
};

var tile_map = {
    'screen_lt': [0,34,34],
    'screen_t': [0,36,34],
    'screen_rt': [0,35,34],
    'screen_l': [0,36,35],
    'screen_c': [0,38,34],
    'screen_r': [0,37,34],
    'screen_lb': [0,34,35],
    'screen_b': [0,37,35],
    'screen_rb': [0,35,35],
    'carpet1_1': [0,2,11],
    'carpet1_2': [0,3,11],
    'carpet1_3': [0,5,11],
    'computer_table1': [0,12,3],
    'computer_table2': [0,12,4],
	'ground': [1,1,5],
    'ground0': [1,1,4],
    'ground1': [0,18,1],
    'ground2': [0,2,0],
    'ground3': [0,3,0],
    'ground4': [0,4,0],
    'ground5': [0,5,0],
    'ground6': [0,6,0],
    'ground7': [0,14,0],
    'ground8': [1,0,5],
    'ground9': [1,0,4],
    'ground10': [0,22,5],
	'pile': [0,7,6],
	'wall_': [0,0,2],
	'wall_l': [0,2,2],
	'wall_r': [0,1,2],
	'wall_lr': [0,3,2],
	'roof_': [0,14,1],
	'roof_u': [0,7,2],
	'roof_r': [0,1,1],
	'roof_ur': [0,8,2],
	'roof_d': [0,7,1],
	'roof_ud': [0,10,2],
	'roof_rd': [0,8,1],
	'roof_urd': [0,6,1],
	'roof_l': [0,2,1],
	'roof_ul': [0,9,2],
	'roof_rl': [0,10,1],
	'roof_url': [0,6,2],
	'roof_dl': [0,9,1],
	'roof_udl': [0,5,2],
	'roof_rdl': [0,5,1],
	'roof_urdl': [0,15,2],
	'chair': [0,10, 13],
    'tableA_1': [1,5,2],
    'tableA_2': [1,6,2],
    'tableA_3': [1,5,3],
    'tableA_4': [1,6,3],
    'tableB_1': [0,6,13],
    'tableB_2': [0,7,13],
    'tableB_3': [0,6,14],
    'tableB_4': [0,7,14],
    'deskA_1': [1,5,4],
    'deskA_2': [1,6,4],
    'deskA_3': [1,5,5],
    'deskA_4': [1,6,5],
    'deskB_1': [1,7,4],
    'deskB_2': [1,8,4],
    'deskB_3': [1,7,5],
    'deskB_4': [1,8,5],
    'deskC_1': [1,9,4],
    'deskC_2': [1,10,4],
    'deskC_3': [1,9,5],
    'deskC_4': [1,10,5],
    'deskD_1': [1,11,4],
    'deskD_2': [1,12,4],
    'deskD_3': [1,11,5],
    'deskD_4': [1,12,5],
    'deskE_1': [1,7,2],
    'deskE_2': [1,8,2],
    'deskE_3': [1,7,3],
    'deskE_4': [1,8,3],
    'deskF_1': [1,9,2],
    'deskF_2': [1,10,2],
    'deskF_3': [1,9,3],
    'deskF_4': [1,10,3],
    'deskG_1': [1,11,2],
    'deskG_2': [1,12,2],
    'deskG_3': [1,11,3],
    'deskG_4': [1,12,3],
    'deskH_1': [1,0,0],
    'deskH_2': [1,1,0],
    'deskH_3': [1,0,1],
    'deskH_4': [1,1,1],
    'deskI_1': [1,0,2],
    'deskI_2': [1,1,2],
    'deskI_3': [1,0,3],
    'deskI_4': [1,1,3],
    'bar_u': [0,2, 12],
    'bar_l': [0,2,13],
    'bar_r': [0,0,14],
    'bar_ul': [0,12,12],
    'bar_d': [0,13,12],
    'bar_lr': [0,1,14],
    'bar_ud': [0,3,13],
    'food_a': [0,3,5],
    'food_b': [0,3,6],
    'food_c':[0,4,6],
    'flower_1': [1,2,1],
    'flower_2': [1,3,1],
    'flower_3': [1,4,1],
    'flower_4': [1,5,1],
    'flower_5': [1,6,1],
    'flower_6': [1,7,1],
    'pool_1': [0,12,18],
    'pool_2': [0,13,18],
};

var tile_groups = {
    ground: [
        ['ground', 'ground0', 'ground1', 'ground2', 'ground3', 'ground4', 'ground5', 'ground6', 'ground7', 'ground8', 'ground9', 'ground10', 'pool_1', 'pool_2']
    ],
    object: [
        ['chair', 'carpet1_1', 'carpet1_2', 'carpet1_3',          'tableA_1', 'tableA_2', 'deskA_1', 'deskA_2', 'deskB_1', 'deskB_2', 'deskC_1', 'deskC_2', 'deskD_1', 'deskD_2', 'deskE_1', 'deskE_2', 'deskF_1', 'deskF_2', 'deskG_1', 'deskG_2', 'deskH_1', 'deskH_2'],
        ['screen_lt', 'screen_t', 'screen_rt', 'computer_table1', 'tableA_3', 'tableA_4', 'deskA_3', 'deskA_4', 'deskB_3', 'deskB_4', 'deskC_3', 'deskC_4', 'deskD_3', 'deskD_4', 'deskE_3', 'deskE_4', 'deskF_3', 'deskF_4', 'deskG_3', 'deskG_4', 'deskH_3', 'deskH_4'],
        ['screen_l', 'screen_c', 'screen_r', 'computer_table2', 'bar_l', 'bar_d', 'bar_lr', 'deskI_1', 'deskI_2', 'tableB_1', 'tableB_2', 'flower_1', 'flower_2', 'flower_3', 'flower_4', 'flower_5', 'flower_6'],
        ['screen_lb', 'screen_b', 'screen_rb', 'bar_u', 'bar_r','bar_ul', 'bar_ud'        , 'deskI_3', 'deskI_4', 'tableB_3', 'tableB_4'],
    ]
};

Game.drawGroundLayer = function () {
    var startCol = Math.floor(this.camera.x / map.tsize);
    var endCol = Math.min(map.cols - 1, startCol + (this.camera.width / map.tsize));
    var startRow = Math.floor(this.camera.y / map.tsize);
    var endRow = Math.min(map.rows - 1, startRow + (this.camera.height / map.tsize));
    var offsetX = -this.camera.x + startCol * map.tsize;
    var offsetY = -this.camera.y + startRow * map.tsize;

    for (var c = startCol; c <= endCol; c++) {
        for (var r = startRow; r <= endRow; r++) {
            var tile = map.getTile('ground', c, r);
            var x = (c - startCol) * map.tsize + offsetX;
            var y = (r - startRow) * map.tsize + offsetY;
            if (tile !== null) { // 'undefined' !== typeof(tile_map[tile])) { // 0 => empty tile
                if ('undefined' === typeof(tile_map[tile])) {
                    tile = 'ground';
                }
                tileS = tile_map[tile][0];
                tileX = tile_map[tile][1];
                tileY = tile_map[tile][2];
                this.ctx.drawImage(
                    this.tileAtlas[tileS], // image
                    tileX * map.tsize, // source x
                    tileY * map.tsize, // source y
                    map.tsize, // source width
                    map.tsize, // source height
                    Math.round(x),  // target x
                    Math.round(y), // target y
                    map.tsize, // target width
                    map.tsize // target height
                );
            }
        }
    }
};

Game.getDrawingWalls = function () {
    var startCol = Math.floor(this.camera.x / map.tsize);
    var endCol = Math.min(map.cols - 1, startCol + (this.camera.width / map.tsize));
    var startRow = Math.floor(this.camera.y / map.tsize);
    var endRow = Math.min(map.rows - 1, startRow + (this.camera.height / map.tsize));
    var offsetX = -this.camera.x + startCol * map.tsize;
    var offsetY = -this.camera.y + startRow * map.tsize;

    var objects = [];
    for (var c = startCol; c <= endCol; c++) {
        for (var r = startRow; r <= endRow; r++) {
			var tile = map.getTile('calculate_wall', c, r);
            var x = (c - startCol) * map.tsize + offsetX;
            var y = (r - startRow) * map.tsize + offsetY;
            if (false !== tile && 'undefined' !== typeof(tile) && 'undefined' !== typeof(tile_map[tile])) {
                tileS = tile_map[tile][0];
                tileX = tile_map[tile][1];
                tileY = tile_map[tile][2];
                objects.push([
                    (map.getTile('calculate_wall_base', c, r)) * 32,
                    'drawImage',
                    [
                    this.tileAtlas[tileS], // image
                    tileX * map.tsize, // source x
                    tileY * map.tsize, // source y
                    map.tsize, // source width
                    map.tsize, // source height
                    Math.round(x),  // target x
                    Math.round(y), // target y
                    map.tsize, // target width
                    map.tsize // target height
                    ]
                ]);
            }
        }
    }
    return objects;
};

Game.getDrawingHeroes = function(){
    var objects = [];
    var heroes = [];
    for (var id in this.heroes) {
        var hero = this.heroes[id];
        heroes.push(hero);
    }
    for (var id in Game.objects) {
        var object = Game.objects[id];
        if (object.type != 'npc') continue;
        var hero = {width:32, height:32};
        hero.x = object.x;
        hero.y = object.y;
        hero.col = 0;
        hero.row = parseInt(object.data.row);
        hero.name = object.data.name;
        hero.messages = [];
        hero.say_type = object.data.say_type
        switch(hero.say_type){
            case '2':
                var w = hero.x - Game.heroes.me.x;
                var h = hero.y - Game.heroes.me.y;
                if (w * w + h * h < 64 * 64) {
                    hero.messages = object.data.say.split("\n").map(function(e){ return [e]; });
                }
                break;
            case '3':
                hero.messages = object.data.say.split("\n").map(function(e){ return [e]; });
                break;
            case '4':
                hero.messages = object.data.say.split("\n").map(function(e){ return [e]; });
                break;
            case '5':
                var w = hero.x - Game.heroes.me.x;
                var h = hero.y - Game.heroes.me.y;
                if (w * w + h * h < 64 * 64) {
                    hero.messages = object.data.say.split("\n").map(function(e){ return [e]; });
                }
                break;
        }

        hero.messages = hero.messages.map(function(message){
            if (message[0].match(/\$people/)) {
                if (room) {
                    c = room.getParticipantCount();
                } else {
                    c = 1;
                }
                message[0] = message[0].replace(/\$people/, c);
            }
            return message;
        });

        character = object.data.character;
		if ('undefined' === typeof(hero.image)) {
            var image = Loader.getImage('hero:' + character);
            if (!image) {
                Loader.loadImage('hero:' + character, 'sprite/' + character + '.png').then();
            } else {
                hero.image = image;
            }
		}
        heroes.push(hero);
    }

	for (var hero of heroes) {
		if ('undefined' === typeof(hero.image)) {
			continue;
		}
        hero.screenX = hero.x - Game.camera.x;
		hero.screenY = hero.y - Game.camera.y;
		col = Math.floor(hero.col / 50) % 3;
        objects.push([
            hero.y,
            'drawImage',
            [
			hero.image,
			col * 32, hero.row * 32, 32, 32,
			hero.screenX - hero.width / 2,
			hero.screenY - hero.height / 2,
			32, 32
            ]
		]);

		objects.push([
            hero.y,
            (function(hero, ctx){
                 var textSize = ctx.measureText(hero.name);
                 var textHeight = textSize.actualBoundingBoxAscent + textSize.actualBoundingBoxDescent;

                 // name
                 ctx.font = 'normal 12px Arial';
                 ctx.textAlign = 'center';
                 ctx.strokeStyle = "black";
                 ctx.lineWidth = 3;
                 ctx.strokeText(hero.name,
                     hero.screenX,
                     hero.screenY - 20
                 );
                 ctx.textAlign = 'center';
                 ctx.fillStyle = "white";
                 ctx.fillText(hero.name,
                     hero.screenX,
                     hero.screenY - 20
                 );

                 // message
                 if (hero.messages.length) {
                     var width = 0;
                     var height = 0;
                     metric = ctx.measureText(hero.name + ':');
                     width = Math.max(width, metric.width);
                     height += metric.actualBoundingBoxAscent + metric.actualBoundingBoxDescent + 2;
                    var message_idx = -1;
                    var duration = 4 + (hero.messages.length % 2);
                    switch(hero.say_type){
                        case '4':
                        case '5':
                            message_idx = parseInt(((new Date()).getTime()/(1000*duration)))%hero.messages.length
                            metric = ctx.measureText(hero.messages[message_idx][0]);
                            width = Math.max(width, metric.width);
                            height += metric.actualBoundingBoxAscent + metric.actualBoundingBoxDescent + 2;
                            break;
                        default:
                            for (var message of hero.messages) {
                                metric = ctx.measureText(message[0]);
                                width = Math.max(width, metric.width);
                                height += metric.actualBoundingBoxAscent + metric.actualBoundingBoxDescent + 2;
                            }
                    }


                     ctx.beginPath();
                     ctx.fillStyle = 'white';
                     ctx.strokeStyle = 'black';
                     ctx.lineWidth = 2;

                     var bubbleLeft = hero.screenX - width / 2 - 3;
                     var bubbleTop = hero.screenY - 20 - height - 3;
                     var bubbleRight = hero.screenX + width / 2 + 3;
                     var bubbleBottom = hero.screenY - 20;

                     var radius = 2;
                     //left-top
                     ctx.moveTo(bubbleLeft + radius, bubbleTop);
                     //right-top
                     ctx.lineTo(bubbleRight - radius, bubbleTop);
                     ctx.quadraticCurveTo(bubbleRight, bubbleTop, bubbleRight, bubbleTop + radius);
                     //right-bottom
                     ctx.lineTo(bubbleRight, bubbleBottom - radius);
                     ctx.quadraticCurveTo(bubbleRight, bubbleBottom, bubbleRight - radius, bubbleBottom);
                     //angle
                     ctx.lineTo((bubbleLeft+bubbleRight)/2 + 4, bubbleBottom);
                     ctx.lineTo((bubbleLeft+bubbleRight)/2, bubbleBottom + 4);
                     ctx.lineTo((bubbleLeft+bubbleRight)/2 - 4, bubbleBottom);

                     //left-bottom
                     ctx.lineTo(bubbleLeft + radius, bubbleBottom);
                     ctx.quadraticCurveTo(bubbleLeft, bubbleBottom, bubbleLeft, bubbleBottom -radius);
                     // back to left-top
                     ctx.lineTo(bubbleLeft, bubbleTop + radius);
                     ctx.quadraticCurveTo(bubbleLeft, bubbleTop, bubbleLeft + radius, bubbleTop);

                     ctx.fill();
                     ctx.stroke();

                     ctx.textAlign = 'left';
                     ctx.fillStyle = 'black';

                     metric = ctx.measureText(hero.name + ':');
                     height -= (metric.actualBoundingBoxAscent + metric.actualBoundingBoxDescent + 2);
                     ctx.fillText(hero.name + ':',
                             hero.screenX - width / 2,
                             hero.screenY - 20 - height - 4
                             );
                    switch (hero.say_type){
                        case '4':
                        case '5':
                            let m = hero.messages[message_idx]
                            metric = ctx.measureText(m[0]);
                            height -= (metric.actualBoundingBoxAscent + metric.actualBoundingBoxDescent + 2);
                            ctx.fillText(m[0],
                                    hero.screenX - width / 2,
                                    hero.screenY - 20 - height - 4
                            );
                            break;
                        default:
                            for (var message of hero.messages) {
                                metric = ctx.measureText(message[0]);
                                height -= (metric.actualBoundingBoxAscent + metric.actualBoundingBoxDescent + 2);
                                ctx.fillText(message[0],
                                        hero.screenX - width / 2,
                                        hero.screenY - 20 - height - 4
                                );
                            }
                    }

                 }
            }),[hero, this.ctx]]);
    }
    return objects;
};

