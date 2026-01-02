"""
Pydantic Schemas
================
Data models for API requests and responses.
"""

from typing import List, Optional
from pydantic import BaseModel, Field


class ItemCount(BaseModel):
    """Count of detected items by type."""
    doors: int = Field(default=0, description="Number of doors detected")
    windows: int = Field(default=0, description="Number of windows detected")


class Room(BaseModel):
    """Individual room data from detection."""
    room_id: int = Field(..., description="Unique room identifier")
    area_m2: float = Field(..., description="Room area in square meters")
    flooring_cost_estimate: float = Field(..., description="Flooring cost estimate (area * rate)")


class RoomDetectionResult(BaseModel):
    """Room detection results."""
    rooms: List[Room] = Field(default=[], description="List of detected rooms")
    total_floor_area_m2: float = Field(default=0.0, description="Total net floor area in square meters")
    room_map_base64: Optional[str] = Field(default=None, description="Base64 encoded room visualization image")


class QuantityTakeoffResponse(BaseModel):
    """Response schema for quantity takeoff calculations."""
    wall_total_length_m: float = Field(
        ..., 
        description="Total wall centerline length in meters"
    )
    wall_gross_surface_area_m2: float = Field(
        ..., 
        description="Gross wall surface area in square meters"
    )
    deductions_area_m2: float = Field(
        ..., 
        description="Total area of doors and windows in square meters"
    )
    wall_net_surface_area_m2: float = Field(
        ..., 
        description="Net wall surface area after deductions in square meters"
    )
    item_counts: ItemCount = Field(
        ..., 
        description="Count of detected doors and windows"
    )
    room_detection: Optional[RoomDetectionResult] = Field(
        default=None,
        description="Room detection results with areas and visualization"
    )
    detection_overlay_base64: Optional[str] = Field(
        default=None,
        description="Base64 encoded image with detection overlays (bounding boxes and labels)"
    )
    warning: Optional[str] = Field(
        default=None,
        description="Warning message if the image may not be a valid floor plan"
    )


class ErrorResponse(BaseModel):
    """Error response schema."""
    detail: str
    error_code: str
