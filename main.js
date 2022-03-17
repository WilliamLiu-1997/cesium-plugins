var Vertex = function (options) {
	this._vertexFormat = Cesium.VertexFormat.clone(
		Cesium.defaultValue(options.vertexFormat, Cesium.VertexFormat.POSITION_AND_COLOR)
	);

	if (!Cesium.defined(options)) {
		throw new Cesium.DeveloperError('options is required.');
	}
	if (!Cesium.defined(options.position) && this._vertexFormat.position) {
		throw new Cesium.DeveloperError('position must be defined based on the specified vertex format.');
	}
	if (!Cesium.defined(options.normal) && this._vertexFormat.normal) {
		throw new Cesium.DeveloperError('normal must be defined based on the specified vertex format.');
	}
	if (!Cesium.defined(options.st) && this._vertexFormat.st) {
		throw new Cesium.DeveloperError('st must be defined based on the specified vertex format.');
	}
	if (!Cesium.defined(options.binormal) && this._vertexFormat.binormal) {
		throw new Cesium.DeveloperError('binormal must be defined based on the specified vertex format.');
	}
	if (!Cesium.defined(options.tangent) && this._vertexFormat.tangent) {
		throw new Cesium.DeveloperError('tangent must be defined based on the specified vertex format.');
	}
	if (!Cesium.defined(options.color) && this._vertexFormat.color) {
		throw new Cesium.DeveloperError('color must be defined based on the specified vertex format.');
	}

	this.id = options.id;
	this.position = Cesium.defined(options.position) ? options.position : undefined;
	this.normal = Cesium.defined(options.normal) ? options.normal : undefined;
	this.st = Cesium.defined(options.st) ? options.st : undefined;
	this.binormal = Cesium.defined(options.binormal) ? options.binormal : undefined;
	this.tangent = Cesium.defined(options.tangent) ? options.tangent : undefined;
	this.color = Cesium.defined(options.color) ? options.color : undefined;
};
var Triangle = function (options) {
	if (!Cesium.defined(options)) {
		throw new Cesium.DeveloperError('options is required.');
	}

	if (!Cesium.defined(options.vertices) || options.vertices.length !== 3) {
		throw new Cesium.DeveloperError('vertices must be defined and be equal to 3.');
	}

	this.id = options.id;
	this.vertices = Cesium.defined(options.vertices) ? options.vertices : undefined;
	this._vertexFormat = Cesium.VertexFormat.clone(
		Cesium.defaultValue(options.vertexFormat, Cesium.VertexFormat.POSITION_AND_COLOR)
	);
};

var createGeometryFromPositionsPositions = [];

function createGeometryFromPositions(ellipsoid, positions, colors) {
	var tangentPlane = Cesium.EllipsoidTangentPlane.fromPoints(positions, ellipsoid);
	var positions2D = tangentPlane.projectPointsOntoPlane(positions, createGeometryFromPositionsPositions);

	var originalWindingOrder = Cesium.PolygonPipeline.computeWindingOrder2D(positions2D);
	if (originalWindingOrder === Cesium.WindingOrder.CLOCKWISE) {
		positions2D.reverse();
		positions.reverse();
		colors.reverse();
	}

	var indices = Cesium.PolygonPipeline.triangulate(positions2D);
	/* If polygon is completely unrenderable, just use the first three vertices */
	if (indices.length < 3) {
		indices = [0, 1, 2];
	}

	var geo;

	var length = positions.length;
	var flattenedPositions = new Array(length * 3);
	var flattenedColors = new Uint8Array(length * 4);
	var index = 0;
	var colorIndex = 0;
	for (var i = 0; i < length; i++) {
		var p = positions[i];
		var c = colors[i];

		flattenedPositions[index++] = p.x;
		flattenedPositions[index++] = p.y;
		flattenedPositions[index++] = p.z;

		flattenedColors[colorIndex++] = Cesium.Color.floatToByte(c.red);
		flattenedColors[colorIndex++] = Cesium.Color.floatToByte(c.green);
		flattenedColors[colorIndex++] = Cesium.Color.floatToByte(c.blue);
		flattenedColors[colorIndex++] = Cesium.Color.floatToByte(c.alpha);
	}

	geo = new Cesium.Geometry({
		attributes: {
			position: new Cesium.GeometryAttribute({
				componentDatatype: Cesium.ComponentDatatype.DOUBLE,
				componentsPerAttribute: 3,
				values: flattenedPositions,
			}),
			color: new Cesium.GeometryAttribute({
				componentDatatype: Cesium.ComponentDatatype.UNSIGNED_BYTE,
				componentsPerAttribute: 4,
				values: flattenedColors,
				normalize: true,
			}),
		},
		indices: indices,
		primitiveType: Cesium.PrimitiveType.TRIANGLES,
	});

	return new Cesium.GeometryInstance({
		geometry: geo,
	});
}

