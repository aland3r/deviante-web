# ADWIN Drift Detection on XES Logs

This project contains two scripts that detect concept drift on sojourn times extracted from XES event logs. One runs in a streaming fashion with a live plot, and the other processes entire logs to generate static graphs.

## What it does
- Reads XES logs from `dataset_manufacturing/`.
- Filters events by a specific activity (default: `Machine_Operating`).
- Computes sojourn times for that activity.
- Detects drifts with ADWIN.
- Produces either live streaming plots or saved static graphs, depending on the script.

## Scripts
- `AdwinStreaming.py`: streams sojourn times and shows a live plot, marking drifts during the stream.
- `AdwinXES.py`: processes each XES file offline and saves a PNG graph with detected drifts.

## Requirements
- Python 3.8+
- Dependencies are listed in `requirements.txt`.

## How to run
1. Install dependencies:

```bash
pip install -r requirements.txt
```

2. Run the streaming version:

```bash
python AdwinStreaming.py
```

3. Run the offline graph version:

```bash
python AdwinXES.py
```

## Configuration
Edit the top of each script:
- `LOG_FILES`: list of XES logs to process.
- `activity_name`: activity to monitor.
- `live_plot` and `stream_delay`: only in `AdwinStreaming.py`.

## Output
- `AdwinStreaming.py`: live chart (if `live_plot = True`) and drift indices printed to the console.
- `AdwinXES.py`: PNG files saved under `resultados_drift/`.

## Datasets bundled with scripts

| Folder | Format | Files | Notes |
|--------|--------|-------|-------|
| `dataset_manufacturing/` | `.xes` | 121 | Synthetic; see naming prefixes below |
| `real_dataset/` | `.csv` | 1 | `Prod1Torno.csv` — real lathe log (2012) |

Full catalog: **Deviante docs** → `deviante/docs/datasets-luiz-picolo.md` (in the Obsidian vault).

Synthetic prefixes: `ST_*` (stable), `DR_*` (1 drift), `DR_MS_*` (5 drifts), `DR_MS_ST_*` (5 stepped drifts), plus `TD.xes`.
