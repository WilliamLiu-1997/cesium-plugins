Cesium.Ion.defaultAccessToken =
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIyY2RiZTA3Ny03MGFlLTQzNzgtOWJmZi05YmNjMWMxNTQ5MjYiLCJpZCI6NzYzMTIsImlhdCI6MTYzOTM4MTc0N30.xJmr6nruHniCNAC1OBIp2sJs5DhIAZpXlXOiYBlasO4';
var viewer = new Cesium.Viewer('cesiumContainer', {
	// terrainProvider: Cesium.createWorldTerrain({
	// 	//requestWaterMask: true,
	// 	requestVertexNormals: true,
	// }),
	//shadows: true,
	//terrainShadows: Cesium.ShadowMode.ENABLED,
	baseLayerPicker: false,
	timeline: false,
	animation: false,
	fullscreenButton: false,
	vrButton: false,
	homeButton: false,
	infoBox: false,
	sceneModePicker: false,
	selectionIndicator: false,
	navigationHelpButton: false,
	navigationInstructionsInitiallyVisible: false,
});
var camera = viewer.camera;
var scene = viewer.scene;
scene.globe.depthTestAgainstTerrain = true;
scene.debugShowFramesPerSecond = true;
var scene = viewer.scene;

