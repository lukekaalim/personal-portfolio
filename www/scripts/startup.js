
var titleText = document.getElementById("presentation-inital-animation");

var container = document.getElementsByClassName("name-container intro")[0];

var canvas = document.getElementById("presentation-canvas");

Tools.PrefixedEvent(titleText,"animationend", function()
{
	setTimeout(function()
		{
			container.className = "name-container outro";
		}, 3000);
});

var scene = Engine.CreateDefaultScene(canvas);

var geometry = new THREE.SphereGeometry( 1, 15, 15 );
var material = new THREE.MeshBasicMaterial( { color: 0xffffff, wireframe: true } );
var cube = new THREE.Mesh( geometry, material );
scene.add( cube );

var updateCubeRotation = function () {
	cube.rotation.x += 0.001;
	cube.rotation.y += 0.01;
};

Engine.Update.push(updateCubeRotation);