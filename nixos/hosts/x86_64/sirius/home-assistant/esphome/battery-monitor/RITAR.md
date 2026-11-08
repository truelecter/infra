# Ritar battery bank: protocol notes

Notes for the battery monitor (`../battery-monitor.yaml`, `ritar_pylon.h`): what the Ritar BMS sends, what the official BMSTool knows about it, what was measured on this installation, and options for feeding better data to the Deye inverter. Anything marked `[INFERENCE]` is a guess that has not been confirmed.

## Installation

- 3 × Ritar GE-W5KWH-51.2V (16S LiFePO4, 100 Ah, 5.12 kWh each) in parallel, 300 Ah in total. ADD DIP switches 1 (master), 2, 3.
- Inverter Deye SUN-6K-SG05LP1-EU-AM2-P. Master RS485 port -> Deye "BMS 485/CAN" port, Ritar protocol `1-DEYE_485`, Deye Lithium Mode 12. Packs chained LINK-OUT -> LINK-IN.
- The monitor listens on the master's free LINK-IN.

## Ports and pinouts (RJ45)

| Port                                            | Pins                                                                                       |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Ritar RS485 (to inverter)                       | 1 = B, 2 = A, 3-8 not connected                                                            |
| Ritar CAN                                       | 7 = CAN_H, 8 = CAN_L, 1-6 not connected                                                    |
| Ritar LINK-IN / LINK-OUT (RS485-2, battery bus) | 7 = A, 8 = B, 1-6 not connected                                                            |
| Deye BMS 485/CAN                                | 1 = 485_B, 2 = 485_A, 3 = GND_485, 4 = CAN-H, 5 = CAN-L, 6 = GND_485, 7 = 485_A, 8 = 485_B |

A straight patch cord works for RS485 (Deye pins 1/2 to Ritar pins 1/2). It is wrong for CAN: CAN needs a two-wire cable, Deye pin 4 to Ritar CAN pin 7 and Deye pin 5 to Ritar CAN pin 8, nothing else connected.

## LINK bus traffic (what `ritar_pylon.h` decodes)

- 9600 8N1. The master polls the other packs with Pylontech-style ASCII frames: `~ VER ADR CID1 CID2 LENGTH INFO CHKSUM \r`, all hex characters, VER `20`, CID1 `46`.
- Requests: CID2 `42` (analog) and `44` (alarm), sweeping ADR `02` to `0F` about once a second. ADR 04 to 0F time out, so each pack is refreshed about every 28 s. Replies (CID2 `00`) come from ADR 01 to 03; the master's own replies appear on the bus too.
- LENGTH: low 12 bits = number of INFO hex characters, top nibble = `(~(n0 + n1 + n2) + 1) & 0xF` over the three low nibbles.
- CHKSUM: two's complement (16 bit) of the sum of all ASCII characters between `~` and CHKSUM. Checked against 50,915 captured frames: 50,913 valid.
- The inverter's own polling of the master does not appear on LINK-IN `[INFERENCE]`.

### Analog reply (to `42`), 138 characters between `~` and `\r`

INFO bytes: DATAFLAG, pack address, cell count (16), 16 × cell voltage (mV), temperature count (6), 6 × temperature (0.1 K, °C = (raw − 2731) / 10), current (signed, 10 mA, + = charge), voltage (10 mV), remaining capacity (10 mAh), user-defined count (`02`), full capacity (10 mAh), cycle count, design capacity (10 mAh).

- Temperatures: 1-4 cell sensors, 5 environment, 6 MOSFET according to BMSTool's decoder. In measured data sensor 5 was the warmest `[INFERENCE: the order in ritar-pack.yaml comments may be swapped]`.
- No SOC or SOH in this frame. SOC = remaining / full.
- Current below 1.0 A per pack is reported as 0, and the remaining-Ah counter stops while it does. In 15 hours of logs the smallest non-zero current of every pack was 1.0 A.

### Alarm reply (to `44`), 104 characters (not decoded yet)

