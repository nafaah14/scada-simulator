# Wärtsilä I/O list extraction

`data/tags/source/engine-io.csv` is extracted from the project's hardware
I/O sheets. It is the authority for real tag names — nothing in the
generator should invent one once a signal exists here.

## Source documents

| Cabinet | Document | Covers |
|---|---|---|
| CFC | `IOListCFC.pdf` | control-room process station: breaker and indication outputs |
| CFE | `IOListCFE.pdf` | engine-room process station: all engine measurements |
| BJA | `IOListBJA.pdf` | auxiliary module: LT water, LFO feeder, cabinet |
| — | `REND_IOList_ENG.pdf` | ENGINEWISE ADDITIONAL: derived values, serial devices, control/status words |

All are project `Poised_003_Stelco_DGU_10` (KD.14979), Rev −/29.11.16,
engine type W20V32. Marked Confidential — keep them out of the repo.

## Re-running

```
python tools/io/pdf-rows.py IOListCFE.pdf rows_cfe.json
python tools/io/iolist-to-csv.py rows_cfc.json=CFC rows_cfe.json=CFE \
                                 rows_bja.json=BJA data/tags/source/engine-io.csv
```

`pdf-rows.py` walks the PDF content stream tracking the text matrix, so it
recovers real x/y positions; the tables are laid out by absolute
positioning and a plain text dump loses the columns. `iolist-to-csv.py`
slices those rows at the x boundaries the sheets use, then undoes the
column merges the layout produces (`MEASok`, `2.5+5sSDL`,
`M148.0DB300,X53.0`, `TE5011ANiCrNi`).

## Reading the CSV

One row per signal. A physical channel is a row with `channel` and
`plc_address` set; the signals derived from it — sensor fault, alarm,
load reduction, shutdown — follow with `derived_from` pointing back at
the measurement.

```
tag                 SCA0_1PT201PV      0_1 is the genset: 011 = G1 … 061 = G6
description         Lube oil inlet pressure
plc_address         IW294              Siemens I/O word
wois_address        DB102,INT114       where the WOIS reads it
sensor_code         PT201              instrument on the P&ID
sensor_type         4-20 mA
range / unit / scale   0-10 / bar / 10 → the PLC integer is bar × 10
event               MEAS

  SCA0_1PT201SF     sensor fault
  SCA0_1PT201AL     limit 3+5s     → alarm low, 3 bar, 5 s delay
  SCA0_1PT201SDL    limit 2.5+5s   → shutdown low, 2.5 bar, 5 s delay
```

`event` is the WOIS alarm class: MEAS, SF, AH/AL, LRH/LRL (load
reduction — sits between alarm and shutdown), SDH/SDL, SHD, TRP, ALM,
IND, EMG, STB, OUT, CONT.

Every limit carries a delay (`110+5s`). A few are compound —
`130+1s & 5+20s DEV` means absolute 130 °C for 1 s **or** 5 °C deviation
from the bearing average for 20 s.
