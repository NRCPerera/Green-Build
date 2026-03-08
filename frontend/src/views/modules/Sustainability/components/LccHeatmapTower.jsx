import React, { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Html } from '@react-three/drei';
import { ZoomIn, ZoomOut, RefreshCw } from 'lucide-react';
import gsap from 'gsap';

/**
 * Helper to determine a color based on the percentage of total cost.
 * > 15%  : Heat (Red)
 * 12-15% : Warm (Orange)
 * 8-12%  : Mid (Yellow)
 * < 8%   : Cool (Green)
 * Note: Adjusted thresholds since we are splitting Superstructure into 3 physical floors.
 */
function getHeatmapColor(percentage, isOptimized) {
    if (!percentage) return '#374151'; // gray-700 fallback

    if (isOptimized) {
        // Enforce AI tower never shows red
        if (percentage > 25) return '#f97316'; // orange-500
        if (percentage > 14) return '#eab308'; // yellow-500
        return '#22c55e'; // green-500
    }

    if (percentage > 25) return '#ef4444'; // red-500
    if (percentage > 14) return '#f97316'; // orange-500
    if (percentage > 8) return '#eab308'; // yellow-500
    return '#22c55e'; // green-500
}

function HeatmapCube({ position, color, label, percentage, heatPercentage, amountFormatted, labelOffsetX = 1.4, labelAnchorX = "left", onLayerClick }) {
    const meshRef = useRef();
    const [hovered, setHover] = useState(false);

    // Subtle floating animation
    useFrame((state) => {
        meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2 + position[1]) * 0.05;
    });

    return (
        <group>
            {/* The Box */}
            <mesh
                ref={meshRef}
                position={position}
                onClick={(e) => {
                    e.stopPropagation();
                    if (onLayerClick) onLayerClick();
                }}
                onPointerOver={(e) => {
                    e.stopPropagation();
                    setHover(true);
                    document.body.style.cursor = 'pointer';
                }}
                onPointerOut={(e) => {
                    e.stopPropagation();
                    setHover(false);
                    document.body.style.cursor = 'auto';
                }}
            >
                <boxGeometry args={[2, 0.8, 2]} />
                <meshStandardMaterial
                    color={hovered ? '#ffffff' : color}
                    opacity={0.9}
                    transparent
                    metalness={0.2}
                    roughness={0.5}
                />
            </mesh>

            {/* Always visible 3D floating label next to the block */}
            <Text
                position={[position[0] + labelOffsetX, position[1], position[2] + 1.05]}
                fontSize={0.25}
                color="#cbd5e1"
                anchorX={labelAnchorX}
                anchorY="middle"
                outlineWidth={0.03}
                outlineColor="#000000"
                lineHeight={1.2}
            >
                {label}
            </Text>

            {/* Hover Tooltip Removed: Values are now permanently visible on the 3D Text labels. */}
        </group>
    );
}

