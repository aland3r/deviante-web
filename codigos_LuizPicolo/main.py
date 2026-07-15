# Imports
import pm4py
import pandas as pd
import matplotlib.pyplot as plt
from river.drift import ADWIN
import os
from pm4py.objects.log.util import interval_lifecycle

# Input logs
LOG_FILES = [
    "dataset_manufacturing/DR_18.xes",
    "dataset_manufacturing/ST_09.xes",
    "dataset_manufacturing/DR_MS_13.xes",
    "dataset_manufacturing/DR_MS_ST_28.xes"
]

# Configurações
OUTPUT_DIR = "resultados_drift"
os.makedirs(OUTPUT_DIR, exist_ok=True)

def graphic_test(xes_file, activity_name):
    print(f"\nProcessando: {xes_file}")
    base_name = os.path.basename(xes_file)

    # 1. Ler log e converter para interval log
    log = pm4py.read_xes(xes_file)
    log = pm4py.convert_to_event_log(log)
    log = interval_lifecycle.to_interval(log)
    df = pm4py.convert_to_dataframe(log)

    # 2. Criar índice de trace
    first_events = df.groupby("case:concept:name").first()
    first_events.sort_values(by="time:timestamp", inplace=True)
    first_events["trace_index"] = range(first_events.shape[0])

    df = pd.merge(
        df,
        first_events[["trace_index"]],
        how="inner",
        on=["case:concept:name"]
    )

    df.sort_values(by=["trace_index", "time:timestamp"], inplace=True)

    # 3. Filtrar atividade e extrai @@duration
    df = df[df["concept:name"] == activity_name]

    if "@@duration" not in df.columns:
        raise ValueError("Coluna @@duration não encontrada no log.")

    series = (
        df.groupby("trace_index", sort=False)["@@duration"]
        .last()
        .reset_index(drop=True)
    )

    # 4. Detecção de drift
    adwin = ADWIN()
    drifts = []

    for i, v in enumerate(series):
        adwin.update(v)
        if adwin.drift_detected:
            drifts.append(i)

    # 5. Plot
    plt.figure(figsize=(5, 5))
    plt.plot(series, linewidth=1.2, label="Sojourn Time")

    for drift in drifts:
        plt.axvline(
            x=drift,
            color='red',
            linestyle='--',
            label='Drift Detectado' if drift == drifts[0] else ""
        )
    
    plt.title(f"{base_name} – {activity_name}")
    plt.xlabel("Trace")
    plt.ylabel("Sojourn Time (seconds)")
    plt.grid(True)
    plt.legend()
    plt.tight_layout()
    
    plt.savefig(f"{OUTPUT_DIR}/{base_name}_{activity_name}.png", dpi=200)
    plt.close()

activity_name = "Machine_Operating"

for log in LOG_FILES:
    graphic_test(log, activity_name)