| INFO byte (from DATAFLAG = 0) | Field                                                                   | Same as Modbus  |
| ----------------------------- | ----------------------------------------------------------------------- | --------------- |
| 0                             | DATAFLAG                                                                |                 |
| 1                             | pack address `[INFERENCE]`                                              |                 |
| 2                             | cell count (16)                                                         |                 |
| 3-18                          | per-cell status byte `[INFERENCE: Pylon codes 0 normal, 1 low, 2 high]` |                 |
| 19                            | temperature count (6)                                                   |                 |
| 20-25                         | per-temperature status byte                                             |                 |
| 26-28                         | not decoded `[INFERENCE: Pylon current/voltage status]`                 |                 |
| 29-32                         | protection, u32 big-endian                                              | registers 11-12 |
| 33                            | not decoded                                                             |                 |
| 34-37                         | status/fault, u32 big-endian                                            | registers 13-14 |
| 38-39                         | per-cell balancing bitmap                                               | register 15     |
| 40-43                         | warning, u32 big-endian                                                 | registers 9-10  |

Bit meanings are in the Modbus section below. BMSTool truncates the warning word to 16 bits in this mode; keep all 32.

## Modbus RTU (what BMSTool uses)

BMSTool (Windows, "16SBMSTool General Edition", version 2.80) talks Modbus RTU only, through an RS485-USB adapter on LINK-IN, 9600 8N1. Function 03 reads, function 0x10 writes (never 0x06). Standard Modbus CRC16, low byte first. Registers are 16-bit big-endian; 32-bit values use two registers, high word first. Slave ID = ADD DIP value. All three packs answered function 03 for IDs 1-3 on this bus.

BMSTool's live view reads 7 blocks per pack, about every 3-4 s: `0,16`, `33,1`, `40,16`, `120,4`, `155,2`, `145,10`, `239,6`. It never reads more than 16 registers at once.

### Read map

| Register                    | Content                                                                                        |
| --------------------------- | ---------------------------------------------------------------------------------------------- |
| 0                           | current, signed, 0.01 A                                                                        |
| 1                           | pack voltage, 0.01 V                                                                           |
| 2                           | SOC, 0.1 %                                                                                     |
| 3                           | SOH, 0.1 %                                                                                     |
| 4 / 5 / 6                   | remaining / full / design capacity, 0.01 Ah                                                    |
| 7                           | cycle count                                                                                    |
| 8                           | solar current, signed, 0.01 A (unused here `[INFERENCE]`)                                      |
| 9-10                        | warning flags, u32                                                                             |
| 11-12                       | protection flags, u32                                                                          |
| 13-14                       | status/fault flags, u32                                                                        |
| 15                          | balancing bitmap, bit n = cell n + 1                                                           |
| 20-30                       | MAC/IP settings (Ethernet models only)                                                         |
| 31                          | "CHG Volt", 0.01 V, decoded by the tool but never read `[INFERENCE: requested charge voltage]` |
| 32                          | inverter protocol (table below)                                                                |
| 33                          | total current, signed, 0.1 A                                                                   |
| 40-55                       | cell voltages, mV                                                                              |
| 120-123                     | cell temperatures, (raw − 500) / 10 °C                                                         |
| 145 / 146                   | MOSFET / environment temperature                                                               |
| 147-154                     | max cell mV + index, min cell mV + index, max temperature + index, min temperature + index     |
| 155 / 156                   | + / − terminal temperature                                                                     |
| 239-244                     | clock, year (2000 +) to second, BCD `[INFERENCE]`                                              |
| 246 / 247                   | log record count / next 40-byte log record (each read advances `[INFERENCE]`)                  |
| 290-299 / 300-309 / 310-319 | firmware version / model SN / pack SN, ASCII                                                   |

Not available anywhere in BMSTool: charge/discharge current limits and "charge allowed" flags. The master generates those itself for the inverter protocol.

### Warning bits (registers 9-10)

0 cell OV, 1 cell UV, 2 pack OV, 3 pack UV, 4 charge OC, 5 discharge OC, 6 charge OT, 7 charge UT, 8 discharge OT, 9 discharge UT, 10 environment OT, 11 environment UT, 12 MOSFET OT, 13 low SOC, 14 cell voltage difference, 15 + terminal OT, 16 − terminal OT.

### Protection bits (registers 11-12)

