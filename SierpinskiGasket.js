"use strict";
// Authors: Ben Bladow & Isak Bjornson
// Description: This program will draw 3D shapes to the screen that the user has selected.
//              The user can use sliders to transform the shape or translate the shape by 
//              clicking and dragging. The user can draw any of 4 different shapes to the 
//              screen.  This program only allows you to manipulate the most recent shape.
// Date: 10/10/2018

/**
    Used Edward Angel code from cubeq.js from
    https://www.cs.unm.edu/~angel/WebGL/7E/04/cubeq.js 
    as base code for our cube functions.
**/

let canvas;

/** @type {WebGLRenderingContext} */
let gl;

let program;

//variables to change the current shape's transformation matrix
let rot1;
let rot2;
let rot3;
let scale1;
let tz;
let tx=0;
let ty=0;

//variables to keep track of the different shapes drawn
let shapes = [];
let numberShapes = 0;

//booleans to keep track of which shape user wants
let isCube = false;
let isTetrahedron = false;
let isTriangularPrism = false;
let isOctahedron = false;

//variables to keep track of the different points for each
//different shape
let positions = [];
let colors = [];

let isMouseDown = false;

let status;

// Represents a shape to be drawn to the screen, and maintains the relevant
// GPU buffers
class Shape {
    constructor() {
        if (!gl) {
            console.log("Shape constructor must be called after WebGL is initialized");
        }
        // Buffer for vertex positions
        this.vBuffer = gl.createBuffer();
        
        // Buffer for vertex colors
        this.cBuffer = gl.createBuffer();

        // Transformation matrix
        this.mat = mat4();

        // Number of vertices in this shape
        this.numVertices = 0;
        
        
        this.vColor = gl.getAttribLocation( program, "vColor" );
        this.vPosition = gl.getAttribLocation( program, "vPosition" );
    }

    // Render the shape to the screen
    draw(location) {
        //first you need to bind the buffer you want to store data in
        gl.bindBuffer( gl.ARRAY_BUFFER, this.cBuffer );

        gl.vertexAttribPointer( this.vColor, 4, gl.FLOAT, false, 0, 0 );
        gl.enableVertexAttribArray( this.vColor );
        
        gl.bindBuffer( gl.ARRAY_BUFFER, this.vBuffer );
        
        gl.vertexAttribPointer( this.vPosition, 4, gl.FLOAT, false, 0, 0 );
        gl.enableVertexAttribArray( this.vPosition );  
        
        //Each matrix has its own unique matrix
        //Set the matrix for each shape.
        gl.uniformMatrix4fv(location, false, flatten(this.mat));
        
        gl.drawArrays( gl.TRIANGLES, 0, this.numVertices );
    }

    // Set the positions and colors to be used for this shape.  Both positions
    // and colors should be arrays of vec4s.
    setData(positions, colors) 
    {
        if (positions.length != colors.length) {
            console.log("Positions and colors not the same length");
        }
        gl.bindBuffer( gl.ARRAY_BUFFER, this.cBuffer );
        gl.bufferData( gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW );
        
        gl.bindBuffer( gl.ARRAY_BUFFER, this.vBuffer );
        gl.bufferData( gl.ARRAY_BUFFER, flatten(positions), gl.STATIC_DRAW );

        //Depending on the shape, set the number of vertices.
        if(isCube)
            this.numVertices = 36;
        else if(isTetrahedron)
            this.numVertices = 24; 
        else if(isTriangularPrism)
            this.numVertices = 30;
        else if(isOctahedron)
            this.numVertices = 48;
    }

    // Set transformation matrix
    setMat(mat) {
        this.mat = mat;
    }
}

