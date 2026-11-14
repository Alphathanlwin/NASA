// AI-assisted: Claude Code
// Generated from backend/app/engine/crops.json by scripts/sync_crops.py. Do not edit.
import type { CropTable } from './types'

export const TABLE = {
  "engine_version": "1.0.0",
  "sources": {
    "ecocrop": "FAO EcoCrop database (mirror: github.com/OpenCLIM/ecocrop, EcoCrop_DB.csv), extracted 14 Nov 2026",
    "team_notes": "Team research notes citing the Myanmar Pulses Sector Development Strategy (2017) and ACIAR/IRRI guides; not re-checked against the originals",
    "challenge": "NASA Space Apps 2026 challenge brief 'Field Shift: Adapting Farms with NASA Data'",
    "design": "Design choice by the team; needs expert review",
    "doa_seed_protocol": "Myanmar Department of Agriculture (MOALI), Seed Division, Myanmar Seed Information Portal: 'Format for Seed Registration Protocol', rate of fertilizer for monsoon variety trials. http://myanmarseedportal.gov.mm/en/protocol/black-gram and /green-gram, read 14 Nov 2026"
  },
  "plans": [
    {
      "id": "rice_rice",
      "monsoon": "rice",
      "dry": "rice",
      "baseline": true
    },
    {
      "id": "rice_mung_bean",
      "monsoon": "rice",
      "dry": "mung_bean",
      "baseline": false
    },
    {
      "id": "rice_black_gram",
      "monsoon": "rice",
      "dry": "black_gram",
      "baseline": false
    }
  ],
  "crops": {
    "rice": {
      "name": "Rice",
      "scientific_name": "Oryza sativa",
      "family": {
        "value": "grass (Gramineae)",
        "source": "ecocrop",
        "verified": true
      },
      "legume": {
        "value": false,
        "source": "ecocrop",
        "verified": true
      },
      "cycle_days": {
        "value": [
          80,
          180
        ],
        "source": "ecocrop",
        "verified": true
      },
      "water_category": {
        "value": "very_high",
        "source": "team_notes",
        "verified": false
      },
      "needs_irrigation_in_dry_season": {
        "value": true,
        "source": "team_notes",
        "verified": false
      },
      "drainage": {
        "value": "tolerates_saturated",
        "label": "poorly drained (saturated more than 50% of the year)",
        "source": "ecocrop",
        "verified": true
      },
      "ph_opt": {
        "value": [
          5.5,
          7.0
        ],
        "source": "ecocrop",
        "verified": true
      },
      "ph_abs": {
        "value": [
          4.5,
          9.0
        ],
        "source": "ecocrop",
        "verified": true
      },
      "texture_opt": {
        "value": [
          "wide"
        ],
        "source": "ecocrop",
        "verified": true
      },
      "texture_abs": {
        "value": [
          "wide"
        ],
        "source": "ecocrop",
        "verified": true
      },
      "temp_abs_max_c": {
        "value": 36,
        "source": "ecocrop",
        "verified": true
      },
      "local_risks": {
        "value": [
          "Needs a reliable water source until harvest.",
          "Late harvest can run into pre-monsoon storms."
        ],
        "source": "design",
        "verified": false
      },
      "sow_window": {
        "value": [
          320,
          350
        ],
        "label": "15 Nov - 16 Dec",
        "source": "team_notes",
        "verified": false
      },
      "waterlogging_tolerance": {
        "value": "high",
        "source": "ecocrop",
        "verified": true
      },
      "soil_notes": {
        "value": "Grows on a wide range of textures; puddled and flooded during the monsoon.",
        "source": "ecocrop",
        "verified": true
      },
      "fertiliser": {
        "value": null,
        "source": "team_notes",
        "verified": false,
        "note": "DAR rice rates are quoted in ACIAR guides, but the originals could not be opened to check them."
      }
    },
    "mung_bean": {
      "name": "Mung bean (green gram)",
      "scientific_name": "Vigna radiata",
      "family": {
        "value": "legume (Leguminosae)",
        "source": "ecocrop",
        "verified": true
      },
      "legume": {
        "value": true,
        "source": "ecocrop",
        "verified": true
      },
      "cycle_days": {
        "value": [
          50,
          120
        ],
        "source": "ecocrop",
        "verified": true
      },
      "water_category": {
        "value": "low",
        "source": "team_notes",
        "verified": false
      },
      "needs_irrigation_in_dry_season": {
        "value": false,
        "source": "team_notes",
        "verified": false
      },
      "drainage": {
        "value": "needs_well_drained",
        "label": "well drained (dry spells)",
        "source": "ecocrop",
        "verified": true
      },
      "ph_opt": {
        "value": [
          5.5,
          6.2
        ],
        "source": "ecocrop",
        "verified": true
      },
      "ph_abs": {
        "value": [
          4.3,
          8.3
        ],
        "source": "ecocrop",
        "verified": true
      },
      "texture_opt": {
        "value": [
          "medium",
          "organic"
        ],
        "source": "ecocrop",
        "verified": true
      },
      "texture_abs": {
        "value": [
          "heavy",
          "medium",
          "light"
        ],
        "source": "ecocrop",
        "verified": true
      },
      "temp_abs_max_c": {
        "value": 40,
        "source": "ecocrop",
        "verified": true
      },
      "local_risks": {
        "value": [
          "Does not tolerate standing water.",
          "Sow soon after the rice harvest while the soil is still moist."
        ],
        "source": "design",
        "verified": false
      },
      "sow_window": {
        "value": [
          315,
          345
        ],
        "label": "11 Nov - 11 Dec",
        "source": "team_notes",
        "verified": false
      },
      "waterlogging_tolerance": {
        "value": "low",
        "source": "ecocrop",
        "verified": true
      },
      "soil_notes": {
        "value": "Needs well-drained soil; does not tolerate standing water.",
        "source": "ecocrop",
        "verified": true
      },
      "fertiliser": {
        "value": {
          "products": [
            {
              "product": "urea",
              "amount": 28,
              "unit": "lb/acre"
            },
            {
              "product": "tsp",
              "amount": 84,
              "unit": "lb/acre"
            },
            {
              "product": "potash",
              "amount": 65,
              "unit": "lb/acre"
            },
            {
              "product": "gypsum",
              "amount": 112,
              "unit": "lb/acre"
            }
          ],
          "context": "monsoon variety trials"
        },
        "source": "doa_seed_protocol",
        "verified": true,
        "url": "http://myanmarseedportal.gov.mm/en/protocol/green-gram"
      }
    },
    "black_gram": {
      "name": "Black gram (matpe)",
      "scientific_name": "Vigna mungo",
      "family": {
        "value": "legume (Leguminosae)",
        "source": "ecocrop",
        "verified": true
      },
      "legume": {
        "value": true,
        "source": "ecocrop",
        "verified": true
      },
      "cycle_days": {
        "value": [
          60,
          130
        ],
        "source": "ecocrop",
        "verified": true
      },
      "water_category": {
        "value": "low",
        "source": "team_notes",
        "verified": false
      },
      "needs_irrigation_in_dry_season": {
        "value": false,
        "source": "team_notes",
        "verified": false
      },
      "drainage": {
        "value": "needs_well_drained",
        "label": "well drained (dry spells)",
        "source": "ecocrop",
        "verified": true
      },
      "ph_opt": {
        "value": [
          5.5,
          6.5
        ],
        "source": "ecocrop",
        "verified": true
      },
      "ph_abs": {
        "value": [
          4.5,
          7.5
        ],
        "source": "ecocrop",
        "verified": true
      },
      "texture_opt": {
        "value": [
          "heavy",
          "medium"
        ],
        "source": "ecocrop",
        "verified": true
      },
      "texture_abs": {
        "value": [
          "heavy",
          "medium"
        ],
        "source": "ecocrop",
        "verified": true
      },
      "temp_abs_max_c": {
        "value": 40,
        "source": "ecocrop",
        "verified": true
      },
      "local_risks": {
        "value": [
          "Does not tolerate standing water.",
          "Sow soon after the rice harvest while the soil is still moist."
        ],
        "source": "design",
        "verified": false
      },
      "sow_window": {
        "value": [
          315,
          345
        ],
        "label": "11 Nov - 11 Dec",
        "source": "team_notes",
        "verified": false
      },
      "waterlogging_tolerance": {
        "value": "low",
        "source": "ecocrop",
        "verified": true
      },
      "soil_notes": {
        "value": "Needs well-drained soil; does not tolerate standing water.",
        "source": "ecocrop",
        "verified": true
      },
      "fertiliser": {
        "value": {
          "products": [
            {
              "product": "urea",
              "amount": 28,
              "unit": "lb/acre"
            },
            {
              "product": "tsp",
              "amount": 84,
              "unit": "lb/acre"
            },
            {
              "product": "potash",
              "amount": 56,
              "unit": "lb/acre"
            },
            {
              "product": "gypsum",
              "amount": 112,
              "unit": "lb/acre"
            }
          ],
          "context": "monsoon variety trials"
        },
        "source": "doa_seed_protocol",
        "verified": true,
        "url": "http://myanmarseedportal.gov.mm/en/protocol/black-gram"
      }
    }
  },
  "assumptions": {
    "rule_weights": {
      "value": "Point sizes of every rule",
      "source": "design",
      "verified": false
    },
    "legume_soil_benefit": {
      "value": "A legume in the rotation is treated as a soil-health benefit; no nitrogen amount is claimed",
      "source": "challenge",
      "verified": false
    },
    "pest_break": {
      "value": "Changing crop family between seasons is treated as a break in pest and disease cycles",
      "source": "challenge",
      "verified": false
    },
    "moisture_threshold": {
      "value": 0.5,
      "label": "Root-zone wetness below 0.5 counts as low residual moisture",
      "source": "design",
      "verified": false
    },
    "onset_rule": {
      "value": 5.0,
      "label": "Pre-monsoon rain starts on the first day after 1 March whose 7-day average rain is 5 mm/day or more",
      "source": "design",
      "verified": false
    },
    "cycle_midpoint": {
      "value": "Harvest date uses the midpoint of the EcoCrop cycle range",
      "source": "design",
      "verified": false
    },
    "texture_classes": {
      "value": "heavy: clay 35% or more; light: clay under 18% and sand over 65%; otherwise medium",
      "source": "design",
      "verified": false
    },
    "premonsoon_window": {
      "value": "1 March to the mean onset of pre-monsoon rain (first day after 1 March whose 7-day mean rain reaches 5 mm/day), counted on the year after sowing",
      "source": "design",
      "verified": false
    }
  },
  "weights": {
    "family_same": -20,
    "family_break": 15,
    "legume": 10,
    "ph_opt": 8,
    "ph_abs": -6,
    "ph_out": -18,
    "texture_opt": 6,
    "texture_abs": -4,
    "texture_out": -12,
    "water_very_high": -30,
    "water_low": 30,
    "irrigated_crop_sometimes": -15,
    "irrigated_crop_unavailable": -40,
    "rainfed_crop_irrigation_available": 5,
    "moisture_normal": 10,
    "moisture_low_irrigation_available": -5,
    "moisture_low_irrigation_sometimes": -12,
    "moisture_low_irrigation_unavailable": -25,
    "moisture_low_irrigated_crop": -5,
    "harvest_after_onset": -15,
    "harvest_near_onset": -6,
    "harvest_clear": 5,
    "near_onset_days": 14,
    "heat_many": -6,
    "heat_some": -3,
    "heat_many_days": 20,
    "heat_some_days": 5,
    "drainage_good": 5,
    "drainage_poor": -20,
    "soil_base": 50,
    "water_base": 50,
    "category_worth": 65,
    "category_caution": 45,
    "premonsoon_per_hot_day": 0.25,
    "premonsoon_cap": 15,
    "premonsoon_clear": 2
  },
  "templates": {
    "family_same": "{crop} after rice: same crop family ({family}), so pests and diseases get no break.",
    "family_break": "{crop} after rice: a different crop family ({family}), which breaks pest and disease cycles.",
    "legume": "{crop} is a legume. Legumes in a rotation are commonly used to support soil health (no nitrogen amount is claimed).",
    "ph_opt": "Topsoil pH {ph} is inside the optimum range for {crop} ({lo}-{hi}).",
    "ph_abs": "Topsoil pH {ph} is outside the optimum range for {crop} ({lo}-{hi}) but inside its tolerated range ({alo}-{ahi}).",
    "ph_out": "Topsoil pH {ph} is outside the tolerated range for {crop} ({alo}-{ahi}).",
    "texture_opt": "Soil texture is {texture} (clay {clay}%), which suits {crop} (optimum: {list}).",
    "texture_abs": "Soil texture is {texture} (clay {clay}%): tolerated by {crop} but not its optimum ({list}).",
    "texture_out": "Soil texture is {texture} (clay {clay}%), outside what {crop} tolerates ({list}).",
    "water_very_high": "{crop} has a very high water need in the season when water is scarce.",
    "water_low": "{crop} has a low water need in the dry season.",
    "irrigated_crop_available": "{crop} needs irrigation in the dry season; irrigation is set to available.",
    "irrigated_crop_sometimes": "{crop} needs irrigation in the dry season, but irrigation is only sometimes available.",
    "irrigated_crop_unavailable": "{crop} needs irrigation in the dry season and none is available.",
    "rainfed_crop_irrigation_available": "Irrigation is available as a backup for {crop} in a dry spell.",
    "moisture_normal": "Residual soil moisture is normal, which {crop} relies on to establish after the rice harvest.",
    "moisture_low_irrigation_available": "Residual soil moisture is low; {crop} would need irrigation to establish.",
    "moisture_low_irrigation_sometimes": "Residual soil moisture is low and irrigation is only sometimes available: {crop} may establish poorly.",
    "moisture_low_irrigation_unavailable": "Residual soil moisture is low and there is no irrigation: {crop} may fail to establish.",
    "moisture_low_irrigated_crop": "Residual soil moisture is low, so {crop} needs more irrigation water from the start.",
    "rain_change": "Dry-season rainfall changed by {pct}% ({from} mm to {to} mm on average). Dry-season rainfall is near zero, so this mainly affects monsoon crops.",
    "harvest_after_onset": "Sown {sow}, {crop} is harvested around {harvest}, after the average start of pre-monsoon rain ({onset}): risk of a wet harvest.",
    "harvest_near_onset": "Sown {sow}, {crop} is harvested around {harvest}, within {days} days of the average start of pre-monsoon rain ({onset}).",
    "harvest_clear": "Sown {sow}, {crop} is harvested around {harvest}, {days} days before the average start of pre-monsoon rain ({onset}).",
    "heat_many": "{n} days of the growing period have an average daily maximum above {limit} C, the tolerated maximum for {crop}: heat-stress risk.",
    "heat_some": "{n} days of the growing period have an average daily maximum above {limit} C, the tolerated maximum for {crop}.",
    "heat_none": "No day of the growing period has an average daily maximum above {limit} C, the tolerated maximum for {crop}.",
    "drainage_good": "Drainage is set to good; {crop} needs well-drained soil.",
    "drainage_poor": "Drainage is set to poor; {crop} needs well-drained soil and does not tolerate standing water.",
    "drainage_rice": "{crop} tolerates saturated soil, so drainage does not limit it.",
    "unknown_ph": "Soil pH is not available for this field, so soil pH fit was not scored.",
    "unknown_texture": "Soil texture is not available for this field, so texture fit was not scored.",
    "unknown_moisture": "Residual soil moisture is not available, so establishment on residual moisture was not scored.",
    "unknown_rain": "Dry-season rainfall average is not available, so the rainfall change was not applied.",
    "unknown_climatology": "Day-of-year climatology is not available, so harvest timing and heat were not checked.",
    "unknown_drainage": "Field drainage is unknown. {crop} needs well-drained soil, so this was not scored.",
    "unknown_income": "Not calculated — enter your price and cost.",
    "unknown_salinity": "Soil salinity is not in these datasets.",
    "local_sowing": "Sowing dates are assumptions for the Delta; confirm them for your township.",
    "local_rain": "Rainfall here is modelled for a grid cell about 55 km wide; check the usual start of pre-monsoon rain locally.",
    "local_general": "Check for salt intrusion, seed availability and the local market before deciding.",
    "local_drainage": "Check how quickly this field drains after the monsoon.",
    "income_relative": "Income is ranked from your own numbers: {net} per acre for {crop} (sales minus cost).",
    "premonsoon_clear": "Sown {sow} and harvested around {harvest}, {crop} finishes before the pre-monsoon heat window that starts on 1 March (mean onset of pre-monsoon rain: {onset}).",
    "premonsoon_hot": "Sown {sow} and harvested around {harvest}, {crop} overlaps {n} days of the pre-monsoon heat window (1 March to the mean onset {onset}); {hot} of those days average above {limit} C. A later sowing pushes more of the growing period into this window.",
    "unknown_smap": "No recommended-quality satellite soil moisture (SMAP) for this 9 km cell; soil wetness comes from the NASA POWER model.",
    "unknown_imerg": "No satellite rainfall (GPM IMERG) for this cell; rain comes from the NASA POWER model."
  },
  "categories": {
    "worth_investigating": "Worth investigating",
    "possible_with_caution": "Possible with caution",
    "weak_fit": "Weak fit",
    "not_workable": "Not workable under these assumptions"
  },
  "scenarios": [
    {
      "id": "irrigation_available",
      "group": "irrigation",
      "label": "Irrigation: available",
      "assumptions": {
        "irrigation": "available"
      }
    },
    {
      "id": "irrigation_sometimes",
      "group": "irrigation",
      "label": "Irrigation: sometimes",
      "assumptions": {
        "irrigation": "sometimes"
      }
    },
    {
      "id": "irrigation_unavailable",
      "group": "irrigation",
      "label": "Irrigation: unavailable",
      "assumptions": {
        "irrigation": "unavailable"
      }
    },
    {
      "id": "delay_0",
      "group": "delay",
      "label": "Planting delay: 0 days",
      "assumptions": {
        "planting_delay_days": 0
      }
    },
    {
      "id": "delay_7",
      "group": "delay",
      "label": "Planting delay: 7 days",
      "assumptions": {
        "planting_delay_days": 7
      }
    },
    {
      "id": "delay_14",
      "group": "delay",
      "label": "Planting delay: 14 days",
      "assumptions": {
        "planting_delay_days": 14
      }
    },
    {
      "id": "moisture_normal",
      "group": "moisture",
      "label": "Residual soil moisture: normal",
      "assumptions": {
        "residual_moisture": "normal"
      }
    },
    {
      "id": "moisture_low",
      "group": "moisture",
      "label": "Residual soil moisture: low",
      "assumptions": {
        "residual_moisture": "low"
      }
    },
    {
      "id": "drainage_good",
      "group": "drainage",
      "label": "Drainage: good",
      "assumptions": {
        "drainage": "good"
      }
    },
    {
      "id": "drainage_unknown",
      "group": "drainage",
      "label": "Drainage: unknown",
      "assumptions": {
        "drainage": "unknown"
      }
    },
    {
      "id": "drainage_poor",
      "group": "drainage",
      "label": "Drainage: poor",
      "assumptions": {
        "drainage": "poor"
      }
    },
    {
      "id": "rainfall_minus_20",
      "group": "rainfall",
      "label": "Rainfall: -20%",
      "assumptions": {
        "rainfall_change_percent": -20
      }
    }
  ]
} as CropTable
