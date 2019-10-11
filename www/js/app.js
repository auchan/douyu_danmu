var container, statsContainer;
var mesh, camera, scene, renderer, effect;
var helper;
var ready = false;
var clock = new THREE.Clock();
var controls, stats;
var audio;
var pause = true;
Ammo().then( function( AmmoLib ) {
	Ammo = AmmoLib;
	init();
	animate();
} );
function init() {
	container = document.querySelector('#scene-container');
	statsContainer = document.querySelector ("#stats-container");
	if((navigator.userAgent.match(/iPhone/i))||(navigator.userAgent.match(/Android/i))||(navigator.userAgent.match(/iPod/i))) {
		statsContainer.style.display = "none";
		return;
    }

	camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 1, 2000 );
	//camera.position.y = 10;
	camera.position.z = 30;
	// scene
	scene = new THREE.Scene();
	scene.background = new THREE.Color( 0xffffff );
	var gridHelper = new THREE.PolarGridHelper( 30, 10 )
	gridHelper.position.y = - 10;
	scene.add( gridHelper );
	var ambient = new THREE.AmbientLight( 0x666666 );
	scene.add( ambient );
	var directionalLight = new THREE.DirectionalLight( 0x887766 );
	directionalLight.position.set( - 1, 1, 1 ).normalize();
	scene.add( directionalLight );
	//
	renderer = new THREE.WebGLRenderer( { antialias: true } );
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	container.appendChild( renderer.domElement );
	effect = new THREE.OutlineEffect( renderer );
	// model
	function onProgress( xhr ) {
		if ( xhr.lengthComputable ) {
			var percentComplete = xhr.loaded / xhr.total * 100;
			console.log( Math.round( percentComplete, 2 ) + '% downloaded' );
		}
	}
	// var modelFile = '../models/mmd/miku/miku_v2.pmd';
	var modelFile = '../models/mmd/yousa_shiying/石英式泠鸢yousa_v1.2-Apose.pmx';
	// var vmdFiles = [ '../models/mmd/vmds/wavefile_v2.vmd' ];
	var vmdFiles = [ '../models/mmd/猫耳开关/nekomimi_mikuv2.vmd' ];
	var cameraFiles = [ '../models/mmd/vmds/wavefile_camera.vmd' ];
	// var audioFile = '../models/mmd/audios/wavefile_short.mp3';
	var audioFile = '../models/mmd/猫耳开关/Hanser - 猫耳开关（Cover miku）.mp3';
	var audioParams = { delayTime: 160 * 1 / 30 };
	helper = new THREE.MMDAnimationHelper();
	var loader = new THREE.MMDLoader();
	loader.loadWithAnimation( modelFile, vmdFiles, function ( mmd ) {
		console.log(mmd)
		mesh = mmd.mesh;
		mesh.position.y = - 10;
		helper.add( mesh, {
			animation: mmd.animation,
			physics: true
		} );
		//loader.loadAnimation( cameraFiles, camera, function ( cameraAnimation ) {
			// helper.add( camera, {
			// 	animation: cameraAnimation
			// } );
			new THREE.AudioLoader().load( audioFile, function ( buffer ) {
				var listener = new THREE.AudioListener();
				listener.setMasterVolume(0.5)
				audio = new THREE.Audio( listener ).setBuffer( buffer );
				listener.position.z = 1;
				helper.add( audio );
				scene.add( audio );
				scene.add( listener );
				scene.add( mesh );
				ready = true;
				createPlayControllerUI();
			}, onProgress, null );
		//}, onProgress, null );
	}, onProgress, null );

	var sceneFile = '../models/mmd/天穹市/天穹市.pmx';
	loader.load( sceneFile, function ( mesh ) {
		mesh.position.y = - 10;
		scene.add( mesh );
	}, onProgress, null );
	//
	window.addEventListener( 'resize', onWindowResize, false );

	// STATS
	stats = new Stats();
	if(statsContainer)
	{
		stats.dom.style.position = "relative";
		statsContainer.appendChild( stats.dom );
	}
	else
	{
		container.appendChild( stats.dom );
	}

	// CONTROLS
	controls = new THREE.OrbitControls( camera, renderer.domElement );
}
function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	effect.setSize( window.innerWidth, window.innerHeight );
}
//
function animate() {
	requestAnimationFrame( animate );
	stats.begin()
	render();
	stats.end()
}
function render() {
	var deltaTime = clock.getDelta()
	if ( ready && !pause ) {
		helper.update( deltaTime );
	}
	effect.render( scene, camera );
}

var playButton;
function createPlayControllerUI()
{
	playButton = document.createElement("button")
	playButton.addEventListener("click", function(){
		toggleMMD();
	});
	playButton.style = "float:right; margin: 4px 4px 4px 4px;";
	playButton.textContent = "Play";
	statsContainer.parentNode.insertBefore(playButton, statsContainer.nextSibling);
}
function toggleMMD()
{
	if (pause) {
		pause = false;
		if (audio) {
			audio.play();
			playButton.textContent = "Pause";
		}
	}
	else {
		pause = true;	
		if (audio) {
			audio.pause();
			playButton.textContent = "Play";
		}
	}
	console.log("playMMD: " + pause);
}