window.onload = function init()
{
    status = document.getElementById("status");
    rot1 = document.getElementById("rot1");
    rot2 = document.getElementById("rot2");
    rot3 = document.getElementById("rot3");
    scale1 = document.getElementById("scale1");
    tz = document.getElementById("tz");
    tx = document.getElementById("tx");
    ty = document.getElementById("ty");
    [rot1, rot2, rot3, scale1, tz].forEach(function(elem) {
        elem.initValue = elem.value;
        elem.addEventListener("input", render);
        elem.addEventListener("dblclick", function() {
            elem.value = elem.initValue;
            render();
        });
    });
    
    //Adding the four different shape buttons and their respective
    //functions
    //Add a cube to the screen
    let addCube = document.getElementById("addCube");
    addCube.addEventListener("click", function(event){
        isCube = true; 
        isTetrahedron = false;
        isTriangularPrism = false;
        isOctahedron = false;
        
        //create the cube and assign data to positions and colors
        createCube();
            
        shapes[numberShapes] = new Shape;
        //assign the global variables positions and colors to the shape
        shapes[numberShapes].setData(positions, colors); 
        
        //reset globals positions and colors for next shape
        positions = [];
        colors = [];
        
        //increase the numberShapes
        numberShapes++;        
        render();
    });   
    
    //Add a tetrahedron to the screen
    let addTet = document.getElementById("addTet");
    addTet.addEventListener("click", function(event){
        isCube = false;  
        isTriangularPrism = false;
        isOctahedron = false;
        isTetrahedron = true;
        
        createTetrahedron();
            
        shapes[numberShapes] = new Shape;
        shapes[numberShapes].setData(positions, colors);
        positions = [];
        colors = [];
        numberShapes++;        
        render();
    }); 
    
    //Add a triangular prism to the screen
    let addTri = document.getElementById("addTri");
    addTri.addEventListener("click", function(event){
        isCube = false;  
        isTetrahedron = false;
        isOctahedron = false;
        isTriangularPrism = true;
        
        createTriangularPrism();
            
        shapes[numberShapes] = new Shape;
        shapes[numberShapes].setData(positions, colors); 
        positions = []; 
        colors = [];
        numberShapes++;        
        render();
    }); 
    
    //Add an octahedron to the screen
    let addOcta = document.getElementById("addOcta");
    addOcta.addEventListener("click", function(event){
        isCube = false;  
        isTetrahedron = false;
        isOctahedron = true;
        isTriangularPrism = false;
        
        createOctaHedron();
            
        shapes[numberShapes] = new Shape;
        shapes[numberShapes].setData(positions, colors);
        positions = [];
        colors = [];
        numberShapes++;        
        render();
    }); 
    

    canvas = document.getElementById( "gl-canvas" );
    //If mousedown, set flag
    canvas.addEventListener("mousedown", function(event) {
        isMouseDown = true;  
    });
    
    //if mouseup clear flag
    canvas.addEventListener("mouseup", function(event) {
        isMouseDown = false;
    });
    
    //moves the shape if the mouse is down
    canvas.addEventListener("mousemove", function() {
        if (event.buttons & 1 === 1) {
            if(isMouseDown)
            {
                //Translate x and y mouse locations
                tx = 2 * event.clientX/canvas.width - 1;
                ty = 2 * (canvas.height-event.clientY)/canvas.height - 1;
            }
            render();
        }
    });
    
    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 0.8, 0.8, 0.8, 1.0 );

    gl.enable(gl.DEPTH_TEST);

    program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );

    render();
};

//**** createCube code from website ****//
function createCube()
{
    quad( 1, 0, 3, 2 );
    quad( 2, 3, 7, 6 );
    quad( 3, 0, 4, 7 );
    quad( 6, 5, 1, 2 );
    quad( 4, 5, 6, 7 );
    quad( 5, 4, 0, 1 );
}