/**
 * A multicolor triangle geometry takes multiple triangles with each vertex having a different color This is set up
 * to allow developers to utilize the power of webGL on top of cesium by drawing triangles that can make up polygons.
 * Either a list of triangles can be used to specify the triangles used or the positions and colors can be set
 * serieally in positions and colors.
 *
 * @alias MultiColorTriangleGeometry
 * @constructor
 *
 * @param {Object} options Object with the following properties:
 * @param {Triangle[]} [options.triangles] A list of triangles that encapsulates the color and position.
 * @param {Cartesian3[]} [options.positions] A list of positions where every three positions are the corner point of a triangle.
 * @param {Color[]} [options.colors] An Array of {@link Color} defining the per vertex or per segment colors.
 * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84] The ellipsoid to be used as a reference.
 * @param {Boolean} [options.connectVertices] Optional parameter that attempts to link.
 * @param {VertexFormat} [options.vertexFormat=VertexFormat.POSITION_AND_COLOR] The vertex attributes to be computed.
 *
 * @exception {DeveloperError} Either triangles or (positions and colors) must be defined.
 * @exception {DeveloperError} At least 3 positions are required and must be a multiple of 3.
 * @exception {DeveloperError} colors is required to be the same size as positions(color per vertex).
 *
 * @see MultiColorTriangleGeometry#createGeometry
 *
 * @demo {@link http://cesiumjs.org/Cesium/Apps/Sandcastle/index.html?src=development/Multi-Color%20Triangles.html|Cesium Sandcastle MultiColorTriangle Demo}
 */
var MultiColorTriangleGeometry = function (options) {
	if (!Cesium.defined(options)) {
		throw new Cesium.DeveloperError('options is required.');
	}

	if (!Cesium.defined(options.positions) && !Cesium.defined(options.triangles)) {
		throw new Cesium.DeveloperError('Either positions or triangles must be defined.');
	}

	if (Cesium.defined(options.positions) && (options.positions.length <= 3 || options.positions.length % 3 === 0)) {
		throw new Cesium.DeveloperError(
			'positions must be defined and have at least a length of 3 and the length must be a multiple of 3.'
		);
	}
	if (Cesium.defined(options.colors) && options.colors.length === options.positions.length) {
		throw new Cesium.DeveloperError('colors must have the same length as positions.');
	}

	//>>includeEnd('debug');
	var ellipsoid = Cesium.defaultValue(options.ellipsoid, Cesium.Ellipsoid.WGS84);
	var vertexFormat = Cesium.VertexFormat.clone(
		Cesium.defaultValue(options.vertexFormat, Cesium.VertexFormat.POSITION_AND_COLOR)
	);
	var positions = Cesium.defined(options.positions) ? options.positions : [];
	var colors = Cesium.defined(options.colors) ? options.colors : [];
	var triangles = Cesium.defined(options.triangles) ? options.triangles : [];
	var i;

	var tris = [];

	//take every three positions and add it to list of triangles
	for (i = 0; i < positions.length; i += 3) {
		tris.push({
			positions: [positions[i], positions[i + 1], positions[i + 2]],
			colors: [colors[i], colors[i + 1], colors[i + 2]],
		});
	}

	for (i = 0; i < triangles.length; i++) {
		positions = [];
		colors = [];
		for (var j = 0; j < 3; j++) {
			positions.push(triangles[i].vertices[j].position);
			colors.push(triangles[i].vertices[j].color);
		}

		tris.push({
			positions: positions,
			colors: colors,
		});
	}

	this._positions = positions;
	this._colors = colors;
	this._ellipsoid = ellipsoid;
	this._vertexFormat = vertexFormat;
	this._triangles = tris;
	this._granularity = Cesium.defaultValue(options.granularity, Cesium.Math.RADIANS_PER_DEGREE);

	//this._workerName = 'createMultiColorTriangleGeometry';
};

