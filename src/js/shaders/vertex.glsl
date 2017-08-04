precision highp float;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
attribute vec3 position;
attribute vec3 offset;

void main(){	
	gl_Position = projectionMatrix * modelViewMatrix * vec4( offset+position, 1.0 );
}