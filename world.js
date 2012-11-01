/*
 * world.js
 * 
 * Generate world maps.
*/

var CellType = {
	UNASSIGNED: 0,
	LAND: 1,
	MOUNTAIN: 2,
	SEA: 3,
	ICE: 4
};

function getRandomNumber(max) {
	return Math.floor(Math.random() * max);
}

function getRandomNumberInclusive(max) {
	return getRandomNumber(max + 1);
}

function rollDie(successPercent) {
	return Math.random() <= successPercent;
}

function shuffle(o) {
    for(var j, x, i = o.length; i; j = parseInt(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
    return o;
}

function getRandomCoordinate(world, type) {
	var x = getRandomNumber(world.width);
	var y = getRandomNumber(world.height);
	
	while (world.grid[y][x] != type) {
		x = getRandomNumber(world.width);
		y = getRandomNumber(world.height);
	}
	
	return { x: x, y: y };
}

function getRandomOceanCoordinate(world) {
	var coord = getRandomCoordinate(world, CellType.SEA);
	var neighbors = getNeighbors(world.grid, coord.x, coord.y);
	
	while (!allNeighborsAre(neighbors, CellType.SEA)) {
		coord = getRandomCoordinate(world, CellType.SEA);
		neighbors = getNeighbors(world.grid, coord.x, coord.y);		
	}
	
	return coord;
}

function allNeighborsAre(grid, neighbors, type) {
	var valid = true;
	
	for (var c = 0; c < neighbors.length; c++) {
		var n = neighbors[c];
		if (grid[n.y][n.x] != type) {
			valid = false;
			break;
		}
	}
	
	return valid;
}

function getNeighbors(grid, x, y, type) {
	var neighbors = [];
	
	//checks for existence of all neighbors 1 away from the selected coordinate.
	for (var r = x - 1; r <= x + 1; r++) {
		for (var c = y - 1; c <= y + 1; c++) {
			if (r >= 0 && r < grid.length && c >= 0 && c < grid[r].length) {
				if (typeof type != undefined) {
					if (grid[r][c] == type) {
						neighbors.push({ x: c, y: r });
					}
				}
				else {
					neighbors.push({ x: c, y: r});
				}
			}
		}
	}
	
	return neighbors;
}

function createSeedSpark(world, type, maxSize) {
	var coord = getRandomCoordinate(world, CellType.UNASSIGNED);
	var seedX = coord.x;
	var seedY = coord.y;
	
	var size = getRandomNumber(maxSize);
	if (size == 0) size = 1;

	//expand across rows and columns to create a seed square, with the
	//upper left at the chosen random coordinate.
	for (var r = 0; r < size; r++) {
		for (var c = 0; c < size; c++) {
			var x = seedX + r;
			var y = seedY + c;

			if (y >= 0 && y < world.grid.length && x >= 0 && x < world.grid[y].length) {
				world.grid[y][x] = type;
				world.sparks.push({ x: x, y: y });
			}
		}
	}
}

/*
 * config has the following properties:
 *   width: width of world.
 *   height: height of world.
 *   seeds: number of land seeds.
 *   seedSize: how big each seed is. 
 */
function createWorld(config) {
	var world = phase0(config);
	phase1(world);
	phase2(world);
	phase3(world);
	return world;
}

function phase0(config) {
	//create and initialize world map.
	var world = {};
	world.config = config;
	world.height = config.height;
	world.width = config.width;
	world.grid = [];
	world.sparks = [];
	
	for (var y = 0; y < config.height; y++) {
		world.grid[y] = [];
		for (var x = 0; x < config.width; x++) {
			world.grid[y][x] = CellType.UNASSIGNED;
		}
	}
	
	//mountains shall be the seeds of our world.
	for (var c = 0; c < config.seeds.number; c++) {
		createSeedSpark(world, CellType.MOUNTAIN, config.seeds.maxSize);
	}
	
	return world;	
}

function phase1(world) {
	var squares = world.width * world.height;
	var assignments = Math.floor(world.config.phases.phase1 * squares);
	var sparksAssigned = 0;
	
	while (sparksAssigned < assignments) {
		if (world.sparks.length == 0) continue;
		var index = getRandomNumber(world.sparks.length);
		var spark = world.sparks[index];
		var assignedNeighbors = phase1AssignNeighbors(spark, world);
		world.sparks.splice(index, 1);
		world.sparks = world.sparks.concat(assignedNeighbors);
		sparksAssigned++;
	}
}

function phase1AssignNeighbors(spark, world) {
	var x = spark.x;
	var y = spark.y;
	var neighbors = getNeighbors(world.grid, y, x, CellType.UNASSIGNED);
	shuffle(neighbors);
	
	var percent = world.config.geography.mountains;
	
	if (world.grid[y][x] == CellType.MOUNTAIN) {
		var mountainous = rollDie(percent) ? true : false;
		
		for (var c = 0; c < neighbors.length; c++) {
			var neighbor = neighbors[c];
			
			if (mountainous) {
				world.grid[neighbor.y][neighbor.x] = CellType.MOUNTAIN;	
			}
			else {
				world.grid[neighbor.y][neighbor.x] = CellType.LAND;
			}
		}		
	}
	else if (world.grid[y][x] == CellType.LAND) {
		for (var c = 0; c < neighbors.length; c++) {
			var neighbor = neighbors[c];
			var mountainous = rollDie(.009) ? true : false;
			
			if (mountainous) {
				world.grid[neighbor.y][neighbor.x] = CellType.MOUNTAIN;	
			}
			else {
				world.grid[neighbor.y][neighbor.x] = CellType.LAND;
			}
		}
	}
	else {
		throw new Error('Phase 1: Something went horribly wrong...');
	}
	
	return neighbors;
}

function phase2(world) {
	//create 40 sea sparks.
	//TODO: this will have to scale with map size probably.
	for (var c = 0; c < 40; c++) {
		createSeedSpark(world, CellType.SEA, 1);
	}
		
	var squares = world.width * world.height;
	var assignments = Math.floor(world.config.phases.phase2 * squares);
	var sparksAssigned = 0;
	
	while (sparksAssigned < assignments) {
		if (world.sparks.length == 0) continue;
		var index = getRandomNumber(world.sparks.length);
		var spark = world.sparks[index];
		var assignedNeighbors = phase2AssignNeighbors(spark, world);
		world.sparks.splice(index, 1);
		world.sparks = world.sparks.concat(assignedNeighbors);
		sparksAssigned++;
	}
}

function phase2AssignNeighbors(spark, world) {
	var x = spark.x;
	var y = spark.y;
	var neighbors = getNeighbors(world.grid, x, y, CellType.UNASSIGNED);
	shuffle(neighbors);
	
	if (world.grid[y][x] == CellType.MOUNTAIN || world.grid[y][x] == CellType.LAND) {
		for (var c = 0; c < neighbors.length; c++) {
			var neighbor = neighbors[c];
			var percent = world.config.geography.land;
			var isLand = rollDie(percent) ? true : false;
			
			if (isLand) {
				world.grid[neighbor.y][neighbor.x] = CellType.LAND;
			}
			else {
				world.grid[neighbor.y][neighbor.x] = CellType.SEA;
			}
		}
	}
	else if (world.grid[y][x] == CellType.SEA) {	
		for (var c = 0; c < neighbors.length; c++) {
			var neighbor = neighbors[c];
			world.grid[neighbor.y][neighbor.x] = CellType.SEA;
		}
	}
	else {
		throw new Error('Phase 2: something went horribly wrong...');
	}
	
	return neighbors;
}

function getBaseIceChance(height, y, extension) {
	var equator = Math.floor(height / 2);
	
	if (y < equator) {
		//north
		var maxLatitude = Math.floor(extension * height);
		
		if (y > maxLatitude) return 0;
		else return 1 - (y / maxLatitude);
	}
	else {
		//south
		var maxLatitude = height - Math.floor(extension * height) - 1;
		
		if (y < maxLatitude) return 0;		
		else return (y - maxLatitude) / (height - maxLatitude);
	}
}

function phase3(world) {
	phase3AssignOcean(world);
	phase3AssignIslands(world);
	phase3AssignWaterMask(world);
	phase3AssignIcecaps(world);
}

function phase3AssignOcean(world) {
	for (var y = 0; y < world.height; y++) {
		for (var x = 0; x < world.width; x++) {
			if (world.grid[y][x] == CellType.UNASSIGNED) {
				world.grid[y][x] = CellType.SEA;
			}
		}
	}
}

function phase3AssignIslands(world) {
	var numIslands = world.config.geography.islands.number;
	var maxSize = world.config.geography.islands.maxSize;
	var percent = world.config.geography.land;
	var sparks = [];
	
	for (var c = 0; c < numIslands; c++) {
		var coord = getRandomOceanCoordinate(world);
		sparks.push(coord);
	}
		
	var squares = world.width * world.height;
	var assignments = Math.floor(world.config.phases.phase3 * squares);
	var sparksAssigned = 0;
	
	console.log(sparks.length);
	while (sparksAssigned < assignments) {
		sparksAssigned++;
		if (sparks.length == 0) continue;
		
		var index = getRandomNumber(sparks.length);
		var spark = sparks[index];
				
		var size = getRandomNumberInclusive(maxSize);
		var neighbors = getNeighbors(world.grid, spark.x, spark.y, CellType.SEA);
		var sparksToAdd = [];
		
		for (var c = 0; c < neighbors.length; c++) {
			var neighbor = neighbors[c];
			
			var land = rollDie(percent);
			
			if (land) {
				world.grid[neighbor.y][neighbor.x] = CellType.LAND;
					
				if (c < size) {
					sparksToAdd.push(neighbor);
				}
			}
		}
		
		sparks.splice(index, 1);
		sparks = sparks.concat(sparksToAdd);
	}
}

function phase3AssignIcecaps(world) {
	//icecaps: first and last rows always have pure ice, while
	//rows above and below have less ice until eventually no ice.
	var icePercent = .75;
	var weight = world.config.geography.icecaps.density;
	var extension = world.config.geography.icecaps.extension;
		
	for (var y = 0; y < world.height; y++) {
		for (var x = 0; x < world.width; x++) {
			var chanceOfIce = icePercent * weight * getBaseIceChance(world.height, y, extension);
			
			if (rollDie(chanceOfIce)) {
				world.grid[y][x] = CellType.ICE;
			}
		}
	}
}

function phase3AssignWaterMask(world) {
	var maskSize = world.config.watermask.size;
	var percent = world.config.watermask.chance;
	
	for (var y = 0; y < world.grid.length; y++) {
		for (var x = 0; x < maskSize; x++) {
			var row = world.grid[y];
			
			//edges always have water
			if (x == 0) {
				row[x] = CellType.SEA;
				row[row.length - x - 1] = CellType.SEA;
			}
			else {
				var maskLeft = rollDie(percent);
				var maskRight = rollDie(percent);
				if (maskLeft) row[x] = CellType.SEA;
				if (maskRight) row[row.length - x - 1] = CellType.SEA;
			}
		}
	}
}

function drawWorld(world) {
	for (var row = 0; row < world.height; row++) {
		for (var col = 0; col < world.width; col++) {
			var type = world.grid[row][col];
			
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

var world = createWorld({
	height: 200,
	width: 200,
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
			maxSize: 2
		},
		icecaps: {
			density: 2,
			extension: .02
		}
	},
	phases: {
		phase1: .1,
		phase2: .1,
		phase3: .1
	}
});

drawWorld(world);
