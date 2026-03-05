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
 * 
 * @param {Object} props
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

    // Initialize Three.js scene
    useEffect(() => {
        if (!containerRef.current) return;

        // Scene setup
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x1a1a2e);
        sceneRef.current = scene;

        // Grid helper
        const gridHelper = new THREE.GridHelper(50, 50, 0x444466, 0x333344);
        scene.add(gridHelper);

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
            if (containerRef.current && renderer.domElement) {
                containerRef.current.removeChild(renderer.domElement);
            }
            renderer.dispose();
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
            // Dispose all geometries and materials in the old group
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

        // Materials for windows and doors
        const windowMaterial = new THREE.MeshStandardMaterial({
            color: 0x88ccff,
            transparent: true,
            opacity: 0.6,
            side: THREE.DoubleSide
        });
        const doorMaterial = new THREE.MeshStandardMaterial({
            color: 0x8b5a2b,
            side: THREE.DoubleSide,
            roughness: 0.6
        });

        const wallHeight = data.metadata?.wall_height || 2.5;
        const roomHeight = 0.15; // Thin room floor extrusion
        const group = new THREE.Group();

        // Build rooms with unique colors
        if (data.rooms && data.rooms.length > 0) {
            console.log(`[3D Viewer] Rendering ${data.rooms.length} rooms`);
            data.rooms.forEach((room) => {
                if (!room || !room.outline || room.outline.length < 3) return;

                // Parse color from hex string
                const colorHex = room.color || '#4A90D9';
                const color = new THREE.Color(colorHex);

                // Create room material with unique color
                const roomMaterial = new THREE.MeshStandardMaterial({
                    color: color,
                    side: THREE.DoubleSide,
                    roughness: 0.4,
                    metalness: 0.1
                });

                const shape = createShape(room.outline, room.holes || []);

                // Room floor (thin extrusion)
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

        // Build windows (glass panes)
        if (data.windows && data.windows.length > 0) {
            data.windows.forEach((win) => {
                if (!win || !win.outline || win.outline.length < 3) return;
                const shape = createShape(win.outline, []);
                const geometry = new THREE.ExtrudeGeometry(shape, {
                    depth: 1.5, // Window height
                    bevelEnabled: false
                });
                const mesh = new THREE.Mesh(geometry, windowMaterial);
                mesh.rotation.x = -Math.PI / 2;
                mesh.position.y = 1.0; // Sill height
                group.add(mesh);
            });
        }

        // Build doors
        if (data.doors && data.doors.length > 0) {
            data.doors.forEach((door) => {
                if (!door || !door.outline || door.outline.length < 3) return;
                const shape = createShape(door.outline, []);
                const geometry = new THREE.ExtrudeGeometry(shape, {
                    depth: 2.2, // Door height
                    bevelEnabled: false
                });
                const mesh = new THREE.Mesh(geometry, doorMaterial);
                mesh.rotation.x = -Math.PI / 2;
                group.add(mesh);
            });
        }

        // Calculate bounds BEFORE adding to scene for proper centering
        const box = new THREE.Box3().setFromObject(group);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        // Center the group at origin
        group.position.x = -center.x;
        group.position.z = -center.z;
        group.position.y = 0; // Keep at ground level

        scene.add(group);
        modelGroupRef.current = group; // Store reference for cleanup

        // Adjust camera to fit model with good viewing angle
        if (cameraRef.current && controlsRef.current) {
            const maxDim = Math.max(size.x, size.z);
            const distance = maxDim * 1.2; // Distance based on model size

            // Position camera for a nice isometric-like view
            cameraRef.current.position.set(distance * 0.7, distance * 0.5, distance * 0.7);

            // Target the center of the model (which is now at origin)
            controlsRef.current.target.set(0, roomHeight / 2, 0);
            controlsRef.current.update();
        }
    };

    const createShape = (outline, holes) => {
        const shape = new THREE.Shape();

        if (outline.length === 0) return shape;

        shape.moveTo(outline[0][0], outline[0][1]);
        for (let i = 1; i < outline.length; i++) {
            shape.lineTo(outline[i][0], outline[i][1]);
        }
        shape.lineTo(outline[0][0], outline[0][1]);

        if (holes && holes.length > 0) {
            holes.forEach((holePoints) => {
                if (!holePoints || holePoints.length < 3) return;
                const holePath = new THREE.Path();
                holePath.moveTo(holePoints[0][0], holePoints[0][1]);
                for (let i = 1; i < holePoints.length; i++) {
                    holePath.lineTo(holePoints[i][0], holePoints[i][1]);
                }
                holePath.lineTo(holePoints[0][0], holePoints[0][1]);
                shape.holes.push(holePath);
            });
        }

        return shape;
    };

    // Create wall edge geometries from room outline
    const createWallEdges = (outline, thickness, height) => {
        if (!outline || outline.length < 3) return null;

        const geometries = [];

        // Create walls along each edge of the room outline
        for (let i = 0; i < outline.length - 1; i++) {
            const p1 = outline[i];
            const p2 = outline[(i + 1) % outline.length];

            // Calculate wall direction and perpendicular
            const dx = p2[0] - p1[0];
            const dy = p2[1] - p1[1];
            const len = Math.sqrt(dx * dx + dy * dy);

            if (len < 0.01) continue; // Skip very short segments

            // Normalized perpendicular vector
            const nx = -dy / len * thickness / 2;
            const ny = dx / len * thickness / 2;

            // Create wall shape (rectangle along the edge)
            const wallShape = new THREE.Shape();
            wallShape.moveTo(p1[0] - nx, p1[1] - ny);
            wallShape.lineTo(p2[0] - nx, p2[1] - ny);
            wallShape.lineTo(p2[0] + nx, p2[1] + ny);
            wallShape.lineTo(p1[0] + nx, p1[1] + ny);
            wallShape.lineTo(p1[0] - nx, p1[1] - ny);

            const geometry = new THREE.ExtrudeGeometry(wallShape, {
                depth: height,
                bevelEnabled: false
            });

            geometries.push(geometry);
        }

        return geometries.length > 0 ? geometries : null;
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
        // Trigger resize after state change
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

    // Always render the card with the Three.js container
    // Use overlays for loading/empty states to keep the container mounted
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
                {/* Three.js container - always mounted */}
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

                {/* Loading overlay */}
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

                {/* Empty state overlay */}
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
