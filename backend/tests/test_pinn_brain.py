import os
import json
from pathlib import Path
import pytest
import torch

from app.engine.pinn_hydrology import (
    DifferentiableFAO56PET,
    PhysicsSoilBucketCell,
    ResidualPINNBlock,
    PINNHydrologyBrain,
    compute_pinn_loss,
)
from app.engine.timeseries_hybrid import get_pinn_model, predict_rootzone_recession


def test_fao56_pet_layer_physics():
    pet_layer = DifferentiableFAO56PET(lat_deg=16.73)
    t_mean = torch.tensor([[28.0, 30.0]])
    t_max = torch.tensor([[33.0, 35.0]])
    t_min = torch.tensor([[23.0, 25.0]])
    doy = torch.tensor([[100.0, 300.0]])

    pet = pet_layer(t_mean, t_max, t_min, doy)
    assert pet.shape == (1, 2)
    # PET in tropical dry season is typically 3 - 8 mm/day
    assert torch.all(pet >= 1.0)
    assert torch.all(pet <= 12.0)


def test_physics_bucket_cell_mass_conservation():
    cell = PhysicsSoilBucketCell(awc_mm=180.0, root_depth_m=0.6, tau_days=35.0)
    s_prev = torch.tensor([[0.80]])
    rain = torch.tensor([[0.0]])
    pet = torch.tensor([[4.5]])

    s_next, drainage = cell(s_prev, rain, pet, kc=0.7)
    # Under 0 rain, moisture must decrease and not violate lower bound
    assert s_next.item() < s_prev.item()
    assert s_next.item() >= cell.wilt_point

    # Heavy rain test: excess must trigger drainage
    rain_heavy = torch.tensor([[150.0]])
    s_flood, drainage_flood = cell(s_prev, rain_heavy, pet, kc=0.7)
    assert drainage_flood.item() > 0.0
    assert s_flood.item() <= 1.0


def test_residual_pinn_quantile_non_crossing():
    block = ResidualPINNBlock(input_dim=8, hidden_dim=16)
    x = torch.randn(10, 8)
    q05, q50, q95 = block(x)

    assert q05.shape == (10, 1)
    assert q50.shape == (10, 1)
    assert q95.shape == (10, 1)

    # Softplus delta formulation guarantees non-crossing: q05 <= q50 <= q95
    assert torch.all(q05 <= q50)
    assert torch.all(q50 <= q95)


def test_pinn_brain_forward_and_loss():
    brain = PINNHydrologyBrain(soil_texture="clay", lat_deg=16.73)
    brain.eval()

    init_w = torch.tensor([[0.75]])
    weather_seq = {
        "t_mean": torch.full((1, 14), 28.0),
        "t_max": torch.full((1, 14), 33.0),
        "t_min": torch.full((1, 14), 23.0),
        "rain_mm": torch.zeros((1, 14)),
        "doy": torch.tensor([[float((300 + i) % 365) for i in range(1, 15)]]),
    }

    out = brain(init_w, weather_seq, days_forward=14)
    assert "physics_trajectory" in out
    assert "q50_trajectory" in out
    assert "q05_trajectory" in out
    assert "q95_trajectory" in out
    assert "pet_sequence" in out

    assert out["q50_trajectory"].shape == (1, 14)
    assert out["pet_sequence"].shape == (1, 14)

    # Monotonicity check under zero rainfall
    phys = out["physics_trajectory"][0]
    for d in range(1, 14):
        assert phys[d] <= phys[d - 1]

    # Verify multi-objective loss function computes cleanly
    targets = torch.full((1, 14), 0.50)
    loss_dict = compute_pinn_loss(out, targets, weather_seq["rain_mm"])
    assert loss_dict["loss_total"].item() > 0.0
    assert "loss_quantile" in loss_dict
    assert "loss_monotonicity" in loss_dict
    assert "loss_physics_anchor" in loss_dict


def test_trained_model_artifacts_and_runtime_integration():
    model_path = Path("data/models/pinn_hydrology.pt")
    calib_path = Path("data/models/pinn_calibration.json")

    assert model_path.exists(), "Trained model weights data/models/pinn_hydrology.pt must exist"
    assert calib_path.exists(), "Calibration metadata data/models/pinn_calibration.json must exist"

    with open(calib_path, "r", encoding="utf-8") as f:
        calib_data = json.load(f)

    assert "mae_pinn" in calib_data
    assert "conformal_q90_residual" in calib_data
    # Unphysical violation rate must be strictly under 1% on unseen test data
    assert calib_data["unphysical_violation_rate"] <= 0.01

    # Test runtime loader
    model, calib = get_pinn_model()
    assert model is not None
    assert calib is not None

    # Test full prediction pipeline
    res = predict_rootzone_recession(
        current_rootzone_wetness=0.68,
        recent_weather={"t2m": 28.0, "t2m_max": 34.0, "t2m_min": 22.0},
        days_forward=28,
        soil_texture="clay",
        confidence_level=0.90,
    )
    assert res["engine"] == "pytorch_pinn"
    assert res["pinn_weights_loaded"] is True
    assert res["conformal_calibrated"] is True
    assert len(res["trajectory"]) == 28
    assert res["terminal_wetness_point"] < res["initial_wetness"]
