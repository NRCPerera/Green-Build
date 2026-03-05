/**
 * BOQ Result View — Step 3
 *
 * Displays the complete Bill of Quantities (sections A–F),
 * summary with contingency/overhead/profit,
 * and the 3D floor plan viewer in a tabbed layout.
 */

import { useState, useMemo } from 'react';
import {
    Card, Table, Row, Col, Statistic, Divider,
    Typography, Space, Tag, Tabs, Collapse, Empty
} from 'antd';
import {
    FileTextOutlined,
    DollarOutlined,
    CheckCircleOutlined,
    EyeOutlined,
    BarChartOutlined,
    DownloadOutlined
} from '@ant-design/icons';
import { generateFullBOQ } from '../../../models/boqModel';
import { FloorPlan3DViewer } from '../../components';

const { Title, Text, Paragraph } = Typography;

const fmt = (n) =>
    `Rs. ${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/* ── Table columns ─────────────────────────────────────────────── */

const boqColumns = [
    {
        title: 'S.No',
        dataIndex: 'key',
        key: 'key',
        width: 60,
        align: 'center',
    },
    {
        title: 'Item Description',
        dataIndex: 'item',
        key: 'item',
        render: (text, record) => (
            <div>
                <Text strong>{text}</Text>
                <br />
                <Text type="secondary" style={{ fontSize: 12 }}>{record.description}</Text>
            </div>
        ),
    },
    {
        title: 'Quantity',
        dataIndex: 'quantity',
        key: 'quantity',
        width: 100,
        align: 'right',
        render: (val) => (
            <Text strong style={{ color: '#52c41a' }}>
                {typeof val === 'number' ? val.toFixed(2) : val}
            </Text>
        ),
    },
    {
        title: 'Unit',
        dataIndex: 'unit',
        key: 'unit',
        width: 60,
        align: 'center',
    },
    {
        title: 'Rate (LKR)',
        dataIndex: 'rate',
        key: 'rate',
        width: 120,
        align: 'right',
    },
    {
        title: 'Amount (LKR)',
        dataIndex: 'total',
        key: 'total',
        width: 140,
        align: 'right',
        render: (text) => (
            <Text strong style={{ color: '#52c41a' }}>{text}</Text>
        ),
    },
];

/* ── Component ─────────────────────────────────────────────────── */

const BOQResultView = ({ mlResults, manualInputs, geometry3D, loading3D, loadingBOQ, boqData, previewImage }) => {
    // Prefer backend-generated BOQ (dynamic rates) over local calculation
    const boq = useMemo(() => {
        if (boqData) {
            // Transform backend boqData to match the expected local structure
            const sections = (boqData.sections || []).map((section) => ({
                code: section.code,
                title: section.title,
                sectionKey: section.sectionKey,
                items: section.items.map((item, idx) => ({
                    key: idx + 1,
                    item: item.itemName || item.description,
                    description: `${item.itemNo} — ${item.materialType || 'standard'}`,
                    quantity: item.quantity,
                    unit: item.unit,
                    rate: item.unitRate?.toLocaleString('en-IN') || item.rate?.toLocaleString('en-IN') || '0',
                    total: fmt(item.totalCost || item.amount || 0),
                })),
                total: section.subtotal,
                totalFormatted: fmt(section.subtotal || 0),
            }));

            return {
                sections,
                summary: {
                    subtotal: boqData.summary?.subtotal || 0,
                    contingencyPercent: boqData.summary?.contingencyPercent || 10,
                    contingencyAmount: boqData.summary?.contingencyAmount || 0,
                    overheadPercent: boqData.summary?.overheadPercent || 15,
                    overheadAmount: boqData.summary?.overheadAmount || 0,
                    profitPercent: boqData.summary?.profitPercent || 10,
                    profitAmount: boqData.summary?.profitAmount || 0,
                    grandTotal: boqData.summary?.grandTotal || 0,
                }
            };
        }

        // Fallback: use local BOQ generator
        return generateFullBOQ(mlResults, manualInputs);
    }, [boqData, mlResults, manualInputs]);

    if (loadingBOQ) {
        return (
            <Card className="glass-card" style={{ textAlign: 'center', padding: '80px 20px' }}>
                <div style={{ fontSize: 48, color: '#00d9ff', marginBottom: 16 }}>⏳</div>
                <Title level={4} style={{ color: '#64748b' }}>Generating BOQ with Dynamic Rates...</Title>
                <Paragraph type="secondary">
                    Querying rate engine and building all 6 measured work sections.
                </Paragraph>
            </Card>
        );
    }

    const { sections, summary } = boq;

    // Build collapse items — one per section
    const sectionPanels = sections
        .filter((s) => s.items.length > 0)
        .map((section) => ({
            key: section.code,
            label: (
                <Space>
                    <Text strong style={{ color: '#00d9ff' }}>{section.title}</Text>
                    <Tag color="blue">{section.items.length} items</Tag>
                    <Text strong style={{ color: '#52c41a' }}>{section.totalFormatted}</Text>
                </Space>
            ),
            children: (
                <Table
                    columns={boqColumns}
                    dataSource={section.items}
                    pagination={false}
                    size="small"
                    className="boq-table"
                />
            ),
        }));

    const tabItems = [
        {
            key: 'boq',
            label: (
                <span>
                    <FileTextOutlined /> Bill of Quantities
                </span>
            ),
            children: (
                <>
                    {/* Section Header */}
                    <Card className="glass-card" style={{ marginBottom: 24 }}>
                        <Space style={{ marginBottom: 8 }}>
                            <FileTextOutlined style={{ color: '#00d9ff', fontSize: 20 }} />
                            <Title level={4} style={{ margin: 0, color: '#00d9ff' }}>
                                Complete Bill of Quantities
                            </Title>
                            <Tag color="green" icon={<CheckCircleOutlined />}>Generated</Tag>
                        </Space>
                        <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                            Professional BOQ with 6 measured work sections based on ML detections and your inputs.
                        </Paragraph>
                    </Card>

                    {/* BOQ Sections (collapsible) */}
                    <Card className="glass-card" style={{ marginBottom: 24 }}>
                        {sectionPanels.length > 0 ? (
                            <Collapse
                                defaultActiveKey={sections.filter(s => s.items.length > 0).map(s => s.code)}
                                items={sectionPanels}
                                ghost
                                style={{ background: 'transparent' }}
                            />
                        ) : (
                            <Empty description="No items generated. Please add inputs in the previous step." />
                        )}
                    </Card>

                    {/* Summary */}
                    <Card className="glass-card" style={{ marginBottom: 24 }}>
                        <Title level={5} style={{ color: '#faad14', marginBottom: 16 }}>
                            <DollarOutlined /> Cost Summary
                        </Title>

                        {/* Section totals */}
                        {sections.filter(s => s.items.length > 0).map((s) => (
                            <Row key={s.code} justify="space-between" style={{ marginBottom: 8 }}>
                                <Col>
                                    <Text type="secondary">{s.title}</Text>
                                </Col>
                                <Col>
                                    <Text strong>{s.totalFormatted}</Text>
                                </Col>
                            </Row>
                        ))}

                        <Divider style={{ margin: '12px 0' }} />

                        <Row justify="space-between" style={{ marginBottom: 6 }}>
                            <Col><Text strong>Subtotal</Text></Col>
                            <Col><Text strong style={{ color: '#52c41a' }}>{fmt(summary.subtotal)}</Text></Col>
                        </Row>
                        <Row justify="space-between" style={{ marginBottom: 6 }}>
                            <Col><Text type="secondary">Contingency ({summary.contingencyPercent}%)</Text></Col>
                            <Col><Text>{fmt(summary.contingencyAmount)}</Text></Col>
                        </Row>
                        <Row justify="space-between" style={{ marginBottom: 6 }}>
                            <Col><Text type="secondary">Overhead ({summary.overheadPercent}%)</Text></Col>
                            <Col><Text>{fmt(summary.overheadAmount)}</Text></Col>
                        </Row>
                        <Row justify="space-between" style={{ marginBottom: 6 }}>
                            <Col><Text type="secondary">Profit ({summary.profitPercent}%)</Text></Col>
                            <Col><Text>{fmt(summary.profitAmount)}</Text></Col>
                        </Row>

                        <Divider style={{ margin: '12px 0' }} />

                        <Row justify="space-between">
                            <Col>
                                <Title level={4} style={{ margin: 0, color: '#faad14' }}>
                                    Grand Total
                                </Title>
                            </Col>
                            <Col>
                                <Title level={4} style={{ margin: 0, color: '#52c41a' }}>
                                    {fmt(summary.grandTotal)}
                                </Title>
                            </Col>
                        </Row>
                    </Card>

                    {/* Per-section summary cards */}
                    <Row gutter={[16, 16]}>
                        {sections.filter(s => s.items.length > 0).map((s) => (
                            <Col xs={24} sm={12} md={8} key={s.code}>
                                <Card size="small" className="glass-card" style={{ textAlign: 'center' }}>
                                    <Statistic
                                        title={s.title}
                                        value={s.total}
                                        precision={2}
                                        prefix="Rs. "
                                        valueStyle={{ color: '#00d9ff', fontSize: 16 }}
                                    />
                                    <Text type="secondary" style={{ fontSize: 11 }}>
                                        {s.items.length} item(s)
                                    </Text>
                                </Card>
                            </Col>
                        ))}
                    </Row>
                </>
            ),
        },
        {
            key: '3d',
            label: (
                <span>
                    <EyeOutlined /> 3D View
                </span>
            ),
            children: (
                <FloorPlan3DViewer
                    floorplanData={geometry3D}
                    loading={loading3D}
                />
            ),
        },
    ];

    return (
        <Tabs
            defaultActiveKey="boq"
            type="card"
            items={tabItems}
            className="quantity-takeoff-tabs"
        />
    );
};

export default BOQResultView;