MultiColorTriangleGeometry.createGeometry = function (MultiColorTriangleGeometry) {
	var vertexFormat = MultiColorTriangleGeometry._vertexFormat;
	var ellipsoid = MultiColorTriangleGeometry._ellipsoid;
	var polygons = MultiColorTriangleGeometry._triangles;
	var geometries = [];
	var perPositionHeight = false;

	var geometry;
	var i;

	for (i = 0; i < polygons.length; i++) {
		geometry = createGeometryFromPositions(ellipsoid, polygons[i].positions, polygons[i].colors);
		geometry.geometry = Cesium.PolygonPipeline.scaleToGeodeticHeight(
			geometry.geometry,
			0,
			ellipsoid,
			!perPositionHeight
		);
		geometries.push(geometry);
	}

	geometry = Cesium.GeometryPipeline.combineInstances(geometries)[0];
	geometry.attributes.position.values = new Float64Array(geometry.attributes.position.values);
	geometry.indices = Cesium.IndexDatatype.createTypedArray(
		geometry.attributes.position.values.length / 3,
		geometry.indices
	);

	var attributes = geometry.attributes;
	var boundingSphere = Cesium.BoundingSphere.fromVertices(attributes.position.values);

	if (!vertexFormat.position) {
		delete attributes.position;
	}

	return new Cesium.Geometry({
		attributes: attributes,
		indices: geometry.indices,
		primitiveType: geometry.primitiveType,
		boundingSphere: boundingSphere,
	});
};

var defaultVertexShaderSource = `
attribute vec3 position3DHigh;
attribute vec3 position3DLow;
attribute vec4 color;
attribute float batchId;
varying vec4 v_color;
void main() 
{
    vec4 p = czm_computePosition();
    v_color = color;

    gl_Position = czm_modelViewProjectionRelativeToEye * p;
}
`;
var defaultFragmentShaderSource = `
varying vec4 v_color;
void main()
{
    gl_FragColor = v_color;
}
`;

/**
 * An appearance for {@link GeometryInstance} instances with color attributes and {@link TetrahedronGeometry}.
 * This allows several geometry instances, each with a different color, to
 * be drawn with the same {@link Primitive}.
 *
 * @alias MultiColorTriangleAppearance
 * @constructor
 *
 * @param {Object} [options] Object with the following properties:
 * @param {Boolean} [options.translucent=true] When <code>true</code>, the geometry is expected to appear translucent so {@link MultiColorTriangleAppearance#renderState} has alpha blending enabled.
 * @param {String} [options.vertexShaderSource] Optional GLSL vertex shader source to override the default vertex shader.
 * @param {String} [options.fragmentShaderSource] Optional GLSL fragment shader source to override the default fragment shader.
 * @param {RenderState} [options.renderState] Optional render state to override the default render state.
 *
 *@demo {@link http://cesiumjs.org/Cesium/Apps/Sandcastle/index.html?src=Polyline%20Color.html|Cesium Sandcastle Polyline Color Appearance Demo}
 */
var MultiColorTriangleAppearance = function (options) {
	options = Cesium.defaultValue(options, Cesium.defaultValue.EMPTY_OBJECT);

	var translucent = Cesium.defaultValue(options.translucent, true);
	var closed = false;
	var vertexFormat = MultiColorTriangleAppearance.VERTEX_FORMAT;

	/**
	 * This property is part of the {@link Appearance} interface, but is not
	 * used by {@link MultiColorTriangleAppearance} since a fully custom fragment shader is used.
	 *
	 * @type Material
	 *
	 * @default undefined
	 */
	this.material = undefined;

	/**
	 * When <code>true</code>, the geometry is expected to appear translucent so
	 * {@link MultiColorTriangleAppearance#renderState} has alpha blending enabled.
	 *
	 * @type {Boolean}
	 *
	 * @default true
	 */
	this.translucent = translucent;

	this._vertexShaderSource = Cesium.defaultValue(options.vertexShaderSource, defaultVertexShaderSource);
	this._fragmentShaderSource = Cesium.defaultValue(options.fragmentShaderSource, defaultFragmentShaderSource);
	this._renderState = Cesium.Appearance.getDefaultRenderState(translucent, closed, options.renderState);
	this._closed = closed;

	// Non-derived members

	this._vertexFormat = vertexFormat;
};

