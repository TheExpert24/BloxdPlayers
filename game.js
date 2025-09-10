class BloxdGame {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('gameCanvas') });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        this.world = new Map();
        this.selectedBlock = 'grass';
        this.keys = {};
        this.mouse = { x: 0, y: 0 };
        this.velocity = { x: 0, y: 0, z: 0 };
        this.onGround = false;
        this.isDay = true;

        this.getTimezoneAndSetTime();
        this.init();
    }

    getTimezoneAndSetTime() {
        const timezoneMap = {
            'PST': 'America/Los_Angeles', 'PDT': 'America/Los_Angeles',
            'MST': 'America/Denver', 'MDT': 'America/Denver',
            'CST': 'America/Chicago', 'CDT': 'America/Chicago',
            'EST': 'America/New_York', 'EDT': 'America/New_York',
            'GMT': 'Europe/London', 'BST': 'Europe/London',
            'CET': 'Europe/Paris', 'CEST': 'Europe/Paris',
            'JST': 'Asia/Tokyo', 'KST': 'Asia/Seoul',
            'IST': 'Asia/Kolkata', 'AEST': 'Australia/Sydney'
        };
        
        const input = prompt('Enter your timezone (e.g., PST, EST, CST, MST, GMT, JST):')?.toUpperCase();
        const timezone = timezoneMap[input] || input || Intl.DateTimeFormat().resolvedOptions().timeZone;
        
        const now = new Date();
        const timeInZone = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
        const hour = timeInZone.getHours();
        this.isDay = hour >= 6 && hour < 18;
    }

    init() {
        this.setupLighting();
        this.setupPlayer();
        this.generateTerrain();
        this.createSign();
        this.createStars();
        this.setupControls();
        this.setupUI();
        this.animate();
    }

    setupLighting() {
        if (this.isDay) {
            this.scene.background = new THREE.Color(0x87CEEB);
            const ambientLight = new THREE.AmbientLight(0x404040, 0.8);
            this.scene.add(ambientLight);
            const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
            directionalLight.position.set(50, 50, 50);
            directionalLight.castShadow = true;
            directionalLight.shadow.mapSize.width = 2048;
            directionalLight.shadow.mapSize.height = 2048;
            this.scene.add(directionalLight);
        } else {
            this.scene.background = new THREE.Color(0x000011);
            const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
            this.scene.add(ambientLight);
            const directionalLight = new THREE.DirectionalLight(0x9999ff, 0.4);
            directionalLight.position.set(50, 50, 50);
            directionalLight.castShadow = true;
            directionalLight.shadow.mapSize.width = 2048;
            directionalLight.shadow.mapSize.height = 2048;
            this.scene.add(directionalLight);
        }
    }

    createStars() {
        if (!this.isDay) {
            const starGeometry = new THREE.SphereGeometry(0.1, 4, 4);
            const starMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
            
            for (let i = 0; i < 200; i++) {
                const star = new THREE.Mesh(starGeometry, starMaterial);
                star.position.set(
                    (Math.random() - 0.5) * 200,
                    Math.random() * 50 + 20,
                    (Math.random() - 0.5) * 200
                );
                this.scene.add(star);
            }
        }
    }

    setupPlayer() {
        this.camera.position.set(0, 10, 0);
        this.raycaster = new THREE.Raycaster();
    }

    generateTerrain() {
        const size = 20;
        for (let x = -size; x < size; x++) {
            for (let z = -size; z < size; z++) {
                const height = Math.floor(Math.random() * 3) + 1;
                for (let y = 0; y < height; y++) {
                    this.placeBlock(x, y, z, y === height - 1 ? 'grass' : 'dirt');
                }
            }
        }
    }

    placeBlock(x, y, z, type) {
        const key = `${x},${y},${z}`;
        if (this.world.has(key)) return;

        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const materials = {
            grass: new THREE.MeshLambertMaterial({ color: 0x4CAF50 }),
            stone: new THREE.MeshLambertMaterial({ color: 0x9E9E9E }),
            wood: new THREE.MeshLambertMaterial({ color: 0x8D6E63 }),
            dirt: new THREE.MeshLambertMaterial({ color: 0x795548 })
        };

        const cube = new THREE.Mesh(geometry, materials[type]);
        cube.position.set(x, y, z);
        cube.castShadow = true;
        cube.receiveShadow = true;
        
        this.scene.add(cube);
        this.world.set(key, { mesh: cube, type });
    }

    removeBlock(x, y, z) {
        const key = `${x},${y},${z}`;
        const block = this.world.get(key);
        if (block) {
            this.scene.remove(block.mesh);
            this.world.delete(key);
        }
    }

    setupControls() {
        document.addEventListener('keydown', (e) => this.keys[e.code] = true);
        document.addEventListener('keyup', (e) => this.keys[e.code] = false);
        
        document.addEventListener('mousemove', (e) => {
            this.mouse.x -= e.movementX * 0.002;
            this.mouse.y -= e.movementY * 0.002;
            this.mouse.y = Math.max(-Math.PI/2, Math.min(Math.PI/2, this.mouse.y));
        });

        document.addEventListener('click', () => {
            if (document.pointerLockElement !== document.getElementById('gameCanvas')) {
                document.getElementById('gameCanvas').requestPointerLock();
            }
        });

        document.addEventListener('mousedown', (e) => {
            if (document.pointerLockElement === document.getElementById('gameCanvas')) {
                e.preventDefault();
                this.handleClick(e.button);
            }
        });

        document.addEventListener('contextmenu', (e) => {
            if (document.pointerLockElement === document.getElementById('gameCanvas')) {
                e.preventDefault();
            }
        });
    }

    setupUI() {
        document.querySelectorAll('.block-selector').forEach(selector => {
            selector.addEventListener('click', (e) => {
                document.querySelectorAll('.block-selector').forEach(s => s.classList.remove('active'));
                e.target.classList.add('active');
                this.selectedBlock = e.target.dataset.block;
            });
        });
    }

    createSign() {
        this.createTextBlocks();
    }

    createTextBlocks() {
        const blockSize = 0.8;
        const material = new THREE.MeshBasicMaterial({ 
            color: 0xFFFFFF,
            transparent: true,
            opacity: 0.9
        });
        const geometry = new THREE.BoxGeometry(blockSize, blockSize, blockSize);
        
        const letters = {
            'B': [[1,1,1,1,0],[1,0,0,0,1],[1,1,1,1,0],[1,0,0,0,1],[1,1,1,1,0]],
            'L': [[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,1,1,1,1]],
            'O': [[0,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,0]],
            'X': [[1,0,0,0,1],[0,1,0,1,0],[0,0,1,0,0],[0,1,0,1,0],[1,0,0,0,1]],
            'D': [[1,1,1,0,0],[1,0,0,1,0],[1,0,0,0,1],[1,0,0,1,0],[1,1,1,0,0]],
            'P': [[1,1,1,1,0],[1,0,0,0,1],[1,1,1,1,0],[1,0,0,0,0],[1,0,0,0,0]],
            'A': [[0,1,1,1,0],[1,0,0,0,1],[1,1,1,1,1],[1,0,0,0,1],[1,0,0,0,1]],
            'Y': [[1,0,0,0,1],[0,1,0,1,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0]],
            'E': [[1,1,1,1,1],[1,0,0,0,0],[1,1,1,1,0],[1,0,0,0,0],[1,1,1,1,1]],
            'R': [[1,1,1,1,0],[1,0,0,0,1],[1,1,1,1,0],[1,0,1,0,0],[1,0,0,1,0]],
            'S': [[0,1,1,1,1],[1,0,0,0,0],[0,1,1,1,0],[0,0,0,0,1],[1,1,1,1,0]]
        };
        
        const word1 = 'BLOXD';
        const word2 = 'PLAYERS';
        let startX = -12;
        for (let i = 0; i < word1.length; i++) {
            const letter = letters[word1[i]];
            if (letter) {
                for (let row = 0; row < letter.length; row++) {
                    for (let col = 0; col < letter[row].length; col++) {
                        if (letter[row][col]) {
                            const block = new THREE.Mesh(geometry, material.clone());
                            block.position.set(
                                startX + i * 6 + col * blockSize,
                                16 - row * blockSize,
                                -25
                            );
                            block.userData = { isSign: true };
                            this.scene.add(block);
                        }
                    }
                }
            }
        }
        
        startX = -16;
        for (let i = 0; i < word2.length; i++) {
            const letter = letters[word2[i]];
            if (letter) {
                for (let row = 0; row < letter.length; row++) {
                    for (let col = 0; col < letter[row].length; col++) {
                        if (letter[row][col]) {
                            const block = new THREE.Mesh(geometry, material.clone());
                            block.position.set(
                                startX + i * 5 + col * blockSize,
                                10 - row * blockSize,
                                -25
                            );
                            block.userData = { isSign: true };
                            this.scene.add(block);
                        }
                    }
                }
            }
        }
    }

    handleClick(button) {
        this.raycaster.setFromCamera({ x: 0, y: 0 }, this.camera);
        const intersects = this.raycaster.intersectObjects(this.scene.children.filter(obj => obj.geometry));

        if (intersects.length > 0) {
            const intersect = intersects[0];
            
            if (intersect.object.userData.isSign) {
                window.open('./bloxd-site.html', '_blank');
                return;
            }
            
            const point = intersect.point;
            const normal = intersect.face.normal;
            
            if (intersect.distance < 5) {
                if (button === 0) { // Left click - remove block
                    const blockPos = {
                        x: Math.floor(point.x - normal.x * 0.5),
                        y: Math.floor(point.y - normal.y * 0.5),
                        z: Math.floor(point.z - normal.z * 0.5)
                    };
                    this.removeBlock(blockPos.x, blockPos.y, blockPos.z);
                } else if (button === 2) { // Right click - place block
                    const blockPos = {
                        x: Math.floor(point.x + normal.x * 0.5),
                        y: Math.floor(point.y + normal.y * 0.5),
                        z: Math.floor(point.z + normal.z * 0.5)
                    };
                    this.placeBlock(blockPos.x, blockPos.y, blockPos.z, this.selectedBlock);
                }
            }
        }
    }

    updatePlayer() {
        const speed = 0.1;
        const jumpPower = 0.2;

        if (this.keys['KeyW']) {
            this.velocity.x -= Math.sin(this.mouse.x) * speed;
            this.velocity.z -= Math.cos(this.mouse.x) * speed;
        }
        if (this.keys['KeyS']) {
            this.velocity.x += Math.sin(this.mouse.x) * speed;
            this.velocity.z += Math.cos(this.mouse.x) * speed;
        }
        if (this.keys['KeyA']) {
            this.velocity.x -= Math.cos(this.mouse.x) * speed;
            this.velocity.z += Math.sin(this.mouse.x) * speed;
        }
        if (this.keys['KeyD']) {
            this.velocity.x += Math.cos(this.mouse.x) * speed;
            this.velocity.z -= Math.sin(this.mouse.x) * speed;
        }

        if (this.keys['Space'] && this.onGround) {
            this.velocity.y = jumpPower;
            this.onGround = false;
        }

        this.velocity.y -= 0.01;
        const newX = this.camera.position.x + this.velocity.x;
        const newZ = this.camera.position.z + this.velocity.z;
        
        if (!this.checkCollision(newX, this.camera.position.y, this.camera.position.z)) {
            this.camera.position.x = newX;
        } else {
            this.velocity.x = 0;
        }
        
        if (!this.checkCollision(this.camera.position.x, this.camera.position.y, newZ)) {
            this.camera.position.z = newZ;
        } else {
            this.velocity.z = 0;
        }
        this.camera.position.y += this.velocity.y;
        const groundHeight = this.getGroundHeight(this.camera.position.x, this.camera.position.z);
        if (this.camera.position.y <= groundHeight + 1.8) {
            this.camera.position.y = groundHeight + 1.8;
            this.velocity.y = 0;
            this.onGround = true;
        } else {
            this.onGround = false;
        }
        this.velocity.x *= 0.8;
        this.velocity.z *= 0.8;
        this.camera.rotation.order = 'YXZ';
        this.camera.rotation.y = this.mouse.x;
        this.camera.rotation.x = this.mouse.y;
    }

    checkCollision(x, y, z) {
        const playerRadius = 0.3;
        const checkPositions = [
            [Math.floor(x + playerRadius), Math.floor(y), Math.floor(z)],
            [Math.floor(x - playerRadius), Math.floor(y), Math.floor(z)],
            [Math.floor(x), Math.floor(y), Math.floor(z + playerRadius)],
            [Math.floor(x), Math.floor(y), Math.floor(z - playerRadius)]
        ];
        
        for (const [bx, by, bz] of checkPositions) {
            const key = `${bx},${by},${bz}`;
            if (this.world.has(key)) {
                return true;
            }
        }
        return false;
    }

    getGroundHeight(x, z) {
        const blockX = Math.floor(x);
        const blockZ = Math.floor(z);
        
        for (let y = 10; y >= 0; y--) {
            const key = `${blockX},${y},${blockZ}`;
            if (this.world.has(key)) {
                return y + 1;
            }
        }
        return 0;
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.updatePlayer();
        this.renderer.render(this.scene, this.camera);
    }
}

window.addEventListener('load', () => {
    new BloxdGame();
});

window.addEventListener('resize', () => {
    const camera = window.game?.camera;
    const renderer = window.game?.renderer;
    if (camera && renderer) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
});
