var Engine =
{
	//Get Engine Version
	Version : function()
	{
		return "0.4";
	},
	
	EditorEnabled : true,
	
	Renderer : null,

	//Takes in a JSON formatted Object, containing the position and rotation and scale properties of all objects in a scene, as well as their name.
	//objectList is a map for which object to use in regards to a particular name
	LoadScene : function (sceneData)
	{
		var scene = new THREE.Scene();
		
		for(var i = 0; i < sceneData.length; i++)
		{
			var objectName = sceneData[i]["Name"];
			var object;
			
			if(Engine.AssetMap[objectName])
			{
				object = Engine.AssetMap[objectName];
			}
			else if(Engine.GeometryMap[objectName])
			{
				object = new THREE.Mesh( Engine.GeometryMap[objectName], new THREE.MeshBasicMaterial( { color: "white" } ) );
			}
			else
			{
				object = new THREE.Mesh( new THREE.BoxGeometry( 1, 1, 1 ), new THREE.MeshBasicMaterial( { color: "white" } ) );
			}
			
			object.name = objectName;
			
			object.position = new THREE.Vector3();
			object.position.set(sceneData[i].Position.x,sceneData[i].Position.y,sceneData[i].Position.z);
			
			object.quaternion = new THREE.Quaternion(sceneData[i].Rotation.x,sceneData[i].Rotation.y,sceneData[i].Rotation.z,sceneData[i].Rotation.w);
			
			object.scale = new THREE.Vector3();
			object.scale.set(sceneData[i].Scale.x,sceneData[i].Scale.y,sceneData[i].Scale.z);
			
			scene.add(object);
			
			if(Engine.EditorEnabled)
			{
				Editor.SelectionTargets.set(object,function(object){return function(){ Editor.SelectObject(object); }}(object));
			}
		}
		return scene;
	},
	
	CreateDefaultScene : function(canvas)
	{
		var scene = new THREE.Scene();
		var camera = new THREE.PerspectiveCamera( 75, window.innerWidth/window.innerHeight, 0.1, 1000 );
		var renderer = new THREE.WebGLRenderer({"canvas":canvas, "alpha": true});
		renderer.setSize( window.innerWidth, window.innerHeight );

		camera.position.z = 5;

		Engine.StartRenderLoop([scene],[camera],renderer);
		
		window.onresize = function()
		{
			camera.aspect =  window.innerWidth/window.innerHeight;
			camera.updateProjectionMatrix();
			renderer.setSize( window.innerWidth, window.innerHeight );
		}
		
		return scene;
	},
	
	//Do not rely on objects being in the same index you inserted them in.
	Update : [],
	
	StartRenderLoop : function(scenes,cameras,renderer)
	{
		Engine.Renderer = renderer;
		renderer.autoClear = false;
		if(scenes.length > cameras.length)
		{
			scenes = scenes.slice(0, cameras.length);
		}
		
		var renderLoop = function()
		{
			for(var i = 0; i < Engine.Update.length; i++)
			{
				Engine.Update[i]();
			}
			
			renderer.clear();   
			for(var i = 0; i < scenes.length; i++)
			{
				renderer.render( scenes[i], cameras[i] );
				renderer.clearDepth();   
			}
			requestAnimationFrame(renderLoop);
		}
		
		requestAnimationFrame(renderLoop);
	},
	
	//Downloads Assets Based off the following Object Syntax:
	/*
	
	[
		{"name":"rockPack","type":"modelPack","AJAX":"/models/rocks.modelpack.json","contentNames":["rock01","rock02","rock03","rock04"]}
	]
	
	//Once downloaded, they are saved the Asset Map by their name;
	//Assets cannot have conflicting names, the newer name will always ovveride the older one
	*/
	DownloadAssets : function (assetsToLoad,completionCallback)
	{
		//the amount of individual assets to load.
		var assetCount = assetsToLoad.length;
		//the amount of assests loaded currenty out of that previous total;
		var assetsLoaded = 0;
		
		
		//For each Asset, download it, parse it, and add it to Asset Map
		for(var i = 0; i < assetCount; i++)
		{
			var assetData = assetsToLoad[i];
			
			if(!assetData.name)
			{
				console.log("Asset doesn't have name, cannot add.");
				continue;
			}
			
			if(!assetData.type)
			{
				console.log("Asset doesn't have type, cannot add.");
				continue;
			}
			
			if(assetData.XMLHttp)
			{
				var request = new XMLHttpRequest();
				
				request.onreadystatechange = function(assetData,request)
				{
					return function()
					{
						//On asset Load Completion
						if (request.readyState == 4 && request.status == 200)
						{
							Engine.ParseAssets(request.responseText,assetData);
							assetsLoaded++;
							
							if(assetCount == assetsLoaded)
							{
								completionCallback();
							}
						}
					}
				}(assetData,request);
				request.open("GET", assetData.XMLHttp, true);
				request.overrideMimeType("application/JSON");
				request.send();
				
				//Asset in the Pipeline.
				continue;
			}
			
			if(assetData.type == "image")
			{
				var loader2d = new THREE.ImageLoader();
				
				var image = loader2d.load(assetData.url,
					function (image)
					{
						Engine.ParseAssets(image,assetData);
						completionCallback();
					}
				);
				
				//Asset in the Pipeline.
				continue;
			}
			
			Engine.ParseAssets(assetData.source,assetData);
		}
	},
	
	ParseAssets : function (source, referenceData)
	{
		//Dependencies
		var loader3d = new THREE.JSONLoader();
		
		if(referenceData.type == "modelPack")
		{
			var pack = JSON.parse(source);
			for(var i = 0; i < pack.length; i++)
			{
				var model = loader3d.parse(pack[i]);
				
				var name;
				
				if(referenceData.contentNames[i])
				{
					name = [referenceData.contentNames[i]];
				}
				else if(model.name)
				{
					name = model.name;
				}
				else
				{
					name = referenceData.name + "_" + i;
				}
				
				//Add the model.
				Engine.AssetMap[assetName] = model;
			}
		}
		
		if(referenceData.type == "model")
		{
			var geometry = loader3d.parse(JSON.parse(source)).geometry;
			Engine.GeometryMap[referenceData.name] = geometry;
		}
		
		if(referenceData.type == "scene")
		{
			var scene = JSON.parse(source)["AllObjects"];
			Engine.AssetMap[referenceData.name] = scene;
		}
		
		if(referenceData.type == "image")
		{
			Engine.AssetMap[referenceData.name] = source;
		}
	},
	
	//Map containg all Assets
	AssetMap : {},
	GeometryMap : {}
};