0 cell OV, 1 cell UV, 2 pack OV, 3 pack UV, 4 full-charge protection, 5 charge OC1, 6 charge OC2, 7 discharge OC1, 8 discharge OC2, 9 charge OT, 10 charge UT, 11 discharge OT, 12 discharge UT, 13 environment OT, 14 environment UT, 15 MOSFET OT, 16 short circuit, 17 reverse connection, 18 cell voltage difference, 19 cell OV secondary, 20 reverse current `[INFERENCE]`, 21 charge short circuit, 22 + terminal OT, 23 − terminal OT.

### Status/fault bits (registers 13-14)

0 cell NTC disconnected, 1 terminal NTC disconnected, 2 MOSFET NTC disconnected, 3 AFE communication fault, 4 MOSFET fault, 5 current-limit board fault, 16 charging, 17 discharging (both 0 = standby), 18 charge MOSFET on, 19 discharge MOSFET on, 20 current-limit MOSFET on, 21 heater on, 22 / 23 dry contact 1 / 2 closed, 24 pre-charge MOSFET on, 25 fuse `[INFERENCE]`, 26 fan `[INFERENCE]`.

### Settings (function 0x10, whole blocks as BMSTool writes them)

Voltages in mV (cell) or 0.01 V (pack), currents 0.01 A, temperatures °C + 50, delays ms unless noted.

| Registers         | Content                                                                                           |
| ----------------- | ------------------------------------------------------------------------------------------------- |
| 160-163           | pack OV alarm, protect, release, delay                                                            |
| 164-167           | cell OV alarm, protect, release, delay                                                            |
| 168-171 / 172-175 | pack / cell UV alarm, protect, release, delay                                                     |
| 176-178           | charge OC alarm, protect, delay                                                                   |
| 179-183           | discharge OC alarm, OC1 protect, OC1 delay, OC2 protect, OC2 delay                                |
| 184-204           | charge OT/UT, discharge OT/UT, MOSFET OT, environment OT/UT: alarm, protect, release each         |
| 205-208           | balance start cell mV, balance start delta mV, pack full-charge voltage, pack full-charge current |
| 209-212           | cell sleep voltage, sleep delay (s), short-circuit delay (µs), low-SOC alarm %                    |
| 283-286           | terminal OT alarm, protect, release, delay                                                        |
| 6-7               | design capacity **and cycle count** (written together)                                            |
| 215-222           | SOC, SOH and capacity overrides                                                                   |
| 223-230           | current and voltage calibration                                                                   |
| 231-238, 287      | MOSFET and dry-contact overrides (1 = on, 2 = off; 238 = 2 returns to automatic)                  |
| 245               | write 1 = factory reset                                                                           |
| 280               | write 1 = sleep (pack shuts down)                                                                 |
| 32                | inverter protocol                                                                                 |

BMSTool's password is the string `1`, checked only inside the tool. The bus itself has no authentication.

### Inverter protocol (register 32)

One register shared by the RS485 and CAN ports: 0 RITARV1_8, 1 PLY (Deye, current setting), 2 Growatt, 3 LIB05 (Voltronic), 4 UPower, 5 Vertiv, 6 Eltek, 7 RITAR_MODBUSV1_9, 14 Inhenergy, 17 Luxpowertek, 18 Phocos (RS485); 8 Victron, 9 RITARV1_0, 10 SMA, 11 Megarevo, 12 TBB, 13 Solis, 15 MUST, 16 PYON_CAN (CAN). The pack's LCD lists the same numbers; this firmware's LCD shows 1, 2, 3, 8, 10, 13 and 15.

### Risks of active access

