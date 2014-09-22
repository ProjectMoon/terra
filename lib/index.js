var	world = require('./world'),
	tUtil = require('./terra-util'),
	tDomain = require('./terra-domain');
	
exports.defaultConfig = tDomain.defaultConfig;
exports.CellType = tDomain.CellType;
exports.createWorld = world.createWorld;
exports.drawWorld = tUtil.drawWorld;
