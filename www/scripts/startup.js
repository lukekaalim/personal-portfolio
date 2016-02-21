
var titleText = document.getElementById("presentation-inital-animation");

var container = document.getElementsByClassName("name-container intro")[0];

var canvas = document.getElementById("presentation-canvas");

var presentation3D = new Engine(canvas);

var scene = presentation3D.CreateDefaultScene(canvas);


var geometry = new THREE.SphereGeometry( 0.5, 25, 15 );
var material = new THREE.MeshBasicMaterial( { color: 0xffffff, wireframe: true } );
var sphere = new THREE.Mesh( geometry, material );
scene.add( sphere);

var updateSphereRotation = function ()
{
	sphere.rotation.x += 0.001;
	sphere.rotation.y += 0.01;
};

presentation3D.RegisterForUpdate(updateSphereRotation);

Tools.PrefixedEvent(titleText,"animationend", function()
{
	setTimeout(function()
		{
			container.className = "name-container outro";
			var moveSphereInsideCamera = function()
			{
				sphere.position.z += 0.005;
			};
			
			presentation3D.RegisterForUpdate(moveSphereInsideCamera);
		}, 3000);
});