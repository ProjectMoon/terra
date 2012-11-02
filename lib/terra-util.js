var	tDomain = require('./terra-domain');

var CellType = tDomain.CellType;

exports.shuffle = function(o) {
    for(var j, x, i = o.length; i; j = parseInt(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
    return o;
}

exports.drawWorld = function(world) {
	for (var row = 0; row < world.height; row++) {
		for (var col = 0; col < world.width; col++) {
			var type = world._grid[row][col];
			
			if (type == CellType.MOUNTAIN) {
				process.stdout.write('^');
			}
			else if (type == CellType.LAND) {
				process.stdout.write('-');
			}
			else if (type == CellType.SEA) {
				process.stdout.write('~');
			}
			else if (type == CellType.ICE) {
				process.stdout.write('*');
			}
			else {
				process.stdout.write('?');
			}
		}
		
		process.stdout.write('\n');
	}
}
