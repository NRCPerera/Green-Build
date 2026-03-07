import { useRef, useEffect, useState } from 'react';
import { Card, Empty, Spin, Alert, Typography, Space, Tooltip, Button } from 'antd';
import {
    ExpandOutlined,
    CompressOutlined,
    ReloadOutlined,
    EyeOutlined
} from '@ant-design/icons';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const { Text } = Typography;

/**
 * 3D Floor Plan Viewer Component
 * Renders a 3D visualization of floor plan geometry data using Three.js
 * * @param {Object} props
 * @param {Object} props.floorplanData - The geometry data from the ML pipeline
 * @param {boolean} props.loading - Whether data is still loading
 */
const FloorPlan3DViewer = ({ floorplanData, loading = false }) => {
    const containerRef = useRef(null);
    const rendererRef = useRef(null);
    const sceneRef = useRef(null);
    const cameraRef = useRef(null);
    const controlsRef = useRef(null);
    const animationIdRef = useRef(null);
    const modelGroupRef = useRef(null); // Track the current model group
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [error, setError] = useState(null);
    const [detectionInfo, setDetectionInfo] = useState(null);

    // Initialize Three.js scene
    useEffect(() => {
        if (!containerRef.current) return;

        // Clean up any existing canvases (handles React StrictMode double-mount)
        while (containerRef.current.querySelector('canvas')) {
            containerRef.current.querySelector('canvas').remove();
        }

        // Scene setup
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x1a1a2e);
        sceneRef.current = scene;

        // Grid will be added/resized when model loads

        // Camera
        const aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
        const camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
        camera.position.set(15, 20, 15);
        cameraRef.current = camera;

        // Renderer
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        containerRef.current.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        // Controls
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.target.set(0, 0, 0);
        controlsRef.current = controls;

        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(20, 30, 20);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        scene.add(dirLight);

        // Additional fill light
        const fillLight = new THREE.DirectionalLight(0x88ccff, 0.3);
        fillLight.position.set(-20, 10, -20);
        scene.add(fillLight);

        // Animation loop
        const animate = () => {
            animationIdRef.current = requestAnimationFrame(animate);
            controls.update();
            renderer.render(scene, camera);
        };
        animate();

        // Handle resize
        const handleResize = () => {
            if (!containerRef.current) return;
            const width = containerRef.current.clientWidth;
            const height = containerRef.current.clientHeight;
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            renderer.setSize(width, height);
        };
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            if (animationIdRef.current) {
                cancelAnimationFrame(animationIdRef.current);
            }
            controls.dispose();
            renderer.dispose();
            if (renderer.domElement && renderer.domElement.parentNode) {
                renderer.domElement.parentNode.removeChild(renderer.domElement);
            }
        };
    }, []);

    // Build 3D model when data changes
    useEffect(() => {
        if (!floorplanData || !sceneRef.current) return;

        try {
            console.log('[3D Viewer] Building model with new data:', {
                walls: floorplanData.walls?.length || 0,
                windows: floorplanData.windows?.length || 0,
                doors: floorplanData.doors?.length || 0
            });
            buildModel(floorplanData);
            setError(null);
        } catch (err) {
            console.error('Error building 3D model:', err);
            setError('Failed to build 3D model from geometry data');
        }
    }, [floorplanData]);

    const buildModel = (data) => {
        const scene = sceneRef.current;

        // Remove the old model group if it exists
        if (modelGroupRef.current) {
            modelGroupRef.current.traverse((child) => {
                if (child.isMesh) {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(m => m.dispose());
                        } else {
                            child.material.dispose();
                        }
                    }
                }
            });
            scene.remove(modelGroupRef.current);
            modelGroupRef.current = null;
        }

        const wallHeight = data.metadata?.wall_height || 2.5;
        const roomHeight = 0.05; // Thin room floor slab
        const group = new THREE.Group();

        // ── 1. Render Room Floors ───────────────────────
        if (data.rooms && data.rooms.length > 0) {
            data.rooms.forEach((room) => {
                if (!room || !room.outline || room.outline.length < 3) return;

                const colorHex = room.color || '#4A90D9';
                const roomMaterial = new THREE.MeshStandardMaterial({
                    color: new THREE.Color(colorHex),
                    side: THREE.DoubleSide,
                    roughness: 0.4,
                    metalness: 0.1
                });

                const shape = createShape(room.outline, room.holes || []);
                const floorGeometry = new THREE.ExtrudeGeometry(shape, {
                    depth: roomHeight,
                    bevelEnabled: false
                });
                const floorMesh = new THREE.Mesh(floorGeometry, roomMaterial);
                floorMesh.rotation.x = -Math.PI / 2;
                floorMesh.receiveShadow = true;
                group.add(floorMesh);
            });
        }

        // ── 2. Render Walls Safely ─────────────────────────────
        const wallMaterial = new THREE.MeshStandardMaterial({
            color: 0xd4c5a9, // Beige walls
            side: THREE.DoubleSide,
            roughness: 0.8,
            metalness: 0.0,
            transparent: true,
            opacity: 0.85
        });

        if (data.walls && data.walls.length > 0) {
            data.walls.forEach((wall) => {
                if (!wall || !wall.outline || wall.outline.length < 3) return;

                const shape = createShape(wall.outline, wall.holes || []);
                
                try {
                    const wallGeometry = new THREE.ExtrudeGeometry(shape, {
                        depth: wallHeight,
                        bevelEnabled: false
                    });
                    
                    const wallMesh = new THREE.Mesh(wallGeometry, wallMaterial);
                    wallMesh.rotation.x = -Math.PI / 2;
                    wallMesh.position.y = roomHeight; 
                    wallMesh.castShadow = true;
                    wallMesh.receiveShadow = true;
                    group.add(wallMesh);
                } catch (e) {
                    console.error("Failed to triangulate wall geometry:", e);
                }
            });
        }

        // ── 3. Render Doors and Windows ──────────────────────────
        const doorCount = data.doors?.length || 0;
        const windowCount = data.windows?.length || 0;
        const roomCount = data.rooms?.length || 0;
        setDetectionInfo({ rooms: roomCount, doors: doorCount, windows: windowCount });

        const doorMaterial = new THREE.MeshStandardMaterial({
            color: 0x8b5a2b, // Brown doors
            side: THREE.DoubleSide,
            roughness: 0.5,
            metalness: 0.1
        });

        const windowMaterial = new THREE.MeshStandardMaterial({
            color: 0x88ddff, // Cyan glass
            transparent: true,
            opacity: 0.45,
            side: THREE.DoubleSide,
            metalness: 0.3,
            roughness: 0.05
        });

        if (data.doors && data.doors.length > 0) {
            const doorHeight = 2.1;
            data.doors.forEach((door) => {
                if (!door || !door.outline || door.outline.length < 3) return;
                const shape = createShape(door.outline, door.holes || []);
                const geometry = new THREE.ExtrudeGeometry(shape, {
                    depth: doorHeight,
                    bevelEnabled: false
                });
                const mesh = new THREE.Mesh(geometry, doorMaterial);
                mesh.rotation.x = -Math.PI / 2;
                mesh.position.y = roomHeight;
                mesh.castShadow = true;
                group.add(mesh);
            });
        }

        if (data.windows && data.windows.length > 0) {
            const windowSillHeight = 0.9;
            const windowPaneHeight = 1.3;
            data.windows.forEach((win) => {
                if (!win || !win.outline || win.outline.length < 3) return;
                const shape = createShape(win.outline, win.holes || []);
                const geometry = new THREE.ExtrudeGeometry(shape, {
                    depth: windowPaneHeight,
                    bevelEnabled: false
                });
                const mesh = new THREE.Mesh(geometry, windowMaterial);
                mesh.rotation.x = -Math.PI / 2;
                mesh.position.y = roomHeight + windowSillHeight;
                group.add(mesh);
            });
        }

        // ── 4. Center model and adjust camera ────────────────────
        const box = new THREE.Box3().setFromObject(group);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        group.position.x = -center.x;
        group.position.z = -center.z;
        group.position.y = 0;

        scene.add(group);
        modelGroupRef.current = group;

        const maxDim = Math.max(size.x, size.z, 1);
        const gridSize = Math.ceil(maxDim * 2.5);
        const gridDivisions = Math.max(10, Math.ceil(gridSize));

        const oldGrid = scene.children.find(c => c.isGridHelper);
        if (oldGrid) scene.remove(oldGrid);
        const newGrid = new THREE.GridHelper(gridSize, gridDivisions, 0x444466, 0x333344);
        scene.add(newGrid);

        if (cameraRef.current && controlsRef.current) {
            const distance = Math.max(maxDim * 1.8, 5);
            cameraRef.current.position.set(distance * 0.7, distance * 0.6, distance * 0.7);
            controlsRef.current.target.set(0, wallHeight / 2, 0);
            controlsRef.current.update();
        }
    };

    // ── NEW: Auto-Correcting Shape Builder ──────────────────────
    const createShape = (outline, holes) => {
        if (!outline || outline.length === 0) return new THREE.Shape();

        // 1. Convert outline array to Three.js Vectors
        let pts = outline.map(p => new THREE.Vector2(p[0], p[1]));
        
        // 2. Force Counter-Clockwise (CCW) for the main shape
        if (THREE.ShapeUtils.isClockWise(pts)) {
            pts = pts.reverse();
        }
        
        const shape = new THREE.Shape(pts);

        // 3. Process holes and force Clockwise (CW) winding
        if (holes && holes.length > 0) {
            holes.forEach((holePoints) => {
                if (!holePoints || holePoints.length < 3) return;
                
                let hPts = holePoints.map(p => new THREE.Vector2(p[0], p[1]));
                
                // Holes must be opposite of the main outline
                if (!THREE.ShapeUtils.isClockWise(hPts)) {
                    hPts = hPts.reverse();
                }
                
                shape.holes.push(new THREE.Path(hPts));
            });
        }
        return shape;
    };

    const resetCamera = () => {
        if (cameraRef.current && controlsRef.current) {
            cameraRef.current.position.set(15, 20, 15);
            controlsRef.current.target.set(0, 1.25, 0);
            controlsRef.current.update();
        }
    };

    const toggleFullscreen = () => {
        setIsFullscreen(!isFullscreen);
        setTimeout(() => {
            if (containerRef.current && cameraRef.current && rendererRef.current) {
                const width = containerRef.current.clientWidth;
                const height = containerRef.current.clientHeight;
                cameraRef.current.aspect = width / height;
                cameraRef.current.updateProjectionMatrix();
                rendererRef.current.setSize(width, height);
            }
        }, 100);
    };

    return (
        <Card
            className="glass-card"
            title={
                <Space>
                    <EyeOutlined style={{ color: '#00d9ff' }} />
                    <Text strong style={{ color: '#00d9ff' }}>3D Floor Plan View</Text>
                </Space>
            }
            extra={
                <Space>
                    <Tooltip title="Reset Camera">
                        <Button
                            icon={<ReloadOutlined />}
                            size="small"
                            onClick={resetCamera}
                            disabled={!floorplanData}
                        />
                    </Tooltip>
                    <Tooltip title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}>
                        <Button
                            icon={isFullscreen ? <CompressOutlined /> : <ExpandOutlined />}
                            size="small"
                            onClick={toggleFullscreen}
                            disabled={!floorplanData}
                        />
                    </Tooltip>
                </Space>
            }
            style={{ marginBottom: '24px' }}
            bodyStyle={{ padding: 0 }}
        >
            {error && (
                <Alert
                    message="Visualization Error"
                    description={error}
                    type="error"
                    showIcon
                    style={{ margin: '16px' }}
                />
            )}
            <div style={{ position: 'relative' }}>
                <div
                    ref={containerRef}
                    style={{
                        width: '100%',
                        height: isFullscreen ? 'calc(100vh - 200px)' : '400px',
                        background: '#1a1a2e',
                        borderRadius: '0 0 8px 8px',
                        cursor: floorplanData ? 'grab' : 'default'
                    }}
                />

                {detectionInfo && (
                    <div style={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        background: 'rgba(0, 0, 0, 0.65)',
                        borderRadius: 8,
                        padding: '8px 12px',
                        display: 'flex',
                        gap: 12,
                        fontSize: 12,
                        color: '#fff',
                        pointerEvents: 'none',
                        zIndex: 10
                    }}>
                        <span>🏠 {detectionInfo.rooms} Rooms</span>
                        <span>🚪 {detectionInfo.doors} Doors</span>
                        <span>🪟 {detectionInfo.windows} Windows</span>
                    </div>
                )}

                {loading && (
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'rgba(26, 26, 46, 0.9)',
                        borderRadius: '0 0 8px 8px'
                    }}>
                        <Spin size="large" />
                        <Text style={{ display: 'block', marginTop: '16px', color: '#00d9ff' }}>
                            Loading 3D Visualization...
                        </Text>
                    </div>
                )}

                {!loading && !floorplanData && (
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'rgba(26, 26, 46, 0.9)',
                        borderRadius: '0 0 8px 8px'
                    }}>
                        <Empty
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                            description={
                                <Text type="secondary">
                                    Upload and process a floor plan to see the 3D visualization
                                </Text>
                            }
                        />
                    </div>
                )}
            </div>
            <div style={{ padding: '12px 16px', background: 'rgba(0,0,0,0.3)' }}>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                    <strong>Controls:</strong> Left Click + Drag to rotate | Right Click + Drag to pan | Scroll to zoom
                </Text>
            </div>
        </Card>
    );
};

export default FloorPlan3DViewer;