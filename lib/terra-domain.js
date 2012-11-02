exports.CellType = {
	UNASSIGNED: 0,
	LAND: 1,
	MOUNTAIN: 2,
	SEA: 3,
	ICE: 4
};

exports.defaultConfig = {
	watermask: {
		size: 4,
		chance: .75
	},
	seeds: {
		number: 10,
		maxSize: 5
	},
	geography: {
		mountains: .43,
		land: .9,
		islands: {
			number: 10,
			maxSize: 5
		},
		icecaps: {
			density: 2,
			extension: .02
		}
	},
	phases: {
		phase1: .1,
		phase2: .1
	}
};

//World class.
function World(config) {
	this.height = null;
	this.width = null;
	
	this._grid = null;
	this._config = null;
	this._sparks = null;
}

World.prototype.coord = function(x, y) {
	return this._grid[x][y];
}

//Exports
exports.World = World;