- Never use ID 0 (BMSTool's default). With several packs on the bus it is ambiguous or a broadcast `[INFERENCE]`.
- Writing register 32 on the master cuts the inverter link. Factory reset (245), sleep (280), MOSFET overrides, calibration and register 6 (which also resets the cycle count) can disable a pack or skew its protections. BMSTool sends a factory reset by itself after a firmware upload.
- The master polls the LINK bus continuously. Any transmission from the ESP can collide with a master poll or a slave reply. If active reads are ever needed: function 03 only, IDs 1-3, at most 16 registers per request, sent after a frame-ending `\r` plus 20-50 ms of silence `[INFERENCE: tune from a log]`, about one request every 1-2 s. Passive decoding of `44` replies already gives the warning, protection, status and balancing words.

## Measured behaviour (November 2026)

- **Inverter battery reading is biased.** BMS totals vs Deye's `battery_current` at the same moments: discharging, 5.67 A vs 4.87 A; charging at about 4 kW, 73.85 A vs 75.22 A; full and idle on grid, 0.00 A vs −1.1 to −1.3 A (−55 to −70 W). Deye reads about 1 A too far towards charging in every mode. The losses sensor (`hass/configs/packages/inverter_losses.yaml`) adds a 55 W offset for this.
- **Real inverter losses:** about 40-55 W idle on grid (grid − load with the battery full), about 40-50 W on battery at low load, about 7-8 % while charging at 4 kW.
- **Current sharing:** 43 / 33 / 23 % for packs 1 / 2 / 3, the same while charging and discharging, so it comes from cable and terminal resistance, not temperature. All pack cables were daisy-chained from pack 1. Pack 3 (new, cooler) often reads 0 A at low load because of the 1 A threshold.
- **After a full charge:** packs 1 and 3 open their charge MOSFET and rest at 54.0-54.8 V internally; pack 2 follows the bus held at about 56.6 V (3.54 V per cell) until the grid drops. A pack with the charge MOSFET open can discharge only through the MOSFET's diode (about 0.5 V drop), so pack 3 contributed nothing for about 3 hours after the grid failed, until its highest cell fell below about 3.39 V `[INFERENCE: release threshold]`.
- **Cell balance:** 1-3 mV spread mid-SOC; 33-80 mV right after a full charge, shrinking slowly.
- **Deye BMS link dropouts:** Deye's battery temperature reads −100 °C, which is Deye's "no BMS data" value, 54-79 times a day on RS485. During each dropout Deye's SOC jumps to its own estimate (for example 77 -> 92) and back when data returns: 116 of 123 upward SOC jumps coincided with −100 °C. Deye's Li-BMS page shows one aggregated battery in row 2 (charge request 56.4 V / 180 A).
- **Charge voltage:** the BMS asks for 56.4 V; Deye's battery voltage reads about 0.25 V low, so the packs see about 56.6 V. With "Disable Float Charge" ticked, Deye keeps the charging voltage when the BMS requests 0 A.

## Deye over CAN (alternative to RS485, untested here)

Neither Ritar nor Deye documents CAN for this pair; Ritar's guides only cover RS485 with Lithium Mode 12. One field report (github.com/mamontuka/ritar-bms-ha, two packs on a Deye 6K-SG03LP1) runs Ritar protocol `SMA` with Deye Lithium Mode `00` over the two-wire cable above, with float charge disabled. That setup also separates the inverter from the LINK bus, and the author polls the LINK bus no faster than every 15 s because faster polling dropped the inverter's CAN link.

## YamBMS (github.com/Sleeper85/esphome-yambms), not adopted

YamBMS merges BMS and shunt data on an ESP and talks to the inverter itself over CAN (Pylon 1.2, confirmed with Deye SUN-6K-SG03LP1 in Lithium Mode 00). It would give Deye the SmartShunt's current (10 mA resolution) and SOC, and its own charge-voltage logic based on cell voltages. It would not fix Deye's own biased battery reading `[INFERENCE]`.

Ritar is not a supported BMS. A YamBMS BMS package per pack needs: total voltage, current, power, SOC, SOH, capacity, remaining capacity, cycles, min/max cell voltage with index, min/max temperature with sensor index, charging and discharging allowed, max charge/discharge current, cell OVP/UVP, balance trigger voltage, error bitmask and online status. The analog replies cover the measurements; SOH, current limits and OVP/UVP would be constants from the pack specification (100 A per pack, 3.65 V cell protection); charging/discharging allowed and errors need the `44` alarm replies decoded. Costs: the ESP becomes Deye's only BMS link (the master's inverter cable is unplugged), pack data refreshes only every ~28 s, it needs a 3.3 V CAN transceiver (SN65HVD230), and it is unknown whether the master keeps polling the LINK bus once the inverter no longer talks to it.
