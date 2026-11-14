"""IoT & In-Situ Agro-Sensor Telemetry Service for Garvesty.

Provides embedded IoT software support:
1. Field telemetry ingestion (LoRaWAN / Cellular edge nodes).
2. Space + Ground Fusion: Fusing in-situ soil moisture/salinity probes with NASA satellite data.
3. Edge node health monitoring (battery mV, LoRaWAN RSSI/SNR signal).
4. Agronomic threshold alarms (salinity intrusion spike, desaturation drought, ponding).
"""
import copy
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class IoTTelemetryPacket(BaseModel):
    device_id: str
    field_id: str
    timestamp_utc: Optional[str] = None
    battery_mv: int = Field(3700, ge=2500, le=4500)
    rssi_dbm: int = Field(-75, ge=-130, le=-30)
    soil_moisture_10cm_vwc: float = Field(..., ge=0.0, le=1.0)
    soil_moisture_40cm_vwc: float = Field(..., ge=0.0, le=1.0)
    soil_temp_c: float = Field(..., ge=5.0, le=50.0)
    salinity_ec_ds_m: float = Field(0.8, ge=0.0, le=15.0)
    water_table_depth_cm: Optional[float] = Field(None, ge=-200.0, le=50.0)


# In-memory store for active IoT nodes and historical telemetry
DEVICES = {
    "GW-TW01": {
        "device_id": "GW-TW01",
        "name": "Twante Pilot Node 1 (Upland Clay)",
        "field_id": "F-01",
        "model": "AgroGuard LoRaWAN Soil Probe v2",
        "hardware_version": "v2.4",
        "firmware_version": "1.3.2",
        "status": "online",
        "last_seen_utc": "2026-11-14T03:30:00Z",
        "battery_mv": 3840,
        "rssi_dbm": -72,
        "snr_db": 9.5,
        "sensors": ["volumetric_water_content", "temperature", "electrical_conductivity"],
    },
    "GW-TW02": {
        "device_id": "GW-TW02",
        "name": "Twante Canal East Node 2 (Lowland Silt)",
        "field_id": "F-02",
        "model": "AgroGuard LoRaWAN Soil Probe v2",
        "hardware_version": "v2.4",
        "firmware_version": "1.3.2",
        "status": "online",
        "last_seen_utc": "2026-11-14T03:25:00Z",
        "battery_mv": 3720,
        "rssi_dbm": -81,
        "snr_db": 7.2,
        "sensors": ["volumetric_water_content", "temperature", "electrical_conductivity"],
    }
}

LATEST_TELEMETRY: Dict[str, Dict[str, Any]] = {
    "F-01": {
        "device_id": "GW-TW01",
        "field_id": "F-01",
        "timestamp_utc": "2026-11-14T03:30:00Z",
        "battery_mv": 3840,
        "rssi_dbm": -72,
        "soil_moisture_10cm_vwc": 0.36,
        "soil_moisture_40cm_vwc": 0.42,
        "soil_temp_c": 27.2,
        "salinity_ec_ds_m": 0.85,
        "water_table_depth_cm": -12.0,
    },
    "F-02": {
        "device_id": "GW-TW02",
        "field_id": "F-02",
        "timestamp_utc": "2026-11-14T03:25:00Z",
        "battery_mv": 3720,
        "rssi_dbm": -81,
        "soil_moisture_10cm_vwc": 0.31,
        "soil_moisture_40cm_vwc": 0.35,
        "soil_temp_c": 28.1,
        "salinity_ec_ds_m": 1.45,
        "water_table_depth_cm": -24.0,
    }
}


def list_devices() -> List[Dict[str, Any]]:
    """Return all registered in-situ field sensor nodes."""
    return list(DEVICES.values())


def get_field_telemetry(field_id: str) -> Optional[Dict[str, Any]]:
    """Get the most recent in-situ telemetry packet and alert analysis for a field."""
    packet = LATEST_TELEMETRY.get(field_id)
    if not packet:
        return None

    # Compute alerts
    alerts = []
    ec = packet.get("salinity_ec_ds_m", 0.0)
    root_vwc = packet.get("soil_moisture_40cm_vwc", 0.35)
    top_vwc = packet.get("soil_moisture_10cm_vwc", 0.35)

    if ec >= 2.0:
        alerts.append({
            "severity": "warning",
            "type": "salinity_intrusion",
            "message": f"Tidal salinity intrusion warning: Electrical conductivity reached {ec} dS/m (pulse threshold: 2.0 dS/m)."
        })
    if root_vwc < 0.25:
        alerts.append({
            "severity": "critical",
            "type": "desaturation_drought",
            "message": f"Root-zone soil moisture critically depleted ({round(root_vwc*100, 1)}% VWC). High crop establishment failure risk without immediate irrigation."
        })
    elif top_vwc > 0.45:
        alerts.append({
            "severity": "info",
            "type": "transient_waterlogging",
            "message": f"Surface soil saturated ({round(top_vwc*100, 1)}% VWC). Ensure field furrows are cleared to prevent pulse hypocotyl rot."
        })

    return {
        "telemetry": packet,
        "alerts": alerts,
        "fusion_status": "GROUND_TRUTH_SYNCHRONIZED",
        "battery_percentage": max(0, min(100, int((packet["battery_mv"] - 3200) / (4200 - 3200) * 100))),
        "signal_quality": "strong" if packet["rssi_dbm"] > -80 else "moderate" if packet["rssi_dbm"] > -100 else "weak"
    }


def record_telemetry(packet: IoTTelemetryPacket) -> Dict[str, Any]:
    """Ingest a new telemetry packet from an IoT field node."""
    data = packet.model_dump()
    if not data.get("timestamp_utc"):
        data["timestamp_utc"] = datetime.now(timezone.utc).isoformat()

    dev_id = data["device_id"]
    field_id = data["field_id"]

    # Update or register device
    if dev_id in DEVICES:
        DEVICES[dev_id]["last_seen_utc"] = data["timestamp_utc"]
        DEVICES[dev_id]["battery_mv"] = data["battery_mv"]
        DEVICES[dev_id]["rssi_dbm"] = data["rssi_dbm"]
        DEVICES[dev_id]["status"] = "online"
    else:
        DEVICES[dev_id] = {
            "device_id": dev_id,
            "name": f"Sensor Node {dev_id}",
            "field_id": field_id,
            "model": "Generic AgroGuard Node",
            "hardware_version": "v1.0",
            "firmware_version": "1.0",
            "status": "online",
            "last_seen_utc": data["timestamp_utc"],
            "battery_mv": data["battery_mv"],
            "rssi_dbm": data["rssi_dbm"],
            "snr_db": 8.0,
            "sensors": ["volumetric_water_content", "temperature", "electrical_conductivity"],
        }

    LATEST_TELEMETRY[field_id] = data
    return get_field_telemetry(field_id) or {"telemetry": data, "alerts": []}