export default function LccHeatmapTower({ cidaBoq, optBoq, formatCurrency, savingsPct, savedLkr, primaryMaterial, aiData, onLayerClick }) {
    const isDual = !!optBoq;
    const xOffset = isDual ? 2.5 : 0;
    const controlsRef = useRef();

    const handleZoomIn = () => {
        if (controlsRef.current) {
            controlsRef.current.object.position.z -= 2;
            controlsRef.current.update();
        }
    };

    const handleZoomOut = () => {
        if (controlsRef.current) {
            controlsRef.current.object.position.z += 2;
            controlsRef.current.update();
        }
    };

    const handleReset = () => {
        if (controlsRef.current) {
            // Smoothly animate the camera back to the original position
            gsap.to(controlsRef.current.object.position, {
                x: 10,
                y: 8,
                z: 15,
                duration: 1.2,
                ease: 'power3.inOut',
                onUpdate: () => controlsRef.current.update()
            });

            // Smoothly animate the target back to origin
            gsap.to(controlsRef.current.target, {
                x: 0,
                y: 2.5,
                z: 0,
                duration: 1.2,
                ease: 'power3.inOut',
                onUpdate: () => controlsRef.current.update()
            });
        }
    };

    // Map conceptual BOQ elements into a 3-floor representation
    const getPhysicalLayers = (boqData) => {
        if (!boqData || boqData.length === 0) {
            return [
                { id: 'roof', name: 'ROOF', short: 'Roof', y: 1.0, amount: 0, percentage: 0 },
                { id: 'super', name: 'SUPERSTRUCTURE', short: 'Superstructure', y: 0.0, amount: 0, percentage: 0 },
                { id: 'sub', name: 'SUBSTRUCTURE', short: 'Substructure', y: -1.0, amount: 0, percentage: 0 },
            ];
        }

        // Look for exact matches from the Python CIDA BoQ response
        const subItem = boqData.find(item => item.element?.includes('Substructure') || item.element === 'Foundation');
        const strucItem = boqData.find(item => item.element?.includes('Superstructure') || item.element === 'Walls/Roof');

        const subAmt = subItem?.amount || 0;
        const subPct = subItem?.percentage || 0;

        const strucAmt = strucItem?.amount || 0;
        const strucPct = strucItem?.percentage || 0;

        // Split Superstructure: 1/3 Roof, 2/3 Walls
        const roofAmt = strucAmt * (1 / 3);
        const roofPct = strucPct * (1 / 3);

        const wallAmt = strucAmt * (2 / 3);
        const wallPct = strucPct * (2 / 3);

        return [
            { id: 'roof', name: 'ROOF', short: 'Roof', y: 1.0, amount: roofAmt, percentage: roofPct },
            { id: 'super', name: 'SUPERSTRUCTURE', short: 'Superstructure', y: 0.0, amount: wallAmt, percentage: wallPct },
            { id: 'sub', name: 'SUBSTRUCTURE', short: 'Substructure', y: -1.0, amount: subAmt, percentage: subPct },
        ];
    };

    // Calculate Original Total
    const originalTotalAmount = cidaBoq?.reduce((acc, curr) => acc + curr.amount, 0) || 1;
    const calculateHeatPct = (amt) => (amt / originalTotalAmount) * 100;

    const rawOriginalLayers = getPhysicalLayers(cidaBoq);
    const originalLayers = rawOriginalLayers.map(layer => ({ ...layer, heatPercentage: calculateHeatPct(layer.amount) }));

    let optimizedLayers = [];
    if (isDual && optBoq) {
        // Find total CIDA difference, explicitly preferring the verified absolute savings passed from the parent
        const origTotal = cidaBoq.reduce((acc, curr) => acc + curr.amount, 0);
        const optTotal = optBoq.reduce((acc, curr) => acc + curr.amount, 0);
        const capexSavings = savedLkr || (origTotal - optTotal);

        const origRoof = rawOriginalLayers[0];
        const origSuper = rawOriginalLayers[1];
        const origSub = rawOriginalLayers[2];

        // Isolate savings entirely to Superstructure (Walls). Roof and Foundation remain untouched.
        const optSuperAmt = Math.max(0, origSuper.amount - capexSavings);

        const rawOptLayers = [
            { ...origRoof }, // Exact match
            { ...origSuper, amount: optSuperAmt }, // Subtract all variance here
            { ...origSub } // Exact match
        ];

        optimizedLayers = rawOptLayers.map(layer => ({ ...layer, heatPercentage: calculateHeatPct(layer.amount) }));
    }

    return (
        <div className={`w-full h-[450px] overflow-visible bg-dark-800/50 border border-white/5 rounded-2xl relative ${isDual ? 'ring-1 ring-indigo-500/30' : ''}`}>
            <div className="absolute top-4 left-4 z-10 pointer-events-none">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                    🏢 3D LCC Heatmap {isDual && <span className="bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded text-[10px]">AI Compare</span>}
                </h3>
                <p className="text-xs text-gray-400 mt-1">Cost intensity by building element</p>
            </div>

            {/* Manual Zoom Controls UI */}
            <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-1 p-1 bg-dark-900/60 backdrop-blur-md border border-white/10 rounded-full pointer-events-auto shadow-2xl">
                <button
                    onClick={handleZoomIn}
                    className="p-2.5 bg-dark-800/80 hover:bg-dark-700 rounded-full text-gray-300 hover:text-white transition-all active:scale-95 group"
                    title="Zoom In"
                >
                    <ZoomIn size={18} className="group-hover:scale-110 transition-transform" />
                </button>
                <div className="h-px w-full bg-white/5 mx-auto"></div>
                <button
                    onClick={handleZoomOut}
                    className="p-2.5 bg-dark-800/80 hover:bg-dark-700 rounded-full text-gray-300 hover:text-white transition-all active:scale-95 group"
                    title="Zoom Out"
                >
                    <ZoomOut size={18} className="group-hover:scale-110 transition-transform" />
                </button>
                <div className="h-px w-full bg-white/5 mx-auto"></div>
                <button
                    onClick={handleReset}
                    className="p-2.5 bg-indigo-500/80 hover:bg-indigo-500 rounded-full text-white transition-all active:scale-95 group mt-0.5"
                    title="Reset View"
                >
                    <RefreshCw size={18} className="group-hover:rotate-180 transition-transform duration-500" />
                </button>
            </div>

            <Canvas gl={{ preserveDrawingBuffer: true }} camera={{ position: [isDual ? 0 : 4, isDual ? 8 : 4, isDual ? 18 : 6], fov: isDual ? 60 : 45 }}>
                <ambientLight intensity={0.6} />
                <pointLight position={[10, 10, 10]} intensity={1} />
                <pointLight position={[-10, -10, -10]} intensity={0.5} color="#4f46e5" />

                <OrbitControls
                    ref={controlsRef}
                    enableZoom={false}
                    enablePan={false}
                    autoRotate={false}
                    autoRotateSpeed={1}
                    maxPolarAngle={Math.PI / 2 + 0.1}
                    target={[0, 2.0, 0]}
                />

                {isDual && (
                    <Html position={[0, 4.5, 0]} center zIndexRange={[10, 0]}>
                        <div className="bg-gradient-to-br from-indigo-500/90 to-purple-600/90 text-white shadow-xl shadow-indigo-500/20 backdrop-blur border border-white/20 rounded-full px-4 py-1.5 flex flex-col items-center pointer-events-none z-10 transform scale-90 sm:scale-100">
                            <span className="text-[10px] font-bold uppercase tracking-wider opacity-90">Saved</span>
                            <span className="text-base font-extrabold">{savingsPct}%</span>
                        </div>
                    </Html>
                )}

                <group position={[-xOffset, 0, 0]}>
                    {isDual && (
                        <Text position={[0, 4.0, 0]} fontSize={0.25} fontWeight="bold" color="#cbd5e1" anchorX="center" anchorY="middle" outlineWidth={0.02} outlineColor="#000000">
                            ORIGINAL
                        </Text>
                    )}
                    {originalLayers.map((layer) => (
                        <HeatmapCube
                            key={'orig-' + layer.id}
                            position={[0, layer.y, 0]}
                            color={getHeatmapColor(layer.heatPercentage, false)}
                            label={`${layer.name}\nRs. ${(layer.amount / 1000000).toFixed(2)}M`}
                            percentage={layer.percentage}
                            heatPercentage={layer.heatPercentage}
                            amountFormatted={formatCurrency ? formatCurrency(layer.amount) : `Rs. ${layer.amount.toFixed(2)}`}
                            labelOffsetX={-2.0}
                            labelAnchorX="right"
                            onLayerClick={() => onLayerClick ? onLayerClick(layer, false) : null}
                        />
                    ))}
                </group>

                {/* Optimized Tower */}
                {isDual && (
                    <group position={[xOffset, 0, 0]}>
                        <Text position={[0, 4.0, 0]} fontSize={0.25} fontWeight="bold" color="#4ade80" anchorX="center" anchorY="middle" outlineWidth={0.02} outlineColor="#000000">
                            AI RECOMMENDED
                        </Text>
                        {optimizedLayers.map((layer) => (
                            <HeatmapCube
                                key={'opt-' + layer.id}
                                position={[0, layer.y, 0]}
                                color={getHeatmapColor(layer.heatPercentage, true)}
                                label={`${layer.name}\nRs. ${(layer.amount / 1000000).toFixed(2)}M`}
                                percentage={layer.percentage}
                                heatPercentage={layer.heatPercentage}
                                amountFormatted={formatCurrency ? formatCurrency(layer.amount) : `Rs. ${layer.amount.toFixed(2)}`}
                                labelOffsetX={2.0}
                                labelAnchorX="left"
                                onLayerClick={() => onLayerClick ? onLayerClick(layer, true) : null}
                            />
                        ))}
                        <Html position={[0, -3.5, 0]} center zIndexRange={[10, 0]}>
                            <div className="bg-dark-900 border border-emerald-500/40 px-5 py-2.5 rounded-xl shadow-2xl backdrop-blur-md whitespace-nowrap">
                                <span className="text-emerald-400 font-bold text-sm tracking-wide">
                                    AI Replaced: <span className="text-gray-400 line-through font-normal mx-1.5">{primaryMaterial || 'Current'}</span> ➔ <span className="ml-1 text-white">{aiData?.recommendedMaterial || 'Optimized'}</span>
                                </span>
                            </div>
                        </Html>
                    </group>
                )}
            </Canvas>
        </div>
    );
}
