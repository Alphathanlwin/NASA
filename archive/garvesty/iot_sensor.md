# Industrial-grade sensors for the Ayeyarwady Delta: shortlist

Date: 14 Nov 2026. Follow-up to [sensors_20km_simulation.md](sensors_20km_simulation.md).

> **Status: Phase 2 plan only.** No hardware will exist before the 15 Nov 2026 deadline. In the pitch, every sensor reading must carry a **DEMO / SIMULATED SENSOR** badge. Never show these numbers as measured.

## Delta conditions and what to look for

| Condition | What the hardware needs |
|---|---|
| Monsoon rain, flooding | IP67 or better on the radio box; **IP68** on anything buried or submerged; mount nodes above the highest flood mark |
| 35 °C+ heat, direct sun | Operating range to at least +60 °C (a black box in sun runs far hotter than air) |
| 80 to 100% humidity | Sealed enclosure, cable glands, no open connectors; silica packs in boxes |
| Salt air near the coast (Labutta) | Plastic (ABS+PC) or stainless housings; seal connectors; rinse and inspect each dry season |
| Lightning | Gateway grounded, lightning arresters on antenna and Ethernet cables |
| Brackish water | Salinity probe must read to seawater (about 50,000 µS/cm), not just fresh water |

## Shortlist (one main pick per category)

Prices are from the vendor pages linked, on 14 Nov 2026, before shipping and import duty. They are not quotes. "Not stated" means the page did not say.

