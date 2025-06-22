// main.js - version simplifiée et corrigée pour Babylon.js
import { snoise } from './noise.js';

// Attendre que le DOM soit chargé
document.addEventListener('DOMContentLoaded', function() {
  // Créer le canvas pour Babylon.js
  const canvas = document.createElement("canvas");
  canvas.id = "renderCanvas";
  canvas.style.position = "fixed";
  canvas.style.top = "0";
  canvas.style.left = "0";
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.zIndex = "-1";
  document.body.insertBefore(canvas, document.body.firstChild);
  
  // Initialiser le moteur Babylon.js
  const engine = new BABYLON.Engine(canvas, true);
  
  // Créer la scène
  const createScene = function() {
    const scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0, 0, 0, 0);
    
    // Créer une caméra
    const camera = new BABYLON.ArcRotateCamera("camera", -Math.PI / 2, Math.PI / 3, 8, 
      new BABYLON.Vector3(0, 0, 0), scene);
    camera.attachControl(canvas, false);
    camera.lowerRadiusLimit = 5;
    camera.upperRadiusLimit = 10;
    
    // Lumière
    const light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);
    light.intensity = 0.7;
    
    // Paramètres pour la grille
    const gridSize = 10;
    const subdivisions = 60; // Réduire si performance problématique
    
    // Créer un ground mesh simple (surface plane)
    const ground = BABYLON.MeshBuilder.CreateGround("liquid", {
      width: gridSize,
      height: gridSize,
      subdivisions: subdivisions,
      updatable: true
    }, scene);
    
    // Légère rotation pour un meilleur angle
    ground.rotation.x = Math.PI / 12;
    
    // Créer un matériau standard (plus simple que le shader personnalisé)
    const material = new BABYLON.StandardMaterial("liquidMat", scene);
    material.diffuseColor = new BABYLON.Color3(0.3, 0.6, 0.9); // Bleu
    material.specularColor = new BABYLON.Color3(0.5, 0.6, 1.0);
    material.emissiveColor = new BABYLON.Color3(0.1, 0.1, 0.3);
    material.alpha = 0.9;
    
    // Options pour transparence
    material.backFaceCulling = false;
    material.useAlphaFromDiffuseTexture = true;
    
    // Assigner le matériau
    ground.material = material;
    
    // Créer le générateur de bruit
    const noise = snoise();
    
    // Variable pour le temps
    let time = 0;
    
    // Animation et mise à jour des vagues
    scene.registerBeforeRender(function() {
      time += engine.getDeltaTime() / 1000;
      
      // Mettre à jour les positions du mesh
      const positions = ground.getVerticesData(BABYLON.VertexBuffer.PositionKind);
      
      for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i];
        const z = positions[i + 2];
        
        // Calcul du bruit à plusieurs octaves
        let noiseValue = 
          noise(x * 0.2 + time * 0.2, z * 0.2 + time * 0.1) * 0.5 + 
          noise(x * 0.4 + time * 0.15, z * 0.4 + time * 0.2) * 0.25 + 
          noise(x * 0.8 + time * 0.1, z * 0.8 + time * 0.3) * 0.125;
        
        // Appliquer le déplacement vertical avec une amplitude modérée
        positions[i + 1] = noiseValue * 0.8;
      }
      
      // Mettre à jour le mesh
      ground.updateVerticesData(BABYLON.VertexBuffer.PositionKind, positions);
      
      // Mettre à jour les normales pour un éclairage correct
      const normals = [];
      BABYLON.VertexData.ComputeNormals(positions, ground.getIndices(), normals);
      ground.updateVerticesData(BABYLON.VertexBuffer.NormalKind, normals);
    });
    
    // Effets post-process
    const pipeline = new BABYLON.DefaultRenderingPipeline("pipeline", true, scene, [camera]);
    pipeline.bloomEnabled = true;
    pipeline.bloomThreshold = 0.2;
    pipeline.bloomWeight = 0.8;
    pipeline.bloomKernel = 64;
    pipeline.bloomScale = 0.5;
    
    return scene;
  };
  
  // Créer la scène
  const scene = createScene();
  
  // Exécuter le moteur de rendu
  engine.runRenderLoop(function() {
    scene.render();
  });
  
  // Gérer le redimensionnement
  window.addEventListener("resize", function() {
    engine.resize();
  });
});