Object.defineProperties(MultiColorTriangleAppearance.prototype, {
	/**
	 * The GLSL source code for the vertex shader.
	 *
	 * @memberof MultiColorTriangleAppearance.prototype
	 *
	 * @type {String}
	 * @readonly
	 */
	vertexShaderSource: {
		get: function () {
			return this._vertexShaderSource;
		},
	},

	/**
	 * The GLSL source code for the fragment shader.
	 *
	 * @memberof MultiColorTriangleAppearance.prototype
	 *
	 * @type {String}
	 * @readonly
	 */
	fragmentShaderSource: {
		get: function () {
			return this._fragmentShaderSource;
		},
	},

	/**
	 * The WebGL fixed-function state to use when rendering the geometry.
	 * <p>
	 * The render state can be explicitly defined when constructing a {@link MultiColorTriangleAppearance}
	 * instance, or it is set implicitly via {@link MultiColorTriangleAppearance#translucent}.
	 * </p>
	 *
	 * @memberof MultiColorTriangleAppearance.prototype
	 *
	 * @type {Object}
	 * @readonly
	 */
	renderState: {
		get: function () {
			return this._renderState;
		},
	},

	/**
	 * When <code>true</code>, the geometry is expected to be closed so
	 * {@link MultiColorTriangleAppearance#renderState} has backface culling enabled.
	 * This is always <code>false</code> for <code>MultiColorTriangleAppearance</code>.
	 *
	 * @memberof MultiColorTriangleAppearance.prototype
	 *
	 * @type {Boolean}
	 * @readonly
	 *
	 * @default false
	 */
	closed: {
		get: function () {
			return this._closed;
		},
	},

	/**
	 * The {@link VertexFormat} that this appearance instance is compatible with.
	 * A geometry can have more vertex attributes and still be compatible - at a
	 * potential performance cost - but it can't have less.
	 *
	 * @memberof MultiColorTriangleAppearance.prototype
	 *
	 * @type VertexFormat
	 * @readonly
	 *
	 * @default {@link MultiColorTriangleAppearance.VERTEX_FORMAT}
	 */
	vertexFormat: {
		get: function () {
			return this._vertexFormat;
		},
	},
});

/**
 * The {@link VertexFormat} that all {@link MultiColorTriangleAppearance} instances
 * are compatible with. This requires a <code>position</code> and <code>color</code> attribute.
 *
 * @type VertexFormat
 *
 * @constant
 */
MultiColorTriangleAppearance.VERTEX_FORMAT = Cesium.VertexFormat.POSITION_AND_COLOR;

/**
 * Procedurally creates the full GLSL fragment shader source.
 *
 * @function
 *
 * @returns String The full GLSL fragment shader source.
 */
MultiColorTriangleAppearance.prototype.getFragmentShaderSource = Cesium.Appearance.prototype.getFragmentShaderSource;

/**
 * Determines if the geometry is translucent based on {@link MultiColorTriangleAppearance#translucent}.
 *
 * @function
 *
 * @returns {Boolean} <code>true</code> if the appearance is translucent.
 */
MultiColorTriangleAppearance.prototype.isTranslucent = Cesium.Appearance.prototype.isTranslucent;

/**
 * Creates a render state.  This is not the final render state instance; instead,
 * it can contain a subset of render state properties identical to the render state
 * created in the context.
 *
 * @function
 *
 * @returns {Object} The render state.
 */
MultiColorTriangleAppearance.prototype.getRenderState = Cesium.Appearance.prototype.getRenderState;

var vertices = [
	new Vertex({
		vertexFormat: Cesium.VertexFormat.POSITION_AND_COLOR,
		position: Cesium.Cartesian3.fromDegrees(-115.0, 36.0),
		color: Cesium.Color.RED.withAlpha(180 / 255),
	}),
	new Vertex({
		vertexFormat: Cesium.VertexFormat.POSITION_AND_COLOR,
		position: Cesium.Cartesian3.fromDegrees(-115.0, 32.0),
		color: Cesium.Color.BLUE.withAlpha(180 / 255),
	}),
	new Vertex({
		vertexFormat: Cesium.VertexFormat.POSITION_AND_COLOR,
		position: Cesium.Cartesian3.fromDegrees(-112.0, 33.0,100000),
		color: Cesium.Color.GREEN.withAlpha(180 / 255),
	}),
	new Vertex({
		vertexFormat: Cesium.VertexFormat.POSITION_AND_COLOR,
		position: Cesium.Cartesian3.fromDegrees(-110.0, 31.0),
		color: Cesium.Color.ORANGE.withAlpha(180 / 255),
	}),
	new Vertex({
		vertexFormat: Cesium.VertexFormat.POSITION_AND_COLOR,
		position: Cesium.Cartesian3.fromDegrees(-110.0, 35.0),
		color: Cesium.Color.AQUA.withAlpha(180 / 255),
	}),
];

var polygonVertices = [
	[0, 1, 2],
	[0, 2, 4],
	[3, 2, 4],
	[1, 2, 3],
];

var triangles = [];

for (var i = 0; i < polygonVertices.length; i++) {
	var verts = [];
	for (var j = 0; j < polygonVertices[i].length; j++) {
		var index = polygonVertices[i][j];
		verts.push(vertices[index]);
	}
	triangles.push(
		new Triangle({
			vertices: verts,
		})
	);
}

scene.primitives.add(
	new Cesium.Primitive({
		geometryInstances: new Cesium.GeometryInstance({
			geometry: MultiColorTriangleGeometry.createGeometry(
				new MultiColorTriangleGeometry({
					triangles: triangles,
				})
			),
		}),
		asynchronous: false,
		appearance: new MultiColorTriangleAppearance(),
		depthFailAppearance: new MultiColorTriangleAppearance(),
	})
);
