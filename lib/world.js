/*
 * world.js
 * 
 * Generate world maps.
*/

var	merge = require('deepmerge'),
	tUtil = require('./terra-util'),
	tDomain = require('./terra-domain');
	
var CellType = tDomain.CellType;
var defaultConfig = tDomain.defaultConfig;
var World = tDomain.World;

function getRandomNumber(max) {
	return Math.floor(Math.random() * max);
}

function getRandomNumberInclusive(max) {
	return getRandomNumber(max + 1);
}

function rollDie(successPercent) {
	return Math.random() <= successPercent;
}

function getRandomCoordinate(world, type) {
	var x = getRandomNumber(world.width);
	var y = getRandomNumber(world.height);
	
	while (world._grid[y][x] != type) {
		x = getRandomNumber(world.width);
		y = getRandomNumber(world.height);
	}
	
	return { x: x, y: y };
}

function getRandomOceanCoordinate(world) {
	var coord = getRandomCoordinate(world, CellType.SEA);
	var neighbors = getNeighbors(world._grid, coord.x, coord.y);
	
	while (!allNeighborsAre(neighbors, CellType.SEA)) {
		coord = getRandomCoordinate(world, CellType.SEA);
		neighbors = getNeighbors(world._grid, coord.x, coord.y);		
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

function getNeighbors(grid, y, x, type) {
	var neighbors = [];
	
	//checks for existence of all neighbors 1 away from the selected coordinate.
	for (var r = y - 1; r <= y + 1; r++) {
		for (var c = x - 1; c <= x + 1; c++) {
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

			if (y >= 0 && y < world._grid.length && x >= 0 && x < world._grid[y].length) {
				world._grid[y][x] = type;
				world._sparks.push({ x: x, y: y });
			}
		}
	}
}

function createIsland(world, seedY, seedX, maxSize) {
	var size = getRandomNumber(maxSize);
	if (size == 0) size = 1;

	//expand across rows and columns to create a seed square, with the
	//upper left at the chosen random coordinate.
	var percent = world._config.geography.land;
	var sparks = [];
	
	for (var r = 0; r < size; r++) {
		for (var c = 0; c < size; c++) {
			var x = seedX + r;
			var y = seedY + c;

			if (y >= 0 && y < world._grid.length && x >= 0 && x < world._grid[y].length) {
				world._grid[y][x] = CellType.LAND;
				sparks.push({ x: x, y: y });
			}
		}
	}
	
	var assignments = size * 2;
	var sparksAssigned = 0;
	while (sparksAssigned < assignments) {
		if (sparks.length == 0) break;
		var index = getRandomNumber(sparks.length);
		var spark = sparks[index];
		var sparksToAdd = [];
		
		var neighbors = getNeighbors(world._grid, spark.y, spark.x, CellType.SEA);
		
		for (var c = 0; c < neighbors.length; c++) {
			var neighbor = neighbors[c];
			var land = rollDie(percent);
			
			if (land) {
				world._grid[neighbor.y][neighbor.x] = CellType.LAND;
				sparksToAdd.push(neighbor);
			}
		}
		
		sparks.splice(index, 1);
		sparks = sparks.concat(sparksToAdd);
		sparksAssigned++;
	}
}

function createWorld(config) {
	var world = phase0(config);
	phase1(world);
	phase2(world);
	phase3(world);
	return world;
}

function validateConfig(config) {
	var errors = '';
	
	if (typeof config.height != 'number' && !(config.height instanceof Number)) {
		errors += 'Height is missing or not a valid number.\n';
	}
	
	if (typeof config.width != 'number' && !(config.width instanceof Number)) {
		errors += 'Width is missing or not a valid number.\n';
	}
	
	return errors;
}

function phase0(config) {
	config = merge(defaultConfig, config);
	var errors = validateConfig(config);
	
	if (errors.length > 0) {
		throw new Error(errors);
	}
	
	//create and initialize world map.
	var world = new World();
	world.height = config.height;
	world.width = config.width;
	
	world._config = config;
	world._grid = [];
	world._sparks = [];
	
	for (var y = 0; y < config.height; y++) {
		world._grid[y] = [];
		for (var x = 0; x < config.width; x++) {
			world._grid[y][x] = CellType.UNASSIGNED;
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
	var assignments = Math.floor(world._config.phases.phase1 * squares);
	var sparksAssigned = 0;
	
	while (sparksAssigned < assignments) {
		if (world._sparks.length == 0) continue;
		var index = getRandomNumber(world._sparks.length);
		var spark = world._sparks[index];
		var assignedNeighbors = phase1AssignNeighbors(spark, world);
		world._sparks.splice(index, 1);
		world._sparks = world._sparks.concat(assignedNeighbors);
		sparksAssigned++;
	}
}

function phase1AssignNeighbors(spark, world) {
	var x = spark.x;
	var y = spark.y;
	var neighbors = getNeighbors(world._grid, y, x, CellType.UNASSIGNED);
	tUtil.shuffle(neighbors);
	
	var percent = world._config.geography.mountains;
	
	if (world._grid[y][x] == CellType.MOUNTAIN) {
		var mountainous = rollDie(percent) ? true : false;
		
		for (var c = 0; c < neighbors.length; c++) {
			var neighbor = neighbors[c];
			
			if (mountainous) {
				world._grid[neighbor.y][neighbor.x] = CellType.MOUNTAIN;	
			}
			else {
				world._grid[neighbor.y][neighbor.x] = CellType.LAND;
			}
		}		
	}
	else if (world._grid[y][x] == CellType.LAND) {
		for (var c = 0; c < neighbors.length; c++) {
			var neighbor = neighbors[c];
			var mountainous = rollDie(.009) ? true : false;
			
			if (mountainous) {
				world._grid[neighbor.y][neighbor.x] = CellType.MOUNTAIN;	
			}
			else {
				world._grid[neighbor.y][neighbor.x] = CellType.LAND;
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
	var assignments = Math.floor(world._config.phases.phase2 * squares);
	var sparksAssigned = 0;
	
	while (sparksAssigned < assignments) {
		var index = getRandomNumber(world._sparks.length);
		var spark = world._sparks[index];
		var assignedNeighbors = phase2AssignNeighbors(spark, world);
		world._sparks.splice(index, 1);
		world._sparks = world._sparks.concat(assignedNeighbors);
		sparksAssigned++;
	}
}

function phase2AssignNeighbors(spark, world) {
	var x = spark.x;
	var y = spark.y;
	var neighbors = getNeighbors(world._grid, y, x, CellType.UNASSIGNED);
	tUtil.shuffle(neighbors);
	
	if (world._grid[y][x] == CellType.MOUNTAIN || world._grid[y][x] == CellType.LAND) {
		var percent = world._config.geography.land;
		var isLand = rollDie(percent);
		
		for (var c = 0; c < neighbors.length; c++) {
			var neighbor = neighbors[c];
		
			if (isLand) {
				world._grid[neighbor.y][neighbor.x] = CellType.LAND;
			}
			else {
				world._grid[neighbor.y][neighbor.x] = CellType.SEA;
			}
		}
	}
	else if (world._grid[y][x] == CellType.SEA) {	
		for (var c = 0; c < neighbors.length; c++) {
			var neighbor = neighbors[c];
			world._grid[neighbor.y][neighbor.x] = CellType.SEA;
		}
	}
	else {
		throw new Error('Phase 2: something went horribly wrong...');
	}
	
	return neighbors;
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
			if (world._grid[y][x] == CellType.UNASSIGNED) {
				world._grid[y][x] = CellType.SEA;
			}
		}
	}
}

function phase3AssignIslands(world) {
	var numIslands = world._config.geography.islands.number;
	var maxSize = world._config.geography.islands.maxSize;
	var percent = world._config.geography.land;
	var sparks = [];
	
	for (var c = 0; c < numIslands; c++) {
		var coord = getRandomOceanCoordinate(world);
		sparks.push(coord);
	}
		
	var squares = world.width * world.height;
	var assignments = Math.floor(world._config.phases.phase3 * squares);
	var sparksAssigned = 0;
	
	while (sparks.length > 0) {
		sparksAssigned++;
		if (sparks.length == 0) continue;
		
		var index = getRandomNumber(sparks.length);
		var spark = sparks[index];
					
		/*
		var neighbors = getNeighbors(world._grid, spark.x, spark.y, CellType.SEA);
		var sparksToAdd = [];
		
		for (var c = 0; c < neighbors.length; c++) {
			var neighbor = neighbors[c];
			
			var land = rollDie(percent);
			
			if (land) {
				world._grid[neighbor.y][neighbor.x] = CellType.LAND;
			}
		}
		
		//sparks = sparks.concat(sparksToAdd);
		*/
		createIsland(world, spark.y, spark.x, maxSize);
		sparks.splice(index, 1);
	}
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

function phase3AssignIcecaps(world) {
	//icecaps: first and last rows always have pure ice, while
	//rows above and below have less ice until eventually no ice.
	var icePercent = .75;
	var weight = world._config.geography.icecaps.density;
	var extension = world._config.geography.icecaps.extension;
		
	for (var y = 0; y < world.height; y++) {
		for (var x = 0; x < world.width; x++) {
			var chanceOfIce = icePercent * weight * getBaseIceChance(world.height, y, extension);
			
			if (rollDie(chanceOfIce)) {
				world._grid[y][x] = CellType.ICE;
			}
		}
	}
}

function phase3AssignWaterMask(world) {
	var maskSize = world._config.watermask.size;
	var percent = world._config.watermask.chance;
	
	for (var y = 0; y < world._grid.length; y++) {
		for (var x = 0; x < maskSize; x++) {
			var row = world._grid[y];
			
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

exports.createWorld = createWorld;