function quad(a, b, c, d)
{
    var vertices = [
        vec4( -0.5, -0.5,  0.5, 1.0 ),
        vec4( -0.5,  0.5,  0.5, 1.0 ),
        vec4(  0.5,  0.5,  0.5, 1.0 ),
        vec4(  0.5, -0.5,  0.5, 1.0 ),
        vec4( -0.5, -0.5, -0.5, 1.0 ),
        vec4( -0.5,  0.5, -0.5, 1.0 ),
        vec4(  0.5,  0.5, -0.5, 1.0 ),
        vec4(  0.5, -0.5, -0.5, 1.0 )
    ];

    var vertexColors = [
        [ 0.0, 0.0, 0.0, 1.0 ],  // black
        [ 1.0, 0.0, 0.0, 1.0 ],  // red
        [ 1.0, 1.0, 0.0, 1.0 ],  // yellow
        [ 0.0, 1.0, 0.0, 1.0 ],  // green
        [ 0.0, 0.0, 1.0, 1.0 ],  // blue
        [ 1.0, 0.0, 1.0, 1.0 ],  // magenta
        [ 0.0, 1.0, 1.0, 1.0 ],  // cyan
        [ 1.0, 1.0, 1.0, 1.0 ]   // white
    ];

    // We need to parition the quad into two triangles in order for
    // WebGL to be able to render it.  In this case, we create two
    // triangles from the quad indices

    //vertex color assigned by the index of the vertex

    var indices = [ a, b, c, a, c, d ];

    for ( var i = 0; i < indices.length; ++i ) {
        positions.push( vertices[indices[i]] );
        // for solid colored faces use
        colors.push(vertexColors[a]);
    }
}

//function to create tetrahedron
function createTetrahedron() 
{
    triangle(0, 1, 2, 0, 0);
    triangle(0, 3, 2, 0, 1);
    triangle(0, 1, 3, 0, 2);
    triangle(1, 2, 3, 1, 3);
}

function triangle(a, b, c, d, color)
{
    var vertices = [
        vec4( -0.5, -0.5,  0.5, 1.0 ),
        vec4(  0.5, -0.5,  0.5, 1.0 ),
        vec4(  0.0,  0.5,  0.0, 1.0 ),
        vec4(  0.0, -0.5, -0.5, 1.0 )
    ];
    var vertexColors = [
        [ 0.0, 0.0, 0.0, 1.0 ],  // black
        [ 1.0, 0.0, 0.0, 1.0 ],  // red
        [ 0.0, 1.0, 0.0, 1.0 ],  // green
        [ 0.0, 0.0, 1.0, 1.0 ]  // blue
    ];
    var indices = [ a, b, c, a, c, d];

    for ( var i = 0; i < indices.length; ++i ) {
        positions.push( vertices[indices[i]] );
        // for solid colored faces use
        colors.push(vertexColors[color]);
    }
}

//function to create triangular Prism
function createTriangularPrism()
{
    prRect(0, 2, 5, 3, 6);
    prRect(0, 1, 4, 3, 2);
    prRect(1, 2, 5, 4, 3);
    prTri(0, 1, 2, 0, 4);
    prTri(3, 4, 5, 3, 5);
}

//for triangular prism
function prRect(a, b, c, d, color)
{
    var vertices = [
        vec4(  0.5, -0.5,  0.8, 1.0 ),
        vec4( -0.5, -0.5,  0.8, 1.0 ),
        vec4(  0.0,  0.5,  0.8, 1.0 ),
        vec4(  0.5, -0.5, -0.8, 1.0 ),
        vec4( -0.5, -0.5, -0.8, 1.0 ),
        vec4(  0.0,  0.5, -0.8, 1.0 )
    ];

    var vertexColors = [
        [ 0.0, 0.0, 0.0, 1.0 ],  // black
        [ 1.0, 0.0, 0.0, 1.0 ],  // red
        [ 1.0, 1.0, 0.0, 1.0 ],  // yellow
        [ 0.0, 1.0, 0.0, 1.0 ],  // green
        [ 0.0, 0.0, 1.0, 1.0 ],  // blue
        [ 1.0, 0.0, 1.0, 1.0 ],  // magenta
        [ 0.0, 1.0, 1.0, 1.0 ],  // cyan
        [ 1.0, 1.0, 1.0, 1.0 ]   // white
    ];
    var indices = [ a, b, c, a, c, d ];

    for ( var i = 0; i < indices.length; ++i ) {
        positions.push( vertices[indices[i]] );
        // for solid colored faces use
        colors.push(vertexColors[color]);
    }
}