var Editor = 
{
	
	Mouse :
	{
		Button0 : false,
		Button1 : false,
		Button2 : false,
		Position : new THREE.Vector2()
	},
	
	MiddleMouseDown : false,
	
	Mouse0Down : false,
	
	CameraRotation : 0,
	CameraMovement : new THREE.Vector3,
	
	ConsoleWindow : 
	{
		Init : function()
		{
			this.Window = document.createElement("div");
			this.Window.style.postion = "fixed";
			this.Window.style.color = "white";
			
			document.body.appendChild(this.Window);
			
			this.Info.set("Engine Version",Engine.Version());
			this.Update();
		},
		
		Update : function()
		{
			this.Window.innerHTML = "";
			this.Info.forEach(function(value,key,map)
			{
				this.Window.innerHTML += key + " : " + value + "<br />";
			});
		},
		
		Info : new Map(),
		
		Window : null
	},
	
	InitDebugControls : function(camera)
	{
		document.oncontextmenu = document.body.oncontextmenu = function() {return false;}
		
		document.addEventListener("mousedown",function(event)
		{
			//For Mouse button tracking
			if(event.button == 1)
			{
				Editor.Mouse.Button1 = true;
				mouseXstart = event.screenX;
				mouseYstart = event.screenY;
				Editor.MiddleMouseDown = true;
			}
			
			//For Clicking
			if(event.button == 0)
			{
				Editor.Mouse.Button0 = true;
				Editor.Mouse0Down = true;
				
				raycaster = new THREE.Raycaster();
				var mouse = new THREE.Vector2();
				mouse.x = ( event.clientX / Engine.Renderer.domElement.clientWidth ) * 2 - 1;
				mouse.y = - ( event.clientY / Engine.Renderer.domElement.clientHeight ) * 2 + 1;
				
				raycaster.setFromCamera( mouse, camera );
				
				objects = [];
				
				for (var key of Editor.SelectionTargets.keys()) {
				  objects.push(key);
				}
				
				var intersects = raycaster.intersectObjects(objects);
				
				if(intersects.length > 0)
				{
					Editor.SelectionTargets.get(intersects[0].object)();
				}
				else
				{
					Editor.SelectObject(null);
				}
			}
			
			if(event.button == 2)
			{
				Editor.Mouse.Button2 = true;
			}
		});
		
		document.addEventListener("mouseup",function(event)
		{
			if(event.button == 1)
			{
				Editor.Mouse.Button1 = false;
				Editor.MiddleMouseDown = false;
			}
			
			if(event.button == 0)
			{
				Editor.Mouse.Button0 = false;
				Editor.Mouse0Down = false;
			}
			if(event.button == 2)
			{
				Editor.Mouse.Button2 = true;
			}
		});
		
		document.addEventListener("mousemove",function(event)
		{
			Editor.Mouse.Position.set(event.screenX,event.screenY);
			
			if(Editor.MiddleMouseDown)
			{
				//Get distance since last update
				var distanceX = mouseXstart - event.screenX;
				var distanceY = mouseYstart - event.screenY;
				
				camera.rotation.y += distanceX * 0.001;
				//camera.rotation.x += distanceY * 0.001;
				
				mouseXstart = event.screenX;
				mouseYstart = event.screenY;
			}
		});
		
		//var mouseFollower = document.createElement(span);
		
		//mouseFollower.style.
		
		
		document.addEventListener("keydown",function(event)
		{
			if(!event.repeat && Editor.KeypressDetect.has(event.key))
			{
				Editor.KeypressDetect.get(event.key)();
			}
		});
		document.addEventListener("keyup",function(event)
		{
			if(!event.repeat && Editor.KeyreleaseDetect.has(event.key))
			{
				Editor.KeyreleaseDetect.get(event.key)();
			}
		});
		//Register default movement
		Editor.KeypressDetect.set("w",function(){Editor.CameraMovement.add(new THREE.Vector3(1,0,0))});
		Editor.KeypressDetect.set("s",function(){Editor.CameraMovement.add(new THREE.Vector3(-1,0,0))});
		Editor.KeypressDetect.set("a",function(){Editor.CameraMovement.add(new THREE.Vector3(0,1,0))});
		Editor.KeypressDetect.set("d",function(){Editor.CameraMovement.add(new THREE.Vector3(0,-1,0))});
		Editor.KeypressDetect.set("c",function(){Editor.CameraMovement.add(new THREE.Vector3(0,0,1))});
		Editor.KeypressDetect.set(" ",function(){Editor.CameraMovement.add(new THREE.Vector3(0,0,-1))});
		Editor.KeypressDetect.set("q",function(){Editor.CameraRotation += 1;});
		Editor.KeypressDetect.set("e",function(){Editor.CameraRotation += -1;});
		
		Editor.KeyreleaseDetect.set("w",function(){Editor.CameraMovement.add(new THREE.Vector3(-1,0,0))});
		Editor.KeyreleaseDetect.set("s",function(){Editor.CameraMovement.add(new THREE.Vector3(1,0,0))});
		Editor.KeyreleaseDetect.set("a",function(){Editor.CameraMovement.add(new THREE.Vector3(0,-1,0))});
		Editor.KeyreleaseDetect.set("d",function(){Editor.CameraMovement.add(new THREE.Vector3(0,1,0))});
		Editor.KeyreleaseDetect.set("c",function(){Editor.CameraMovement.add(new THREE.Vector3(0,0,-1))});
		Editor.KeyreleaseDetect.set(" ",function(){Editor.CameraMovement.add(new THREE.Vector3(0,0,1))});
		Editor.KeyreleaseDetect.set("q",function(){Editor.CameraRotation += -1;});
		Editor.KeyreleaseDetect.set("e",function(){Editor.CameraRotation += 1;});
		
		
		//Add too loop
		Engine.Update.push(function()
		{
			var movement = (new THREE.Vector3(-Editor.CameraMovement.y,-Editor.CameraMovement.z,-Editor.CameraMovement.x)).applyQuaternion(camera.quaternion);
			camera.position.add(movement);
			camera.rotation.z += Editor.CameraRotation * 0.05;
		});
		
		//Create Handle
		Editor.Handle = new THREE.Object3D();
		
		var upHandle = new THREE.Mesh(Engine.GeometryMap["arrow"],new THREE.MeshBasicMaterial( { color: "green" } ));
		upHandle.scale.multiplyScalar(0.3);
		
		upHandle.quaternion.setFromAxisAngle( new THREE.Vector3( 1, 0, 0 ), -Math.PI / 2 );
		
		var leftHandle = upHandle.clone();
		leftHandle.quaternion.setFromAxisAngle( new THREE.Vector3( 0, 1, 0 ), -Math.PI / 2 );
		leftHandle.material = new THREE.MeshBasicMaterial( { 'color' : "red" } );
		var backHandle = upHandle.clone();
		backHandle.quaternion.setFromAxisAngle( new THREE.Vector3( 0, 0, 1 ), -Math.PI / 2 );
		backHandle.material = new THREE.MeshBasicMaterial( { color: "blue" } );
		
		Editor.Handle.add(upHandle);
		Editor.Handle.add(leftHandle);
		Editor.Handle.add(backHandle);
		
		//Adds the Handles to Selection Targets
		Editor.MakeDraggable(upHandle,
			function()
			{
				Editor.ConsoleWindow.Info.set("Dragging: ","Up");
				Editor.ConsoleWindow.Update();
				
				//Get Mouse Original Position
				upHandle.originalPosition = Editor.Mouse.Position.clone();
				var newPosition = upHandle.position.clone.sub(camera.position);
				},
			function()
			{
				Editor.ConsoleWindow.Info.set("Delta Position X: ",upHandle.originalPosition.clone().sub(Editor.Mouse.Position).x);
				Editor.ConsoleWindow.Info.set("Delta Position Y: ",upHandle.originalPosition.clone().sub(Editor.Mouse.Position).y);
				Editor.ConsoleWindow.Update();
			},
			function()
			{
				Editor.ConsoleWindow.Info.set("Dragging: ","none");
				Editor.ConsoleWindow.Update();
			}
		)
		
		//Add toggle functionality to handle
		Editor.Handle.setActive = function(activeState)
		{
			if(!activeState)
			{
				Editor.GizmoScene.remove(Editor.Handle);
			}
			else
			{
				Editor.GizmoScene.add(Editor.Handle);
			}
		}
		
		//Returns the Scene that needs to be fed into the render loop.
		
		return Editor.GizmoScene;
	},
	
	MakeDraggable : function(objectToDrag,onStartDrag,whileDragging,onEndDrag)
	{
		Editor.SelectionTargets.set(objectToDrag,function()
		{
			onStartDrag(objectToDrag);
			
			var updateFunction = function()
			{
				
				whileDragging(objectToDrag);
				
				if(!Editor.Mouse0Down)
				{
					onEndDrag(objectToDrag);
					Engine.Update.splice(Engine.Update.indexOf(this),1);
				}
			}
			
			Engine.Update.push(updateFunction);
		});
	},
	
	GizmoScene : new THREE.Scene(),
	
	Handle : null,
	
	HandleGrab : function()
	{
		
	},
	
	SelectObject : function(object)
	{
		Editor.SelectedObject = object;
		if(object)
		{
			Editor.Handle.setActive(true);
			Editor.Handle.position.copy(object.position);
			Editor.ConsoleWindow.Info.set("Selected Object",object.name);
		}
		else
		{
			Editor.Handle.setActive(false);
			Editor.ConsoleWindow.Info.set("Selected Object","None Selcted");
		}
		
		Editor.ConsoleWindow.Update();
	},
	
	SelectedObject : null,
	
	//To add a selection target, simply do
	//Editor.SelectionTarget.set(objectToListenTo,callback);
	SelectionTargets : new Map(),
	//Same deal, excelpt the object to listen to is a Key
	KeypressDetect : new Map(),
	KeyreleaseDetect : new Map()
}

var Tools = 
{
	PrefixedEvent : function(element, type, callback)
	{
		var pfx = ["webkit", "moz", "MS", "o", ""];
		for (var p = 0; p < pfx.length; p++)
		{
			if (!pfx[p])
			{
				type = type.toLowerCase();
			}
			element.addEventListener(pfx[p]+type, callback, false);
		}
	},
	
	SetClassAtEndOfAnimation : function(animtingElement, targetElement, delay, newClass)
	{
		Tools.PrefixedEvent(animtingElement,"animationend", function()
		{
			setTimeout(function()
				{
					targetElement.className = newClass;
				}, delay * 1000);
		});
	}
}