| Category | Pick | IP rating | Operating temp | Salt / corrosion | Power | LoRaWAN AS923? | Price seen |
|---|---|---|---|---|---|---|---|
| Soil moisture + EC + temp | **Milesight EM500-SMTC** | IP67 radio box, IP68 probe | -30 to +70 °C | Epoxy + stainless probe, sold as "corrosion resistance" | 19,000 mAh Li-SOCl2, up to 10 yr (lab figure, 10 min interval) | Yes (AS923-1 to 4) | US$620 ([MCCI](https://store.mcci.com/products/milesight-em500-smtc-soil-conductivity-sensor)); $363 ex GST, AUD implied ([Powertec](https://powertec.com.au/milesight-em500-smtc-lorawan-soil-moisture-temp-ec-sensor-ip67-0-100-rh-40-c-80-c-0-20000-s-cm-2m-cable)) |
| Soil (budget option) | **Dragino SE01-LB** (or SE01-LS solar) | IP66 enclosure | -40 to +85 °C | Not stated | 8,500 mAh Li-SOCl2, up to 5 yr; LS version solar + Li-ion | Yes | about $162, USD implied ([RobotShop](https://www.robotshop.com/products/dragino-se01-lb-lorawan-soil-moisture-ec-sensor-8500mah-li-socl2-us915), US915 version) |
| Weather station (with rain) | **Milesight WTS506** | IP65 sensors, IP67 hub | -40 to +85 °C sensors, -20 to +60 °C hub | Aluminium housing, "resistance to rust, corrosion" | 15 W solar + 18650 backup, at least 1 week without sun | Yes | Not stated (quote only) ([Milesight](https://www.milesight.com/iot/product/lorawan-sensor/wts506)) |
| Weather station (budget) | **SenseCAP S2120 8-in-1** (Seeed) | No IP code given ("suitable for outdoor"); battery box IPX6 | -40 to +60 °C with lithium AA | Vendor warns high salinity and humidity speed up aging; "not maintenance-free" | 0.5 W solar + AA, up to 2 yr | Yes (AS923-1 to 4) | US$299 ([Seeed](https://www.seeedstudio.com/sensecap-s2120-lorawan-8-in-1-weather-sensor-p-5436.html)) |
| Rain gauge (dedicated) | **Dragino WSC2-L kit + tipping-bucket or WSS-08 gauge** | IP66 transmitter | Gauge -40 to +60 °C | Not stated | 12 V input + 1,000 mAh Li-ion (needs a small solar panel) | Yes | Not stated ([WSC2-L](https://www.dragino.com/products/agriculture-weather-station/item/339-wsc2-l.html), [WSS-08](https://www.dragino.com/products/agriculture-weather-station/item/340-wss-08.html)) |
| Water level, pressure (canal, river) | **Milesight EM500-SWL** | IP67 radio box, IP68 probe | -30 to +70 °C box, -20 to +70 °C probe | Probe is **stainless 304** (not 316, so check often in brackish water) | 19,000 mAh Li-SOCl2, about 9 to 10 yr (lab) | Yes | AUD 489 ex GST, 10 m model ([IOT Store AU](https://iot-store.com.au/products/milesight-em500-lorawan-submersible-water-level-sensor)) |
| Water level, ultrasonic (paddy, flood depth) | **Milesight EM500-UDL** | IP67 | -30 to +65 °C (W050/W100) | ABS+PC housing, no contact with water | 19,000 mAh Li-SOCl2, up to 10 yr (lab) | Yes | US$537.50 ([MCCI](https://store.mcci.com/products/milesight-em500-udl-ultrasonic-distance-level-sensor)) |
| Water salinity (EC) | **Dragino WQS-LB node + DR-EC200 probe** | IP68 probe; node IP not stated | Node -40 to +85 °C; probe 0 to 60 °C | DR-EC200 is a 4-electrode probe made "for high EC such as sea water": 1 to 200,000 µS/cm, 0 to 70 PSU | Node 8,500 mAh Li-SOCl2 ("several years"); probe needs 7 to 30 V DC | Yes | Node €58.99 ex VAT ([Kilo Electronics](https://kiloelectronics.com/en/produkt/dragino-dr-eck10-0-ec-sensor-10%c2%b5s/)); EC200 price not found (**estimate**: a few hundred USD) ([Dragino](https://dragino.com/products/water-air-quality-sensor/item/345-wqs-lb.html)) |
| LoRaWAN gateway (outdoor) | **RAKwireless WisGate Edge Pro RAK7289V2 / CV2 (LTE)** | IP67 / NEMA-6 | -30 to +55 °C | Industrial enclosure, cable glands | PoE 802.3af or 12 V DC, or RAK Battery Plus | Yes (AS923-1 to 4), 8 or 16 channels | US$372 to 525 ([RAK store](https://store.rakwireless.com/products/wisgate-edge-pro-rak7289)); antennas not included |
| Gateway solar kit | **RAK Battery Plus RAK9155 + 80 W panel** | IP65 enclosure | Panel -40 to +85 °C; battery discharge about -15 to +60 °C | Not stated | 50 Ah LiFePO4, "more than 5 days without sun" | n/a | US$817 with panel ([RAK store](https://store.rakwireless.com/products/rak-battery-plus-rak9155?variant=42309251563718)) |
| Gateway (alternative) | **Milesight UG67** | IP67 | -40 to +70 °C | Has matching lightning arresters (GL01 Ethernet, GL02 antenna) | PoE or 6 to 12 V DC, optional UPS battery kit | Yes | Not stated (quote only) ([Milesight](https://www.milesight.com/iot/product/lorawan-gateway/ug67)) |

Not recommended: Dragino LPS8v2 gateway is an **indoor** unit (no IP rating, 5 V USB power) ([Dragino](https://www.dragino.com/products/lora-lorawan-gateway/item/228-dlos8n.html)). Dragino DR-ECK1.0 and ECK10.0 water EC probes only read to 2,000 and 20,000 µS/cm, too low for salt intrusion.

### Why these picks

- **Milesight EM500 series** is the most consistent "industrial" line here: IP67 boxes, IP68 probes, 10-year batteries, all AS923. Using one brand for soil and water level keeps setup simple.
- **RAK7289CV2** has LTE built in, which matters because villages may have no wired internet. With the solar kit it runs off-grid.
- Specs on the Milesight WTS506 and UG67 pages, and part of the EM500 pages, came from long pages that were only partly readable; confirm against the PDF datasheet before buying.

## Example Phase 2 kit for one township (estimate)

| Item | Qty | Rough cost (USD, **estimate**) |
|---|---|---|
| RAK7289CV2 gateway + antenna + solar kit | 1 | about 1,400 |
| EM500-SMTC soil probes | 4 | about 1,600 to 2,500 |
| Weather station (S2120 or WTS506) | 1 | about 300 to 1,000 |
| EM500-SWL or EM500-UDL water level | 2 | about 700 to 1,100 |
| WQS-LB + DR-EC200 salinity (coastal sites only) | 1 | about 300 to 600 |
| Mast, grounding, lightning arresters, mounting | 1 set | about 300 to 500 |
| **Total** | | **about US$4,600 to 7,100** before shipping and duty |

This is higher than the US$1,500 to 2,500 in the earlier note because industrial units cost about 3 to 5 times hobby-grade ones. A mixed kit (Dragino SE01 for most soil points, Milesight for water) brings it down.

## Buying in or near Myanmar

- **No authorized Milesight partner is listed in Myanmar.** The nearest is **Riverplus Company Limited (Thailand)**; others in the region are Cytron (Malaysia) and VIoT (Vietnam) ([Milesight partner list](https://www.milesight.com/partner/find-channel-partner)).
- **RAKwireless** sells direct worldwide with shipping worked out at checkout, but its shipping policy does not list Myanmar ([RAK shipping policy](https://www.rakwireless.com/en-us/legal/shipping-policy)). **Seeed's** shipping page did not load, so Myanmar delivery is unconfirmed.
- No local Myanmar shops were found. Plan to import via Thailand or Singapore and allow for customs time and duty.
- Lithium (Li-SOCl2) batteries in most nodes count as dangerous goods for air freight, which can limit couriers. (General shipping rule, not checked per vendor.)

## Radio band and legal caution

- The LoRa Alliance regional parameters (RP002-1.0.3) list Myanmar under **AS923-1 (919 to 924 MHz)**, plus 433 to 435 MHz and 866 to 869 MHz ([LoRa Alliance RP002-1.0.3](https://lora-alliance.org/wp-content/uploads/2021/05/RP002-1.0.3-FINAL-1.pdf); same in [Lansitec's table](https://www.lansitec.com/blogs/lorawan-frequency-plan-by-country-or-region/)). This row was read from a summary of the PDF, so check it in the PDF itself.
- The Things Network shows **no frequency plan** for Myanmar ([TTN](https://www.thethingsnetwork.org/docs/lorawan/frequencies-by-country/)).
- So: order **AS923** versions of every device, and before any real deployment confirm with Myanmar's telecom regulator (Posts and Telecommunications Department) that unlicensed use of 920 to 924 MHz is allowed and whether import needs type approval. Say this openly in the pitch as an open question.

## How to show it in the pitch

- One slide: "Phase 2 field layer (planned)" with the table of picks, the township kit cost, and the badge **DEMO, simulated from NASA data**.
- In the app, sensor cards use a dashed outline and the DEMO badge in Burmese and English.
- One line on why industrial grade: "IP68 probes, 10-year batteries, solar gateway with LTE, so it survives monsoon floods and needs a visit only once a season."

## Sources

- [Milesight EM500-SMTC product page](https://www.milesight.com/iot/product/lorawan-sensor/em500-smtc), [MCCI store](https://store.mcci.com/products/milesight-em500-smtc-soil-conductivity-sensor), [Powertec](https://powertec.com.au/milesight-em500-smtc-lorawan-soil-moisture-temp-ec-sensor-ip67-0-100-rh-40-c-80-c-0-20000-s-cm-2m-cable)
- [Dragino SE01-LB](https://www.dragino.com/products/agriculture-weather-station/item/277-se01-lb.html), [RobotShop SE01-LB](https://www.robotshop.com/products/dragino-se01-lb-lorawan-soil-moisture-ec-sensor-8500mah-li-socl2-us915)
- [Milesight WTS506](https://www.milesight.com/iot/product/lorawan-sensor/wts506)
- [Seeed SenseCAP S2120](https://www.seeedstudio.com/sensecap-s2120-lorawan-8-in-1-weather-sensor-p-5436.html), [The Pi Hut S2120](https://thepihut.com/products/sensecap-s2120-8-in-1-lorawan-weather-sensor)
- [Dragino WSC2-L](https://www.dragino.com/products/agriculture-weather-station/item/339-wsc2-l.html), [Dragino WSS-08](https://www.dragino.com/products/agriculture-weather-station/item/340-wss-08.html)
- [Milesight EM500-SWL](https://www.milesight.com/iot/product/lorawan-sensor/em500-swl), [IOT Store AU EM500-SWL](https://iot-store.com.au/products/milesight-em500-lorawan-submersible-water-level-sensor)
- [Milesight EM500-UDL](https://www.milesight.com/iot/product/lorawan-sensor/em500-udl), [MCCI EM500-UDL](https://store.mcci.com/products/milesight-em500-udl-ultrasonic-distance-level-sensor)
- [Dragino WQS-LB and probes](https://dragino.com/products/water-air-quality-sensor/item/345-wqs-lb.html), [Kilo Electronics DR-ECK10.0 / WQS-LB](https://kiloelectronics.com/en/produkt/dragino-dr-eck10-0-ec-sensor-10%c2%b5s/), [Embedded Works WQS-LB](https://embeddedworks.net/product/sens1183/), [IOT Store AU WQS](https://iot-store.com.au/products/wqs-lorawan-water-quality-sensor)
- [RAK7289V2 datasheet](https://docs.rakwireless.com/product-categories/wisgate/rak7289v2/datasheet/), [RAK store RAK7289](https://store.rakwireless.com/products/wisgate-edge-pro-rak7289), [RAK Battery Plus RAK9155](https://store.rakwireless.com/products/rak-battery-plus-rak9155?variant=42309251563718)
- [Milesight UG67](https://www.milesight.com/iot/product/lorawan-gateway/ug67), [Dragino LPS8v2](https://www.dragino.com/products/lora-lorawan-gateway/item/228-dlos8n.html)
- [Milesight channel partners](https://www.milesight.com/partner/find-channel-partner), [RAK shipping policy](https://www.rakwireless.com/en-us/legal/shipping-policy)
- [LoRa Alliance RP002-1.0.3](https://lora-alliance.org/wp-content/uploads/2021/05/RP002-1.0.3-FINAL-1.pdf), [Lansitec frequency table](https://www.lansitec.com/blogs/lorawan-frequency-plan-by-country-or-region/), [TTN frequencies by country](https://www.thethingsnetwork.org/docs/lorawan/frequencies-by-country/)