//for trianglular prism
function prTri(a, b, c, d, color) 
{
    var vertices = [
        vec4(  0.5, -0.5,  0.8, 1.0 ),
        vec4( -0.5, -0.5,  0.8, 1.0 ),
        vec4(  0.0,  0.5,  0.8, 1.0 ),
        vec4(  0.5, -0.5, -0.8, 1.0 ),
        vec4( -0.5, -0.5, -0.8, 1.0 ),
        vec4(  0.0,  0.5, -0.8, 1.0 )
    ];
    var vertexColors = [
        [ 0.0, 0.0, 0.0, 1.0 ],  // black
        [ 1.0, 0.0, 0.0, 1.0 ],  // red
        [ 1.0, 1.0, 0.0, 1.0 ],  // yellow
        [ 0.0, 1.0, 0.0, 1.0 ],  // green
        [ 0.0, 0.0, 1.0, 1.0 ],  // blue
        [ 1.0, 0.0, 1.0, 1.0 ],  // magenta
        [ 0.0, 1.0, 1.0, 1.0 ],  // cyan
        [ 1.0, 1.0, 1.0, 1.0 ]   // white
    ];
    var indices = [ a, b, c, a, c, d ];

    for ( var i = 0; i < indices.length; ++i ) {
        positions.push( vertices[indices[i]] );
        // for solid colored faces use
        colors.push(vertexColors[color]);
    }
}

//create the octahedron
function createOctaHedron(){
    octTri(0, 2, 3, 0, 0);
    octTri(0, 3, 4, 0, 1);
    octTri(0, 4, 1, 0, 2);
    octTri(0, 1, 2, 0, 3);
    octTri(5, 2, 3, 5, 4);
    octTri(5, 3, 4, 5, 5);
    octTri(5, 4, 1, 5, 6);
    octTri(5, 1, 2, 5, 7);
}

function octTri(a, b, c, d, color)
{
    var vertices = [
        vec4( 0.0, 0.5, 0.0, 1.0 ),
        vec4(-0.5, 0.0, 0.0, 1.0 ),
        vec4( 0.0, 0.0, 0.5, 1.0 ),
        vec4( 0.5, 0.0, 0.0, 1.0 ),
        vec4( 0.0, 0.0,-0.5, 1.0 ),
        vec4( 0.0,-0.5, 0.0, 1.0 )
    ];
    var vertexColors = [
        [ 0.0, 0.0, 0.0, 1.0 ],  // black
        [ 1.0, 0.0, 0.0, 1.0 ],  // red
        [ 1.0, 1.0, 0.0, 1.0 ],  // yellow
        [ 0.0, 1.0, 0.0, 1.0 ],  // green
        [ 0.0, 0.0, 1.0, 1.0 ],  // blue
        [ 1.0, 0.0, 1.0, 1.0 ],  // magenta
        [ 0.0, 1.0, 1.0, 1.0 ],  // cyan
        [ 1.0, 1.0, 1.0, 1.0 ]   // white
    ];
    var indices = [ a, b, c, a, c, d ];

    for ( var i = 0; i < indices.length; ++i ) {
        positions.push( vertices[indices[i]] );
        // for solid colored faces use
        colors.push(vertexColors[color]);
    }
}


function render()
{
    status.innerHTML = "Angles: " + (+rot1.value).toFixed()
        + ", " + (+rot2.value).toFixed()
        + ", " + (+rot3.value).toFixed()
        + ". Scale: " + (+scale1.value).toFixed(2)
        + ". Translation: " + (+tz.value).toFixed(2)
        + ". tx is: " + tx;
    
    
    
    let r1 = rotateX(rot1.value);
    let r2 = rotateY(rot2.value);
    let r3 = rotateZ(rot3.value);
    let s1 = scalem(scale1.value, scale1.value, scale1.value);
    let t1 = translate(tx, ty, tz.value);
    
    let mat = mult(t1, mult(s1, mult(r3, mult(r2, r1))));
    //Need a different matrix for each shape
    let location = gl.getUniformLocation(program, "mat");
    
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    for (let i=0; i<shapes.length; i++) {
        if (i === shapes.length - 1) {
            shapes[i].setMat(mat)  
        }
        shapes[i].draw(location);
    }
}
